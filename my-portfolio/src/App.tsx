import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { PanelLeftOpen, SquarePen, Menu } from 'lucide-react';
import { gsap, motionTier } from './lib/motion';
import { useTheme } from './lib/theme';
import { withViewTransition } from './lib/viewTransition';
import { coverRadius, isDeskLayout, type Point } from './lib/dom';
import { preloadResume } from './lib/resume';
import ChatInterface from './components/chat/ChatInterface';
import Sidebar from './components/layout/Sidebar';
import ModelPicker from './components/chat/ModelPicker';
import PoweredBy from './components/layout/PoweredBy';
import type { Tone } from './lib/tone';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const BlogSection = lazy(() => import('./components/blog/BlogSection'));

const iconBtn = 'p-2.5 desk:p-2 rounded-lg text-muted hover:text-fg hover:bg-hover transition-colors';

function App() {
  const [theme, setTheme] = useTheme();
  const [tone, setTone] = useState<Tone>('default');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [isBlogOpen, setIsBlogOpen] = useState(false);

  const blogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const portalOriginRef = useRef<Point | null>(null);

  // Warm the résumé preview while idle so it opens instantly when asked for
  useEffect(preloadResume, []);

  // ⌘K / Ctrl+K — jump to the composer from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('composer')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The composer glides back to the centre as the transcript fades out
  const handleNewChat = useCallback(() => {
    setMobileOpen(false);
    withViewTransition(() => setChatKey(k => k + 1));
  }, []);

  const handlePromptHandled = useCallback(() => setActivePrompt(null), []);

  const handlePrompt = useCallback((prompt: string) => {
    setActivePrompt(prompt);
    setMobileOpen(false);
  }, []);

  // Desktop: un-collapse the docked sidebar. Phones: slide the drawer in.
  const handleBrowseTopics = useCallback(() => {
    if (isDeskLayout()) setCollapsed(false);
    else setMobileOpen(true);
  }, []);

  const handleBlogOpen = useCallback((origin?: Point) => {
    portalOriginRef.current = origin ?? null;
    setMobileOpen(false);
    setIsBlogOpen(true);
  }, []);

  // Blog enters through an expanding clip-path portal from the button that opened it
  useEffect(() => {
    if (!isBlogOpen || !blogRef.current) return;
    const el = blogRef.current;
    const origin = portalOriginRef.current;
    const tier = motionTier();

    if (tier === 'off' || !origin) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out', overwrite: true });
      return;
    }

    const radius = coverRadius(origin) * 1.05;

    gsap.set(el, { opacity: 1, clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` });
    gsap.to(el, {
      clipPath: `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
      duration: tier === 'lite' ? 0.6 : 0.9,
      ease: 'portalIn',
      overwrite: true,
      onComplete: () => { gsap.set(el, { clipPath: 'none' }); },
    });
    if (mainRef.current) {
      gsap.to(mainRef.current, { scale: 0.98, opacity: 0.6, duration: 0.9, ease: 'power2.inOut', overwrite: true });
    }
  }, [isBlogOpen]);

  const handleBlogClose = useCallback(() => {
    const el = blogRef.current;
    if (!el) { setIsBlogOpen(false); return; }
    const origin = portalOriginRef.current;
    const tier = motionTier();

    const restoreMain = () => {
      if (mainRef.current) {
        gsap.to(mainRef.current, {
          scale: 1, opacity: 1,
          duration: 0.5, ease: 'power2.out',
          clearProps: 'opacity,transform',
          overwrite: true,
        });
      }
    };

    if (tier === 'off' || !origin) {
      gsap.to(el, {
        opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: true,
        onComplete: () => setIsBlogOpen(false),
      });
      restoreMain();
      return;
    }

    // Collapse back through the portal it came from
    const radius = coverRadius(origin) * 1.05;

    gsap.set(el, { clipPath: `circle(${radius}px at ${origin.x}px ${origin.y}px)` });
    gsap.to(el, {
      clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`,
      duration: tier === 'lite' ? 0.5 : 0.7,
      ease: 'power3.inOut',
      overwrite: true,
      onComplete: () => setIsBlogOpen(false),
    });
    restoreMain();
  }, []);

  return (
    <>
      <div ref={mainRef} className="flex h-[100dvh] bg-bg text-fg">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCollapse={() => setCollapsed(true)}
          onMobileClose={() => setMobileOpen(false)}
          onNewChat={handleNewChat}
          onPrompt={handlePrompt}
          onBlog={handleBlogOpen}
          theme={theme}
          onThemeChange={setTheme}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <header className="h-14 shrink-0 flex items-center gap-1 px-2 sm:px-3">
            <button onClick={() => setMobileOpen(true)} className={`desk:hidden ${iconBtn}`} aria-label="Open sidebar">
              <Menu size={20} />
            </button>
            {collapsed && (
              <div className="fade-in hidden desk:flex items-center gap-0.5">
                <button onClick={() => setCollapsed(false)} className={iconBtn} aria-label="Open sidebar" title="Open sidebar">
                  <PanelLeftOpen size={19} />
                </button>
                <button onClick={handleNewChat} className={iconBtn} aria-label="New chat" title="New chat">
                  <SquarePen size={19} />
                </button>
              </div>
            )}
            <ModelPicker tone={tone} onChange={setTone} />
            {/* Right corner: Groq badge (all screens), then New chat on phones */}
            <div className="ml-auto flex items-center gap-1">
              <PoweredBy />
              <button onClick={handleNewChat} className={`desk:hidden ${iconBtn}`} aria-label="New chat">
                <SquarePen size={19} />
              </button>
            </div>
          </header>

          <ChatInterface
            key={chatKey}
            tone={tone}
            activePrompt={activePrompt}
            onPromptHandled={handlePromptHandled}
            onBrowseTopics={handleBrowseTopics}
          />
        </main>
      </div>

      {isBlogOpen && (
        <div ref={blogRef} className="blog-page-enter fixed inset-0 z-[100] overflow-hidden bg-[#f6f6f6]">
          <Suspense fallback={null}>
            <BlogSection onClose={handleBlogClose} />
          </Suspense>
        </div>
      )}

      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;
