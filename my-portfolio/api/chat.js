/**
 * Groq proxy with a per-visitor token budget.
 *
 * The Groq key never reaches the browser. Every visitor (keyed by a salted
 * hash of their IP, so refreshing or clearing storage doesn't reset it) gets
 * a token allowance per rolling window, and all visitors together share a
 * daily budget kept under Groq's own free-tier caps.
 *
 * Capacity: Groq's free-tier limits are tracked per model (each has ~200K
 * tokens/day, 8K tokens/min, 1K requests/day). So the proxy rotates through
 * several models — when one is near its daily cap or answers 429, the next
 * one takes the request. Three models ≈ 3× the daily and per-minute capacity.
 *
 *   GET  /api/chat  → current quota for the caller, plus the model list
 *   POST /api/chat  → streams the Groq SSE response, then one final
 *                     `data: {"quota": …}` event with the updated numbers
 *
 * Every answered question is also logged (question + answer, no IP or
 * visitor id) so the site owner can see what people ask the model —
 * read them with `npm run questions`. Canned answers never reach this
 * endpoint, so only questions that cost tokens are logged.
 *
 * Abuse protection: the system prompt and tools are fixed server-side (the
 * browser only sends the conversation and a tone), every message is rebuilt
 * from known fields with size caps, cross-site browser requests are refused,
 * and IPv6 visitors are grouped by /64 network so one connection can't rotate
 * through addresses to reset its quota.
 *
 * Usage is stored in Upstash Redis (see _lib/redis.js). Without it the
 * counters live in memory: fine for local dev, NOT enforced across
 * serverless instances in production.
 */
import { createHash } from 'node:crypto';
import { retrieve } from './_lib/knowledge.js';
import { redis } from './_lib/redis.js';
import { buildSystemPrompt, isTone, TOOLS } from './_lib/prompt.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Answers are meant to be short; this also caps hidden reasoning tokens
const MAX_OUTPUT_TOKENS = 1000;

const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);

// Tried in order. All support streaming + tool calls on Groq's free tier.
const MODELS = (process.env.CHAT_MODELS || 'openai/gpt-oss-20b,openai/gpt-oss-120b,qwen/qwen3.8-27b')
    .split(',').map(m => m.trim()).filter(Boolean);
// Stop sending to a model a little before Groq's 200K/day cap, leaving room
// for api/github-summary.js (which uses gpt-oss-20b, but is CDN-cached)
const MODEL_DAILY_TOKENS = num(process.env.CHAT_MODEL_DAILY_TOKENS, 190_000);
// gpt-oss accepts low/medium/high; Qwen accepts none/default ("none" = no hidden reasoning tokens)
const reasoningFor = (model) => (model.startsWith('qwen/') ? 'none' : 'low');

// Per visitor: tokens allowed per rolling window, starting at their first message
const IP_LIMIT = num(process.env.CHAT_IP_TOKEN_LIMIT, 50_000);
const IP_WINDOW_S = num(process.env.CHAT_IP_WINDOW_HOURS, 24) * 3600;
// Everyone combined, per UTC day — by default, what all the models can serve
const GLOBAL_LIMIT = num(process.env.CHAT_GLOBAL_TOKEN_LIMIT, MODELS.length * MODEL_DAILY_TOKENS);
// Burst guard so parallel requests can't race past the budget before it's counted
const REQS_PER_MIN = num(process.env.CHAT_IP_REQUESTS_PER_MIN, 8);

const MAX_MESSAGES = 14;
const MAX_CHARS = 24_000;                                            // whole conversation
const MAX_LEN = { user: 1_500, assistant: 4_000, tool: 6_000 };      // per message
const TOOL_NAME = TOOLS[0].function.name;

// Question log: newest first, capped so it can't grow without bound
const LOG_KEY = 'chat:questions';
const LOG_MAX = 2000;

// --- Identity & quota -------------------------------------------------------

function clientIp(request) {
    // Vercel overwrites x-forwarded-for with the real client address, so it can't be spoofed there
    const fwd = request.headers.get('x-forwarded-for');
    return (fwd && fwd.split(',')[0].trim()) || request.headers.get('x-real-ip') || 'local';
}

/**
 * IPv4 as-is; IPv6 by its /64 network. A single home or phone connection gets
 * a whole /64 (billions of addresses), so per-address limits would be useless.
 */
function visitorNetwork(ip) {
    if (!ip.includes(':')) return ip;
    const [head, tail = ''] = ip.split('::');
    const left = head ? head.split(':') : [];
    const right = tail ? tail.split(':') : [];
    const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
    return `${groups.slice(0, 4).map(g => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

function visitorKey(request) {
    const salt = process.env.CHAT_IP_SALT || 'agentfolio';
    const hash = createHash('sha256').update(`${salt}:${visitorNetwork(clientIp(request))}`).digest('hex').slice(0, 32);
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

// --- Model rotation -----------------------------------------------------------

const modelKey = (model) => `chat:model:${model}:${utcDay()}`;
const coolKey = (model) => `chat:cool:${model}`;

/** Models that are under their daily budget and not cooling down after a 429, in order */
async function availableModels() {
    const state = await redis(MODELS.flatMap(m => [['GET', modelKey(m)], ['GET', coolKey(m)]]));
    return MODELS.filter((_, i) => (Number(state[i * 2]) || 0) < MODEL_DAILY_TOKENS && !state[i * 2 + 1]);
}

/** After a 429, skip this model for as long as Groq asked (clamped to 5 s – 1 h) */
const coolDown = (model, seconds) =>
    redis([['SET', coolKey(model), '1', 'EX', Math.min(3600, Math.max(5, Math.ceil(seconds) || 60))]]).catch(() => {});

const chargeModel = (model, tokens) =>
    redis([['INCRBY', modelKey(model), tokens], ['EXPIRE', modelKey(model), 26 * 3600, 'NX']]).catch(() => {});

async function overRequestRate(ipKey) {
    const key = `${ipKey}:rpm:${Math.floor(Date.now() / 60_000)}`;
    const [count] = await redis([['INCRBY', key, 1], ['EXPIRE', key, 70, 'NX']]);
    return count > REQS_PER_MIN;
}

const userQuestions = (messages) =>
    messages.filter(m => m.role === 'user' && typeof m.content === 'string').map(m => m.content);

/** The visitor's latest question — on a tool follow-up it's further back */
const lastQuestion = (messages) => userQuestions(messages).at(-1) ?? '';

/**
 * Adds the profile sections relevant to the latest question as a second
 * system message (see knowledge/ and api/_lib/knowledge.js). Done here rather
 * than in the browser so the knowledge base never ships in the page bundle.
 */
function withProfileNotes(messages) {
    const asked = userQuestions(messages);
    const notes = retrieve(asked.at(-1) ?? '', asked.at(-2) ?? '');
    if (!notes) return messages;
    const note = {
        role: 'system',
        content: `PROFILE NOTES (verified facts about Mirang, retrieved for this question — prefer these over general knowledge, never contradict them, and never go beyond them):\n${notes}`,
    };
    const firstNonSystem = messages.findIndex(m => m.role !== 'system');
    const at = firstNonSystem === -1 ? messages.length : firstNonSystem;
    return [...messages.slice(0, at), note, ...messages.slice(at)];
}

/** Best-effort: a logging failure must never break the chat */
async function logQuestion(question, answer, tokens, model) {
    if (!question || process.env.CHAT_LOG_QUESTIONS === 'off') return;
    const entry = JSON.stringify({ at: new Date().toISOString(), q: question.slice(0, 500), a: answer.slice(0, 2000), tokens, model });
    await redis([['LPUSH', LOG_KEY, entry], ['LTRIM', LOG_KEY, 0, LOG_MAX - 1]]).catch(err => console.error('question log failed:', err));
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

const isString = (v, max) => typeof v === 'string' && v.length <= max;

/**
 * Rebuilds the conversation from known fields only, or returns null if
 * anything is off. Callers can't add system messages, other tools, or extra
 * request parameters, and no single message can be oversized.
 */
function cleanMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;
    if (JSON.stringify(messages).length > MAX_CHARS) return null;
    const out = [];
    for (const m of messages) {
        if (!m || typeof m !== 'object') return null;
        if (m.role === 'user') {
            if (!isString(m.content, MAX_LEN.user) || !m.content.trim()) return null;
            out.push({ role: 'user', content: m.content });
        } else if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
            const call = m.tool_calls[0];
            if (m.tool_calls.length !== 1 || call?.function?.name !== TOOL_NAME || !isString(call.id, 100)
                || !isString(call.function.arguments ?? '', 500)) return null;
            out.push({ role: 'assistant', content: null, tool_calls: [{ id: call.id, type: 'function', function: { name: TOOL_NAME, arguments: call.function.arguments ?? '{}' } }] });
        } else if (m.role === 'assistant') {
            if (!isString(m.content, MAX_LEN.assistant)) return null;
            out.push({ role: 'assistant', content: m.content });
        } else if (m.role === 'tool') {
            if (!isString(m.content, MAX_LEN.tool) || !isString(m.tool_call_id, 100)) return null;
            out.push({ role: 'tool', content: m.content, tool_call_id: m.tool_call_id, name: TOOL_NAME });
        } else {
            return null; // includes 'system': the server owns the instructions
        }
    }
    return out.at(-1).role === 'assistant' ? null : out;
}

/**
 * Browsers always send Origin on POST. Refuse other websites' pages; scripts
 * that omit or fake it are still bound by the per-visitor quota. Extra allowed
 * origins (e.g. a custom domain) can be listed in CHAT_ALLOWED_ORIGINS.
 */
function allowedOrigin(request) {
    const origin = request.headers.get('origin');
    if (!origin) return true;
    try {
        const host = new URL(origin).host;
        const extra = (process.env.CHAT_ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
        return host === request.headers.get('host') || extra.some(o => o === origin || o === host)
            || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    } catch {
        return false;
    }
}

// --- Handlers ---------------------------------------------------------------

export async function GET(request) {
    try {
        return json({ quota: await readQuota(visitorKey(request)), models: MODELS });
    } catch (err) {
        console.error('quota read failed:', err);
        return json({ error: 'quota unavailable' }, 503);
    }
}

export async function POST(request) {
    const key = apiKey();
    if (!key) return json({ error: 'GROQ_API_KEY is not set on the server.' }, 500);

    if (!allowedOrigin(request)) return json({ error: 'forbidden' }, 403);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const messages = cleanMessages(body?.messages);
    if (!messages) return json({ error: 'Invalid or oversized conversation' }, 400);
    const tone = isTone(body?.tone) ? body.tone : 'default';

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

    const prompt = withProfileNotes([{ role: 'system', content: buildSystemPrompt(tone) }, ...messages]);

    // Reserve the prompt cost now so concurrent requests see it; settled to
    // Groq's exact count once the stream ends
    const reserved = estimateTokens(prompt);
    await charge(ipKey, reserved).catch(() => {});

    const callModel = (model) => fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model,
            reasoning_effort: reasoningFor(model),
            messages: prompt,
            tools: TOOLS,
            tool_choice: 'auto',
            stream: true,
            stream_options: { include_usage: true },
            // Low temperature: answers should stick to the profile notes, not improvise
            temperature: 0.4,
            max_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: request.signal,
    }).catch(err => err);

    // First model that accepts the request wins; a 429 benches that model for a while
    const candidates = await availableModels().catch(() => MODELS);
    let upstream = null;
    let model = null;
    let lastStatus = 429;
    for (const candidate of candidates) {
        const res = await callModel(candidate);
        if (!(res instanceof Error) && res.ok && res.body) { upstream = res; model = candidate; break; }
        if (res instanceof Error && res.name === 'AbortError') break; // visitor pressed Stop
        lastStatus = res instanceof Error ? 502 : res.status;
        if (lastStatus === 429) await coolDown(candidate, Number(res.headers.get('retry-after')));
        else console.error('Groq error:', candidate, lastStatus, res instanceof Error ? res.message : await res.text().catch(() => ''));
    }

    if (!upstream) {
        // Nothing was generated — hand the reservation back
        await charge(ipKey, -reserved).catch(() => {});
        if (lastStatus === 429) {
            // Every model is at Groq's per-minute or daily limit, shared by all visitors
            return json({ error: 'upstream_busy', quota: await readQuota(ipKey).catch(() => null) }, 429, { 'Retry-After': '60' });
        }
        return json({ error: 'upstream_error' }, 502);
    }

    // Pass every chunk straight through, collecting the answer text and the
    // usage block Groq sends at the end (`usage`, or `x_groq.usage` on older responses)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';
    let actual = 0;
    let answer = '';
    let reasoningChars = 0;

    const watch = (text) => {
        buffer += text;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.startsWith('data:') || line.includes('[DONE]')) continue;
            try {
                const data = JSON.parse(line.slice(5).trim());
                const usage = data.usage || data.x_groq?.usage;
                if (usage?.total_tokens) actual = usage.total_tokens;
                const delta = data.choices?.[0]?.delta;
                answer += delta?.content || '';
                reasoningChars += delta?.reasoning?.length || 0;
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
            const cost = actual || reserved + Math.min(MAX_OUTPUT_TOKENS, Math.ceil((answer.length + reasoningChars) / 4) + 200);
            try {
                await Promise.all([charge(ipKey, cost - reserved), chargeModel(model, cost)]);
                const quota = await readQuota(ipKey);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ quota, model })}\n\n`));
            } catch (err) {
                console.error('quota settle failed:', err);
            }
            // Before closing: work after the response ends may be cut off on Vercel.
            // A turn that only asked for a tool has no text; the follow-up logs it.
            if (answer) await logQuestion(lastQuestion(messages), answer, cost, model);
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
