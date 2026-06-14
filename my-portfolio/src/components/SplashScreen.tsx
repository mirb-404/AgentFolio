import React, { useEffect, useRef } from 'react';
import { gsap } from '../lib/motion';

interface SplashScreenProps {
    onComplete: () => void;
}

/**
 * Fable-style preloader: micro meta labels, a giant eased percentage and a
 * hairline progress bar; the whole screen lifts away when the count lands.
 * Progress tracks font loading with a time-based ramp underneath so it can
 * never stall.
 */
const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const countWrapRef = useRef<HTMLDivElement>(null);
    const countRef = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLSpanElement>(null);
    const metaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (window.innerWidth < 768) { onComplete(); return; }

        let raf = 0;
        let displayed = 0;
        let fontsReady = false;
        let done = false;
        const start = performance.now();

        // preload the exact faces the hero uses so SplitText measures real
        // metrics — otherwise the headline visibly re-flows mid-animation
        const faces = [
            '400 1rem "Clash Display"',
            '500 1rem "Clash Display"',
            '400 1rem Satoshi',
            '500 1rem Satoshi',
            '700 1rem Satoshi',
        ];
        Promise.all([document.fonts.ready, ...faces.map((f) => document.fonts.load(f))])
            .catch(() => { /* missing face — proceed anyway */ })
            .finally(() => { fontsReady = true; });
        // safety: never hold the door past 4s
        const safety = setTimeout(() => { fontsReady = true; }, 4000);

        // meta + count fade in quietly
        const enter = gsap.timeline({ defaults: { ease: 'power2.out' } });
        enter
            .fromTo(metaRef.current, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5 }, 0.1)
            .fromTo(countWrapRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.15);

        const finish = () => {
            if (done) return;
            done = true;
            gsap.to(rootRef.current, {
                yPercent: -100,
                duration: 1.0,
                ease: 'power4.inOut',
                delay: 0.15,
                onComplete,
            });
        };

        const tick = () => {
            if (done) return;
            raf = requestAnimationFrame(tick);

            // time ramp carries progress; the last stretch waits for fonts
            const elapsed = (performance.now() - start) / 1000;
            const target = Math.min(elapsed / 1.4, fontsReady ? 1 : 0.92);

            // eased count — never snaps, sample-style
            displayed += (target * 100 - displayed) * 0.08;
            if (target >= 1 && displayed > 99.2) displayed = 100;

            if (countRef.current) countRef.current.textContent = String(Math.round(displayed));
            if (barRef.current) barRef.current.style.transform = `scaleX(${displayed / 100})`;

            if (displayed >= 100) finish();
        };
        tick();

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(safety);
            enter.kill();
        };
    }, [onComplete]);

    return (
        <div
            ref={rootRef}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-[#0a0a0a]"
            style={{ pointerEvents: 'none' }}
            role="status"
            aria-label="Loading"
        >
            {/* meta labels */}
            <div ref={metaRef} className="flex gap-8 text-[11px] font-mono uppercase tracking-[0.22em] text-[#555550] opacity-0">
                <span>mirang bhandari</span>
                <span>agentfolio — {new Date().getFullYear()}</span>
            </div>

            {/* giant eased count */}
            <div ref={countWrapRef} className="flex items-start text-[#f2f1ec] opacity-0">
                <div
                    ref={countRef}
                    className="font-fustat font-normal text-[clamp(6rem,18vw,13rem)] leading-[0.9] tracking-[-0.04em]"
                >
                    0
                </div>
                <span className="mt-6 text-[clamp(1.4rem,4vw,3rem)] font-fustat text-[#555550]">%</span>
            </div>

            {/* hairline progress bar */}
            <div className="w-[min(42vw,320px)] h-px bg-white/10 overflow-hidden">
                <span
                    ref={barRef}
                    className="block h-full w-full bg-[#f2f1ec] origin-left"
                    style={{ transform: 'scaleX(0)' }}
                />
            </div>
        </div>
    );
};

export default SplashScreen;
