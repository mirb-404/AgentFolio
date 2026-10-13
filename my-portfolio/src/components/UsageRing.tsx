import React, { useEffect, useRef, useState } from 'react';
import { formatReset, type Quota } from '../lib/quota';

const SIZE = 22;
const STROKE = 2.5;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/**
 * Claude-style usage ring that sits beside the send button. Fills as the
 * visitor spends their token allowance; hover, focus or tap for the numbers.
 */
const UsageRing: React.FC<{ quota: Quota }> = ({ quota }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const share = quota.exhausted ? 1 : Math.min(1, quota.used / quota.limit);
    const pct = Math.round(share * 100);
    const tone = quota.exhausted ? 'text-red-500' : share >= 0.8 ? 'text-amber-500' : 'text-subtle';
    const reset = formatReset(quota.resetAt);

    // Taps outside close the popover on touch screens
    useEffect(() => {
        if (!open) return;
        const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [open]);

    const headline = quota.exhausted
        ? quota.scope === 'global' ? "Today's shared limit reached" : 'Usage limit reached'
        : `${pct}% of your allowance used`;
    const detail = quota.exhausted
        ? `Topic shortcuts still work.${reset ? ` Refills in ${reset}.` : ''}`
        : `${quota.used.toLocaleString()} / ${quota.limit.toLocaleString()} tokens${reset ? ` · resets in ${reset}` : ''}`;

    return (
        <div
            ref={ref}
            className="relative shrink-0"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                aria-label={`${headline}. ${detail}`}
                className={`size-9 grid place-items-center rounded-full hover:bg-hover transition-colors ${tone}`}
            >
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
                    <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--line-strong)" strokeWidth={STROKE} />
                    <circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={R}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        strokeDasharray={CIRC}
                        // A sliver stays visible once anything is spent, so 1% doesn't read as 0
                        strokeDashoffset={CIRC * (1 - (share > 0 ? Math.max(share, 0.04) : 0))}
                        className="transition-[stroke-dashoffset] duration-700 ease-out"
                    />
                </svg>
            </button>
            <div
                role="status"
                className={`absolute bottom-full right-0 mb-2 w-max max-w-[16rem] rounded-xl border border-line bg-elevated px-3 py-2 text-left shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-[opacity,transform] duration-150 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}
            >
                <p className="text-[13px] font-medium text-fg">{headline}</p>
                <p className="mt-0.5 text-xs text-subtle">{detail}</p>
            </div>
        </div>
    );
};

export default React.memo(UsageRing);
