import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

// Slow start, fast bloom — the blog's clip-path portal
CustomEase.create('portalIn', 'M0,0 C0.65,0 0.2,1 1,1');

export { gsap };

export type MotionTier = 'full' | 'lite' | 'off';

let reduceMq: MediaQueryList | null = null;
let coarseMq: MediaQueryList | null = null;

/**
 * full — desktop, fine pointer, motion allowed
 * lite — mobile / coarse pointer: shorter durations
 * off  — prefers-reduced-motion: instant or simple opacity fades only
 */
export function motionTier(): MotionTier {
    if (typeof window === 'undefined') return 'off';
    reduceMq ??= window.matchMedia('(prefers-reduced-motion: reduce)');
    coarseMq ??= window.matchMedia('(pointer: coarse)');
    if (reduceMq.matches) return 'off';
    if (window.innerWidth < 768 || coarseMq.matches) return 'lite';
    return 'full';
}

/** True while the tab is backgrounded — render loops skip work instead of burning frames. */
export const isHidden = () => typeof document !== 'undefined' && document.hidden;
