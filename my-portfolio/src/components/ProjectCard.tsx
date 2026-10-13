import React from 'react';
import FadeImg from './FadeImg';

interface Project {
    id: string;
    title: string;
    category: string;
    description: string;
    link: string;
    image?: string;
    techStack?: string[];
    isNew?: boolean;
}

interface ProjectCardProps {
    project: Project;
    onClick?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project, onClick }) => (
    <button
        onClick={onClick}
        className="group w-full h-full text-left flex flex-col rounded-2xl border border-line bg-bg overflow-hidden hover:border-line-strong transition-colors"
    >
        <div className="aspect-[16/10] w-full overflow-hidden bg-raised">
            {project.image && (
                <FadeImg
                    src={project.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-[1.03]"
                />
            )}
        </div>
        <div className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-subtle">
                <span className="truncate">{project.category}</span>
                {project.isNew && <span className="shrink-0 rounded-full bg-accent/12 text-accent px-1.5 py-px text-[11px] font-medium">New</span>}
            </div>
            <h3 className="text-[15px] font-medium text-fg">{project.title}</h3>
            <p className="text-sm text-muted leading-relaxed line-clamp-2">{project.description}</p>
        </div>
    </button>
));

export default ProjectCard;
