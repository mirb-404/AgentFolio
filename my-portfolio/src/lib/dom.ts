// Small browser helpers shared across components

export type Point = { x: number; y: number };

/** Hover-capable pointer — autofocus and hover hints are only safe there */
export const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

/** Docked-sidebar layout; mirrors the `desk:` variant in index.css */
export const isDeskLayout = () => window.matchMedia('(min-width: 768px) and (min-height: 500px)').matches;

/** Centre of an element on screen — the origin for circle reveals */
export function centerOf(el: Element): Point {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Radius a circle at `p` needs to cover the whole viewport */
export const coverRadius = ({ x, y }: Point) =>
    Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

/** Run `fn` when the browser is idle (or after a short delay); returns a cancel function */
export function whenIdle(fn: () => void, timeout = 400): () => void {
    if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(fn, { timeout });
        return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(fn, Math.min(timeout, 200));
    return () => clearTimeout(id);
}
