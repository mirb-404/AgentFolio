import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type ThemePref = 'light' | 'dark';
export type RevealOrigin = { x: number; y: number };

const KEY = 'agentfolio-theme';
const META_COLORS = { light: '#f7f7f5', dark: '#212121' };

// Dark is the default; light only when the visitor has chosen it
const readPref = (): ThemePref => {
    try {
        if (localStorage.getItem(KEY) === 'light') return 'light';
    } catch { /* storage blocked */ }
    return 'dark';
};

function apply(pref: ThemePref) {
    const dark = pref === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? META_COLORS.dark : META_COLORS.light);
}

type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type DocWithVT = Document & { startViewTransition?: (update: () => void) => ViewTransition };

/**
 * Same move as the blog portal: the new theme grows out of the toggle as an
 * expanding circle over a frozen snapshot of the old one. Falls back to an
 * instant swap where View Transitions aren't supported or motion is reduced.
 */
function revealTheme(update: () => void, origin?: RevealOrigin) {
    const doc = document as DocWithVT;
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        update();
        return;
    }

    const root = document.documentElement;
    const { x, y } = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    root.classList.add('theme-vt');
    const vt = doc.startViewTransition(() => flushSync(update));
    vt.ready.then(() => {
        root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
        );
    }).catch(() => { /* transition skipped */ });
    vt.finished.finally(() => root.classList.remove('theme-vt'));
}

/**
 * Light / dark, dark by default. index.html applies the stored choice
 * before first paint; this hook keeps it in sync afterwards.
 */
export function useTheme() {
    const [pref, setPref] = useState<ThemePref>(readPref);

    useEffect(() => { apply(pref); }, [pref]);

    const update = useCallback((next: ThemePref, origin?: RevealOrigin) => {
        try {
            localStorage.setItem(KEY, next);
        } catch { /* storage blocked */ }
        revealTheme(() => {
            apply(next);
            setPref(next);
        }, origin);
    }, []);

    return [pref, update] as const;
}
