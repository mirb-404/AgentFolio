import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type ThemePref = 'system' | 'light' | 'dark';
export type RevealOrigin = { x: number; y: number };

const KEY = 'agentfolio-theme';
const META_COLORS = { light: '#ffffff', dark: '#212121' };

const readPref = (): ThemePref => {
    try {
        const v = localStorage.getItem(KEY);
        if (v === 'light' || v === 'dark') return v;
    } catch { /* storage blocked */ }
    return 'system';
};

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

function apply(pref: ThemePref) {
    const dark = pref === 'dark' || (pref === 'system' && systemDark());
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
 * Light / dark / follow-the-system. index.html applies the stored choice
 * before first paint; this hook keeps it in sync afterwards.
 */
export function useTheme() {
    const [pref, setPref] = useState<ThemePref>(readPref);

    useEffect(() => {
        apply(pref);
        if (pref !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => apply('system');
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [pref]);

    const update = useCallback((next: ThemePref, origin?: RevealOrigin) => {
        try {
            if (next === 'system') localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, next);
        } catch { /* storage blocked */ }
        revealTheme(() => {
            apply(next);
            setPref(next);
        }, origin);
    }, []);

    return [pref, update] as const;
}
