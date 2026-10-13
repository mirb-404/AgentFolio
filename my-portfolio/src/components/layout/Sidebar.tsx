import React from 'react';
import {
    SquarePen, BookOpen, PanelLeftClose, X, Sun, Moon,
    Github, Linkedin, Twitter, Mail, ExternalLink,
} from 'lucide-react';
import LogoMark from '../ui/LogoMark';
import { portfolioData } from '../../data/portfolioData';
import type { ThemePref } from '../../lib/theme';
import { centerOf, isDeskLayout, type Point } from '../../lib/dom';

interface SidebarProps {
    /** Desktop: docked vs collapsed */
    collapsed: boolean;
    /** Mobile: drawer open */
    mobileOpen: boolean;
    onCollapse: () => void;
    onMobileClose: () => void;
    onNewChat: () => void;
    onPrompt: (prompt: string) => void;
    onBlog: (origin?: Point) => void;
    theme: ThemePref;
    onThemeChange: (t: ThemePref, origin?: Point) => void;
}

// Portfolio sections, presented the way a chat app lists past conversations
const TOPICS: { label: string; prompt: string }[] = [
    { label: 'About me', prompt: 'Tell me about yourself' },
    { label: 'Projects', prompt: 'Show me your projects' },
    { label: 'Work experience', prompt: 'Tell me about your experience' },
    { label: 'Skills & stack', prompt: 'What are your skills?' },
    { label: 'Certifications', prompt: 'Certifications' },
    { label: 'Recent GitHub activity', prompt: 'Recent GitHub Activity' },
    { label: 'Life outside code', prompt: 'My Hobbies' },
    { label: 'Résumé', prompt: 'Show me your resume' },
];

const socialIcon = (name: string) =>
    name.includes('GitHub') ? Github :
        name.includes('LinkedIn') ? Linkedin :
            name.includes('Twitter') ? Twitter :
                name.includes('Email') || name.includes('Mail') ? Mail : ExternalLink;

const row = 'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 desk:py-2 text-[15px] desk:text-sm text-fg hover:bg-hover transition-colors text-left';

const Sidebar: React.FC<SidebarProps> = ({
    collapsed, mobileOpen, onCollapse, onMobileClose, onNewChat, onPrompt, onBlog, theme, onThemeChange,
}) => {
    const isDark = theme === 'dark';
    const ThemeIcon = isDark ? Sun : Moon;
    const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';

    return (
        <>
            {/* Mobile backdrop */}
            <div
                onClick={onMobileClose}
                className={`desk:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />

            <aside
                className={`fixed desk:relative inset-y-0 left-0 z-50 desk:z-auto shrink-0 overflow-hidden bg-panel border-r border-line
                    w-[280px] transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} desk:translate-x-0
                    ${collapsed ? 'desk:w-0 desk:border-r-0' : 'desk:w-[260px]'}`}
                aria-label="Sidebar"
            >
                {/* Fixed inner width so content doesn't reflow while the panel animates */}
                <div className="flex flex-col h-full w-[280px] desk:w-[260px] p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    {/* Brand + collapse */}
                    <div className="flex items-center justify-between h-11 px-1.5 mb-1">
                        <button onClick={onNewChat} className="flex items-center gap-2 rounded-lg px-1 py-1 text-fg" title="AgentFolio — New chat">
                            <LogoMark size={22} />
                            <span className="font-semibold text-[15px] tracking-[-0.02em]">AgentFolio</span>
                        </button>
                        <button
                            onClick={() => (isDeskLayout() ? onCollapse() : onMobileClose())}
                            className="p-2.5 desk:p-2 rounded-lg text-subtle hover:text-fg hover:bg-hover transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X size={18} className="desk:hidden" />
                            <PanelLeftClose size={18} className="hidden desk:block" />
                        </button>
                    </div>

                    <button onClick={onNewChat} className={row}>
                        <SquarePen size={17} className="text-muted" /> New chat
                    </button>
                    <button
                        onClick={(e) => onBlog(centerOf(e.currentTarget))}
                        className={row}
                    >
                        <BookOpen size={17} className="text-muted" /> Blog
                    </button>

                    {/* Topics */}
                    <div className="mt-6 flex-1 min-h-0 overflow-y-auto">
                        <h3 className="px-2.5 pb-1.5 text-xs font-medium text-subtle">Explore</h3>
                        <nav className="flex flex-col">
                            {TOPICS.map(t => (
                                <button key={t.label} onClick={() => onPrompt(t.prompt)} className={`${row} truncate`}>
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Footer — socials, theme, and the "account" row */}
                    <div className="pt-2 border-t border-line">
                        <div className="flex items-center gap-0.5 px-1 py-1">
                            {portfolioData.socials.map(s => {
                                const Icon = socialIcon(s.name);
                                return (
                                    <a
                                        key={s.name}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={s.name}
                                        className="p-2.5 desk:p-2 rounded-lg text-subtle hover:text-fg hover:bg-hover transition-colors"
                                    >
                                        <Icon size={16} />
                                    </a>
                                );
                            })}
                            <button
                                onClick={(e) => onThemeChange(isDark ? 'light' : 'dark', centerOf(e.currentTarget))}
                                title={themeLabel}
                                aria-label={themeLabel}
                                className="ml-auto p-2.5 desk:p-2 rounded-lg text-subtle hover:text-fg hover:bg-hover transition-colors"
                            >
                                <ThemeIcon size={16} />
                            </button>
                        </div>
                        <button onClick={() => onPrompt('Contact me')} className={`${row} py-2.5`}>
                            <img src={portfolioData.profileImage} alt="" className="size-8 rounded-full object-cover shrink-0" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium truncate">{portfolioData.name}</span>
                                <span className="block text-xs text-subtle truncate">Get in touch</span>
                            </span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default React.memo(Sidebar);
