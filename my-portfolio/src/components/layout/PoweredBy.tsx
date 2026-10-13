import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { fetchChatInfo, useLastModel } from '../../lib/quota';
import { useClickOutside, useEscape } from '../../lib/hooks';

const MAKERS: Record<string, string> = { openai: 'OpenAI', qwen: 'Qwen' };
/** "openai/gpt-oss-20b" → { name: "gpt-oss-20b", maker: "OpenAI" } */
const describe = (id: string) => {
    const [vendor, name = vendor] = id.split('/');
    return { name, maker: MAKERS[vendor] ?? vendor };
};

/** Groq's official badge (public/powered-by-groq-*.svg), matched to the theme */
const GroqBadge: React.FC<{ className: string }> = ({ className }) => (
    <>
        <img src="/powered-by-groq-light.svg" alt="Powered by Groq for fast inference" className={`${className} w-auto dark:hidden`} />
        <img src="/powered-by-groq-dark.svg" alt="Powered by Groq for fast inference" className={`${className} w-auto hidden dark:block`} />
    </>
);

/**
 * Top-right corner of the header: the Groq badge (plus the model name on
 * wider screens). Opens a card listing every model the chat can use, in
 * fallback order, and which one wrote the latest answer.
 */
const PoweredBy: React.FC = () => {
    const [models, setModels] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const lastModel = useLastModel();

    useEffect(() => {
        let live = true;
        fetchChatInfo().then(info => { if (live && info) setModels(info.models); });
        return () => { live = false; };
    }, []);

    useClickOutside(ref, open, () => setOpen(false));
    useEscape(() => setOpen(false), open);

    const shown = lastModel ?? models[0];

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={shown ? `Powered by ${describe(shown).name} on Groq. Show models` : 'Powered by Groq. Show models'}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-hover transition-colors"
            >
                <GroqBadge className="h-7" />
                {shown && <span className="hidden sm:inline text-[13px] text-subtle font-mono">{describe(shown).name}</span>}
            </button>

            <div
                role="dialog"
                aria-label="Models behind this chat"
                inert={!open}
                className={`absolute right-0 top-full mt-1.5 z-50 w-[min(18rem,calc(100vw-1.5rem))] origin-top-right rounded-2xl border border-line bg-elevated p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-[opacity,translate,scale,visibility] duration-200 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${open ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-[0.97] -translate-y-1 invisible'}`}
            >
                <a href="https://groq.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-subtle hover:text-fg transition-colors">
                    <GroqBadge className="h-10" />
                    <ArrowUpRight size={14} />
                </a>
                <p className="mt-3 text-sm text-fg">
                    Powered by <span className="font-semibold">{models[0] ? describe(models[0]).name : 'open models'}</span>, running on Groq's fast inference.
                </p>
                {models.length > 1 && (
                    <>
                        <p className="mt-3 mb-1.5 text-xs text-subtle">When a model is busy, the next one answers:</p>
                        <ol className="flex flex-col gap-1">
                            {models.map((id, i) => {
                                const { name, maker } = describe(id);
                                return (
                                    <li key={id} className="flex items-center gap-2 rounded-lg bg-raised/60 px-2.5 py-1.5 text-[13px]">
                                        <span className="font-mono text-fg">{name}</span>
                                        <span className="text-subtle">{maker}</span>
                                        <span className="ml-auto text-[11px] text-subtle">
                                            {id === lastModel ? 'last answer' : i === 0 ? 'primary' : `fallback ${i}`}
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    </>
                )}
            </div>
        </div>
    );
};

export default React.memo(PoweredBy);
