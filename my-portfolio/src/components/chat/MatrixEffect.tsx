import React, { useEffect, useRef } from 'react';

interface MatrixEffectProps {
    onExit: () => void;
}

const MatrixEffect: React.FC<MatrixEffectProps> = ({ onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set full screen
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const chars = "XYZABC0123456789";
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops: number[] = [];

        // Initialize drops
        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }

        let animationId: number;

        const draw = () => {
            // Semi-transparent black to create trail effect
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#0F0"; // Matrix Green
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }

            animationId = requestAnimationFrame(draw);
        };

        draw();

        // Handle resize
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Re-calc columns if needed, but simple reset is fine for now
        };

        window.addEventListener('resize', handleResize);

        // Escape to exit
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onExit();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onExit]);

    return (
        <div className="fixed inset-0 z-50 bg-black cursor-pointer" onClick={onExit}>
            <canvas ref={canvasRef} className="block w-full h-full" />
            <div className="absolute top-4 right-4 text-green-500 font-mono text-sm opacity-50">
                Press ESC or Click to Exit
            </div>
        </div>
    );
};

export default MatrixEffect;
