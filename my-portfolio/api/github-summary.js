// GET /api/github-summary — a first-person summary of recent GitHub activity,
// written by the model. Generated at most once per 6 hours: the Redis cache
// (with a single-flight lock) means no URL or request flood can trigger extra
// Groq calls, and the CDN header keeps most requests off the function entirely.
import { CACHE_HEADER, GITHUB_USER, fetchActivity } from './_lib/github.js';
import { cached } from './_lib/redis.js';

const SUMMARY_TTL = 6 * 3600;

async function writeSummary(groqKey) {
    const activity = await fetchActivity(GITHUB_USER);
    const githubJsonStr = JSON.stringify({
        recent_github_activity: activity.length > 0 ? activity : "No recent public coding activity found."
    });

    const systemPrompt = `You are Mirang Bhandari's AI portfolio assistant. The user has asked about your recent GitHub activity.
Read the following JSON containing his recent coding activity: ${githubJsonStr}
Summarize this data naturally in the first person ("Here is what I've been working on...").
Be professional but concise. Use bullet points if there are 2-3 repos. Don't use em dashes.
CRITICAL: DO NOT add any filler or external information. DO NOT append any tags, just output the summary text.`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
            // gpt-oss-20b's reasoning tokens count toward max_tokens,
            // so keep effort low and leave some headroom
            model: "openai/gpt-oss-20b",
            reasoning_effort: "low",
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.4,
            max_tokens: 800
        })
    });
    if (!groqResponse.ok) throw new Error(`Groq API failed generation (${groqResponse.status})`);
    const groqData = await groqResponse.json();
    return `${groqData.choices[0].message.content.trim()}\n\n{{GITHUB}}`;
}

export default async function handler(req, res) {
    try {
        const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
        if (!groqKey) return res.status(500).json({ summary: "GitHub summary is not configured.\n\n{{GITHUB}}" });

        const summary = await cached('cache:github:summary', SUMMARY_TTL, () => writeSummary(groqKey));
        if (!summary) {
            // Another request is generating it right now
            return res.status(503).json({ summary: "I'm refreshing my GitHub summary, here's my profile in the meantime.\n\n{{GITHUB}}" });
        }
        res.setHeader('Cache-Control', CACHE_HEADER);
        res.status(200).json({ summary });
    } catch (error) {
        console.error("GitHub summary error:", error);
        res.status(500).json({ summary: "I couldn't reach GitHub just now, here's my profile instead.\n\n{{GITHUB}}" });
    }
}
