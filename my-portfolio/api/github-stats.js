// GET /api/github-stats — profile numbers for the GitHub widget
import { CACHE_HEADER, GITHUB_USER, fetchProfile } from './_lib/github.js';

export default async function handler(req, res) {
    try {
        const data = await fetchProfile(req.query.username || GITHUB_USER);
        res.setHeader('Cache-Control', CACHE_HEADER);
        res.status(200).json({
            public_repos: data.public_repos,
            followers: data.followers,
            following: data.following,
            avatar_url: data.avatar_url,
            html_url: data.html_url,
            bio: data.bio,
        });
    } catch (error) {
        console.error('GitHub stats error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}
