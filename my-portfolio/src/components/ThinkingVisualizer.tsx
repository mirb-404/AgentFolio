import React, { useEffect, useRef } from 'react';

const ThinkingVisualizer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set dimensions (small strip)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        let time = 0;
        let animationId: number;

        const draw = () => {
            const width = rect.width;
            const height = rect.height;

            ctx.clearRect(0, 0, width, height);

            // Draw multiple waves
            const waves = 3;
            const frequency = 0.05;

            for (let i = 0; i < waves; i++) {
                ctx.beginPath();
                ctx.moveTo(0, height / 2);

                for (let x = 0; x < width; x++) {
                    // Combine sine waves for organic look
                    const y = height / 2 +
                        Math.sin(x * frequency + time + i) * 5 * Math.sin(time * 0.5) +
                        Math.cos(x * 0.03 - time) * 2;

                    ctx.lineTo(x, y);
                }

                // Fade out at edges — cyan thinking waves
                const gradient = ctx.createLinearGradient(0, 0, width, 0);
                gradient.addColorStop(0, "rgba(34, 211, 238, 0)");
                gradient.addColorStop(0.5, `rgba(34, 211, 238, ${0.45 + Math.sin(time) * 0.25})`);
                gradient.addColorStop(1, "rgba(34, 211, 238, 0)");

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            time += 0.15;
            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-32 h-8"
            style={{ width: '128px', height: '32px' }}
        />
    );
};

export default ThinkingVisualizer;
