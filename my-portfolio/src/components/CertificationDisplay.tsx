import React, { useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import type { Certification } from '../data/portfolioData';
import Collapse from './Collapse';

interface CertificationDisplayProps {
    certifications: Certification[];
}

const CertificationItem: React.FC<{ cert: Certification }> = ({ cert }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0">
            <div className="size-10 rounded-xl bg-white border border-line flex items-center justify-center shrink-0 overflow-hidden">
                <img src={cert.icon} alt={`${cert.issuer} logo`} className="size-7 object-contain" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="text-[15px] font-medium text-fg">{cert.name}</h3>
                    <span className="text-sm text-subtle tabular-nums">{cert.date}</span>
                </div>
                <p className="text-sm text-muted">{cert.issuer}</p>

                <Collapse open={isExpanded}>
                    <p className="pt-2 text-sm leading-relaxed text-muted">{cert.description}</p>
                </Collapse>

                <div className="mt-1.5 flex items-center gap-4 text-sm">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center gap-1 text-subtle hover:text-fg transition-colors"
                    >
                        {isExpanded ? 'Less' : 'Details'}
                        <ChevronDown size={14} className={`transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {cert.link && (
                        <a
                            href={cert.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-subtle hover:text-fg transition-colors"
                        >
                            Credential <ArrowUpRight size={14} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

const CertificationDisplay: React.FC<CertificationDisplayProps> = ({ certifications }) => (
    <div className="w-full rounded-2xl border border-line px-5 py-4 divide-y divide-line">
        {certifications.map((cert) => <CertificationItem key={cert.id} cert={cert} />)}
    </div>
);

export default CertificationDisplay;
