// Shared Redis access for the API routes. Upstash's REST API, so no client
// library or open connections — one HTTPS round trip per batch of commands.
//
// Vercel Marketplace → Upstash for Redis sets KV_REST_API_URL / KV_REST_API_TOKEN.
// Without them everything falls back to an in-memory map: fine for local dev,
// but NOT shared between serverless instances, so limits aren't reliable in
// production until Redis is connected.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL && process.env.VERCEL) {
    console.warn('[redis] KV_REST_API_URL is not set — quotas and caches are per-instance only. Connect Upstash Redis.');
}

/** In-memory stand-in for Redis: { key: { value, expiresAt } } */
const memory = new Map();
const memGet = (key) => {
    const hit = memory.get(key);
    if (hit && hit.expiresAt <= Date.now()) { memory.delete(key); return undefined; }
    return hit;
};

/** Just the commands the API uses, with Redis semantics */
function memoryCommand([cmd, key, ...args]) {
    const hit = memGet(key);
    switch (cmd) {
        case 'GET': return hit ? String(hit.value) : null;
        case 'TTL': return hit ? (hit.expiresAt === Infinity ? -1 : Math.ceil((hit.expiresAt - Date.now()) / 1000)) : -2;
        case 'SET': {
            // SET key value [EX seconds] [NX]
            const ex = args.indexOf('EX');
            if (args.includes('NX') && hit) return null;
            memory.set(key, { value: args[0], expiresAt: ex > 0 ? Date.now() + Number(args[ex + 1]) * 1000 : Infinity });
            return 'OK';
        }
        case 'DEL': return memory.delete(key) ? 1 : 0;
        case 'INCRBY': {
            const value = (hit ? Number(hit.value) : 0) + Number(args[0]);
            memory.set(key, { value, expiresAt: hit ? hit.expiresAt : Infinity });
            return value;
        }
        case 'EXPIRE': {
            if (!hit) return 0;
            if (args[1] === 'NX' && hit.expiresAt !== Infinity) return 0;
            hit.expiresAt = Date.now() + Number(args[0]) * 1000;
            return 1;
        }
        case 'LPUSH': {
            const list = hit ? hit.value : [];
            list.unshift(args[0]);
            memory.set(key, { value: list, expiresAt: Infinity });
            return list.length;
        }
        case 'LTRIM': {
            if (hit) hit.value = hit.value.slice(Number(args[0]), Number(args[1]) + 1);
            return 'OK';
        }
        default: throw new Error(`unsupported ${cmd}`);
    }
}

/** Runs Redis commands in one round trip; each result is the command's reply */
export async function redis(commands) {
    if (!REDIS_URL || !REDIS_TOKEN) return commands.map(memoryCommand);
    const res = await fetch(`${REDIS_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`Redis ${res.status}`);
    return (await res.json()).map(r => r.result);
}

/**
 * Server-side cache with a single-flight lock: however many requests miss at
 * once, `produce` runs at most once per `ttlSeconds`. Callers that lose the
 * race get `null` (show a "try again" message) instead of triggering more work.
 * This is what stops a cache-busting loop from turning into upstream API calls.
 */
export async function cached(key, ttlSeconds, produce) {
    const [hit] = await redis([['GET', key]]);
    if (hit) return JSON.parse(hit);
    const [lock] = await redis([['SET', `${key}:lock`, '1', 'EX', 60, 'NX']]);
    if (!lock) return null;
    try {
        const value = await produce();
        await redis([['SET', key, JSON.stringify(value), 'EX', ttlSeconds]]);
        return value;
    } finally {
        await redis([['DEL', `${key}:lock`]]).catch(() => {});
    }
}
