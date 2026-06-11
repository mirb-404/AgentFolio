import { useState, useRef, useCallback, useEffect } from 'react';
import { gsap, motionTier } from './lib/motion';
import Layout from './components/Layout';
import ChatInterface from './components/ChatInterface';
import SplashScreen from './components/SplashScreen';
import WarpBackground, { type WarpHandle } from './components/WarpBackground';
import MagneticCursor from './components/MagneticCursor';
import BlogSection from './components/BlogSection';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

type PortalOrigin = { x: number; y: number };

function App() {
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBlogOpen, setIsBlogOpen] = useState(false);
  const blogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const warpRef = useRef<WarpHandle>(null);
  const portalOriginRef = useRef<PortalOrigin | null>(null);

  const handleStart = useCallback(() => {
    // Hyperspeed jump fires as the hero shatters — one continuous moment
    warpRef.current?.jump();
    setHasStarted(true);
  }, []);

  const handleBlogOpen = useCallback((origin?: PortalOrigin) => {
    portalOriginRef.current = origin ?? null;
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

    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    ) * 1.05;

    gsap.set(el, { opacity: 1, clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` });
    gsap.to(el, {
      clipPath: `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
      duration: tier === 'lite' ? 0.6 : 0.9,
      ease: 'portalIn',
      overwrite: true,
      onComplete: () => { gsap.set(el, { clipPath: 'none' }); },
    });
    // The dark world recedes behind the portal
    if (mainRef.current) {
      gsap.to(mainRef.current, { scale: 0.965, opacity: 0.55, duration: 0.9, ease: 'power2.inOut', overwrite: true });
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
    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    ) * 1.05;

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
    <div className="min-h-[100dvh] bg-black text-white selection:bg-white selection:text-black relative" style={{ zIndex: 1 }}>
      <div ref={mainRef}>
        <WarpBackground ref={warpRef} active={!loading && !hasStarted} />
        {loading ? (
          <SplashScreen onComplete={() => setLoading(false)} />
        ) : (
          <Layout
            onHomeClick={() => { setHasStarted(false); if (isBlogOpen) handleBlogClose(); }}
            onMenuClick={() => setIsSidebarOpen(true)}
            onBlogClick={handleBlogOpen}
          >
            <ChatInterface
              hasStarted={hasStarted}
              onStart={handleStart}
              activePrompt={null}
              onPromptHandled={() => { }}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
            />
          </Layout>
        )}
      </div>

      {isBlogOpen && (
        <div ref={blogRef} className="blog-page-enter fixed inset-0 z-[100] overflow-hidden bg-[#f6f6f6]">
          <BlogSection onClose={handleBlogClose} />
        </div>
      )}

      <MagneticCursor />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
