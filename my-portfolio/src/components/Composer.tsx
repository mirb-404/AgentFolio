import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ComposerProps {
    onSend: (text: string) => void;
    onStop: () => void;
    busy: boolean;
    autoFocus?: boolean;
    placeholder?: string;
}

const MAX_HEIGHT = 200;

/**
 * The composer owns its draft text — keeping it in ChatInterface would
 * re-render the whole transcript on every keystroke.
 */
const Composer: React.FC<ComposerProps> = ({ onSend, onStop, busy, autoFocus, placeholder = 'Ask about projects, skills, experience…' }) => {
    const [value, setValue] = useState('');
    const ref = useRef<HTMLTextAreaElement>(null);

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
            className="vt-composer w-full flex items-end gap-2 rounded-[28px] bg-composer border border-line dark:border-transparent shadow-[0_1px_6px_rgba(0,0,0,0.05)] pl-5 pr-2.5 py-2.5 cursor-text"
        >
            <textarea
                id="composer"
                ref={ref}
                rows={1}
                value={value}
                autoFocus={autoFocus}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submit();
                    }
                }}
                placeholder={placeholder}
                aria-label="Message"
                className="flex-1 resize-none bg-transparent outline-none text-base leading-6 py-1.5 text-fg placeholder:text-subtle"
                style={{ maxHeight: MAX_HEIGHT }}
            />
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
