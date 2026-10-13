import React from 'react';
import { useAnimatedClose } from '../../lib/hooks';
import FadeImg from '../ui/FadeImg';
import { X, ArrowUpRight, BookOpen } from 'lucide-react';
import type { Project } from '../../data/portfolioData';

interface ProjectDetailModalProps {
    project: Project;
    onClose: () => void;
}

const secondary = 'inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-fg hover:bg-hover transition-colors';

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
    const [closing, close] = useAnimatedClose(onClose);

    const image = project.detailImage || project.image;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal aria-label={project.title}>
            <div className={`${closing ? 'fade-out' : 'fade-in'} absolute inset-0 bg-black/50`} onClick={close} />

            <div className={`${closing ? 'pop-out' : 'pop-in'} relative w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden rounded-3xl bg-elevated border border-line shadow-[0_24px_60px_rgba(0,0,0,0.25)]`}>
                <button
                    onClick={close}
                    className="absolute top-3 right-3 z-10 size-9 grid place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                {image && (
                    <div className="aspect-[16/8] w-full shrink-0 bg-raised overflow-hidden">
                        <FadeImg src={image} alt="" className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="p-6 sm:p-7 overflow-y-auto">
                    <div className="text-sm text-subtle mb-1">{project.category}</div>
                    <h2 className="text-2xl font-semibold tracking-[-0.01em] text-fg mb-3">{project.title}</h2>
                    <p className="text-[15px] leading-7 text-muted mb-5">{project.description}</p>

                    {project.techStack && project.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-6">
                            {project.techStack.map((tag) => (
                                <span key={tag} className="rounded-full bg-raised px-3 py-1 text-sm text-fg">{tag}</span>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-fg text-bg px-4 py-2.5 text-sm font-medium hover:opacity-85 transition-opacity"
                        >
                            Visit project <ArrowUpRight size={16} />
                        </a>
                        {project.docs && (
                            <a href={project.docs} target="_blank" rel="noopener noreferrer" className={secondary}>
                                <BookOpen size={16} /> Docs
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailModal;
