import { flushSync } from 'react-dom';

type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type DocWithVT = Document & { startViewTransition?: (update: () => void) => ViewTransition };

/**
 * Run a state update inside a View Transition so the browser crossfades /
 * morphs between the before and after frames. Falls back to a plain update
 * (and returns null) where unsupported or when the visitor prefers reduced motion.
 */
export function withViewTransition(update: () => void): ViewTransition | null {
    const doc = document as DocWithVT;
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        update();
        return null;
    }
    return doc.startViewTransition(() => flushSync(update));
}
