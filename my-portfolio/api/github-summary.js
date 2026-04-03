export default async function handler(req, res) {
    const username = req.query.username || 'mirb-404';
    const CACHE_DURATION = 6 * 60 * 60; // 6 hours

    try {
        const githubToken = process.env.VITE_GITHUB_TOKEN;
        const groqKey = process.env.VITE_GROQ_API_KEY;

        if (!groqKey) {
            return res.status(500).json({ summary: "Error: Missing VITE_GROQ_API_KEY on Vercel.\n\n{{GITHUB}}" });
        }

        const headers = githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {};

        // 1. Fetch GitHub Data
        const eventsResponse = await fetch(`https://api.github.com/users/${username}/events/public?per_page=40`, { headers });
        if (!eventsResponse.ok) throw new Error(`GitHub API returned status: ${eventsResponse.status}`);
        const events = await eventsResponse.json();

        const relevantEvents = events.filter((event) =>
            event.type === 'CreateEvent' || event.type === 'PullRequestEvent' || event.type === 'PushEvent'
        );

        const repoActivity = {};
        relevantEvents.slice(0, 30).forEach((event) => {
            const repoName = event.repo.name;
            if (!repoActivity[repoName]) {
                repoActivity[repoName] = { pushCount: 0, prCount: 0, repoCreated: false, recentCommits: [] };
            }

            if (event.type === 'PushEvent') {
                repoActivity[repoName].pushCount += 1;
                const commits = event.payload?.commits || [];
                commits.forEach((commit) => {
                    if (repoActivity[repoName].recentCommits.length < 3) {
                        repoActivity[repoName].recentCommits.push(commit.message.split('\n')[0]);
                    }
                });
            } else if (event.type === 'PullRequestEvent') {
                repoActivity[repoName].prCount += 1;
            } else if (event.type === 'CreateEvent' && event.payload?.ref_type === 'repository') {
                repoActivity[repoName].repoCreated = true;
            }
        });

        const structuredData = Object.entries(repoActivity).map(([repo, data]) => {
            const actions = [];
            if (data.repoCreated) actions.push("Created repository");
            if (data.pushCount > 0) actions.push(`Pushed ${data.pushCount} time(s)`);
            if (data.prCount > 0) actions.push(`Opened ${data.prCount} PR(s)`);
            return { repository: repo, activity: actions, recent_commits: data.recentCommits };
        });

        const githubJsonStr = JSON.stringify({
            recent_github_activity: structuredData.length > 0 ? structuredData : "No recent public coding activity found."
        });

        // 2. Call Groq API locally to summarize the data
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
                model: "llama-3.1-8b-instant",
                messages: [{ role: "system", content: systemPrompt }],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!groqResponse.ok) throw new Error("Groq API failed generation");
        const groqData = await groqResponse.json();

        const llmSummary = groqData.choices[0].message.content.trim();

        // 3. Assemble and Cache via Vercel Edge Server
        const finalResponse = `${llmSummary}\n\n{{GITHUB}}`;

        res.setHeader('Cache-Control', `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=86400`);
        res.status(200).json({ summary: finalResponse });

    } catch (error) {
        console.error("Vercel Serverless Error:", error);
        res.status(500).json({ summary: `Error fetching activity: ${error.message}\n\n{{GITHUB}}` });
    }
}
