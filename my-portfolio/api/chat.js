/**
 * Groq proxy with a per-visitor token budget.
 *
 * The Groq key never reaches the browser. Every visitor (keyed by a salted
 * hash of their IP, so refreshing or clearing storage doesn't reset it) gets
 * a token allowance per rolling window, and all visitors together share a
 * daily budget kept under Groq's own free-tier tokens-per-day cap.
 *
 *   GET  /api/chat  → current quota for the caller
 *   POST /api/chat  → streams the Groq SSE response, then one final
 *                     `data: {"quota": …}` event with the updated numbers
 *
 * Usage is stored in Upstash Redis (Vercel Marketplace → Upstash for Redis,
 * which sets KV_REST_API_URL / KV_REST_API_TOKEN). Without it the counters
 * live in memory — fine for local dev, NOT enforced across serverless
 * instances in production.
 */
import { createHash } from 'node:crypto';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-20b';
const MAX_OUTPUT_TOKENS = 1500;

const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
// Per visitor: tokens allowed per rolling window, starting at their first message
const IP_LIMIT = num(process.env.CHAT_IP_TOKEN_LIMIT, 30_000);
const IP_WINDOW_S = num(process.env.CHAT_IP_WINDOW_HOURS, 24) * 3600;
// Everyone combined, per UTC day. Groq's free tier caps gpt-oss-20b at 200K
// tokens/day; the default leaves headroom for the GitHub summary function.
const GLOBAL_LIMIT = num(process.env.CHAT_GLOBAL_TOKEN_LIMIT, 150_000);
// Burst guard so parallel requests can't race past the budget before it's counted
const REQS_PER_MIN = num(process.env.CHAT_IP_REQUESTS_PER_MIN, 8);

const MAX_MESSAGES = 14;
const MAX_CHARS = 24_000;

// --- Storage ----------------------------------------------------------------

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

/** In-memory stand-in for Redis: { key: { value, expiresAt } } */
const memory = new Map();
const memGet = (key) => {
    const hit = memory.get(key);
    if (hit && hit.expiresAt <= Date.now()) { memory.delete(key); return undefined; }
    return hit;
};

/** Runs Redis commands in one round trip; each result is the command's reply */
async function redis(commands) {
    if (REDIS_URL && REDIS_TOKEN) {
        const res = await fetch(`${REDIS_URL}/pipeline`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(commands),
        });
        if (!res.ok) throw new Error(`Redis ${res.status}`);
        const out = await res.json();
        return out.map(r => r.result);
    }
    // Only the handful of commands used below
    return commands.map(([cmd, key, arg, flag]) => {
        const hit = memGet(key);
        switch (cmd) {
            case 'GET': return hit ? String(hit.value) : null;
            case 'TTL': return hit ? (hit.expiresAt === Infinity ? -1 : Math.ceil((hit.expiresAt - Date.now()) / 1000)) : -2;
            case 'INCRBY': {
                const value = (hit ? Number(hit.value) : 0) + Number(arg);
                memory.set(key, { value, expiresAt: hit ? hit.expiresAt : Infinity });
                return value;
            }
            case 'EXPIRE': {
                if (!hit) return 0;
                if (flag === 'NX' && hit.expiresAt !== Infinity) return 0;
                hit.expiresAt = Date.now() + Number(arg) * 1000;
                return 1;
            }
            default: throw new Error(`unsupported ${cmd}`);
        }
    });
}

// --- Identity & quota -------------------------------------------------------

function clientIp(request) {
    // Vercel overwrites x-forwarded-for with the real client address, so it can't be spoofed there
    const fwd = request.headers.get('x-forwarded-for');
    return (fwd && fwd.split(',')[0].trim()) || request.headers.get('x-real-ip') || 'local';
}

function visitorKey(request) {
    const salt = process.env.CHAT_IP_SALT || 'agentfolio';
    const hash = createHash('sha256').update(`${salt}:${clientIp(request)}`).digest('hex').slice(0, 32);
    return `chat:ip:${hash}`;
}

const utcDay = () => new Date().toISOString().slice(0, 10);
const globalKey = () => `chat:global:${utcDay()}`;
const endOfUtcDay = () => {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
};

async function readQuota(ipKey) {
    const [ipUsed, ipTtl, globalUsed] = await redis([['GET', ipKey], ['TTL', ipKey], ['GET', globalKey()]]);
    return shapeQuota(Number(ipUsed) || 0, ipTtl, Number(globalUsed) || 0);
}

/**
 * What the client renders. The ring shows this visitor's own budget; if the
 * shared daily budget runs out first, it reads as exhausted until midnight UTC.
 */
function shapeQuota(ipUsed, ipTtl, globalUsed) {
    const used = Math.min(ipUsed, IP_LIMIT);
    const globalOut = globalUsed >= GLOBAL_LIMIT;
    const ipOut = ipUsed >= IP_LIMIT;
    const ipResetAt = ipTtl > 0 ? Date.now() + ipTtl * 1000 : null;
    return {
        used,
        limit: IP_LIMIT,
        exhausted: ipOut || globalOut,
        scope: ipOut ? 'visitor' : globalOut ? 'global' : null,
        // Null until the visitor's window has started
        resetAt: ipOut ? ipResetAt : globalOut ? endOfUtcDay() : used > 0 ? ipResetAt : null,
    };
}

/** Adds tokens to both counters; starts each window on its first use */
async function charge(ipKey, tokens) {
    if (!tokens) return;
    await redis([
        ['INCRBY', ipKey, tokens],
        ['EXPIRE', ipKey, IP_WINDOW_S, 'NX'],
        ['INCRBY', globalKey(), tokens],
        ['EXPIRE', globalKey(), 26 * 3600, 'NX'],
    ]);
}

async function overRequestRate(ipKey) {
    const key = `${ipKey}:rpm:${Math.floor(Date.now() / 60_000)}`;
    const [count] = await redis([['INCRBY', key, 1], ['EXPIRE', key, 70, 'NX']]);
    return count > REQS_PER_MIN;
}

// --- Helpers ----------------------------------------------------------------

const json = (body, status = 200, headers = {}) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    });

const apiKey = () => process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

/** Rough pre-count (≈4 chars per token) used only to reserve budget up front */
const estimateTokens = (messages) => Math.ceil(JSON.stringify(messages).length / 4);

function validMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false;
    if (JSON.stringify(messages).length > MAX_CHARS) return false;
    return messages.every(m => m && typeof m === 'object' && ['system', 'user', 'assistant', 'tool'].includes(m.role));
}

// --- Handlers ---------------------------------------------------------------

export async function GET(request) {
    try {
        return json({ quota: await readQuota(visitorKey(request)) });
    } catch (err) {
        console.error('quota read failed:', err);
        return json({ error: 'quota unavailable' }, 503);
    }
}

export async function POST(request) {
    const key = apiKey();
    if (!key) return json({ error: 'GROQ_API_KEY is not set on the server.' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { messages, tools } = body ?? {};
    if (!validMessages(messages)) return json({ error: 'Invalid or oversized conversation' }, 400);

    const ipKey = visitorKey(request);
    let quota;
    try {
        if (await overRequestRate(ipKey)) {
            return json({ error: 'rate_limited', quota: await readQuota(ipKey) }, 429, { 'Retry-After': '60' });
        }
        quota = await readQuota(ipKey);
    } catch (err) {
        console.error('quota check failed:', err);
        return json({ error: 'quota unavailable' }, 503);
    }
    if (quota.exhausted) return json({ error: 'quota_exhausted', quota }, 429);

    // Reserve the prompt cost now so concurrent requests see it; settled to
    // Groq's exact count once the stream ends
    const reserved = estimateTokens(messages);
    await charge(ipKey, reserved).catch(() => {});

    const upstream = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model: MODEL,
            reasoning_effort: 'low',
            messages,
            // Only the tools the site actually implements
            ...(Array.isArray(tools) && tools.length ? { tools: tools.slice(0, 2), tool_choice: 'auto' } : {}),
            stream: true,
            stream_options: { include_usage: true },
            temperature: 0.7,
            max_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: request.signal,
    }).catch(err => err);

    if (upstream instanceof Error || !upstream.ok || !upstream.body) {
        // Nothing was generated — hand the reservation back
        await charge(ipKey, -reserved).catch(() => {});
        const status = upstream instanceof Error ? 502 : upstream.status;
        if (status === 429) {
            // Groq's own per-minute/day limit, shared by every visitor
            const retry = upstream.headers?.get('retry-after') || '60';
            return json({ error: 'upstream_busy', quota: await readQuota(ipKey).catch(() => null) }, 429, { 'Retry-After': retry });
        }
        const detail = upstream instanceof Error ? upstream.message : await upstream.text().catch(() => '');
        console.error('Groq error:', status, detail);
        return json({ error: 'upstream_error' }, 502);
    }

    // Pass every chunk straight through, watching for the usage block Groq
    // sends at the end (`usage`, or `x_groq.usage` on older responses)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';
    let actual = 0;

    const watch = (text) => {
        buffer += text;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.startsWith('data:') || !line.includes('usage')) continue;
            try {
                const data = JSON.parse(line.slice(5).trim());
                const usage = data.usage || data.x_groq?.usage;
                if (usage?.total_tokens) actual = usage.total_tokens;
            } catch { /* partial or non-JSON line */ }
        }
    };

    const stream = new ReadableStream({
        async start(controller) {
            const reader = upstream.body.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    watch(decoder.decode(value, { stream: true }));
                    controller.enqueue(value);
                }
            } catch { /* client went away mid-stream */ }

            // A stopped stream never gets its usage block — estimate what was
            // generated (plus hidden reasoning) so Stop can't dodge the meter
            const cost = actual || reserved + Math.min(MAX_OUTPUT_TOKENS, Math.ceil(outputChars / 4) + 200);
            try {
                await charge(ipKey, cost - reserved);
                const quota = await readQuota(ipKey);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ quota })}\n\n`));
            } catch (err) {
                console.error('quota settle failed:', err);
            }
            try { controller.close(); } catch { /* already closed */ }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Accel-Buffering': 'no',
        },
    });
}
