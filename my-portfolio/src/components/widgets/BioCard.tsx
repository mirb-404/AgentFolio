import React from 'react';
import { MapPin, Briefcase, Github, Linkedin, Twitter, Mail } from 'lucide-react';
import { portfolioData } from '../../data/portfolioData';

const BioCard: React.FC = () => (
    <div className="rounded-2xl border border-line p-5 sm:p-6">
        <div className="flex items-center gap-4 mb-5">
            <img
                src={portfolioData.profileImage}
                alt={portfolioData.name}
                className="size-14 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
                <h2 className="text-lg font-semibold text-fg leading-tight">{portfolioData.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
                    <span className="flex items-center gap-1.5"><Briefcase size={13} className="text-subtle" />{portfolioData.role}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={13} className="text-subtle" />{portfolioData.location}</span>
                </div>
            </div>
        </div>

        <div className="space-y-3 text-[15px] leading-7 text-fg">
            {portfolioData.bio.split('\n').map(p => p.trim()).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
        </div>

        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-line">
            {portfolioData.socials.map((social) => {
                const Icon = social.name.includes('GitHub') ? Github :
                    social.name.includes('LinkedIn') ? Linkedin :
                        social.name.includes('Twitter') ? Twitter :
                            social.name.includes('Email') ? Mail : Briefcase;
                return (
                    <a
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-fg hover:bg-hover transition-colors"
                    >
                        <Icon size={14} />
                        {social.name}
                    </a>
                );
            })}
        </div>
    </div>
);

export default BioCard;
