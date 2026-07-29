import React, { useRef, useState, useCallback, useEffect } from 'react';
import { getBlogById } from '../data/blogData';
import { ChevronLeft, ChevronRight, ArrowLeft, Calendar, Clock, Home } from 'lucide-react';

interface BlogContentProps {
  blogId: string;
  onBack: () => void;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasNext: boolean;
  hasPrev: boolean;
}

// ── Syntax highlighter ──────────────────────────────────────────────────────
const PY_KEYWORDS = new Set([
  'def','class','import','from','return','if','elif','else','for','while',
  'in','not','and','or','is','True','False','None','async','await','with',
  'as','pass','lambda','yield','try','except','finally','raise','del',
  'global','nonlocal','assert','break','continue',
]);
const JS_KEYWORDS = new Set([
  'const','let','var','function','return','if','else','for','while','in',
  'of','class','extends','import','export','default','from','async','await',
  'new','this','true','false','null','undefined','type','interface',
  'implements','try','catch','finally','throw','break','continue','typeof',
  'instanceof','void','static','get','set','super',
]);

const TOKEN_RE = /(#[^\n]*|\/\/[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_]\w*)/g;

function highlight(code: string, lang: string): React.ReactNode[] {
  const keywords = lang === 'python' ? PY_KEYWORDS : JS_KEYWORDS;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;

  while ((m = TOKEN_RE.exec(code)) !== null) {
    if (m.index > last) nodes.push(code.slice(last, m.index));
    const [full, comment, str, num, word] = m;

    if (comment)  nodes.push(<span key={m.index} style={{ color: '#6a9955' }}>{full}</span>);
    else if (str) nodes.push(<span key={m.index} style={{ color: '#ce9178' }}>{full}</span>);
    else if (num) nodes.push(<span key={m.index} style={{ color: '#b5cea8' }}>{full}</span>);
    else if (word && keywords.has(word))
                  nodes.push(<span key={m.index} style={{ color: '#569cd6' }}>{full}</span>);
    else          nodes.push(full);

    last = m.index + full.length;
  }
  if (last < code.length) nodes.push(code.slice(last));
  return nodes;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <mark key={i} className="font-semibold bg-amber-100 text-amber-900 px-1 py-px rounded-sm not-italic box-decoration-clone">{part.slice(2, -2)}</mark>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-[12px] font-medium bg-blue-100 text-blue-800 rounded px-1.5 py-0.5 break-words box-decoration-clone">{part.slice(1, -1)}</code>;
    return part;
  });
}

// Callout styles — light theme equivalents
const CALLOUT = {
  info:    { icon: 'ℹ',  label: 'Info',    wrap: 'bg-blue-50  border-blue-200',  title: 'text-blue-800',  body: 'text-blue-700' },
  tip:     { icon: '💡', label: 'Tip',     wrap: 'bg-green-50 border-green-200', title: 'text-green-800', body: 'text-green-700' },
  warning: { icon: '⚠',  label: 'Warning', wrap: 'bg-amber-50 border-amber-200', title: 'text-amber-800', body: 'text-amber-700' },
  note:    { icon: '📝', label: 'Note',    wrap: 'bg-[#f8f8f8] border-[#e0e0e0]', title: 'text-[#333]',  body: 'text-[#555]'   },
} as const;

const BlogContent: React.FC<BlogContentProps> = ({
  blogId, onBack, onClose, onNavigate, hasNext, hasPrev,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [lbVisible, setLbVisible] = useState(false);
  const post = getBlogById(blogId);

  useEffect(() => {
    setProgress(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [blogId]);

  const openLightbox = useCallback((url: string, alt: string) => {
    setLightbox({ url, alt });
    requestAnimationFrame(() => setLbVisible(true));
  }, []);

  const closeLightbox = useCallback(() => {
    setLbVisible(false);
    setTimeout(() => setLightbox(null), 300);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox, closeLightbox]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const total = scrollHeight - clientHeight;
      setProgress(total > 0 ? Math.min(100, (scrollTop / total) * 100) : 0);
    }
  }, []);

  if (!post) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f6f6f6]">
        <p className="text-[#aaa] font-sans text-sm">Post not found</p>
      </div>
    );
  }

  // ── Content block renderers ──────────────────────────────────────────────
  const renderContent = () => post.content.map((block, idx) => {
    switch (block.type) {

      // ── Paragraph ───────────────────────────────────────────────────────
      case 'paragraph':
        return (
          <p key={idx} className="text-[16px] sm:text-[17px] text-[#292929] leading-[1.85] font-sans">
            {renderInline(block.text)}
          </p>
        );

      // ── Headings ────────────────────────────────────────────────────────
      case 'heading': {
        if (block.level === 2) return (
          <h2 key={idx} className="font-display text-[20px] sm:text-[24px] font-medium text-[#111] leading-tight tracking-tight mt-12 mb-4 pl-4 border-l-[3px] border-blue-500">
            {block.text}
          </h2>
        );
        if (block.level === 3) return (
          <h3 key={idx} className="font-display text-[17px] sm:text-[19px] font-medium text-[#222] leading-tight tracking-tight mt-9 mb-3 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            {block.text}
          </h3>
        );
        return (
          <h1 key={idx} className="font-display text-[24px] sm:text-[28px] font-medium text-[#111] leading-tight tracking-tight mt-12 mb-4">
            {block.text}
          </h1>
        );
      }

      // ── Code block ──────────────────────────────────────────────────────
      // Stays dark — better readability for code
      case 'code':
        return (
          <div key={idx} className="my-7 rounded-xl overflow-hidden border border-[#ddd] shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]/70" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]/70" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]/70" />
              </div>
              <span className="text-[10px] font-mono text-[#666] uppercase tracking-widest">{block.language}</span>
              <div className="w-14" />
            </div>
            <pre className="bg-[#161616] px-5 py-4 overflow-x-auto">
              <code className="text-[12.5px] sm:text-[13px] font-mono text-[#d4d4d4] leading-relaxed whitespace-pre">
                {highlight(block.content, block.language)}
              </code>
            </pre>
          </div>
        );

      // ── Blockquote ──────────────────────────────────────────────────────
      case 'quote':
        return (
          <blockquote key={idx} className="my-8 relative bg-[#f9f9f9] border border-[#e8e8e8] border-l-[3px] border-l-blue-400 rounded-r-xl px-5 sm:px-6 py-5 overflow-hidden">
            <div className="absolute top-2 right-4 font-serif text-5xl text-[#e0e0e0] leading-none select-none pointer-events-none">
              "
            </div>
            <p className="text-[15px] sm:text-[16px] text-[#555] leading-relaxed italic font-sans pr-8">
              {renderInline(block.text)}
            </p>
            {block.author && (
              <footer className="text-xs text-[#aaa] mt-3 not-italic font-mono">— {block.author}</footer>
            )}
          </blockquote>
        );

      // ── Lists ────────────────────────────────────────────────────────────
      case 'list':
        if (block.ordered) return (
          <ol key={idx} className="my-5 sm:my-6 space-y-3 font-sans">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-3.5 text-[16px] sm:text-[17px] text-[#292929] leading-relaxed">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-bold font-mono flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        );
        return (
          <ul key={idx} className="my-5 sm:my-6 space-y-3 font-sans">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-[16px] sm:text-[17px] text-[#292929] leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-[10px]" />
                <span className="flex-1 min-w-0">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );

      // ── Callout ──────────────────────────────────────────────────────────
      case 'callout': {
        const s = CALLOUT[block.variant];
        return (
          <div key={idx} className={`my-6 sm:my-7 rounded-xl border ${s.wrap} px-4 sm:px-5 py-4`}>
            <p className={`text-[11px] font-bold font-mono uppercase tracking-widest mb-1.5 flex items-center gap-2 ${s.title}`}>
              <span className="text-sm">{s.icon}</span>
              {block.title ?? s.label}
            </p>
            <p className={`text-[14px] sm:text-[15px] leading-relaxed font-sans ${s.body}`}>
              {renderInline(block.text)}
            </p>
          </div>
        );
      }

      // ── Inline image ─────────────────────────────────────────────────────
      case 'image':
        return (
          <figure key={idx} className="my-8 sm:my-10 rounded-xl bg-[#efefef]">
            <img
              src={block.url}
              alt={block.alt}
              loading="lazy"
              decoding="async"
              onClick={() => openLightbox(block.url, block.alt)}
              className="w-full h-auto block rounded-xl border border-[#e5e5e5] shadow-sm cursor-zoom-in transition-opacity duration-200 hover:opacity-90"
            />
            {block.caption && (
              <figcaption className="text-[12px] text-[#aaa] text-center mt-2.5 italic font-sans">{block.caption}</figcaption>
            )}
          </figure>
        );

      // ── Divider ───────────────────────────────────────────────────────────
      case 'divider':
        return (
          <div key={idx} className="my-10 sm:my-12 flex items-center justify-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#e0e0e0]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#ccc]" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#e0e0e0]" />
          </div>
        );

      default: return null;
    }
  });

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f6f6f6] font-sans">

      {/* ── Reading Progress Bar ──────────────────────────────────────── */}
      <div className="h-[3px] shrink-0 bg-[#e8e8e8]">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Navigation Bar ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#e8e8e8] shrink-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

          {/* Left: back to list + home — both clearly visible */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#222] rounded-lg transition-colors text-sm font-medium"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Posts</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#222] rounded-lg transition-colors text-sm font-medium"
            >
              <Home size={13} />
              <span className="hidden sm:inline">Home</span>
            </button>
          </div>

          {/* Breadcrumb */}
          <p className="flex-1 text-[11px] text-[#bbb] font-mono text-center truncate hidden md:block">
            {post.category} › {post.title}
          </p>

          {/* Right: prev / next */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate('prev')}
              disabled={!hasPrev}
              className="flex items-center justify-center w-8 h-8 bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#333] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous article"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => onNavigate('next')}
              disabled={!hasNext}
              className="flex items-center justify-center w-8 h-8 bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#333] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next article"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Article ───────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#f6f6f6]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-16 sm:pb-20">
          <article>

            {/* Category + Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                {post.category}
              </span>
              {post.tags?.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-white border border-[#e0e0e0] rounded-md text-[10px] font-mono text-[#888]">
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="font-display text-[24px] sm:text-[32px] lg:text-[40px] font-medium text-[#111] leading-[1.15] tracking-tight mb-7 break-words">
              {post.title}
            </h1>

            {/* Author + Meta */}
            <div className="flex items-center justify-between py-4 border-y border-[#ebebeb] mb-10 gap-3">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[11px] text-[#111] font-sans uppercase tracking-widest">Written by</span>
                <span className="text-sm text-[#111] font-sans italic font-medium truncate">
                  {post.author?.name ?? 'Mirang Bhandari'}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-[12px] text-[#111] shrink-0">
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} />
                  <span className="hidden sm:inline">
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="sm:hidden">
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </span>
                <span className="text-[#ccc]">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={11} />
                  {post.readTime}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-5 sm:space-y-6">
              {renderContent()}
            </div>

            {/* Footer Nav */}
            <div className="mt-14 pt-8 border-t border-[#e8e8e8] flex items-center justify-between">
              <button
                onClick={() => hasPrev && onNavigate('prev')}
                disabled={!hasPrev}
                className="flex items-center gap-2 px-4 py-2 bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#333] rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                onClick={onBack}
                className="text-[11px] font-semibold text-[#aaa] hover:text-[#333] transition-colors uppercase tracking-widest"
              >
                All Posts
              </button>

              <button
                onClick={() => hasNext && onNavigate('next')}
                disabled={!hasNext}
                className="flex items-center gap-2 px-4 py-2 bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#333] rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

          </article>
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          onClick={closeLightbox}
          className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${lbVisible ? 'bg-black/85 opacity-100' : 'bg-black/0 opacity-0'}`}
          style={{ cursor: 'zoom-out' }}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/25 rounded-full text-white text-xl leading-none transition-colors z-10 select-none"
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.alt}
            onClick={(e) => e.stopPropagation()}
            className={`max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl transition-transform duration-300 cursor-default ${lbVisible ? 'scale-100' : 'scale-90'}`}
          />
        </div>
      )}
    </div>
  );
};

export default BlogContent;
