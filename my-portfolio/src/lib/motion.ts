import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(SplitText, Physics2DPlugin, ScrambleTextPlugin, DrawSVGPlugin, CustomEase);

// Signature eases shared across the app
CustomEase.create('agentOut', 'M0,0 C0.22,1.04 0.36,1 1,1');     // slight overshoot settle
CustomEase.create('portalIn', 'M0,0 C0.65,0 0.2,1 1,1');         // slow start, fast bloom

export { gsap, SplitText };

export type MotionTier = 'full' | 'lite' | 'off';

// motionTier() is consulted on every animated mount — every chat message, every
// tool chip, every transition. matchMedia() allocates a fresh MediaQueryList on
// each call, so the queries are resolved once and the answer cached until the
// environment actually changes.
let reduceMq: MediaQueryList | null = null;
let coarseMq: MediaQueryList | null = null;
let fineMq: MediaQueryList | null = null;
let tierCache: MotionTier | null = null;

function ensureQueries() {
    if (reduceMq || typeof window === 'undefined') return;
    reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    coarseMq = window.matchMedia('(pointer: coarse)');
    fineMq = window.matchMedia('(pointer: fine)');
    const invalidate = () => { tierCache = null; };
    reduceMq.addEventListener('change', invalidate);
    coarseMq.addEventListener('change', invalidate);
    fineMq.addEventListener('change', invalidate);
    window.addEventListener('resize', invalidate, { passive: true });
}

/**
 * full — desktop, fine pointer, motion allowed
 * lite — mobile / coarse pointer: shorter durations, no physics, low particle counts
 * off  — prefers-reduced-motion: instant or simple opacity fades only
 */
export function motionTier(): MotionTier {
    if (typeof window === 'undefined') return 'off';
    if (tierCache) return tierCache;
    ensureQueries();
    if (reduceMq!.matches) return (tierCache = 'off');
    if (window.innerWidth < 768 || coarseMq!.matches) return (tierCache = 'lite');
    return (tierCache = 'full');
}

export const hasFinePointer = () => {
    if (typeof window === 'undefined') return false;
    ensureQueries();
    return fineMq!.matches;
};

/** True while the tab is backgrounded — render loops skip work instead of burning frames. */
export const isHidden = () => typeof document !== 'undefined' && document.hidden;

/**
 * Fire a Physics2D particle burst at viewport coordinates.
 * Particles are appended to <body> and self-clean when the tween ends.
 */
export function burstAt(x: number, y: number, opts?: { count?: number; colors?: string[] }) {
    const tier = motionTier();
    if (tier === 'off') return;

    // Each dot becomes its own compositor layer, and the burst fires at the exact
    // moment the world transition is busiest — keep the count modest.
    const count = opts?.count ?? (tier === 'lite' ? 5 : 10);
    const colors = opts?.colors ?? ['#22d3ee', '#67e8f9', '#f2f1ec', '#0ea5e9'];

    const frag = document.createDocumentFragment();
    const dots: HTMLSpanElement[] = [];

    for (let i = 0; i < count; i++) {
        const dot = document.createElement('span');
        const size = 3 + Math.random() * 4;
        dot.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;` +
            `border-radius:9999px;background:${colors[i % colors.length]};pointer-events:none;z-index:9999;` +
            `will-change:transform,opacity;`;
        dots.push(dot);
        frag.appendChild(dot);
    }
    document.body.appendChild(frag);

    gsap.to(dots, {
        duration: 0.9,
        physics2D: {
            velocity: 'random(160, 420)',
            angle: 'random(180, 360)',
            gravity: 900,
        },
        scale: 0,
        opacity: 0,
        ease: 'none',
        stagger: { amount: 0.06 },
        onComplete: () => dots.forEach(d => d.remove()),
    });
}
