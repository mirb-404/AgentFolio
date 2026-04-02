import React, { useEffect, useState } from 'react';
import { Github, Users, BookOpen, GitCommit, Activity } from 'lucide-react';

interface GithubStats {
    public_repos: number;
    followers: number;
    following: number;
    avatar_url: string;
    html_url: string;
    bio: string;
}

const GithubWidget: React.FC = () => {
    const [stats, setStats] = useState<GithubStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const username = 'mirb-404';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                if (import.meta.env.DEV) {
                    console.log("Widget Local Dev: Fetching stats from GitHub directly.");
                    const githubToken = import.meta.env.VITE_GITHUB_TOKEN;
                    const headers: Record<string, string> = {};
                    if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;

                    const response = await fetch(`https://api.github.com/users/${username}`, { headers });
                    if (response.ok) setStats(await response.json());
                } else {
                    console.log("Widget Production: Fetching stats from Vercel Edge API.");
                    const response = await fetch(`/api/github-stats?username=${username}`);

                    const cacheStatus = response.headers.get('x-vercel-cache');
                    if (cacheStatus === 'HIT') console.log(`✅ Widget Stats Cached! (${cacheStatus})`);
                    else if (cacheStatus === 'MISS') console.log(`⚠️ Widget Stats cache miss (${cacheStatus})`);

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

    const chartUrl = `https://ghchart.rshah.org/22c55e/${username}`;

    return (
        <div className="w-full max-w-xl bg-[#0d0d0d] border border-[#191919] rounded-2xl overflow-hidden mt-4">

            {/* Header */}
            <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#141414]">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {stats?.avatar_url ? (
                        <div className="relative shrink-0">
                            <img
                                src={stats.avatar_url}
                                alt={username}
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#252525]"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-[#0d0d0d] rounded-full p-0.5 border border-[#222]">
                                <Github className="text-[#888] w-2.5 h-2.5" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-[#111] flex items-center justify-center border border-[#222]">
                            <Github className="text-[#484848] w-5 h-5" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] sm:text-sm font-display tracking-wider text-white flex items-center gap-2">
                            {username}
                            {isLoading && <Activity className="w-3 h-3 text-blue-500 animate-pulse shrink-0" />}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#585858] mt-0.5 truncate font-mono">
                            {stats?.bio || "Software Engineer & AI Researcher"}
                        </p>
                    </div>
                </div>

                <a
                    href={stats?.html_url || `https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#222] hover:border-[#333] bg-[#111] hover:bg-[#161616] text-[#888] hover:text-white text-xs font-mono rounded-xl transition-all shrink-0"
                >
                    <Github size={12} />
                    View Profile
                </a>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 divide-x divide-[#141414] border-b border-[#141414]">
                <div className="p-4 sm:p-5 flex items-center gap-3">
                    <div className="p-2 bg-[#111] rounded-xl border border-[#1e1e1e] text-blue-500/70 shrink-0">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-white leading-none font-display">
                            {isLoading ? "—" : stats?.public_repos ?? 0}
                        </div>
                        <div className="text-[11px] text-[#585858] font-mono mt-1">Public Repos</div>
                    </div>
                </div>

                <div className="p-4 sm:p-5 flex items-center gap-3">
                    <div className="p-2 bg-[#111] rounded-xl border border-[#1e1e1e] text-blue-500/70 shrink-0">
                        <Users className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-white leading-none font-display">
                            {isLoading ? "—" : stats?.followers ?? 0}
                        </div>
                        <div className="text-[11px] text-[#585858] font-mono mt-1">Followers</div>
                    </div>
                </div>
            </div>

            {/* Contribution graph */}
            <div className="p-4 sm:p-5 bg-[#080808]">
                <div className="flex items-center gap-2 mb-3">
                    <GitCommit className="text-[#484848] w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-display tracking-wider text-[#585858]">Live Contributions</span>
                </div>
                <div className="w-full overflow-hidden rounded-xl border border-[#161616] p-2 bg-[#0a0a0a]">
                    <img
                        src={chartUrl}
                        alt={`${username}'s contribution graph`}
                        className="w-full h-auto opacity-80 mix-blend-screen filter brightness-90 contrast-125 saturate-150"
                        style={{ filter: 'invert(90%) hue-rotate(180deg)' }}
                    />
                </div>
            </div>

        </div>
    );
};

export default GithubWidget;
