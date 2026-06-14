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

/**
 * full — desktop, fine pointer, motion allowed
 * lite — mobile / coarse pointer: shorter durations, no physics, low particle counts
 * off  — prefers-reduced-motion: instant or simple opacity fades only
 */
export function motionTier(): MotionTier {
    if (typeof window === 'undefined') return 'off';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off';
    if (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches) return 'lite';
    return 'full';
}

export const hasFinePointer = () =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

/**
 * Fire a Physics2D particle burst at viewport coordinates.
 * Particles are appended to <body> and self-clean when the tween ends.
 */
export function burstAt(x: number, y: number, opts?: { count?: number; colors?: string[] }) {
    const tier = motionTier();
    if (tier === 'off') return;

    const count = opts?.count ?? (tier === 'lite' ? 6 : 16);
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
