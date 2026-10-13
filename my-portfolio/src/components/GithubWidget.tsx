import React, { useEffect, useState } from 'react';
import { Github, ArrowUpRight } from 'lucide-react';
import FadeImg from './FadeImg';

interface GithubStats {
    public_repos: number;
    followers: number;
    following: number;
    avatar_url: string;
    html_url: string;
    bio: string;
}

const username = 'mirb-404';

const GithubWidget: React.FC = () => {
    const [stats, setStats] = useState<GithubStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                if (import.meta.env.DEV) {
                    const githubToken = import.meta.env.VITE_GITHUB_TOKEN;
                    const headers: Record<string, string> = {};
                    if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;
                    const response = await fetch(`https://api.github.com/users/${username}`, { headers });
                    if (response.ok) setStats(await response.json());
                } else {
                    const response = await fetch(`/api/github-stats?username=${username}`);
                    if (response.ok) setStats(await response.json());
                }
            } catch (error) {
                console.error("Failed to load GitHub stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const stat = (value: number | undefined, label: string) => (
        <div>
            <div className="text-lg font-semibold text-fg tabular-nums leading-none">{isLoading ? '—' : value ?? 0}</div>
            <div className="text-xs text-subtle mt-1">{label}</div>
        </div>
    );

    return (
        <div className="w-full rounded-2xl border border-line overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center gap-3">
                {stats?.avatar_url
                    ? <FadeImg src={stats.avatar_url} alt={username} className="size-11 rounded-full shrink-0" />
                    : <div className="size-11 rounded-full bg-raised grid place-items-center shrink-0"><Github size={18} className="text-subtle" /></div>}
                <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-medium text-fg">{username}</h3>
                    <p className="text-sm text-muted truncate">{stats?.bio || 'Software Engineer & AI Researcher'}</p>
                </div>
                <a
                    href={stats?.html_url || `https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-fg hover:bg-hover transition-colors"
                >
                    Profile <ArrowUpRight size={14} />
                </a>
            </div>

            <div className="px-4 sm:px-5 pb-4 flex gap-8">
                {stat(stats?.public_repos, 'Public repos')}
                {stat(stats?.followers, 'Followers')}
            </div>

            <div className="border-t border-line p-4 sm:p-5">
                <div className="text-xs text-subtle mb-3">Contributions, last 12 months</div>
                {/* ghchart only renders on white; invert + hue-rotate keeps the greens green in dark mode */}
                <div className="w-full aspect-[663/104]">
                    <FadeImg
                        src={`https://ghchart.rshah.org/40c463/${username}`}
                        alt={`${username}'s contribution graph`}
                        className="w-full h-full dark:invert dark:hue-rotate-180"
                    />
                </div>
            </div>
        </div>
    );
};

export default GithubWidget;
