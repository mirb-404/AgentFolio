import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, motionTier } from '../lib/motion';
import { portfolioData } from '../data/portfolioData';
import { Github, Linkedin, Twitter, ExternalLink, Menu, BookOpen } from 'lucide-react';
import LogoMark from './LogoMark';

interface LayoutProps {
    children: React.ReactNode;
    /** Hero world (full nav) vs chat world (compact header) — both Claude-light */
    light?: boolean;
    onHomeClick?: () => void;
    onMenuClick?: () => void;
    onBlogClick?: (origin?: { x: number; y: number }) => void;
    /** Nav items fire portfolio prompts into the chat agent */
    onNavPrompt?: (prompt: string) => void;
}

const NAV_ITEMS: { label: string; prompt: string }[] = [
    { label: 'Projects', prompt: 'Show me your projects' },
    { label: 'Skills', prompt: 'What are your skills?' },
    { label: 'Experience', prompt: 'Tell me about your experience' },
    { label: 'Contact', prompt: 'Contact me' },
];

const Layout: React.FC<LayoutProps> = ({ children, light = false, onHomeClick, onMenuClick, onBlogClick, onNavPrompt }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Entrance — header settles down from above right after the splash hands off
    useGSAP(() => {
        if (motionTier() === 'off') return;
        gsap.from('header', {
            y: -16, opacity: 0,
            duration: 0.7, ease: 'power3.out',
            clearProps: 'all',
        });
    }, { scope: containerRef });

    const handleBlogClick = (e: React.MouseEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        onBlogClick?.({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    };

    const Wordmark = (
        <div
            onClick={onHomeClick}
            className="flex items-center gap-2 cursor-pointer select-none text-[#f2f1ec]"
            title="AgentFolio — Home"
        >
            <LogoMark size={30} />
            <span className="font-grotesk font-semibold text-[20px] sm:text-[22px] tracking-[-0.05em] leading-none">
                AgentFolio
            </span>
        </div>
    );

    return (
        <div ref={containerRef} className="flex flex-col h-[100dvh] w-full max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 font-sans relative z-10">
            {light ? (
                /* ---- Hero nav — full menu over the ambient mesh ---- */
                <header className="flex justify-between items-center py-4 z-20 relative shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={onMenuClick}
                            className="sm:hidden p-1.5 -ml-1 text-[#8a8a85] hover:text-[#f2f1ec] transition-colors rounded-lg hover:bg-[#1a1a1a]"
                            aria-label="Open Menu"
                        >
                            <Menu size={19} />
                        </button>
                        {Wordmark}
                    </div>

                    {/* Menu items — each fires a portfolio prompt */}
                    <nav className="hidden lg:flex items-center gap-8">
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.label}
                                onClick={() => onNavPrompt?.(item.prompt)}
                                className="font-grotesk font-medium text-[15px] tracking-[-0.0125em] text-[#8a8a85] hover:text-[#f2f1ec] transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                        <button
                            onClick={handleBlogClick}
                            className="font-grotesk font-medium text-[15px] tracking-[-0.0125em] text-[#8a8a85] hover:text-[#f2f1ec] transition-colors"
                        >
                            Blog
                        </button>
                    </nav>

                    {/* Right buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onNavPrompt?.('Show me your resume')}
                            className="hidden sm:block font-grotesk font-medium text-[14px] text-[#b5b3ab] px-4 py-2 rounded-lg hover:bg-[#1a1a1a] hover:text-[#f2f1ec] transition-colors"
                            data-magnetic
                        >
                            Resume
                        </button>
                        <button
                            onClick={() => onNavPrompt?.('Contact me')}
                            className="font-grotesk font-medium text-[14px] bg-[#f2f1ec] text-[#0a0a0a] px-5 py-2 rounded-lg hover:bg-white transition-colors"
                            data-magnetic
                        >
                            Let's Talk
                        </button>
                    </div>
                </header>
            ) : (
                /* ---- Chat header — compact obsidian ---- */
                <header className="flex justify-between items-center py-3 sm:py-4 border-b border-[#1c1c1c] mb-2 sm:mb-4 z-20 relative shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={onMenuClick}
                            className="sm:hidden p-1.5 -ml-1 text-[#8a8a85] hover:text-[#f2f1ec] transition-colors rounded-lg hover:bg-[#1a1a1a]"
                            aria-label="Open Menu"
                        >
                            <Menu size={19} />
                        </button>
                        {Wordmark}
                    </div>

                    {/* Blog button — rotating cyan shine border */}
                    <div className="relative flex blog-shine-wrap rounded-[10px] shrink-0 group" data-magnetic>
                        <span className="sm:hidden absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#34d399] z-10 pointer-events-none" />
                        <button
                            onClick={handleBlogClick}
                            className="blog-shine-inner"
                            title="View Blog"
                        >
                            <BookOpen size={13} className="text-[#67e8f9] group-hover:text-white transition-colors duration-200 shrink-0" />
                            <span className="hidden sm:inline font-grotesk font-semibold text-[12px] tracking-wide text-[#a5f3fc] group-hover:text-white transition-colors duration-200">
                                Blog
                            </span>
                            <span className="hidden sm:inline text-[8px] font-bold text-[#34d399] tracking-widest leading-none">new</span>
                        </button>
                    </div>

                    {/* Social links */}
                    <div className="flex items-center gap-1">
                        {portfolioData.socials.map((social) => {
                            const Icon = social.name.includes('GitHub') ? Github :
                                social.name.includes('LinkedIn') ? Linkedin :
                                    social.name.includes('Twitter') ? Twitter : ExternalLink;
                            return (
                                <a
                                    key={social.name}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-[#8a8a85] hover:text-[#f2f1ec] hover:bg-[#1a1a1a] rounded-lg transition-all duration-150"
                                    title={social.name}
                                    data-magnetic
                                >
                                    <Icon size={16} />
                                </a>
                            );
                        })}
                    </div>
                </header>
            )}

            <main className="flex-1 overflow-hidden flex flex-col relative">
                {children}
            </main>
        </div>
    );
};

export default Layout;
