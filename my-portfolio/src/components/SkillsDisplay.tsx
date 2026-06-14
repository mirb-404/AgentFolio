import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Code, Cpu, Globe, Wrench } from 'lucide-react';

export interface SkillCategory {
    title: string;
    icon: string;
    skills: string[];
}

interface SkillsDisplayProps {
    skills: SkillCategory[];
}

const SkillsDisplay: React.FC<SkillsDisplayProps> = React.memo(({ skills }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.from(".skill-section", {
            y: 18,
            opacity: 0,
            duration: 0.45,
            stagger: 0.08,
            ease: "power2.out"
        });
        // Pills pop in individually behind their sections
        gsap.from(".skill-pill", {
            scale: 0.8,
            opacity: 0,
            duration: 0.35,
            stagger: { amount: 0.5 },
            ease: "back.out(2)",
            delay: 0.15,
            clearProps: "all",
        });
    }, { scope: containerRef, dependencies: [] });

    const getIcon = (name: string) => {
        switch (name) {
            case 'code': return <Code size={16} />;
            case 'cpu': return <Cpu size={16} />;
            case 'globe': return <Globe size={16} />;
            case 'tool': return <Wrench size={16} />;
            default: return <Code size={16} />;
        }
    };

    return (
        <div ref={containerRef} className="flex flex-col gap-5 sm:gap-7 w-full">
            {skills.map((category, idx) => (
                <div key={idx} className="skill-section">
                    <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
                        <span className="p-1.5 bg-[#141414] rounded-lg text-[#22d3ee] border border-[#232323]">
                            {getIcon(category.icon)}
                        </span>
                        <h4 className="font-grotesk font-semibold text-[12px] sm:text-[13px] tracking-wider uppercase text-[#a8a8a2]">
                            {category.title}
                        </h4>
                        <span className="flex-1 h-px bg-gradient-to-r from-[#232323] to-transparent" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {category.skills.map((skill, sIdx) => (
                            <span
                                key={sIdx}
                                className="skill-pill px-3 py-1 sm:px-3.5 sm:py-1.5 bg-[#0f0f0f] border border-[#232323] rounded-full text-xs sm:text-[13px] font-medium text-[#8a8a85] hover:border-[#22d3ee]/35 hover:text-[#f2f1ec] hover:bg-[#141414] transition-all duration-150 cursor-default"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
});

export default SkillsDisplay;
