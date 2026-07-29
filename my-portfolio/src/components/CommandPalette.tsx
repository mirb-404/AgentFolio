import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, motionTier } from '../lib/motion';
import { Search, ArrowRight, FolderGit2, Wrench, Briefcase, FileText, CornerDownLeft } from 'lucide-react';

const QUICK_ACTIONS = [
    { label: 'Show me your projects', Icon: FolderGit2 },
    { label: 'What are your skills?', Icon: Wrench },
    { label: 'Tell me about your experience', Icon: Briefcase },
    { label: 'Show me your resume', Icon: FileText },
];

interface CommandPaletteProps {
    /** inline = embedded in the hero; overlay = global ⌘K modal */
    variant?: 'inline' | 'overlay';
    autoFocus?: boolean;
    onSubmit: (text: string) => void;
    onClose?: () => void;
}

/**
 * Raycast-style command palette — the front door to the agent.
 * Typed text submits as a question; arrow keys walk the quick actions.
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ variant = 'inline', autoFocus = false, onSubmit, onClose }) => {
    const [value, setValue] = useState('');
    const [sel, setSel] = useState(-1);
    const panelRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Overlay entrance
    useGSAP(() => {
        if (variant !== 'overlay' || motionTier() === 'off') return;
        gsap.from(panelRef.current, { y: -14, scale: 0.97, opacity: 0, duration: 0.3, ease: 'power3.out' });
        gsap.from(wrapRef.current, { opacity: 0, duration: 0.25, ease: 'power2.out' });
    }, []);

    const fire = (text: string) => {
        if (!text.trim()) return;
        setValue('');
        setSel(-1);
        onSubmit(text);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSel(s => (s + 1) % QUICK_ACTIONS.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSel(s => (s <= 0 ? QUICK_ACTIONS.length - 1 : s - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (sel >= 0) fire(QUICK_ACTIONS[sel].label);
            else fire(value);
        } else if (e.key === 'Escape') {
            onClose?.();
        } else {
            setSel(-1); // typing clears action selection
        }
    };

    const panel = (
        <div
            ref={panelRef}
            /* The inline variant deliberately drops backdrop-blur: it sits on top of
               the animated shine ring and the WebGL field, so the browser would
               re-blur its whole backdrop every frame — for 5% of visible tint. */
            className={`relative w-full max-w-[560px] rounded-2xl border border-[#262626] overflow-hidden text-left
                       shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(34,211,238,0.05)] ${
                           variant === 'overlay' ? 'bg-[#121212]/95 backdrop-blur-xl' : 'bg-[#121212]'
                       }`}
        >
            {/* Accent hairline glow along the top edge */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/60 to-transparent" />

            {/* Input row */}
            <div className="flex items-center gap-3 px-4 sm:px-5 h-[54px]">
                <Search size={16} className="text-[#555550] shrink-0" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoFocus={autoFocus}
                    maxLength={3000}
                    placeholder="Ask anything about me…"
                    className="flex-1 bg-transparent text-[15px] text-[#f2f1ec] placeholder:text-[#555550] outline-none font-sans min-w-0"
                />
                <button
                    type="button"
                    onClick={() => fire(value)}
                    disabled={!value.trim()}
                    aria-label="Send"
                    className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-[#555550] border border-[#262626] bg-[#1a1a1a] rounded-md px-2 py-1
                               enabled:text-[#67e8f9] enabled:border-[#22d3ee]/30 transition-colors"
                >
                    <CornerDownLeft size={10} /> send
                </button>
            </div>

            <div className="h-px bg-[#1f1f1f]" />

            {/* Quick actions */}
            <div className="py-2">
                <p className="px-5 pt-1 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[#454545]">
                    Quick actions
                </p>
                {QUICK_ACTIONS.map((action, i) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={() => fire(action.label)}
                        onMouseEnter={() => setSel(i)}
                        onMouseLeave={() => setSel(-1)}
                        className={`w-full flex items-center gap-3 px-5 py-2.5 text-left text-[13.5px] font-sans transition-colors duration-100 ${
                            sel === i ? 'bg-[#1a1a1a] text-[#f2f1ec]' : 'text-[#8a8a85]'
                        }`}
                    >
                        <action.Icon size={14} className={`shrink-0 transition-colors ${sel === i ? 'text-[#22d3ee]' : 'text-[#555550]'}`} />
                        <span className="flex-1">{action.label}</span>
                        <ArrowRight
                            size={13}
                            className={`shrink-0 transition-all duration-150 ${
                                sel === i ? 'opacity-100 translate-x-0 text-[#22d3ee]' : 'opacity-0 -translate-x-1'
                            }`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );

    if (variant === 'overlay') {
        return (
            <div
                ref={wrapRef}
                className="fixed inset-0 z-[200] flex justify-center items-start pt-[16vh] px-4 bg-black/70 backdrop-blur-sm"
                onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            >
                {panel}
            </div>
        );
    }

    // Inline hero variant gets the rotating glow ring
    return (
        <div className="palette-shine-wrap w-full max-w-[563px]">
            {panel}
        </div>
    );
};

export default React.memo(CommandPalette);
