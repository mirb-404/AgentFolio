import React from 'react';
import { portfolioData } from '../data/portfolioData';
import { Github, Linkedin, Twitter, ExternalLink, Bot, Menu } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    onHomeClick?: () => void;
    onMenuClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onHomeClick, onMenuClick }) => {
    return (
        <div className="flex flex-col h-[100dvh] w-full max-w-4xl mx-auto p-2 sm:p-4 md:p-6 font-sans">
            <header className="flex justify-between items-center py-2 sm:py-4 border-b border-gray-800 mb-2 sm:mb-4 z-20 relative">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={onMenuClick}
                        className="sm:hidden p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Open Menu"
                    >
                        <Menu size={20} className="sm:hidden" />
                        <Menu size={24} className="hidden sm:block" />
                    </button>
                    <div
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
                        onClick={onHomeClick}
                        title="Back to Home"
                    >
                        <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900 border border-gray-800 group-hover:border-white transition-colors">
                            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                            <span className="text-gray-500 group-hover:text-gray-300 transition-colors">AgentFolio</span>
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
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
                                className="text-gray-500 hover:text-white transition-colors"
                                title={social.name}
                            >
                                <Icon size={18} className="sm:hidden" />
                                <Icon size={20} className="hidden sm:block" />
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
