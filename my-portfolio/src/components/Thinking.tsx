import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motionTier } from '../lib/motion';
import Collapse from './Collapse';

export type Trace = { steps: string[]; ms: number };

// Grows from a dot to a full star and back — ping-pong so it never "jumps"
const GLYPHS = ['·', '✢', '✳', '✶', '✻', '✽'];
const FRAMES = [...GLYPHS, ...GLYPHS.slice(1, -1).reverse()];
const TEXT_VS = '︎';

export const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [frame, setFrame] = useState(4);

    useEffect(() => {
        if (motionTier() === 'off') return;
        const id = window.setInterval(() => setFrame(f => (f + 1) % FRAMES.length), 120);
        return () => window.clearInterval(id);
    }, []);

    return (
        <span aria-hidden className={`spinner-glyph text-accent ${className}`}>
            {FRAMES[frame]}{TEXT_VS}
        </span>
    );
};

/** Live state while the agent works: spinner + shimmering step label */
export const ThinkingIndicator: React.FC<{ label: string }> = ({ label }) => (
    <div role="status" aria-live="polite" className="msg-in flex items-center gap-2.5 text-[15px] leading-7">
        <Spinner className="text-[17px]" />
        <span key={label} className="shimmer-text fade-in">{label}</span>
    </div>
);

const stripEllipsis = (s: string) => s.replace(/…$/, '');

/** What's left once the answer starts: a quiet, expandable record of the steps */
export const ThoughtSummary: React.FC<{ trace: Trace }> = ({ trace }) => {
    const [open, setOpen] = useState(false);
    const seconds = Math.max(1, Math.round(trace.ms / 1000));

    // The button row is exactly as tall as the live indicator it replaces
    // (h-7), so the answer starts where "Thinking…" was — no jump
    return (
        <div className="mb-2">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="h-7 inline-flex items-center gap-1 text-sm text-subtle hover:text-fg transition-colors"
            >
                Thought for {seconds}s
                <ChevronRight size={14} className={`transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${open ? 'rotate-90' : ''}`} />
            </button>
            <Collapse open={open}>
                <ol className="mt-1 mb-2 ml-[5px] border-l border-line pl-4 space-y-1.5 text-sm text-muted">
                    {trace.steps.map((s, i) => <li key={i}>{stripEllipsis(s)}</li>)}
                </ol>
            </Collapse>
        </div>
    );
};
