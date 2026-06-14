import React, { useRef, useState, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blogPosts, getCategories } from '../data/blogData';
import { Calendar, Clock, ArrowRight, X, Home } from 'lucide-react';

interface BlogListProps {
  onSelectBlog: (blogId: string) => void;
  onClose: () => void;
}

// Fixed color palette cycled by category index — full class names for Tailwind JIT
const PALETTE = [
  { pill: 'bg-violet-100 border-violet-200 text-violet-700', dot: 'bg-violet-500' },
  { pill: 'bg-blue-100 border-blue-200 text-blue-700',       dot: 'bg-blue-500'   },
  { pill: 'bg-emerald-100 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  { pill: 'bg-amber-100 border-amber-200 text-amber-700',    dot: 'bg-amber-500'  },
  { pill: 'bg-rose-100 border-rose-200 text-rose-700',       dot: 'bg-rose-500'   },
  { pill: 'bg-cyan-100 border-cyan-200 text-cyan-700',       dot: 'bg-cyan-500'   },
];

const isNew = (date: string) => Date.now() - new Date(date).getTime() < 30 * 24 * 60 * 60 * 1000;

const namedCategories = getCategories();
const getCatStyle = (cat: string) => {
  const i = namedCategories.indexOf(cat);
  return PALETTE[Math.max(0, i) % PALETTE.length];
};

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const s = getCatStyle(category);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {category}
    </span>
  );
};

const BlogList: React.FC<BlogListProps> = ({ onSelectBlog, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const postsRef     = useRef<HTMLDivElement>(null);

  const allCats   = ['All', ...namedCategories];
  const [selectedCat, setSelectedCat] = useState('All');
  const [displayCat,  setDisplayCat]  = useState('All');

  const filtered = displayCat === 'All' ? blogPosts : blogPosts.filter(p => p.category === displayCat);
  const featured = filtered[0];
  const rest      = filtered.slice(1);

  // One-shot entry animation
  useGSAP(() => {
    const cp = 'opacity,transform';
    gsap.timeline()
      .from('.bl-nav',     { y: -6,  opacity: 0, duration: 0.18, ease: 'power2.out', clearProps: cp })
      .from('.bl-sidebar', { x: -12, opacity: 0, duration: 0.22, ease: 'power2.out', clearProps: cp }, '-=0.08')
      .from('.bl-posts',   { y: 12,  opacity: 0, duration: 0.22, ease: 'power2.out', clearProps: cp }, '-=0.1');
  }, { scope: containerRef });

  const handleCatChange = useCallback((cat: string) => {
    if (cat === selectedCat) return;
    setSelectedCat(cat);
    const posts = postsRef.current;
    if (!posts) { setDisplayCat(cat); return; }
    gsap.to(posts, {
      opacity: 0, y: -8, duration: 0.1, ease: 'power2.in',
      onComplete: () => {
        setDisplayCat(cat);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          gsap.fromTo(posts,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', clearProps: 'opacity,transform' }
          );
        }));
      },
    });
  }, [selectedCat]);

  const fmt  = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'long',  day: 'numeric', year: 'numeric' });
  const fmtS = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-[#f6f6f6] overflow-hidden font-sans">

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <div className="bl-nav bg-white border-b border-[#e8e8e8] shrink-0">
        <div className="px-5 sm:px-8 h-14 flex items-center justify-between gap-4">

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#222] transition-colors shrink-0"
          >
            <Home size={14} className="shrink-0" />
            <span className="text-sm font-medium hidden sm:inline">Home</span>
          </button>

          <h1 className="font-display text-base sm:text-lg font-medium text-[#111] tracking-tight shrink-0">
            Writings
          </h1>

          {/* Mobile category chips */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 justify-end">
            {allCats.map(cat => (
              <button
                key={cat}
                onClick={() => handleCatChange(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 ${
                  selectedCat === cat
                    ? 'bg-[#111] text-white'
                    : 'bg-white border border-[#ddd] text-[#555] hover:border-[#999]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#333] transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Body: Sidebar + Posts ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── Desktop Sidebar ───────────────────────────────────────── */}
        <aside className="bl-sidebar hidden md:flex flex-col w-52 lg:w-56 shrink-0 border-r border-[#e8e8e8] bg-white overflow-y-auto">
          <div className="px-4 pt-7 pb-4">

            <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-[0.2em] mb-3 px-1">
              Categories
            </p>

            <div className="space-y-0.5">
              {allCats.map(cat => {
                const isActive = selectedCat === cat;
                const s = cat !== 'All' ? getCatStyle(cat) : null;
                const count = cat === 'All' ? blogPosts.length : blogPosts.filter(p => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCatChange(cat)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#111] text-white'
                        : 'text-[#555] hover:bg-[#f5f5f5] hover:text-[#111]'
                    }`}
                  >
                    {s && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-white/60' : s.dot}`} />
                    )}
                    <span className="flex-1 truncate">{cat}</span>
                    <span className={`text-[10px] font-mono tabular-nums ${isActive ? 'text-white/50' : 'text-[#ccc]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-[#f0f0f0]">
              <button
                onClick={onClose}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#888] hover:text-[#222] hover:bg-[#f5f5f5] transition-all duration-150"
              >
                <Home size={13} />
                Back to Portfolio
              </button>
            </div>
          </div>
        </aside>

        {/* ── Posts list ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div ref={postsRef} className="bl-posts max-w-2xl mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-4 sm:space-y-5">

            {/* Featured card */}
            {featured && (
              <button
                onClick={() => onSelectBlog(featured.id)}
                className="relative group w-full text-left bg-white border border-[#e5e5e5] hover:border-[#c0c0c0] rounded-2xl p-6 sm:p-8 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
              >
                {isNew(featured.date) && (
                  <span className="absolute top-4 right-4 text-[8px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md">
                    New
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <CategoryBadge category={featured.category} />
                  <span className="text-[10px] font-semibold text-[#bbb] uppercase tracking-[0.18em]">Featured</span>
                </div>

                <h2 className="font-display text-[20px] sm:text-[24px] font-medium text-[#111] leading-tight tracking-tight group-hover:text-blue-700 transition-colors mb-3">
                  {featured.title}
                </h2>

                <p className="text-sm sm:text-[15px] text-[#666] leading-relaxed mb-6">
                  {featured.excerpt}
                </p>

                {featured.tags && featured.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {featured.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-md text-[10px] font-mono text-[#777]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[#f0f0f0]">
                  <div className="flex items-center gap-4 text-[12px] text-[#aaa]">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={11} />
                      <span className="hidden sm:inline">{fmt(featured.date)}</span>
                      <span className="sm:hidden">{fmtS(featured.date)}</span>
                    </span>
                    <span className="flex items-center gap-1.5"><Clock size={11} />{featured.readTime}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700">
                    Read <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                  </span>
                </div>
              </button>
            )}

            {/* More articles */}
            {rest.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-1">
                  <span className="text-[11px] font-bold text-[#bbb] uppercase tracking-widest">More</span>
                  <div className="flex-1 h-px bg-[#e8e8e8]" />
                </div>

                {rest.map(post => (
                  <button
                    key={post.id}
                    onClick={() => onSelectBlog(post.id)}
                    className="relative group w-full text-left flex items-start gap-4 bg-white border border-[#e5e5e5] hover:border-[#c0c0c0] rounded-xl px-4 sm:px-5 py-4 transition-all duration-150 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                  >
                    {isNew(post.date) && (
                      <span className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md">
                        New
                      </span>
                    )}
                    <div className="w-1 self-stretch rounded-full bg-[#e0e0e0] group-hover:bg-blue-500 transition-colors shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <CategoryBadge category={post.category} />
                      <h3 className="font-display text-sm sm:text-[15px] font-medium text-[#111] group-hover:text-blue-700 leading-snug transition-colors mt-2 mb-1.5 line-clamp-2 break-words">
                        {post.title}
                      </h3>
                      <p className="text-xs text-[#888] leading-relaxed line-clamp-2 mb-2 break-words">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-[#bbb]">
                        <span className="flex items-center gap-1"><Calendar size={10} />{fmtS(post.date)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{post.readTime}</span>
                      </div>
                    </div>

                    <ArrowRight size={14} className="shrink-0 text-[#ddd] group-hover:text-blue-500 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white border border-[#e8e8e8] flex items-center justify-center text-[#ccc] text-xl">✦</div>
                <p className="text-sm text-[#bbb]">No articles in this category yet</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogList;
