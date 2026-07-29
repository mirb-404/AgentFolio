import React, { useEffect, useRef } from 'react';
import { motionTier, isHidden } from '../lib/motion';

const WIDTH = 128;
const HEIGHT = 32;
// The strip is 128px wide; sampling the curve every 4px is indistinguishable
// from every 1px and quarters the path work.
const STEP = 4;

const ThinkingVisualizer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Cap DPR — this is a 128×32 decorative strip, not artwork
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = WIDTH * dpr;
        canvas.height = HEIGHT * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 1.5;

        const tier = motionTier();
        const waves = tier === 'full' ? 3 : 2;
        const frequency = 0.05;

        let time = 0;
        let animationId = 0;

        const paint = () => {
            ctx.clearRect(0, 0, WIDTH, HEIGHT);

            // One gradient per frame, shared by every wave — it only varies with
            // time, not with the wave index.
            const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
            gradient.addColorStop(0, 'rgba(34, 211, 238, 0)');
            gradient.addColorStop(0.5, `rgba(34, 211, 238, ${0.45 + Math.sin(time) * 0.25})`);
            gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
            ctx.strokeStyle = gradient;

            const amp = 5 * Math.sin(time * 0.5);

            for (let i = 0; i < waves; i++) {
                ctx.beginPath();
                ctx.moveTo(0, HEIGHT / 2);
                for (let x = 0; x <= WIDTH; x += STEP) {
                    const y = HEIGHT / 2 +
                        Math.sin(x * frequency + time + i) * amp +
                        Math.cos(x * 0.03 - time) * 2;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        };

        if (tier === 'off') {
            paint();
            return;
        }

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            if (isHidden()) return;
            paint();
            time += 0.15;
        };
        draw();

        return () => cancelAnimationFrame(animationId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-32 h-8"
            style={{ width: `${WIDTH}px`, height: `${HEIGHT}px` }}
        />
    );
};

export default React.memo(ThinkingVisualizer);
