import React, { useEffect, useState } from 'react';
import { BrainCircuit } from 'lucide-react';

interface SplashScreenProps {
    onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (window.innerWidth < 768) {
            onComplete();
            return;
        }

        const rafId = requestAnimationFrame(() => setVisible(true));
        const exitTimer = setTimeout(() => setExiting(true), 1500);
        const doneTimer = setTimeout(onComplete, 1950);

        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(exitTimer);
            clearTimeout(doneTimer);
        };
    }, [onComplete]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080808]"
            style={{
                opacity: exiting ? 0 : 1,
                transition: 'opacity 0.4s ease-in-out',
                pointerEvents: 'none',
            }}
        >
            <div
                className="flex flex-col items-center gap-5"
                style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'opacity 0.45s ease-out, transform 0.45s ease-out',
                }}
            >
                {/* Icon */}
                <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-[#222] bg-[#0f0f0f]">
                    <BrainCircuit className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>

                {/* Name */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white font-display">
                    AgentFolio
                </h1>

                {/* Divider */}
                <div className="w-10 h-px bg-[#252525]" />

                {/* Subtitle */}
                <p className="text-[11px] sm:text-xs tracking-[0.45em] text-[#3a3a3a] font-mono uppercase">
                    Agentic Portfolio
                </p>
            </div>
        </div>
    );
};

export default SplashScreen;
