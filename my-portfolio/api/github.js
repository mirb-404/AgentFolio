// GET /api/github — recent activity as JSON, for the chat model's GitHub tool
import { CACHE_HEADER, GITHUB_USER, fetchActivity } from './_lib/github.js';

export default async function handler(req, res) {
    try {
        const activity = await fetchActivity(req.query.username || GITHUB_USER);
        res.setHeader('Cache-Control', CACHE_HEADER);
        res.status(200).json({
            recent_github_activity: activity.length > 0
                ? activity
                : 'No recent public coding activity found. DO NOT MENTION REPOSITORIES OR PROJECTS FROM BACKGROUND KNOWLEDGE.',
        });
    } catch (error) {
        console.error('GitHub activity error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}
