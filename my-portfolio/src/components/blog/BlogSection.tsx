import React, { useState, useCallback, useRef } from 'react';
import gsap from 'gsap';
import BlogList from './BlogList';
import BlogContent from './BlogContent';
import { blogPosts } from '../../data/blogData';

interface BlogSectionProps {
  onClose: () => void;
}

const BlogSection: React.FC<BlogSectionProps> = ({ onClose }) => {
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const currentIndex = selectedBlogId
    ? blogPosts.findIndex(p => p.id === selectedBlogId)
    : -1;

  const crossfade = useCallback((action: () => void) => {
    const el = wrapperRef.current;
    if (!el) { action(); return; }
    gsap.to(el, {
      opacity: 0, duration: 0.13, ease: 'power2.in',
      onComplete: () => {
        action();
        gsap.to(el, { opacity: 1, duration: 0.2, ease: 'power2.out', clearProps: 'opacity' });
      },
    });
  }, []);

  const handleSelectBlog = useCallback((id: string) => {
    crossfade(() => setSelectedBlogId(id));
  }, [crossfade]);

  const handleBack = useCallback(() => {
    crossfade(() => setSelectedBlogId(null));
  }, [crossfade]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (currentIndex === -1) return;
    const next = direction === 'prev'
      ? (currentIndex === 0 ? blogPosts.length - 1 : currentIndex - 1)
      : (currentIndex === blogPosts.length - 1 ? 0 : currentIndex + 1);
    crossfade(() => setSelectedBlogId(blogPosts[next].id));
  }, [currentIndex, crossfade]);

  return (
    <div ref={wrapperRef} className="w-full h-full">
      {selectedBlogId ? (
        // Keyed so each post mounts fresh: scrolled to the top, progress at zero
        <BlogContent
          key={selectedBlogId}
          blogId={selectedBlogId}
          onBack={handleBack}
          onClose={onClose}
          onNavigate={handleNavigate}
          hasNext={currentIndex < blogPosts.length - 1}
          hasPrev={currentIndex > 0}
        />
      ) : (
        <BlogList onSelectBlog={handleSelectBlog} onClose={onClose} />
      )}
    </div>
  );
};

export default BlogSection;
