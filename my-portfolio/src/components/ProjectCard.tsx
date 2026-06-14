import React from 'react';
import { ArrowUpRight } from 'lucide-react';


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

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project, onClick }) => {
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [rotation, setRotation] = React.useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = React.useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg rotation
        const rotateY = ((x - centerX) / centerX) * 10;

        setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setRotation({ x: 0, y: 0 });
    };
    return (
        <div
            className="perspective-1000 h-full w-full shrink-0 cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
        >
            <div
                ref={cardRef}
                className="group relative h-full w-full rounded-xl transition-all duration-200 ease-out"
                style={{
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* Main Content Container - Image Background */}
                <div className="absolute inset-0 bg-[#0f0f0f] rounded-xl overflow-hidden border border-[#232323]">

                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                        style={{ backgroundImage: `url(${project.image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b'})` }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 w-full p-4 sm:p-5 flex flex-col items-start translate-z-20">
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 mb-1 sm:mb-2 text-[8px] sm:text-[10px] md:text-xs font-bold tracking-wider text-[#67e8f9] bg-[#22d3ee]/10 border border-[#22d3ee]/25 rounded uppercase backdrop-blur-md">
                            {project.category}
                        </span>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight mb-1 group-hover:text-[#67e8f9] transition-colors">
                            {project.title}
                        </h3>
                        <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 line-clamp-2 mb-1 sm:mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                            {project.description}
                        </p>
                    </div>

                    {/* Top Right Arrow and New Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        {project.isNew && (
                            <div className="px-2 py-0.5 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-full">
                                <span className="text-[9px] font-semibold text-red-400 uppercase tracking-widest">New</span>
                            </div>
                        )}
                        <div className="p-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full text-white/70 group-hover:text-[#0a0a0a] group-hover:bg-[#22d3ee] group-hover:border-[#22d3ee] transition-all duration-300">
                            <ArrowUpRight size={16} />
                        </div>
                    </div>
                </div>

                {/* Holographic Border Glow */}
                <div
                    className={`absolute -inset-[1px] bg-gradient-to-tr from-[#22d3ee]/0 via-[#22d3ee]/40 to-[#67e8f9]/0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none ${isHovered ? 'opacity-100' : ''}`}
                    style={{ transform: 'translateZ(-1px)' }}
                />
            </div>
        </div>
    );
});

export default ProjectCard;
