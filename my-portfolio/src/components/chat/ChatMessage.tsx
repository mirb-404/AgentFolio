import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { portfolioData, type Project } from '../../data/portfolioData';
import ProjectCard from '../widgets/ProjectCard';
import SkillsDisplay from '../widgets/SkillsDisplay';
import ExperienceTimeline from '../widgets/ExperienceTimeline';
import BioCard from '../widgets/BioCard';
import CertificationDisplay from '../widgets/CertificationDisplay';
import InteractiveHobbies from '../widgets/InteractiveHobbies';
import GithubWidget from '../widgets/GithubWidget';
import ResumeCard from '../widgets/ResumeCard';
import { ThoughtSummary, type Trace } from './Thinking';

interface ChatMessageProps {
    role: 'agent' | 'user' | 'tool';
    content: string | React.ReactNode;
    isStreaming?: boolean;
    /** Latest agent reply keeps its action row visible, like ChatGPT */
    isLatest?: boolean;
    trace?: Trace;
    onProjectSelect?: (project: Project) => void;
}

// Hoisted to module scope: fresh component identities each render would force
// ReactMarkdown to rebuild the whole tree on every streaming tick.
// `node` (react-markdown's AST node) is pulled out so it isn't spread onto the DOM
const MD_COMPONENTS: Components = {
    strong: ({ node, ...props }) => <strong className="font-semibold text-fg" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-3 space-y-1.5 marker:text-subtle" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-3 space-y-1.5 marker:text-subtle" {...props} />,
    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
    a: ({ node, ...props }) => <a className="font-medium underline decoration-line-strong underline-offset-[3px] hover:decoration-fg transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
    code: ({ node, ...props }) => <code className="font-mono text-[0.85em] bg-raised rounded-md px-1.5 py-0.5" {...props} />,
    h1: ({ node, ...props }) => <h1 className="text-xl font-semibold mt-6 mb-3 first:mt-0" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mt-6 mb-3 first:mt-0" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-5 mb-2 first:mt-0" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-line-strong pl-4 my-3 text-muted" {...props} />,
};

const MD_PLUGINS = [remarkGfm];
const noop = () => {};

const FENCE = /^\s*(```|~~~)/;
const LIST_OR_QUOTE = /^\s{0,3}(?:[-*+]\s|\d{1,9}[.)]\s|>)/;
const INDENTED = /^\s{2,}\S/;
const TAG = /{{[A-Z_]+}}/g;
// A tag the typewriter is halfway through ("{{PROJ") — hidden until complete
const PARTIAL_TAG = /\{(\{[A-Z_]*\}?)?$/;

// The sideways nudge plays once per visit, on the first project row
let deckNudged = false;

/**
 * Split a markdown run into paragraph-sized blocks. A streaming message then
 * only re-parses its final block on each tick instead of the whole document —
 * every earlier block is byte-identical and memoised away.
 *
 * Fenced code and "loose" lists must survive intact or the rendering changes.
 */
function splitBlocks(text: string): string[] {
    const lines = text.split('\n');
    const blocks: string[] = [];
    let current: string[] = [];
    let fenced = false;

    const currentStartsList = () => {
        const first = current.find(l => l.trim() !== '');
        return !!first && LIST_OR_QUOTE.test(first);
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (FENCE.test(line)) {
            fenced = !fenced;
            current.push(line);
            continue;
        }
        if (fenced || line.trim() !== '') {
            current.push(line);
            continue;
        }

        if (!current.length) continue;

        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        const next = j < lines.length ? lines[j] : null;

        if (next && currentStartsList() && (LIST_OR_QUOTE.test(next) || INDENTED.test(next))) {
            current.push('');
            continue;
        }

        blocks.push(current.join('\n'));
        current = [];
    }

    if (current.length) blocks.push(current.join('\n'));
    return blocks;
}

const MarkdownBlock = React.memo<{ text: string }>(({ text }) => (
    <div className="mb-4 last:mb-0">
        <ReactMarkdown remarkPlugins={MD_PLUGINS} components={MD_COMPONENTS}>
            {text}
        </ReactMarkdown>
    </div>
));
MarkdownBlock.displayName = 'MarkdownBlock';

/**
 * Horizontally scrolling project row. Scrollability is signposted by a peek
 * of the next card, edge fades, arrows that disable at the ends, a thin
 * progress bar, and a one-time nudge.
 */
const ProjectDeck: React.FC<{ projects: Project[]; onSelect: (p: Project) => void }> = React.memo(({ projects, onSelect }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef(0);
    const [edges, setEdges] = useState({ start: true, end: false, scrollable: true });
    const [nudge] = useState(() => {
        if (deckNudged) return false;
        deckNudged = true;
        return true;
    });

    // Scroll position -> edge state (React) + progress thumb (direct DOM, no re-render)
    const update = useCallback(() => {
        rafRef.current = 0;
        const el = trackRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        const next = { start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2, scrollable: max > 2 };
        setEdges(prev => (prev.start === next.start && prev.end === next.end && prev.scrollable === next.scrollable ? prev : next));
        const thumb = thumbRef.current;
        if (thumb && max > 0) {
            const frac = el.clientWidth / el.scrollWidth;
            thumb.style.width = `${frac * 100}%`;
            thumb.style.transform = `translateX(${(el.scrollLeft / max) * ((1 - frac) / frac) * 100}%)`;
        }
    }, []);

    const onScroll = useCallback(() => {
        if (!rafRef.current) rafRef.current = requestAnimationFrame(update);
    }, [update]);

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        const ro = new ResizeObserver(onScroll);
        ro.observe(el);
        return () => { ro.disconnect(); cancelAnimationFrame(rafRef.current); };
    }, [onScroll]);

    const scrollBy = (dir: 1 | -1) => {
        const el = trackRef.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    const arrow = 'size-8 grid place-items-center rounded-full border border-line text-muted hover:text-fg hover:bg-hover disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted transition-[opacity,color,background-color] duration-200';
    const fade = 'pointer-events-none absolute inset-y-0 w-10 sm:w-14 z-10 transition-opacity duration-300';

    return (
        <div className="my-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-subtle">{projects.length} projects</span>
                {edges.scrollable && (
                    <div className="hidden sm:flex gap-1.5">
                        <button onClick={() => scrollBy(-1)} disabled={edges.start} className={arrow} aria-label="Previous projects"><ChevronLeft size={16} /></button>
                        <button onClick={() => scrollBy(1)} disabled={edges.end} className={arrow} aria-label="Next projects"><ChevronRight size={16} /></button>
                    </div>
                )}
            </div>

            <div className="relative -mx-4 sm:mx-0">
                <div className={`${fade} left-0 bg-gradient-to-r from-bg to-transparent ${edges.start ? 'opacity-0' : 'opacity-100'}`} />
                <div className={`${fade} right-0 bg-gradient-to-l from-bg to-transparent ${edges.end || !edges.scrollable ? 'opacity-0' : 'opacity-100'}`} />
                <div
                    ref={trackRef}
                    onScroll={onScroll}
                    tabIndex={0}
                    aria-label="Projects, scroll sideways"
                    className="scrollbar-hide overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-px-4 sm:scroll-px-0 px-4 sm:px-0 rounded-2xl"
                >
                    <div className={`flex gap-3 ${nudge ? 'deck-nudge' : ''}`}>
                        {projects.map((p) => (
                            <div key={p.id} className="snap-start shrink-0 w-[78%] sm:w-[44%]">
                                <ProjectCard project={p} onClick={() => onSelect(p)} />
                            </div>
                        ))}
                        {/* Trailing spacer so the last card can snap fully into view on mobile */}
                        <div className="shrink-0 w-1 sm:hidden" aria-hidden />
                    </div>
                </div>
            </div>

            {edges.scrollable && (
                <div className="mt-3 h-[3px] rounded-full bg-line overflow-hidden" aria-hidden>
                    <div ref={thumbRef} className="h-full rounded-full bg-subtle/70" style={{ width: '40%' }} />
                </div>
            )}
        </div>
    );
});
ProjectDeck.displayName = 'ProjectDeck';

const RichMessageContent: React.FC<{ content: string; streaming?: boolean; onProjectSelect?: (project: Project) => void }> = ({ content, streaming, onProjectSelect }) => {
    const parts = useMemo(() => {
        if (!content) return [];
        const text = streaming ? content.replace(PARTIAL_TAG, '') : content;
        return text.split(/({{PROJECTS}}|{{SKILLS}}|{{RESUME}}|{{EXPERIENCE}}|{{BIO}}|{{CERTIFICATIONS}}|{{HOBBIES}}|{{GITHUB}})/g);
    }, [content, streaming]);

    return (
        <>
            {parts.map((part, index) => {
                switch (part) {
                    case '{{PROJECTS}}':
                        return <div key={index} className="msg-in"><ProjectDeck projects={portfolioData.projects} onSelect={onProjectSelect ?? noop} /></div>;
                    case '{{BIO}}':
                        return <div key={index} className="msg-in my-4"><BioCard /></div>;
                    case '{{EXPERIENCE}}':
                        return <div key={index} className="msg-in my-4"><ExperienceTimeline experiences={portfolioData.experience} /></div>;
                    case '{{SKILLS}}':
                        return <div key={index} className="msg-in my-4"><SkillsDisplay skills={portfolioData.skills} /></div>;
                    case '{{CERTIFICATIONS}}':
                        return <div key={index} className="msg-in my-4"><CertificationDisplay certifications={portfolioData.certifications} /></div>;
                    case '{{HOBBIES}}':
                        return <div key={index} className="msg-in my-4"><InteractiveHobbies hobbies={portfolioData.hobbies} /></div>;
                    case '{{GITHUB}}':
                        return <div key={index} className="msg-in my-4"><GithubWidget /></div>;
                    case '{{RESUME}}':
                        return <div key={index} className="msg-in my-4"><ResumeCard /></div>;
                }
                if (!part.trim()) return null;
                return splitBlocks(part).map((block, bi) => <MarkdownBlock key={`${index}-${bi}`} text={block} />);
            })}
        </>
    );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => {
                navigator.clipboard?.writeText(text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                });
            }}
            className="p-1.5 rounded-lg text-subtle hover:text-fg hover:bg-hover transition-colors"
            aria-label={copied ? 'Copied' : 'Copy'}
            title={copied ? 'Copied' : 'Copy'}
        >
            {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
    );
};

// Memoised so finished messages don't re-render while a new one streams
const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ role, content, isStreaming, isLatest, trace, onProjectSelect }) => {
    if (role === 'user') {
        return (
            <div className="msg-in flex justify-end">
                <div className="max-w-[85%] sm:max-w-[70%] rounded-3xl bg-raised px-5 py-2.5 text-base leading-7 text-fg whitespace-pre-wrap">
                    {content}
                </div>
            </div>
        );
    }

    return <AgentMessage content={content} isStreaming={isStreaming} isLatest={isLatest} trace={trace} onProjectSelect={onProjectSelect} />;
});

const AgentMessage: React.FC<Omit<ChatMessageProps, 'role'>> = ({ content, isStreaming, isLatest, trace, onProjectSelect }) => {
    // Streamed answers reveal themselves by typing in, and they take over the
    // exact spot the thinking indicator held; fading them in too reads as a
    // blink. Only content that arrives whole (forms, errors) eases in.
    const [arrivedWhole] = useState(!isStreaming);
    const copyText = typeof content === 'string' ? content.replace(TAG, '').trim() : '';

    return (
        <div className="group">
            {trace && <ThoughtSummary trace={trace} />}
            <div className={`text-base leading-7 text-fg ${arrivedWhole ? 'msg-in' : ''}`}>
                {typeof content === 'string'
                    ? <RichMessageContent content={content} streaming={isStreaming} onProjectSelect={onProjectSelect} />
                    : content}
            </div>
            {!isStreaming && copyText && (
                <div className={`mt-1.5 -ml-1.5 flex transition-opacity ${isLatest ? '' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100'}`}>
                    <CopyButton text={copyText} />
                </div>
            )}
        </div>
    );
};

export default ChatMessage;
