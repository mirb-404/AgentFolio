import { whenIdle } from './dom';

// Snapshot of the résumé produced by `npm run resume:sync` (scripts/resume-sync.mjs).
// Imported through Vite so every file gets a content hash and can be cached forever.
import pdfUrl from '../assets/resume/resume.pdf?url';
import thumbUrl from '../assets/resume/thumb.png';

const pageModules = import.meta.glob<string>('../assets/resume/page-*.png', { eager: true, import: 'default' });

// Natural pixel size of the rendered pages — lets the viewer reserve space up front
export const PAGE_SIZE = { width: 1587, height: 2245 };

export const resume = {
    pdfUrl,
    thumbUrl,
    pages: Object.entries(pageModules)
        .sort(([a], [b]) => parseInt(a.match(/page-(\d+)/)![1]) - parseInt(b.match(/page-(\d+)/)![1]))
        .map(([, url]) => url),
    fileName: 'Mirang-Bhandari-Resume.pdf',
};

let preloaded = false;

/**
 * Fetch + decode the preview images and warm the PDF in the HTTP cache while
 * the browser is idle, so opening the résumé is instant. ~220 KB total.
 */
export function preloadResume() {
    if (preloaded || typeof window === 'undefined') return;
    preloaded = true;
    const run = () => {
        for (const src of [resume.thumbUrl, ...resume.pages]) {
            const img = new Image();
            img.decoding = 'async';
            img.src = src;
            img.decode?.().catch(() => { /* fine — it's only a warm-up */ });
        }
        fetch(resume.pdfUrl, { priority: 'low' } as RequestInit).catch(() => {});
    };
    whenIdle(run, 4000);
}
