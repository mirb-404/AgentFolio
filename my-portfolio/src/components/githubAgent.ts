/**
 * githubAgent.ts
 * 
 * ============================================================================
 * 🤖 AGENTIC PORTFOLIO TOOL: GITHUB ACTIVITY FETCHER
 * ============================================================================
 * 
 * This file defines the tools that the LLM can decide to use if the user 
 * asks about your recent coding activity. By keeping this separate, the 
 * core ChatInterface component stays clean, and the Agent tools are clearly 
 * defined here.
 */

// 1. Tool Definition (sent to the LLM so it knows this tool exists)
export const githubActivityToolDefinition = {
    type: "function",
    function: {
        name: "fetch_github_activity",
        description: "Fetches Mirang's most recent GitHub commit activity and repository updates. Call this when the user asks what Mirang is currently working on, coding, building, or his recent GitHub activity.",
        parameters: {
            type: "object",
            properties: {
                username: {
                    type: "string",
                    description: "The GitHub username to fetch. Should always be 'Bloodwingv2'."
                }
            },
            required: ["username"]
        }
    }
};

interface CacheType {
    timestamp: number;
    data: string | null;
}

let githubCache: CacheType = {
    timestamp: 0,
    data: null
};

// 2. Tool Execution (the actual API call executed when the LLM requests it)
export const fetchGithubActivity = async (username: string = 'Bloodwingv2'): Promise<string> => {
    // We still keep a tiny local cache (e.g., 5 mins) to prevent spamming our own serverless function
    // during a single user session, but the heavy lifting and 3-hour cache is handled by Vercel Edge.
    const CACHE_TTL = 5 * 60 * 1000;
    if (githubCache.data && (Date.now() - githubCache.timestamp < CACHE_TTL)) {
        console.log("Serving GitHub activity from local React cache");
        return githubCache.data;
    }

    try {
        let payload = "";

        // If we are running locally via `npm run dev`, Vite doesn't automatically serve Vercel /api functions.
        // We fallback to the direct GitHub API so your local environment doesn't break.
        if (import.meta.env.DEV) {
            console.log("Development mode detected. Fetching directly from GitHub API.");
            const githubToken = import.meta.env.VITE_GITHUB_TOKEN;
            const headers: Record<string, string> = {};
            if (githubToken) {
                headers['Authorization'] = `Bearer ${githubToken}`;
            }

            const eventsResponse = await fetch(`https://api.github.com/users/${username}/events/public?per_page=40`, {
                headers
            });

            if (!eventsResponse.ok) throw new Error(`GitHub API returned status: ${eventsResponse.status}`);
            const events = await eventsResponse.json();

            const relevantEvents = events.filter((event: any) =>
                event.type === 'CreateEvent' || event.type === 'PullRequestEvent' || event.type === 'PushEvent'
            );

            const repoActivity: Record<string, { pushCount: number, prCount: number, repoCreated: boolean, recentCommits: string[] }> = {};

            relevantEvents.slice(0, 30).forEach((event: any) => {
                const repoName = event.repo.name;
                if (!repoActivity[repoName]) {
                    repoActivity[repoName] = { pushCount: 0, prCount: 0, repoCreated: false, recentCommits: [] };
                }

                if (event.type === 'PushEvent') {
                    repoActivity[repoName].pushCount += 1;
                    const commits = event.payload?.commits || [];
                    commits.forEach((commit: any) => {
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

            payload = JSON.stringify({
                recent_github_activity: structuredData.length > 0 ? structuredData : "No recent public coding activity found."
            });

        } else {
            // Production on Vercel: perfectly routes to the Serverless Function.
            console.log("Production mode detected. Fetching from Vercel Edge API.");
            const response = await fetch(`/api/github?username=${username}`);

            if (!response.ok) {
                throw new Error(`Cached API returned status: ${response.status}`);
            }

            // Extract the Vercel CDN Cache Header to verify if it hit the cache
            const cacheStatus = response.headers.get('x-vercel-cache');

            if (cacheStatus === 'HIT') {
                console.log(`✅ SUCCESS: Response successfully cached! (Vercel Edge: ${cacheStatus})`);
                console.log("Using cached GitHub data for the next 6 hours.");
            } else if (cacheStatus === 'MISS') {
                console.log(`⚠️ CACHE MISS: Vercel hit the real GitHub API. (Vercel Edge: ${cacheStatus})`);
                console.log("Response successfully fetched and is now cached for 6 hours.");
            } else if (cacheStatus) {
                console.log(`ℹ️ Vercel Edge Cache Status: ${cacheStatus}`);
            } else {
                console.log("ℹ️ No Vercel caching headers found (Might be running locally without Vercel CLI).");
            }

            const data = await response.json();
            payload = JSON.stringify(data);
        }

        // Update local session cache
        githubCache = {
            timestamp: Date.now(),
            data: payload
        };

        return payload;

    } catch (error: any) {
        console.error("Failed to fetch GitHub activity:", error);
        return JSON.stringify({
            status: "error",
            message: `Failed to fetch GitHub activity: ${error.message}`
        });
    }
};
