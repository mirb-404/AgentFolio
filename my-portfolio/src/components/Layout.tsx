import React from 'react';
import { portfolioData } from '../data/portfolioData';
import { Github, Linkedin, Twitter, ExternalLink, Menu, BookOpen } from 'lucide-react';
import agentfolioLogo from '../assets/05-pill-tag-dark.svg';

interface LayoutProps {
    children: React.ReactNode;
    onHomeClick?: () => void;
    onMenuClick?: () => void;
    onBlogClick?: (origin?: { x: number; y: number }) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onHomeClick, onMenuClick, onBlogClick }) => {
    return (
        <div className="flex flex-col h-[100dvh] w-full max-w-4xl mx-auto px-3 sm:px-5 font-sans">
            <header className="flex justify-between items-center py-3 sm:py-4 border-b border-[#141414] mb-2 sm:mb-4 z-20 relative shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Mobile menu button */}
                    <button
                        onClick={onMenuClick}
                        className="sm:hidden p-1.5 -ml-1 text-[#505050] hover:text-white transition-colors rounded-lg hover:bg-[#141414]"
                        aria-label="Open Menu"
                    >
                        <Menu size={19} />
                    </button>

                    {/* Logo */}
                    <div
                        className="flex items-center cursor-pointer group"
                        onClick={onHomeClick}
                        title="Back to Home"
                    >
                        <img
                            src={agentfolioLogo}
                            alt="AgentFolio"
                            className="h-8 sm:h-9 w-auto transition-opacity duration-200 group-hover:opacity-80"
                        />
                    </div>
                </div>

                {/* Blog Button — rotating white-shine border */}
                <div className="relative flex blog-shine-wrap rounded-[10px] shrink-0 group" data-magnetic>
                    <span className="sm:hidden absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 z-10 pointer-events-none" />
                    <button
                        onClick={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            onBlogClick?.({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                        }}
                        className="blog-shine-inner"
                        title="View Blog"
                    >
                        <BookOpen size={13} className="text-blue-300/90 group-hover:text-white transition-colors duration-200 shrink-0" />
                        <span className="hidden sm:inline font-display font-semibold text-[11px] tracking-wide text-blue-200/90 group-hover:text-white transition-colors duration-200">
                            Blog
                        </span>
                        <span className="hidden sm:inline text-[8px] font-bold text-green-400/90 tracking-widest leading-none">new</span>
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
                                className="p-2 text-[#525252] hover:text-white hover:bg-[#141414] rounded-lg transition-all duration-150"
                                title={social.name}
                                data-magnetic
                            >
                                <Icon size={16} />
                            </a>
                        );
                    })}
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex flex-col relative">
                {children}
            </main>
        </div>
    );
};

export default Layout;
