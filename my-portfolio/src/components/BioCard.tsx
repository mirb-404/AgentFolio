import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, motionTier } from '../lib/motion';
import { MapPin, Briefcase, Github, Linkedin, Twitter, Mail } from 'lucide-react';
import { portfolioData } from '../data/portfolioData';
const myImage = portfolioData.profileImage;

const BioCard: React.FC = () => {
    const cardRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (motionTier() === 'off') return;
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from(cardRef.current, {
            y: 24, opacity: 0, filter: 'blur(8px)',
            duration: 0.6, clearProps: 'filter',
        })
            .from('.bio-banner', { scale: 1.18, duration: 1.2, ease: 'power2.out' }, 0.05)
            .from('.bio-avatar', { scale: 0.5, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, 0.25)
            .from('.bio-item', {
                y: 14, opacity: 0,
                duration: 0.45, stagger: 0.08,
                clearProps: 'opacity,transform',
            }, 0.35);
    }, { scope: cardRef });

    return (
        <div ref={cardRef} className="max-w-xl mx-auto bg-[#0c0c0c] border border-[#181818] rounded-2xl overflow-hidden mt-4">

            {/* Banner / Cover */}
            <div
                className="bio-banner h-28 relative bg-cover bg-center"
                style={{ backgroundImage: `url(${portfolioData.headerImage})` }}
            >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
                <div className="absolute inset-0 bg-grid-white/[0.04] bg-[length:20px_20px]" />
            </div>

            <div className="px-5 pb-5 relative">
                {/* Profile Image — gradient ring */}
                <div className="bio-avatar relative -mt-14 mb-4">
                    <div className="w-[88px] h-[88px] p-[2px] rounded-2xl bg-gradient-to-br from-[#22d3ee]/70 to-[#0e7490]/40">
                        <div className="w-full h-full rounded-[14px] border border-[#1a1a1a] overflow-hidden bg-[#111]">
                            <img
                                src={myImage}
                                alt={portfolioData.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(portfolioData.name)}&background=random`;
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Header Info */}
                <div className="bio-item mb-5">
                    <h2 className="text-xl font-bold text-white mb-1 tracking-tight">{portfolioData.name}</h2>
                    <div className="text-[#67e8f9]/90 font-medium mb-2 flex items-center gap-1.5 text-sm">
                        <Briefcase size={13} className="text-[#22d3ee]/70" />
                        {portfolioData.role}
                    </div>
                    <div className="text-[#484848] text-xs flex items-center gap-1.5 font-mono">
                        <MapPin size={12} className="text-[#404040]" />
                        {portfolioData.location}
                    </div>
                </div>

                {/* Bio Text */}
                <div className="bio-item text-[#888] text-sm leading-relaxed mb-5 space-y-2">
                    {portfolioData.bio.split('\n').map((paragraph, idx) => {
                        const trimmed = paragraph.trim();
                        if (!trimmed) return null;
                        return <p key={idx}>{trimmed}</p>;
                    })}
                </div>

                {/* Social Links */}
                <div className="bio-item flex flex-wrap gap-2 pt-4 border-t border-[#141414]">
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
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] hover:bg-[#161616] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl text-xs text-[#686868] hover:text-white transition-all duration-150 group"
                            >
                                <Icon size={12} className="text-[#555550] group-hover:text-[#22d3ee] transition-colors" />
                                {social.name}
                            </a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BioCard;
