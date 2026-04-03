export default async function handler(req, res) {
    const username = req.query.username || 'mirb-404';
    const CACHE_DURATION = 6 * 60 * 60; // 6 hours

    try {
        const githubToken = process.env.VITE_GITHUB_TOKEN;
        const headers = githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {};

        const response = await fetch(`https://api.github.com/users/${username}`, { headers });
        if (!response.ok) throw new Error(`GitHub API returned status: ${response.status}`);

        const data = await response.json();

        // Pass along the exact cache control headers for the Vercel CDN
        res.setHeader('Cache-Control', `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=86400`);
        res.status(200).json({
            public_repos: data.public_repos,
            followers: data.followers,
            following: data.following,
            avatar_url: data.avatar_url,
            html_url: data.html_url,
            bio: data.bio
        });

    } catch (error) {
        console.error("Vercel Serverless Error fetching stats:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
}
