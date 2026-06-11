import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { gsap, motionTier, hasFinePointer } from '../lib/motion';

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
const FADE_LERP = 0.018;         // opacity transition speed (~1.8s to fully fade)
const PARALLAX = 0.07;           // how far the warp centre drifts toward the cursor
const CENTER_LERP = 0.04;        // smoothing for centre movement

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

    useImperativeHandle(ref, () => ({
        jump: () => {
            const tier = motionTier();
            if (tier === 'off') return;
            const peak = tier === 'lite' ? 10 : 22;
            // Force visible for the jump even if a fade-out already started
            targetRef.current = 1;
            opacityRef.current = Math.max(opacityRef.current, 0.65);
            gsap.timeline()
                .to(speedRef.current, { mult: peak, duration: 0.7, ease: 'power3.in' })
                .to(speedRef.current, { mult: 1, duration: 1.1, ease: 'power2.out' }, '+=0.25');
        },
    }), []);

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

    // Main animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let alive = true;
        const fullTier = motionTier() === 'full';

        const loop = () => {
            if (!alive) return;
            rafRef.current = requestAnimationFrame(loop);

            // Smoothly lerp canvas opacity toward target
            const diff = targetRef.current - opacityRef.current;
            if (Math.abs(diff) > 0.002) {
                opacityRef.current += diff * FADE_LERP;
            } else {
                opacityRef.current = targetRef.current;
            }

            // Nothing to draw while fully faded out
            if (opacityRef.current < 0.004) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

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

            // Fade previous frame — produces the motion-blur streak.
            // During a jump the fade weakens so streaks stretch much longer.
            ctx.globalAlpha = 1;
            ctx.fillStyle = `rgba(8,8,8,${TRAIL_ALPHA * (1 - jumpT * 0.72)})`;
            ctx.fillRect(0, 0, W, H);

            ctx.globalAlpha = opacityRef.current;

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

                // Visual properties keyed to depth
                const t = s.z;                              // 0 = far, 1 = close
                const brightness = Math.round(30 + t * 220);
                const blue = Math.min(brightness + 45, 255);
                const lw = (0.3 + t * t * 2.0) * (1 + jumpT * 0.8);

                const x1 = s.px * W;
                const y1 = s.py * H;
                const x2 = s.x * W;
                const y2 = s.y * H;

                // Chromatic aberration during the jump — RGB-split ghost streaks
                if (chromatic) {
                    const off = 1.5 + jumpT * 2.5;
                    ctx.globalAlpha = opacityRef.current * 0.5 * jumpT;
                    ctx.beginPath();
                    ctx.moveTo(x1 - off, y1);
                    ctx.lineTo(x2 - off, y2);
                    ctx.strokeStyle = `rgb(255,60,80)`;
                    ctx.lineWidth = lw;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(x1 + off, y1);
                    ctx.lineTo(x2 + off, y2);
                    ctx.strokeStyle = `rgb(40,200,255)`;
                    ctx.lineWidth = lw;
                    ctx.stroke();
                    ctx.globalAlpha = opacityRef.current;
                }

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `rgb(${brightness},${brightness + 8},${blue})`;
                ctx.lineWidth = lw;
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
        };

        loop();
        return () => {
            alive = false;
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // Keep canvas pixel-size synced with the viewport
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const sync = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
    }, []);

    // Drive the fade based on active prop
    useEffect(() => {
        targetRef.current = active ? 1 : 0;
    }, [active]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0,
                pointerEvents: 'none',
                display: 'block',
            }}
        />
    );
});

WarpBackground.displayName = 'WarpBackground';

export default WarpBackground;
