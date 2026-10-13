import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatReset, type Quota } from '../../lib/quota';
import { motionTier } from '../../lib/motion';
import { whenIdle } from '../../lib/dom';
import { useClickOutside } from '../../lib/hooks';

const SIZE = 22;
const STROKE = 2.5;
const R = (SIZE - STROKE) / 2;
const TWEEN_MS = 1100;

// Last value on screen, shared across instances — the home-screen composer and
// the docked one are separate mounts, and the ring must not restart from zero
let shown = { share: 0, used: 0 };

// Fast start, long soft landing — reads as the ring "settling" into place
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/** A sliver stays visible once anything is spent, so 1% doesn't read as 0 */
const arcFor = (share: number) => (share > 0 ? Math.max(share, 0.03) : 0) * 100;

/**
 * Claude-style usage ring that sits beside the send button. Fills as the
 * visitor spends their token allowance; hover, focus or tap for the numbers.
 *
 * The fill and the token count tween together off one rAF loop that writes
 * straight to the DOM — no React render per frame.
 */
const UsageRing: React.FC<{ quota: Quota }> = ({ quota }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const arcRef = useRef<SVGCircleElement>(null);
    const countRef = useRef<HTMLSpanElement>(null);
    const pctRef = useRef<HTMLSpanElement>(null);

    const share = quota.exhausted ? 1 : Math.min(1, quota.used / quota.limit);
    const tone = quota.exhausted ? 'text-red-500' : share >= 0.8 ? 'text-amber-500' : 'text-subtle';
    const reset = formatReset(quota.resetAt);

    const paint = (s: number, used: number) => {
        arcRef.current?.setAttribute('stroke-dashoffset', String(100 - arcFor(s)));
        if (countRef.current) countRef.current.textContent = Math.round(used).toLocaleString();
        if (pctRef.current) pctRef.current.textContent = String(Math.round(s * 100));
    };

    // Re-apply the current frame after every render (and before first paint,
    // so a remount picks up exactly where the last ring left off)
    useLayoutEffect(() => { paint(shown.share, shown.used); });

    useEffect(() => {
        const to = { share, used: Math.min(quota.used, quota.limit) };
        const from = { ...shown };
        if (from.share === to.share && from.used === to.used) { paint(to.share, to.used); return; }
        if (motionTier() === 'off') { shown = to; paint(to.share, to.used); return; }

        // Wait for a quiet moment so the fill doesn't compete with a big render
        let raf = 0;
        const cancelIdle = whenIdle(() => {
            const start = performance.now();
            const frame = (now: number) => {
                const t = Math.min(1, (now - start) / TWEEN_MS);
                const k = easeOutQuart(t);
                shown = {
                    share: from.share + (to.share - from.share) * k,
                    used: from.used + (to.used - from.used) * k,
                };
                paint(shown.share, shown.used);
                if (t < 1) raf = requestAnimationFrame(frame);
            };
            raf = requestAnimationFrame(frame);
        });
        return () => { cancelIdle(); cancelAnimationFrame(raf); };
    }, [share, quota.used, quota.limit]);

    // Taps outside close the popover on touch screens
    useClickOutside(ref, open, () => setOpen(false));

    const label = quota.exhausted
        ? `Usage limit reached.${reset ? ` Refills in ${reset}.` : ''}`
        : `${Math.round(share * 100)}% of your allowance used: ${quota.used.toLocaleString()} of ${quota.limit.toLocaleString()} tokens.${reset ? ` Resets in ${reset}.` : ''}`;

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
                aria-label={label}
                className={`size-9 grid place-items-center rounded-full hover:bg-hover transition-[color,background-color] duration-500 ${tone}`}
            >
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
                    <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--line-strong)" strokeWidth={STROKE} />
                    <circle
                        ref={arcRef}
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={R}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        // pathLength lets the offset be a plain 0–100 percentage
                        pathLength={100}
                        strokeDasharray="100 100"
                    />
                </svg>
            </button>
            <div
                aria-hidden
                className={`absolute bottom-full right-0 mb-2 w-max max-w-[16rem] rounded-xl border border-line bg-elevated px-3 py-2 text-left shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-[opacity,transform] duration-200 ease-out ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}
            >
                <p className="text-[13px] font-medium text-fg">
                    {quota.exhausted
                        ? quota.scope === 'global' ? "Today's shared limit reached" : 'Usage limit reached'
                        : <><span ref={pctRef} className="tabular-nums" />% of your allowance used</>}
                </p>
                <p className="mt-0.5 text-xs text-subtle">
                    {quota.exhausted
                        ? `Topic shortcuts still work.${reset ? ` Refills in ${reset}.` : ''}`
                        : <><span ref={countRef} className="tabular-nums" /> / {quota.limit.toLocaleString()} tokens{reset ? ` · resets in ${reset}` : ''}</>}
                </p>
            </div>
        </div>
    );
};

export default React.memo(UsageRing);
