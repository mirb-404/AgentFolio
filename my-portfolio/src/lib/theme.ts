import { useCallback, useEffect, useState } from 'react';
import { withViewTransition } from './viewTransition';
import { coverRadius, type Point } from './dom';

export type ThemePref = 'light' | 'dark';

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

/**
 * Same move as the blog portal: the new theme grows out of the toggle as an
 * expanding circle over a frozen snapshot of the old one. Falls back to an
 * instant swap where View Transitions aren't supported or motion is reduced.
 */
function revealTheme(update: () => void, origin?: Point) {
    const root = document.documentElement;
    const { x, y } = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const radius = coverRadius({ x, y });

    root.classList.add('theme-vt');
    const vt = withViewTransition(update);
    if (!vt) { root.classList.remove('theme-vt'); return; }
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

    const update = useCallback((next: ThemePref, origin?: Point) => {
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
