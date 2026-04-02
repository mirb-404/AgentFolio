import React, { useRef, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { User, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { portfolioData } from '../data/portfolioData';
import ProjectCard from './ProjectCard';
import SkillsDisplay from './SkillsDisplay';
import ExperienceTimeline from './ExperienceTimeline';
import BioCard from './BioCard';
import CertificationDisplay from './CertificationDisplay';
import InteractiveHobbies from './InteractiveHobbies';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const meImg = "/me.webp";
import GithubWidget from './GithubWidget';

interface ChatMessageProps {
    role: 'agent' | 'user' | 'tool';
    content: string | React.ReactNode;
    timestamp?: string;
    onProjectSelect?: (project: any) => void;
}


const ProjectDeck: React.FC<{ projects: typeof portfolioData.projects; onSelect: (p: any) => void }> = ({ projects, onSelect }) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [itemsPerPage, setItemsPerPage] = React.useState(2);

    React.useEffect(() => {
        const handleResize = () => {
            setItemsPerPage(window.innerWidth < 768 ? 1 : 2);
        };
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const maxIndex = Math.max(0, projects.length - itemsPerPage);

    const nextSlide = () => {
        if (currentIndex < maxIndex) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    return (
        <div className="relative w-full max-w-[640px] mx-auto my-6">

            {/* Main Stage - Shows 2 cards (desktop) or 1 (mobile) */}
            <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm relative h-80 sm:h-96">
                <div
                    className="flex transition-transform duration-500 ease-in-out h-full"
                    style={{ transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)` }}
                >
                    {projects.map((p) => (
                        <div
                            key={p.id}
                            className={`shrink-0 p-3 flex items-center justify-center h-full ${itemsPerPage === 1 ? 'w-full' : 'w-1/2'}`}
                        >
                            <div className="w-full h-full transform transition-all duration-300 hover:scale-105">
                                <ProjectCard project={p} onClick={() => onSelect(p)} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Controls */}
            <button
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="absolute left-1 sm:-left-12 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white disabled:opacity-20 hover:text-blue-400 transition-colors z-20 bg-black/60 sm:bg-black/50 backdrop-blur-sm rounded-full shadow-lg"
            >
                <ChevronLeft size={24} className="sm:w-7 sm:h-7" />
            </button>

            <button
                onClick={nextSlide}
                disabled={currentIndex >= maxIndex}
                className="absolute right-1 sm:-right-12 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white disabled:opacity-20 hover:text-blue-400 transition-colors z-20 bg-black/60 sm:bg-black/50 backdrop-blur-sm rounded-full shadow-lg"
            >
                <ChevronRight size={24} className="sm:w-7 sm:h-7" />
            </button>

            {/* Pagination Dots - One dot per slide position */}
            <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-blue-500 w-6' : 'bg-gray-700 hover:bg-gray-500'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

const RichMessageContent: React.FC<{ content: string; onProjectSelect?: (project: any) => void }> = ({ content, onProjectSelect }) => {
    // Memoize the expensive parsing logic
    const parts = useMemo(() => {
        if (!content) return [];
        return content.split(/({{PROJECTS}}|{{SKILLS}}|{{RESUME}}|{{EXPERIENCE}}|{{BIO}}|{{CERTIFICATIONS}}|{{HOBBIES}}|{{GITHUB}})/g);
    }, [content]);

    return (
        <div className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (part === '{{PROJECTS}}') {
                    return (
                        <div key={index} className="mt-6 mb-2">
                            <ProjectDeck projects={portfolioData.projects} onSelect={(p) => onProjectSelect?.(p)} />
                        </div>
                    );
                }
                if (part === '{{BIO}}') {
                    return (
                        <div key={index} className="mt-6 mb-2">
                            <BioCard />
                        </div>
                    );
                }
                if (part === '{{EXPERIENCE}}') {
                    return (
                        <div key={index} className="mt-6 mb-2">
                            <ExperienceTimeline experiences={portfolioData.experience} />
                        </div>
                    );
                }

                if (part === '{{SKILLS}}') {
                    return (
                        <div key={index} className="mt-4 not-prose">
                            <SkillsDisplay skills={portfolioData.skills} />
                        </div>
                    );
                }
                if (part === '{{CERTIFICATIONS}}') {
                    return (
                        <div key={index} className="mt-4 not-prose">
                            <CertificationDisplay certifications={portfolioData.certifications} />
                        </div>
                    );
                }
                if (part === '{{HOBBIES}}') {
                    return (
                        <div key={index} className="w-full">
                            <InteractiveHobbies hobbies={portfolioData.hobbies as any} />
                        </div>
                    );
                }
                if (part === '{{GITHUB}}') {
                    return (
                        <div key={index} className="w-full mt-4">
                            <GithubWidget />
                        </div>
                    );
                }
                if (part === '{{RESUME}}') {
                    return (
                        <div key={index} className="mt-4 not-prose">
                            <a
                                href={portfolioData.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <Download size={20} />
                                Download Resume
                            </a>
                        </div>
                    );
                }
                if (!part.trim()) return null;

                return (
                    <div key={index} className="inline-block w-full">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                strong: ({ node, ...props }: any) => <span className="font-bold text-white" {...props} />,
                                ul: ({ node, ...props }: any) => <ul className="list-disc list-outside ml-4 my-2 space-y-1 text-gray-300" {...props} />,
                                ol: ({ node, ...props }: any) => <ol className="list-decimal list-outside ml-4 my-2 space-y-1 text-gray-300" {...props} />,
                                li: ({ node, ...props }: any) => <li className="pl-1 leading-relaxed text-xs sm:text-sm" {...props} />,
                                p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0 leading-relaxed text-gray-200 text-xs sm:text-sm md:text-[15px]" {...props} />,
                                a: ({ node, ...props }: any) => <a className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium text-xs sm:text-sm" target="_blank" rel="noopener noreferrer" {...props} />,
                                code: ({ node, ...props }: any) => <span className="font-mono text-[10px] sm:text-xs text-yellow-200/90 bg-white/5 px-1 py-0.5 rounded" {...props} />,
                                h1: ({ node, ...props }: any) => <h1 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 mt-4" {...props} />,
                                h2: ({ node, ...props }: any) => <h2 className="text-sm sm:text-base md:text-lg font-bold text-white mb-2 mt-4" {...props} />,
                                h3: ({ node, ...props }: any) => <h3 className="text-sm sm:text-[15px] font-bold text-white mb-1 mt-3" {...props} />,
                                blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-gray-700 pl-4 py-1 my-2 italic text-gray-400 text-xs sm:text-sm" {...props} />,
                            }}
                        >
                            {part}
                        </ReactMarkdown>
                    </div>
                );
            })}
        </div>
    );
};

// Use React.memo for the entire message component to prevent re-renders of old messages during streaming
const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ role, content, onProjectSelect }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.from(containerRef.current, {
            y: 20,
            opacity: 0,
            duration: 0.5,
            ease: "power3.out"
        });
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className={`flex w-full mb-5 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[88%] md:max-w-[76%] gap-2.5 ${role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                    role === 'agent'
                        ? 'ring-1 ring-[#222]'
                        : 'bg-[#181818] border border-[#252525] text-[#525252]'
                }`}>
                    {role === 'agent'
                        ? <img src={meImg} className="w-full h-full object-cover rounded-full" alt="Agent" />
                        : <User size={15} />
                    }
                </div>

                {/* Bubble */}
                <div className={`flex flex-col gap-1 ${role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        role === 'agent'
                            ? 'bg-[#0f0f0f] border border-[#1c1c1c] text-[#d0d0d0] rounded-tl-sm'
                            : 'bg-white text-black rounded-tr-sm font-medium shadow-sm'
                    }`}>
                        {role === 'agent' && typeof content === 'string' ? (
                            <RichMessageContent content={content} onProjectSelect={onProjectSelect} />
                        ) : (
                            content
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
});

export default ChatMessage;
