import { flushSync } from 'react-dom';

type DocWithVT = Document & { startViewTransition?: (update: () => void) => unknown };

/**
 * Run a state update inside a View Transition so the browser crossfades /
 * morphs between the before and after frames. Falls back to a plain update
 * where unsupported or when the visitor prefers reduced motion.
 */
export function withViewTransition(update: () => void) {
    const doc = document as DocWithVT;
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        update();
        return;
    }
    doc.startViewTransition(() => flushSync(update));
}
