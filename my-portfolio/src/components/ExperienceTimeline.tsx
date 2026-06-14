import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Building2 } from 'lucide-react';
import type { Experience } from '../data/portfolioData';

interface ExperienceTimelineProps {
    experiences: Experience[];
}

const ExperienceCard: React.FC<{ exp: Experience }> = ({ exp }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const bullets = exp.description.split('\n').map(p => p.trim()).filter(Boolean);
    const hasMore = bullets.length > 2;
    const displayedBullets = isExpanded ? bullets : bullets.slice(0, 2);

    return (
        <div className="group bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-5 hover:bg-[#141414] hover:border-[#2a2a2a] transition-all duration-200">

            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                {/* Company logo */}
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden">
                    {exp.logo ? (
                        <img
                            src={exp.logo}
                            alt={exp.company}
                            className="w-7 h-7 object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <Building2 className={`text-gray-400 ${exp.logo ? 'hidden' : ''}`} size={18} />
                </div>

                {/* Role + meta */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-white group-hover:text-[#67e8f9] transition-colors duration-200 leading-snug">
                        {exp.role}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-sm text-[#888]">{exp.company}</span>
                        <span className="w-1 h-1 rounded-full bg-[#2e2e2e] shrink-0" />
                        <span className="font-mono text-[10px] text-[#555] bg-[#0a0a0a] px-2 py-0.5 rounded-md border border-[#1d1d1d]">
                            {exp.period}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bullet points */}
            <ul className="space-y-2">
                {displayedBullets.map((point, idx) => (
                    <li key={idx} className="flex gap-2.5 items-start">
                        <span className="mt-[7px] w-1 h-1 rounded-full bg-[#22d3ee]/50 shrink-0" />
                        <span className="text-sm text-[#787878] leading-relaxed">{point}</span>
                    </li>
                ))}
            </ul>

            {hasMore && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-3.5 flex items-center gap-1.5 text-[11px] font-mono text-[#555550] hover:text-[#67e8f9] transition-colors px-2 py-1 -ml-2 rounded-lg hover:bg-[#1a1a1a]"
                >
                    <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {isExpanded ? 'Show less' : `${bullets.length - 2} more`}
                </button>
            )}
        </div>
    );
};

const ExperienceTimeline: React.FC<ExperienceTimelineProps> = ({ experiences }) => {
    const listRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const items = listRef.current?.children;
        if (items) {
            gsap.from(items, {
                opacity: 0,
                x: -12,
                stagger: 0.12,
                duration: 0.5,
                ease: 'power2.out'
            });
        }
    }, { scope: listRef });

    return (
        <div ref={listRef} className="w-full max-w-2xl mx-auto">
            {experiences.map((exp, i) => (
                <div key={exp.id} className="flex gap-4">

                    {/* Timeline rail — dot + connecting line */}
                    <div className="flex flex-col items-center shrink-0 w-5">
                        {/* Dot aligned with card header */}
                        <div className="mt-[22px] w-2.5 h-2.5 rounded-full bg-[#0a0a0a] border-2 border-[#22d3ee]/50 shrink-0 z-10 shadow-[0_0_8px_rgba(34,211,238,0.25)]" />
                        {/* Vertical line to next card (omit after last) */}
                        {i < experiences.length - 1 && (
                            <div className="w-px flex-1 mt-2 bg-gradient-to-b from-[#22d3ee]/25 to-[#1f1f1f]" />
                        )}
                    </div>

                    {/* Card */}
                    <div className={`flex-1 min-w-0 ${i < experiences.length - 1 ? 'pb-5' : ''}`}>
                        <ExperienceCard exp={exp} />
                    </div>

                </div>
            ))}
        </div>
    );
};

export default ExperienceTimeline;
