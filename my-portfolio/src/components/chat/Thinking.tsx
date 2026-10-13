import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Collapse from '../ui/Collapse';

export type Trace = { steps: string[]; ms: number };

const RAYS = Array.from({ length: 8 }, (_, i) => i * 45);
// Tapered petals pointing up from the centre: straight rays reach further than diagonals
const LONG_RAY = 'M12 1.6C13.45 5 13.45 8.7 12 12C10.55 8.7 10.55 5 12 1.6Z';
const SHORT_RAY = 'M12 4C13.2 6.6 13.2 9.4 12 12C10.8 9.4 10.8 6.6 12 4Z';

/**
 * The spark: straight and diagonal petals pulse in opposition — plus, star,
 * cross, star — while the mark turns slowly. Always symmetric, so it reads
 * as one deliberate shape breathing rather than a jitter. SVG, not text
 * glyphs, so it's identical on every OS; animated with CSS transforms only.
 */
export const Spark: React.FC<{ size?: number; animated?: boolean; className?: string }> = ({ size = 16, animated = true, className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden
        className={`shrink-0 overflow-visible ${animated ? 'spark-live' : ''} ${className}`}
    >
        <g className="spark-spin" fill="currentColor">
            {RAYS.map((deg, i) => (
                <g key={deg} transform={`rotate(${deg} 12 12)`}>
                    <path d={i % 2 ? SHORT_RAY : LONG_RAY} className={`spark-ray ${i % 2 ? 'spark-ray-b' : ''}`} />
                </g>
            ))}
            <circle cx="12" cy="12" r="1.5" />
        </g>
    </svg>
);

/** Kept for callers that want the live spinner by name */
export const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => (
    <Spark size={19} className={`text-accent ${className}`} />
);

/** Seconds since mount, ticking once a second */
function useElapsed() {
    const [start] = useState(() => performance.now());
    const [secs, setSecs] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setSecs(Math.floor((performance.now() - start) / 1000)), 1000);
        return () => window.clearInterval(id);
    }, [start]);
    return secs;
}

/**
 * Live state while the agent works: spark + shimmering step label. Each new
 * step slides up into place; a quiet seconds counter appears if it runs long.
 */
export const ThinkingIndicator: React.FC<{ label: string }> = ({ label }) => {
    const secs = useElapsed();
    return (
        <div role="status" aria-live="polite" className="msg-in h-7 flex items-center gap-2.5 text-[15px]">
            <Spinner />
            <span className="relative overflow-hidden">
                <span key={label} className="step-in block shimmer-text">{label}</span>
            </span>
            <span
                aria-hidden
                className={`text-sm text-subtle tabular-nums transition-opacity duration-500 ${secs >= 3 ? 'opacity-100' : 'opacity-0'}`}
            >
                {secs}s
            </span>
        </div>
    );
};

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
                className="h-7 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-fg transition-colors"
            >
                {/* The spinner, at rest — same mark, same spot, so the hand-off reads as continuous */}
                <Spark size={14} animated={false} className="text-accent/80" />
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
