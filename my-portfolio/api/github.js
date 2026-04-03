export default async function handler(req, res) {
    const username = req.query.username || 'mirb-404';
    const CACHE_DURATION = 6 * 60 * 60; // 6 hours in seconds

    try {
        const githubToken = process.env.VITE_GITHUB_TOKEN; // Vercel uses process.env
        const headers = {};
        if (githubToken) {
            headers['Authorization'] = `Bearer ${githubToken}`;
        }

        const eventsResponse = await fetch(`https://api.github.com/users/${username}/events/public?per_page=40`, {
            headers
        });

        if (!eventsResponse.ok) throw new Error(`GitHub API (Events) returned status: ${eventsResponse.status}`);
        const events = await eventsResponse.json();

        // Filter and parse relevant activity
        const relevantEvents = events.filter((event) => {
            if (event.type === 'CreateEvent' || event.type === 'PullRequestEvent' || event.type === 'PushEvent') return true;
            return false;
        });

        // Group relevant events by repository
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

            return {
                repository: repo,
                activity: actions,
                recent_commits: data.recentCommits
            };
        });

        const payload = {
            recent_github_activity: structuredData.length > 0 ? structuredData : "No recent public coding activity found. DO NOT MENTION REPOSITORIES OR PROJECTS FROM BACKGROUND KNOWLEDGE."
        };

        // Cache exactly as requested: data cached for 6 hours (21600 seconds) on Vercel CDN
        res.setHeader('Cache-Control', `s-maxage=${CACHE_DURATION}`);
        res.status(200).json(payload);
    } catch (error) {
        console.error("Serverless Function Error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
}
