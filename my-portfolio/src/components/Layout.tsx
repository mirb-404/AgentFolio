import React from 'react';
import { portfolioData } from '../data/portfolioData';
import { Github, Linkedin, Twitter, ExternalLink, Bot } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    onHomeClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onHomeClick }) => {
    return (
        <div className="flex flex-col h-[100dvh] w-full max-w-4xl mx-auto p-4 md:p-6 font-sans">
            <header className="flex justify-between items-center py-4 border-b border-gray-800 mb-4 z-20 relative">
                <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
                    onClick={onHomeClick}
                    title="Back to Home"
                >
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 border border-gray-800 group-hover:border-white transition-colors">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        <span className="text-gray-500 group-hover:text-gray-300 transition-colors">AgentFolio</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
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
                                <Icon size={20} />
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
