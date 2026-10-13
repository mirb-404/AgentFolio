/**
 * The one tool the chat model can call: Mirang's recent GitHub activity.
 * The heavy lifting (and a 6-hour CDN cache) lives in api/github.js.
 */

/** Sent to the model so it knows the tool exists */
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
                    description: "The GitHub username to fetch. Should always be 'mirb-404'."
                }
            },
            required: ["username"]
        }
    }
};

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
