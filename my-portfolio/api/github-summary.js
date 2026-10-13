// GET /api/github-summary — a first-person summary of recent GitHub activity,
// written by the model and cached at the CDN so most visitors cost no tokens
import { CACHE_HEADER, GITHUB_USER, fetchActivity } from './_lib/github.js';

export default async function handler(req, res) {
    const username = req.query.username || GITHUB_USER;

    try {
        const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
        if (!groqKey) {
            return res.status(500).json({ summary: "Error: Missing GROQ_API_KEY on Vercel.\n\n{{GITHUB}}" });
        }

        const activity = await fetchActivity(username);
        const githubJsonStr = JSON.stringify({
            recent_github_activity: activity.length > 0 ? activity : "No recent public coding activity found."
        });

        const systemPrompt = `You are Mirang Bhandari's AI portfolio assistant. The user has asked about your recent GitHub activity.
        Read the following JSON containing his recent coding activity: ${githubJsonStr}
        Summarize this data naturally in the first person ("Here is what I've been working on...").
        Be professional but concise. Use bullet points if there are 2-3 repos.
        CRITICAL: DO NOT add any filler or external information. DO NOT append any tags, just output the summary text.`;

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${groqKey}`
            },
            body: JSON.stringify({
                // gpt-oss-20b's reasoning tokens count toward max_tokens,
                // so keep effort low and leave some headroom
                model: "openai/gpt-oss-20b",
                reasoning_effort: "low",
                messages: [{ role: "system", content: systemPrompt }],
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!groqResponse.ok) throw new Error("Groq API failed generation");
        const groqData = await groqResponse.json();
        const llmSummary = groqData.choices[0].message.content.trim();

        res.setHeader('Cache-Control', CACHE_HEADER);
        res.status(200).json({ summary: `${llmSummary}\n\n{{GITHUB}}` });
    } catch (error) {
        console.error("GitHub summary error:", error);
        res.status(500).json({ summary: `Error fetching activity: ${error.message}\n\n{{GITHUB}}` });
    }
}
