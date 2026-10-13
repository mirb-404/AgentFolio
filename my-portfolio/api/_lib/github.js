// Shared by the GitHub endpoints. Vercel doesn't turn `_`-prefixed paths
// inside /api into functions, so this stays a plain module.
//
// The endpoints only ever serve this one account and ignore query strings,
// so they can't be used as a free GitHub proxy for other users.

export const GITHUB_USER = 'mirb-404';

// Shared CDN cache for every GitHub response: 6 hours fresh, a day stale
export const CACHE_HEADER = 'public, s-maxage=21600, stale-while-revalidate=86400';

const headers = () => {
    // Server-only; the VITE_ name is still read for older deployments
    const token = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchProfile(username) {
    const res = await fetch(`https://api.github.com/users/${username}`, { headers: headers() });
    if (!res.ok) throw new Error(`GitHub API returned status: ${res.status}`);
    return res.json();
}

/**
 * Recent public pushes, PRs and new repos, grouped per repository:
 * [{ repository, activity: ["Pushed 2 time(s)", …], recent_commits: [...] }]
 */
export async function fetchActivity(username) {
    const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=40`, { headers: headers() });
    if (!res.ok) throw new Error(`GitHub API returned status: ${res.status}`);
    const events = await res.json();

    const repos = {};
    for (const event of events.filter(e => ['CreateEvent', 'PullRequestEvent', 'PushEvent'].includes(e.type)).slice(0, 30)) {
        const repo = (repos[event.repo.name] ??= { pushes: 0, prs: 0, created: false, commits: [] });
        if (event.type === 'PushEvent') {
            repo.pushes += 1;
            for (const commit of event.payload?.commits ?? []) {
                if (repo.commits.length < 3) repo.commits.push(commit.message.split('\n')[0]);
            }
        } else if (event.type === 'PullRequestEvent') {
            repo.prs += 1;
        } else if (event.payload?.ref_type === 'repository') {
            repo.created = true;
        }
    }

    return Object.entries(repos).map(([repository, r]) => ({
        repository,
        activity: [
            r.created && 'Created repository',
            r.pushes > 0 && `Pushed ${r.pushes} time(s)`,
            r.prs > 0 && `Opened ${r.prs} PR(s)`,
        ].filter(Boolean),
        recent_commits: r.commits,
    }));
}
