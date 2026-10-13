import React, { useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import type { Experience } from '../../data/portfolioData';
import Collapse from '../ui/Collapse';

interface ExperienceTimelineProps {
    experiences: Experience[];
}

const ExperienceItem: React.FC<{ exp: Experience; last: boolean }> = ({ exp, last }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const bullets = exp.description.split('\n').map(p => p.trim()).filter(Boolean);
    const hasMore = bullets.length > 2;
    const listClass = 'list-disc pl-5 space-y-1.5 marker:text-subtle text-[15px] leading-relaxed text-fg';

    return (
        <div className="flex gap-4">
            {/* Logo with a rail down to the next role */}
            <div className="flex flex-col items-center shrink-0">
                <div className="size-10 rounded-xl bg-white border border-line flex items-center justify-center overflow-hidden">
                    {exp.logo
                        ? <img src={exp.logo} alt={exp.company} className="size-7 object-contain" />
                        : <Building2 className="text-neutral-400" size={18} />}
                </div>
                {!last && <div className="w-px flex-1 bg-line my-2" />}
            </div>

            <div className={`flex-1 min-w-0 ${last ? '' : 'pb-7'}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="text-[15px] font-medium text-fg">{exp.role}</h3>
                    <span className="text-sm text-subtle tabular-nums">{exp.period}</span>
                </div>
                <div className="text-sm text-muted mb-2.5">{exp.company}</div>

                <ul className={listClass}>
                    {bullets.slice(0, 2).map((point, idx) => <li key={idx} className="pl-1">{point}</li>)}
                </ul>
                {hasMore && (
                    <Collapse open={isExpanded}>
                        <ul className={`${listClass} pt-1.5`}>
                            {bullets.slice(2).map((point, idx) => <li key={idx} className="pl-1">{point}</li>)}
                        </ul>
                    </Collapse>
                )}

                {hasMore && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-2 inline-flex items-center gap-1 text-sm text-subtle hover:text-fg transition-colors"
                    >
                        {isExpanded ? 'Show less' : `${bullets.length - 2} more`}
                        <ChevronDown size={14} className={`transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>
        </div>
    );
};

const ExperienceTimeline: React.FC<ExperienceTimelineProps> = ({ experiences }) => (
    <div className="w-full">
        {experiences.map((exp, i) => (
            <ExperienceItem key={exp.id} exp={exp} last={i === experiences.length - 1} />
        ))}
    </div>
);

export default ExperienceTimeline;
