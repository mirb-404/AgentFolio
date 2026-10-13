/**
 * Runs the chat model's one tool, fetch_github_activity (defined server-side
 * in api/_lib/prompt.js). The heavy lifting and caching live in api/github.js.
 */

// Short in-session cache so repeat questions don't refetch
const CACHE_TTL = 5 * 60 * 1000;
let cache: { at: number; data: string } | null = null;

/** Runs the tool; always resolves to a JSON string for the model */
export const fetchGithubActivity = async (username: string = 'mirb-404'): Promise<string> => {
    if (cache && Date.now() - cache.at < CACHE_TTL) return cache.data;

    try {
        const response = await fetch(`/api/github?username=${encodeURIComponent(username)}`);
        if (!response.ok) throw new Error(`API returned status: ${response.status}`);
        const data = JSON.stringify(await response.json());
        cache = { at: Date.now(), data };
        return data;
    } catch (error) {
        console.error("Failed to fetch GitHub activity:", error);
        return JSON.stringify({
            status: "error",
            message: `Failed to fetch GitHub activity: ${error instanceof Error ? error.message : error}`
        });
    }
};
