import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { motionTier } from './motion';

/** Keeps a ref pointed at the latest callback, so listeners never go stale */
function useLatest<T>(value: T) {
    const ref = useRef(value);
    useLayoutEffect(() => { ref.current = value; });
    return ref;
}

/** Calls `onEscape` when Escape is pressed, while `active` */
export function useEscape(onEscape: () => void, active = true) {
    const ref = useLatest(onEscape);
    useEffect(() => {
        if (!active) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ref.current(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, ref]);
}

/** Closes a popover on a pointer press outside `container`, while `open` */
export function useClickOutside(container: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
    const ref = useLatest(onClose);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (!container.current?.contains(e.target as Node)) ref.current();
        };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open, container, ref]);
}

/**
 * For modals: `close()` flags `closing` so the exit animation can play, then
 * calls `onClose` once it's done (instantly under reduced motion). Escape closes too.
 */
export function useAnimatedClose(onClose: () => void, exitMs = 160) {
    const [closing, setClosing] = useState(false);
    const close = useCallback(() => {
        if (motionTier() === 'off') { onClose(); return; }
        setClosing(true);
        window.setTimeout(onClose, exitMs);
    }, [onClose, exitMs]);
    useEscape(close);
    return [closing, close] as const;
}
