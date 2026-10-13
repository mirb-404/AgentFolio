// GET /api/github-stats — profile numbers for the GitHub widget.
// Always Mirang's account; cached server-side so no URL can force extra GitHub calls.
import { CACHE_HEADER, GITHUB_USER, fetchProfile } from './_lib/github.js';
import { cached } from './_lib/redis.js';

export default async function handler(req, res) {
    try {
        const stats = await cached('cache:github:stats', 6 * 3600, async () => {
            const data = await fetchProfile(GITHUB_USER);
            return {
                public_repos: data.public_repos,
                followers: data.followers,
                following: data.following,
                avatar_url: data.avatar_url,
                html_url: data.html_url,
                bio: data.bio,
            };
        });
        if (!stats) return res.status(503).json({ status: 'error', message: 'Refreshing, try again in a moment.' });
        res.setHeader('Cache-Control', CACHE_HEADER);
        res.status(200).json(stats);
    } catch (error) {
        console.error('GitHub stats error:', error);
        res.status(500).json({ status: 'error', message: 'GitHub is unavailable right now.' });
    }
}
