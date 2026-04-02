import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Camera, Mountain, BookOpen, Gamepad2, Brain, Github, Star, Coffee, Printer, Music, Telescope, Code2, Cpu, Globe, Rocket, MonitorPlay, Joystick, PenTool, Lightbulb } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export interface HobbyOrInterest {
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    bgImage?: string;
}

interface InteractiveHobbiesProps {
    hobbies: HobbyOrInterest[];
}

const InteractiveHobbies: React.FC<InteractiveHobbiesProps> = React.memo(({ hobbies }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // Prevent re-animation issues during chat streaming by checking if already rendered
        if (containerRef.current?.dataset.animated === "true") return;

        const isMobile = window.innerWidth < 768;

        gsap.from(".interactive-hobby-card", {
            y: isMobile ? 20 : 40,
            opacity: 0,
            rotationX: isMobile ? 0 : 10,
            duration: isMobile ? 0.4 : 0.8,
            stagger: isMobile ? 0 : 0.1, // Disable stagger on mobile
            ease: "power3.out",
            clearProps: "all"
        });

        if (containerRef.current) {
            containerRef.current.dataset.animated = "true";
        }
    }, { scope: containerRef, dependencies: [] });

    // ... GetIcon logic kept the same ...
    const getIcon = (name?: string, props?: LucideProps) => {
        const size = props?.size || 24;
        const className = props?.className || "";
        switch (name?.toLowerCase()) {
            case 'camera': return <Camera size={size} className={className} />;
            case 'mountain': return <Mountain size={size} className={className} />;
            case 'book': return <BookOpen size={size} className={className} />;
            case 'gamepad': return <Gamepad2 size={size} className={className} />;
            case 'brain': return <Brain size={size} className={className} />;
            case 'github': return <Github size={size} className={className} />;
            case 'coffee': return <Coffee size={size} className={className} />;
            case 'printer': return <Printer size={size} className={className} />;
            case 'music': return <Music size={size} className={className} />;
            case 'telescope': return <Telescope size={size} className={className} />;
            case 'code': return <Code2 size={size} className={className} />;
            case 'cpu': return <Cpu size={size} className={className} />;
            case 'globe': return <Globe size={size} className={className} />;
            case 'rocket': return <Rocket size={size} className={className} />;
            case 'monitor': return <MonitorPlay size={size} className={className} />;
            case 'joystick': return <Joystick size={size} className={className} />;
            case 'pen': return <PenTool size={size} className={className} />;
            case 'bulb': return <Lightbulb size={size} className={className} />;
            default: return <Star size={size} className={className} />;
        }
    };

    const isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div ref={containerRef} className="flex flex-col gap-8 w-full max-w-2xl mx-auto my-6 overflow-visible" style={isMobileView ? {} : { perspective: '1000px' }}>

            {/* Hobbies Bento Box */}
            <div className="w-full">
                <div className="flex items-center gap-3 mb-6">
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {hobbies.map((hobby, idx) => {
                        const styleColor = hobby.color || "#8b5cf6"; // Default purple
                        const isLarge = idx === 0 || idx === 3; // Make some cards larger for bento effect

                        return (
                            <div
                                key={idx}
                                className={`interactive-hobby-card group relative overflow-hidden rounded-2xl bg-[#111111] border border-gray-800/50 hover:border-gray-600/50 transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-end p-6 ${isLarge ? 'md:col-span-2 md:aspect-[2.5/1]' : 'min-h-[240px] md:aspect-auto md:h-48'}`}
                                style={{ willChange: 'transform' }}
                            >
                                {/* Optional Background Image Layer */}
                                {hobby.bgImage && (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500 ease-out"
                                        style={{ backgroundImage: `url(${hobby.bgImage})` }}
                                    />
                                )}
                                {/* Background Image Gradient Overlay */}
                                {hobby.bgImage && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-transparent" />
                                )}

                                {/* Animated Ambient Glow Background */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 ease-out"
                                    style={{ background: `radial-gradient(circle at 50% 120%, ${styleColor}, transparent 70%)` }}
                                />

                                {/* Icon Layer */}
                                <div className="absolute top-6 left-6 z-10">
                                    <div
                                        className="p-3 rounded-xl bg-gray-900/90 border border-white/10 group-hover:scale-110 transition-transform duration-300 ease-out shadow-lg"
                                        style={{ color: styleColor }}
                                    >
                                        {getIcon(hobby.icon, { size: 24 })}
                                    </div>
                                </div>

                                {/* Content Layer */}
                                <div className="relative z-20 mt-auto pt-16">
                                    <h4 className="text-lg font-bold text-white mb-2">
                                        {hobby.title}
                                    </h4>

                                    {/* Description reveals smoothly on hover and mobile tap */}
                                    <div className="max-h-0 md:max-h-none opacity-0 md:opacity-100 overflow-hidden group-hover:max-h-40 group-active:max-h-40 group-focus:max-h-40 group-hover:opacity-100 group-active:opacity-100 transition-[max-height,opacity,margin] duration-300 ease-out mt-0 group-hover:mt-2 group-active:mt-2">
                                        <p className="text-sm text-gray-400 line-clamp-4 leading-relaxed pb-2">
                                            {hobby.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div >
    );
});

export default InteractiveHobbies;
