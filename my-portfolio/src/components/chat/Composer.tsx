import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isHidden } from '../../lib/motion';
import { canHover } from '../../lib/dom';
import { ArrowUp, Square } from 'lucide-react';
import UsageRing from './UsageRing';
import type { Quota } from '../../lib/quota';
import { getPredefinedResponse } from '../../lib/cannedAnswers';
import { MAX_QUESTION_LENGTH } from '../../lib/quota';

interface ComposerProps {
    onSend: (text: string) => void;
    onStop: () => void;
    busy: boolean;
    autoFocus?: boolean;
    quota?: Quota | null;
}

const MAX_HEIGHT = 200;

// Shown one at a time in the empty composer, so visitors learn what they can ask
const EXAMPLES = [
    "What's your tech stack?",
    'Show me your projects',
    'Where have you worked?',
    'Show me your résumé',
    'Any certifications?',
    'What are you building on GitHub?',
    'What do you do outside of code?',
    'How can I get in touch?',
];
const ROTATE_MS = 3500;

/**
 * The composer owns its draft text — keeping it in ChatInterface would
 * re-render the whole transcript on every keystroke.
 */
const Composer: React.FC<ComposerProps> = ({ onSend, onStop, busy, autoFocus, quota }) => {
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);
    // `turn` remounts the two hint layers so their roll animations replay each swap
    const [{ hint, prev, turn }, setRoll] = useState({ hint: 0, prev: -1, turn: 0 });
    const ref = useRef<HTMLTextAreaElement>(null);
    const empty = value === '';
    // Same rules the chat uses, so this is exactly what will happen on send
    const free = value.trim() !== '' && getPredefinedResponse(value) !== null;

    // Roll to the next example — outgoing and incoming overlap, so there's no blank beat.
    // Paused while typing, and while the tab is in the background.
    useEffect(() => {
        if (!empty) return;
        const tick = window.setInterval(() => {
            if (isHidden()) return;
            setRoll(r => ({ hint: (r.hint + 1) % EXAMPLES.length, prev: r.hint, turn: r.turn + 1 }));
        }, ROTATE_MS);
        return () => window.clearInterval(tick);
    }, [empty]);

    // Grow with the text, up to a cap, then scroll
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    }, [value]);

    const submit = () => {
        if (busy || !value.trim()) return;
        onSend(value);
        setValue('');
    };

    return (
        <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            onClick={() => ref.current?.focus()}
            className="vt-composer w-full flex items-end gap-1 rounded-[28px] bg-composer border border-line dark:border-transparent shadow-[0_1px_6px_rgba(0,0,0,0.05)] pl-5 pr-2.5 py-2.5 cursor-text"
        >
            <div className="relative flex-1 min-w-0">
                {/* Animated stand-in for the placeholder — a native one can't fade */}
                {empty && (
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 py-1.5 text-base leading-6 text-subtle">
                        <span className="relative h-6 flex-1 min-w-0 overflow-hidden">
                            {turn > 0 && prev >= 0 && (
                                <span key={`out-${turn}`} className="hint-out absolute inset-0 truncate">Try “{EXAMPLES[prev]}”</span>
                            )}
                            <span key={turn} className={`${turn > 0 ? 'hint-in ' : ''}absolute inset-0 truncate`}>Try “{EXAMPLES[hint]}”</span>
                        </span>
                        {canHover && focused && (
                            <kbd className="shrink-0 rounded border border-line px-1.5 text-[11px] leading-[18px] font-sans text-subtle">Tab</kbd>
                        )}
                    </div>
                )}
                <textarea
                    id="composer"
                    ref={ref}
                    rows={1}
                    maxLength={MAX_QUESTION_LENGTH}
                    value={value}
                    autoFocus={autoFocus}
                    onChange={(e) => setValue(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={(e) => {
                        // Tab takes the example on show; with text in the box it moves focus as usual
                        if (e.key === 'Tab' && !e.shiftKey && empty) {
                            e.preventDefault();
                            setValue(EXAMPLES[hint]);
                            return;
                        }
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    aria-label="Message: ask about projects, skills, experience, or anything else"
                    className="relative block w-full resize-none bg-transparent outline-none text-base leading-6 py-1.5 text-fg placeholder:text-subtle"
                    style={{ maxHeight: MAX_HEIGHT }}
                />
            </div>
            <span
                title="Answered instantly from Mirang's profile, so it doesn't use your AI allowance"
                aria-hidden={!free}
                className={`h-9 shrink-0 flex items-center transition-opacity duration-200 ${free ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <span className="rounded-full border border-line px-2 py-0.5 text-xs text-subtle">Free</span>
            </span>
            {quota && <UsageRing quota={quota} />}
            {/* One button, two icons crossfading — Send ⇄ Stop never jumps */}
            <button
                type={busy ? 'button' : 'submit'}
                onClick={busy ? (e) => { e.preventDefault(); onStop(); } : undefined}
                disabled={!busy && !value.trim()}
                aria-label={busy ? 'Stop generating' : 'Send message'}
                className="relative size-9 shrink-0 rounded-full bg-fg text-bg grid place-items-center hover:opacity-80 disabled:opacity-20 disabled:cursor-default transition-opacity"
            >
                <ArrowUp size={18} strokeWidth={2.25} className={`absolute transition-[opacity,transform] duration-200 ${busy ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`} />
                <Square size={12} fill="currentColor" className={`absolute transition-[opacity,transform] duration-200 ${busy ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
            </button>
        </form>
    );
};

export default React.memo(Composer);
