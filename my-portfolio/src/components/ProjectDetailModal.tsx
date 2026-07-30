import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, motionTier } from '../lib/motion';
import { X, ExternalLink, Github, Layers, BookOpen } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    category: string;
    description: string;
    link: string;
    docs?: string;
    image?: string;
    /** Optional interior shot for the modal header; falls back to the card image */
    detailImage?: string;
    techStack?: string[];
}

interface ProjectDetailModalProps {
    project: Project;
    onClose: () => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Cinematic open: backdrop fades, panel un-clips from its center line,
    // image settles from a slight zoom, content cascades in with a blur dissolve
    useGSAP(() => {
        if (motionTier() === 'off') return;
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(backdropRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
            .fromTo(modalRef.current,
                { clipPath: 'inset(46% 8% 46% 8% round 24px)', opacity: 0.6 },
                { clipPath: 'inset(0% 0% 0% 0% round 16px)', opacity: 1, duration: 0.55, ease: 'power3.inOut' }, 0.05)
            .fromTo(imageRef.current,
                { scale: 1.18 },
                { scale: 1, duration: 1.1, ease: 'power2.out' }, 0.1)
            .fromTo(headerRef.current ? headerRef.current.children : [],
                { y: 18, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.45, stagger: 0.07 }, 0.35)
            .fromTo(contentRef.current ? contentRef.current.children : [],
                { y: 16, opacity: 0, filter: 'blur(6px)' },
                { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.45, stagger: 0.08, clearProps: 'filter' }, 0.45);
    }, []);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) {
            handleClose();
        }
    };

    const handleClose = () => {
        if (motionTier() === 'off') { onClose(); return; }
        gsap.to(modalRef.current, {
            clipPath: 'inset(44% 6% 44% 6% round 24px)',
            opacity: 0,
            duration: 0.3,
            ease: 'power3.in',
            onComplete: onClose,
        });
        gsap.to(backdropRef.current, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            style={{ perspective: '1000px' }}
        >
            {/* Backdrop */}
            <div
                ref={backdropRef}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleBackdropClick}
            />

            {/* Modal Container */}
            <div
                ref={modalRef}
                className="relative w-full max-w-2xl bg-[#0f0f0f] border border-[#232323] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]
                           shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(34,211,238,0.04)]"
            >
                {/* Header Image Area */}
                <div className="relative h-48 sm:h-64 w-full bg-[#0a0a0a] overflow-hidden shrink-0">
                    <div
                        ref={imageRef}
                        className="absolute inset-0 bg-cover bg-center opacity-70"
                        style={{ backgroundImage: `url(${project.detailImage || project.image || 'https://grainy-gradients.vercel.app/noise.svg'})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/40 to-transparent" />
                    {/* Cyan hairline along the image base */}
                    <div className="absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />

                    <div className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-lg border border-[#2a2a2a]">
                        <Layers className="text-[#22d3ee]" size={18} />
                    </div>

                    <button
                        onClick={handleClose}
                        className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-white/10 backdrop-blur-md rounded-full text-[#f2f1ec] border border-[#2a2a2a] transition-colors z-10"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>

                    <div ref={headerRef} className="absolute bottom-6 left-6 right-6">
                        <span className="px-3 py-1 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/25 text-[#67e8f9] text-xs font-mono uppercase tracking-wider mb-3 inline-block">
                            {project.category}
                        </span>
                        <h2 className="text-3xl font-bold text-[#f2f1ec] tracking-tight">{project.title}</h2>
                    </div>
                </div>

                {/* Content Body */}
                <div ref={contentRef} className="p-6 sm:p-8 flex-1 overflow-y-auto">
                    <div>
                        <h3 className="text-[#f2f1ec] font-semibold mb-2 text-sm font-grotesk tracking-wide">About Project</h3>
                        <p className="text-[#a8a8a2] text-sm leading-relaxed mb-6">
                            {project.description}
                        </p>
                    </div>

                    {/* Dynamic Tech Stack Tags */}
                    {project.techStack && project.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {project.techStack.map((tag, i) => (
                                <span key={i} className="px-3 py-1 bg-[#141414] border border-[#262626] rounded-md text-xs text-[#8a8a85] font-mono hover:border-[#22d3ee]/30 hover:text-[#d6d5cf] transition-colors">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap gap-3 pt-6 border-t border-[#1f1f1f]">
                        <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-magnetic
                            className="flex-1 min-w-40 flex items-center justify-center gap-2 bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0a0a] py-3 rounded-xl font-semibold text-sm transition-colors"
                        >
                            <ExternalLink size={16} />
                            Visit Live Site
                        </a>
                        {project.docs && (
                            <a
                                href={project.docs}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-magnetic
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#141414] border border-[#262626] text-[#8a8a85] hover:text-[#f2f1ec] hover:border-[#22d3ee]/30 rounded-xl font-semibold text-sm transition-colors"
                            >
                                <BookOpen size={16} />
                                Documentation
                            </a>
                        )}
                        <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-magnetic
                            className="flex items-center justify-center px-4 bg-[#141414] border border-[#262626] text-[#8a8a85] hover:text-[#f2f1ec] hover:border-[#2e2e2e] rounded-xl transition-colors"
                            aria-label="View source on GitHub"
                        >
                            <Github size={18} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailModal;
