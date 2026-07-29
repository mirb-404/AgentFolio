import { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { gsap, motionTier, hasFinePointer, isHidden, beginHeavyMoment } from '../lib/motion';

interface WarpBackgroundProps {
    active: boolean;
}

export interface WarpHandle {
    /** Hyperspeed jump: stars accelerate hard, streaks stretch, chromatic split — then decays. */
    jump: () => void;
}

interface Star {
    x: number;   // normalized 0–1
    y: number;
    z: number;   // 0 = far/center, 1 = close/edge
    px: number;  // previous x (for streak)
    py: number;
}

// Tuning knobs
const BASE_SPEED = 0.0028;       // very gentle drift
const Z_INCREMENT = 0.0022;      // how fast stars "approach"
const TRAIL_ALPHA = 0.10;        // lower = longer trails (slower fade)
const FADE_LERP = 0.055;         // opacity transition speed (~1s to fully fade)
const PARALLAX = 0.07;           // how far the warp centre drifts toward the cursor
const CENTER_LERP = 0.04;        // smoothing for centre movement
// Stars are batched into depth bands: one stroke() per band instead of one per
// star turns ~450 canvas draw calls a frame into 8.
const DEPTH_BANDS = 8;
// The trail effect repaints the whole canvas every frame, so its cost is pure
// fill rate. Streaks are motion blur by definition — rendering below CSS size
// and letting the browser upscale halves that fill with no visible loss.
const RES_SCALE = 0.7;

function resetStar(star: Star, cx: number, cy: number) {
    // Spawn from a tight cluster at the warp centre
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.04;
    star.x = cx + Math.cos(angle) * r;
    star.y = cy + Math.sin(angle) * r;
    star.z = 0;
    star.px = star.x;
    star.py = star.y;
}

const WarpBackground = forwardRef<WarpHandle, WarpBackgroundProps>(({ active }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<Star[]>([]);
    const rafRef = useRef<number>(0);
    const opacityRef = useRef<number>(0);
    const targetRef = useRef<number>(0);
    // Warp centre follows the cursor with a lazy lerp (desktop only)
    const centerRef = useRef({ x: 0.5, y: 0.5 });
    const centerTargetRef = useRef({ x: 0.5, y: 0.5 });
    // 1 = idle drift; tweened up hard during a jump
    const speedRef = useRef({ mult: 1 });
    const activeRef = useRef(false);
    const clearedRef = useRef(true);
    // Loop lifecycle — the rAF only spins while there is something to show
    const aliveRef = useRef(false);
    const runningRef = useRef(false);
    const loopRef = useRef<(() => void) | null>(null);
    const lastOpacityRef = useRef(-1);

    const startLoop = useCallback(() => {
        if (runningRef.current || !aliveRef.current || !loopRef.current) return;
        runningRef.current = true;
        rafRef.current = requestAnimationFrame(loopRef.current);
    }, []);

    useImperativeHandle(ref, () => ({
        jump: () => {
            const tier = motionTier();
            if (tier === 'off') return;
            const peak = tier === 'lite' ? 10 : 22;
            // Force visible for the jump even if the layer is normally hidden
            targetRef.current = 1;
            opacityRef.current = Math.max(opacityRef.current, 0.85);
            startLoop();
            // Ambient layers stand down for the length of the jump
            const releaseHeavy = beginHeavyMoment();
            gsap.timeline({
                onComplete: () => {
                    targetRef.current = activeRef.current ? 1 : 0;
                    releaseHeavy();
                },
            })
                .to(speedRef.current, { mult: peak, duration: 0.7, ease: 'power3.in' })
                .to(speedRef.current, { mult: 1, duration: 1.1, ease: 'power2.out' }, '+=0.25');
        },
    }), [startLoop]);

    // Initialise stars spread across all depths so the canvas isn't empty on mount
    useEffect(() => {
        const numStars = motionTier() === 'full' ? 450 : 240;
        starsRef.current = Array.from({ length: numStars }, () => {
            const star: Star = { x: 0, y: 0, z: 0, px: 0, py: 0 };
            resetStar(star, 0.5, 0.5);
            // Pre-advance so stars are scattered, not all at centre
            const advance = Math.random();
            star.z = advance;
            const angle = Math.atan2(star.y - 0.5, star.x - 0.5);
            const dist = advance * 0.65;
            star.x = 0.5 + Math.cos(angle) * dist;
            star.y = 0.5 + Math.sin(angle) * dist;
            star.px = star.x;
            star.py = star.y;
            return star;
        });
    }, []);

    // Cursor parallax — warp centre leans toward the mouse
    useEffect(() => {
        if (!hasFinePointer() || motionTier() !== 'full') return;
        const onMove = (e: MouseEvent) => {
            const nx = e.clientX / window.innerWidth - 0.5;   // -0.5 … 0.5
            const ny = e.clientY / window.innerHeight - 0.5;
            centerTargetRef.current.x = 0.5 + nx * 2 * PARALLAX;
            centerTargetRef.current.y = 0.5 + ny * 2 * PARALLAX;
        };
        window.addEventListener('mousemove', onMove, { passive: true });
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    // Main animation loop.
    // The loop parks itself once the layer has fully faded out and is woken by
    // jump() / the `active` prop — previously it kept drawing every frame for
    // the entire life of the page, invisible or not.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const fullTier = motionTier() === 'full';

        const bands: Path2D[] = new Array(DEPTH_BANDS);

        const loop = () => {
            if (!aliveRef.current) return;

            if (isHidden()) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            // Smoothly lerp canvas opacity toward target
            const diff = targetRef.current - opacityRef.current;
            if (Math.abs(diff) > 0.002) {
                opacityRef.current += diff * FADE_LERP;
            } else {
                opacityRef.current = targetRef.current;
            }

            // Visibility lives on the element so the layer can sit above the video.
            // Only touch style when it actually moved — every write is a mutation
            // the compositor has to look at.
            const opa = Math.round(opacityRef.current * 1000) / 1000;
            if (opa !== lastOpacityRef.current) {
                canvas.style.opacity = String(opa);
                lastOpacityRef.current = opa;
            }

            // Fully faded: wipe accumulated trails once, then stop the loop
            // entirely until something asks for the warp again.
            if (opacityRef.current < 0.004 && targetRef.current < 0.004) {
                if (!clearedRef.current) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    clearedRef.current = true;
                }
                runningRef.current = false;
                return;
            }
            clearedRef.current = false;

            rafRef.current = requestAnimationFrame(loop);

            const W = canvas.width;
            const H = canvas.height;

            // Ease the warp centre toward its target
            const c = centerRef.current;
            const ct = centerTargetRef.current;
            c.x += (ct.x - c.x) * CENTER_LERP;
            c.y += (ct.y - c.y) * CENTER_LERP;

            const mult = speedRef.current.mult;
            const jumpT = Math.min(Math.max((mult - 1) / 12, 0), 1); // 0 idle → 1 full jump
            const chromatic = jumpT > 0.18 && fullTier;
            const ghostOff = 1.5 + jumpT * 2.5;

            // Fade previous frame — produces the motion-blur streak.
            // During a jump the fade weakens so streaks stretch much longer.
            ctx.globalAlpha = 1;
            ctx.fillStyle = `rgba(10,10,10,${TRAIL_ALPHA * (1 - jumpT * 0.72)})`;
            ctx.fillRect(0, 0, W, H);

            // Path2D has no reset, so the batches are rebuilt each frame —
            // a dozen small allocations against hundreds of draw calls saved.
            for (let b = 0; b < DEPTH_BANDS; b++) bands[b] = new Path2D();
            const cyan = new Path2D();
            const violet = new Path2D();
            let hasGhosts = false;

            for (const s of starsRef.current) {
                s.px = s.x;
                s.py = s.y;

                // Direction from the (moving) warp centre
                const dx = s.x - c.x;
                const dy = s.y - c.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 0.0001;

                // Speed scales with depth — near-zero when distant, faster when close
                const spd = BASE_SPEED * (0.08 + s.z * s.z * 2.2) * mult;
                s.x += (dx / len) * spd;
                s.y += (dy / len) * spd;
                s.z = Math.min(s.z + Z_INCREMENT * mult, 1);

                // Recycle off-screen stars
                if (s.x < -0.02 || s.x > 1.02 || s.y < -0.02 || s.y > 1.02) {
                    resetStar(s, c.x, c.y);
                    continue;
                }

                const x1 = s.px * W;
                const y1 = s.py * H;
                const x2 = s.x * W;
                const y2 = s.y * H;

                // Depth decides both colour and width, so one band index covers both
                const band = Math.min(DEPTH_BANDS - 1, (s.z * DEPTH_BANDS) | 0);
                const p = bands[band];
                p.moveTo(x1, y1);
                p.lineTo(x2, y2);

                // Chromatic aberration during the jump — RGB-split ghost streaks
                if (chromatic) {
                    hasGhosts = true;
                    cyan.moveTo(x1 - ghostOff, y1);
                    cyan.lineTo(x2 - ghostOff, y2);
                    violet.moveTo(x1 + ghostOff, y1);
                    violet.lineTo(x2 + ghostOff, y2);
                }
            }

            if (hasGhosts) {
                ctx.globalAlpha = 0.5 * jumpT;
                ctx.lineWidth = (0.8 + jumpT * 1.4);
                ctx.strokeStyle = 'rgb(34,211,238)';
                ctx.stroke(cyan);
                ctx.strokeStyle = 'rgb(167,139,250)';
                ctx.stroke(violet);
                ctx.globalAlpha = 1;
            }

            for (let b = 0; b < DEPTH_BANDS; b++) {
                // Band centre stands in for every star in it — visually identical
                // at these sizes, one stroke instead of dozens.
                const t = (b + 0.5) / DEPTH_BANDS;
                const cr = Math.round(30 + t * 190);
                const cg = Math.round(34 + t * 211);
                const cb = Math.round(38 + t * 217);
                ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
                ctx.lineWidth = (0.3 + t * t * 2.0) * (1 + jumpT * 0.8);
                ctx.stroke(bands[b]);
            }

            ctx.globalAlpha = 1;
        };

        loopRef.current = loop;
        aliveRef.current = true;
        // Nothing is visible on mount; the first jump() or active=true starts it.
        if (targetRef.current > 0) startLoop();

        return () => {
            aliveRef.current = false;
            runningRef.current = false;
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // Keep canvas pixel-size synced with the viewport
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const sync = () => {
            canvas.width = Math.round(window.innerWidth * RES_SCALE);
            canvas.height = Math.round(window.innerHeight * RES_SCALE);
            clearedRef.current = true; // resizing wipes the backing store
        };
        sync();

        // Resizing reallocates the backing store — coalesce drag bursts
        let timer = 0;
        const onResize = () => {
            clearTimeout(timer);
            timer = window.setTimeout(sync, 120);
        };
        window.addEventListener('resize', onResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // Drive the fade based on active prop
    useEffect(() => {
        activeRef.current = active;
        targetRef.current = active ? 1 : 0;
        // Fading out still needs frames to run; fading in obviously does
        startLoop();
    }, [active, startLoop]);

    // A backgrounded tab parks the loop mid-fade — resume when it comes back
    useEffect(() => {
        const onVisible = () => { if (!document.hidden) startLoop(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [startLoop]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 1,
                pointerEvents: 'none',
                display: 'block',
                opacity: 0,
                // Promoted up front: allocating a full-screen compositor layer is
                // itself a hitch, and it would otherwise land on the exact frame
                // the jump starts.
                transform: 'translateZ(0)',
                willChange: 'opacity',
            }}
        />
    );
});

WarpBackground.displayName = 'WarpBackground';

export default WarpBackground;
