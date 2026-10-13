// GET /api/github — recent activity as JSON, for the chat model's GitHub tool.
// Always Mirang's account; cached server-side so no URL can force extra GitHub calls.
import { CACHE_HEADER, GITHUB_USER, fetchActivity } from './_lib/github.js';
import { cached } from './_lib/redis.js';

export default async function handler(req, res) {
    try {
        const activity = await cached('cache:github:activity', 30 * 60, () => fetchActivity(GITHUB_USER));
        if (!activity) return res.status(503).json({ status: 'error', message: 'Refreshing, try again in a moment.' });
        res.setHeader('Cache-Control', CACHE_HEADER);
        res.status(200).json({
            recent_github_activity: activity.length > 0
                ? activity
                : 'No recent public coding activity found. DO NOT MENTION REPOSITORIES OR PROJECTS FROM BACKGROUND KNOWLEDGE.',
        });
    } catch (error) {
        console.error('GitHub activity error:', error);
        res.status(500).json({ status: 'error', message: 'GitHub is unavailable right now.' });
    }
}
