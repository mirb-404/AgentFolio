import React, { useRef, useState } from 'react';
import { useClickOutside, useEscape } from '../../lib/hooks';
import { Check, ChevronDown } from 'lucide-react';
import type { Tone } from '../../lib/tone';

const OPTIONS: { id: Tone; label: string; hint: string }[] = [
    { id: 'default', label: 'Mirang 2.0', hint: 'Great for most questions' },
    { id: 'concise', label: 'Mirang 2.0 Concise', hint: 'Fewer words, same facts' },
    { id: 'detailed', label: 'Mirang 2.0 Deep Dive', hint: 'Goes further into the tech' },
];

const ModelPicker: React.FC<{ tone: Tone; onChange: (t: Tone) => void }> = ({ tone, onChange }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useClickOutside(rootRef, open, () => setOpen(false));
    useEscape(() => setOpen(false), open);

    const suffix = tone === 'concise' ? 'Concise' : tone === 'detailed' ? 'Deep Dive' : null;

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[17px] font-medium text-fg hover:bg-hover transition-colors"
            >
                Mirang 2.0
                {suffix && <span className="text-subtle font-normal">{suffix}</span>}
                <ChevronDown size={16} className={`text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            <div
                role="menu"
                inert={!open}
                className={`absolute left-0 top-full mt-1.5 z-50 w-72 origin-top-left rounded-2xl border border-line bg-elevated p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-[opacity,transform,visibility] duration-150 ease-out ${open ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-[0.97] -translate-y-1 invisible'}`}
            >
                    {OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            role="menuitemradio"
                            aria-checked={tone === opt.id}
                            onClick={() => { onChange(opt.id); setOpen(false); }}
                            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-hover transition-colors"
                        >
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm text-fg">{opt.label}</span>
                                <span className="block text-[13px] text-subtle">{opt.hint}</span>
                            </span>
                            {tone === opt.id && <Check size={16} className="text-fg shrink-0" />}
                        </button>
                    ))}
                    <div className="my-1.5 h-px bg-line mx-2" />
                    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-not-allowed" aria-disabled>
                        <span className="flex-1">
                            <span className="block text-sm text-subtle">Mirang 3.0</span>
                            <span className="block text-[13px] text-subtle/80">Ships after graduation</span>
                        </span>
                    </div>
            </div>
        </div>
    );
};

export default ModelPicker;
