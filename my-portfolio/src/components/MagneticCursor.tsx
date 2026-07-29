import React, { useEffect, useRef } from 'react';
import { gsap, motionTier, hasFinePointer } from '../lib/motion';

/**
 * Desktop-only cursor layer:
 *  - a crisp dot that tracks the pointer tightly
 *  - a soft ring that trails with inertia and grows over interactive elements
 *  - magnetic attraction for any element marked [data-magnetic]
 * Renders nothing on touch devices or with reduced motion.
 */
const MagneticCursor: React.FC = () => {
    const dotRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const enabled = hasFinePointer() && motionTier() === 'full';

    useEffect(() => {
        if (!enabled) return;
        const dot = dotRef.current;
        const ring = ringRef.current;
        if (!dot || !ring) return;

        gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 });

        const dotX = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' });
        const dotY = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' });
        const ringX = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3' });
        const ringY = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3' });

        let revealed = false;
        const onMove = (e: MouseEvent) => {
            if (!revealed) {
                revealed = true;
                gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
                gsap.to([dot, ring], { opacity: 1, duration: 0.25 });
            }
            dotX(e.clientX); dotY(e.clientY);
            ringX(e.clientX); ringY(e.clientY);
        };

        // Ring reacts to anything interactive.
        // Only on an actual change of state: mouseover fires for every element
        // the pointer crosses — and during the world transition, elements slide
        // under a stationary cursor — so tweening unconditionally spawned a fresh
        // tween many times a second for no visible difference.
        let overInteractive: boolean | null = null;
        const onOver = (e: MouseEvent) => {
            const interactive = !!(e.target as HTMLElement).closest(
                'button, a, input, textarea, [role="button"], [data-magnetic]'
            );
            if (interactive === overInteractive) return;
            overInteractive = interactive;
            gsap.to(ring, {
                scale: interactive ? 2 : 1,
                opacity: interactive ? 0.45 : 1,
                duration: 0.32,
                ease: 'power3.out',
                overwrite: 'auto',
            });
        };

        const onDown = () => gsap.to(dot, { scale: 0.55, duration: 0.15, ease: 'power2.out' });
        const onUp = () => gsap.to(dot, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
        const onLeaveWindow = () => { gsap.to([dot, ring], { opacity: 0, duration: 0.25 }); revealed = false; };

        // ---- Magnetic attraction for [data-magnetic] elements ----
        let magnetEl: HTMLElement | null = null;

        const detach = () => {
            if (!magnetEl) return;
            const el = magnetEl;
            magnetEl = null;
            el.removeEventListener('mousemove', onMagnetMove);
            el.removeEventListener('mouseleave', detach);
            gsap.to(el, { x: 0, y: 0, duration: 0.75, ease: 'elastic.out(1, 0.32)', overwrite: true });
        };

        const onMagnetMove = (e: MouseEvent) => {
            if (!magnetEl) return;
            const r = magnetEl.getBoundingClientRect();
            const relX = e.clientX - (r.left + r.width / 2);
            const relY = e.clientY - (r.top + r.height / 2);
            gsap.to(magnetEl, {
                x: relX * 0.32,
                y: relY * 0.32,
                duration: 0.35,
                ease: 'power3.out',
                overwrite: 'auto',
            });
        };

        const onMagnetOver = (e: MouseEvent) => {
            const el = (e.target as HTMLElement).closest('[data-magnetic]') as HTMLElement | null;
            if (!el || el === magnetEl) return;
            detach();
            magnetEl = el;
            el.addEventListener('mousemove', onMagnetMove);
            el.addEventListener('mouseleave', detach);
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        document.addEventListener('mouseover', onOver, { passive: true });
        document.addEventListener('mouseover', onMagnetOver, { passive: true });
        window.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);
        document.documentElement.addEventListener('mouseleave', onLeaveWindow);

        return () => {
            window.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseover', onOver);
            document.removeEventListener('mouseover', onMagnetOver);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            document.documentElement.removeEventListener('mouseleave', onLeaveWindow);
            detach();
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <>
            <div
                ref={dotRef}
                aria-hidden
                className="fixed top-0 left-0 w-[6px] h-[6px] rounded-full bg-white pointer-events-none z-[10001] mix-blend-difference"
            />
            <div
                ref={ringRef}
                aria-hidden
                className="fixed top-0 left-0 w-[34px] h-[34px] rounded-full border border-[#22d3ee]/50 pointer-events-none z-[10000]"
                style={{ boxShadow: '0 0 18px rgba(34,211,238,0.14) inset' }}
            />
        </>
    );
};

export default MagneticCursor;
