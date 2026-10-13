// Prints the questions visitors asked the AI (newest first), from the log
// api/chat.js keeps in Upstash Redis. Canned answers aren't logged.
//
//   npm run questions            # last 50
//   npm run questions -- 200     # last 200
//   npm run questions -- --json  # raw JSON, e.g. to pipe into a file
//
// Needs KV_REST_API_URL and KV_REST_API_TOKEN in .env — `vercel env pull .env`
// fetches them, or copy them from Vercel → Storage → your Upstash database.

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
    console.error('Missing KV_REST_API_URL / KV_REST_API_TOKEN in .env (run `vercel env pull .env`).');
    process.exit(1);
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const count = Number(args.find(a => /^\d+$/.test(a))) || 50;

const res = await fetch(`${url}/lrange/chat:questions/0/${count - 1}`, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
    console.error(`Redis returned ${res.status}: ${await res.text()}`);
    process.exit(1);
}
const entries = (await res.json()).result.map(e => JSON.parse(e));

if (asJson) {
    console.log(JSON.stringify(entries, null, 2));
} else if (!entries.length) {
    console.log('No questions logged yet.');
} else {
    for (const { at, q, a, tokens } of entries) {
        console.log(`\n${at.slice(0, 16).replace('T', ' ')}  ·  ${tokens} tokens`);
        console.log(`Q: ${q}`);
        console.log(`A: ${a.replace(/\s+/g, ' ').slice(0, 240)}${a.length > 240 ? '…' : ''}`);
    }
    console.log(`\n${entries.length} shown.`);
}
