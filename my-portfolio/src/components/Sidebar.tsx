import React from 'react';
import { X, Trash2, Terminal, ChevronRight } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onClear: () => void;
    onCommandSelect: (cmd: string) => void;
    isDisabled?: boolean;
}

const secretCommands = [
    { cmd: 'help', desc: 'System manual' },
    { cmd: 'clear', desc: 'Clear terminal' },
    { cmd: 'matrix', desc: 'Enter simulation' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onClear, onCommandSelect, isDisabled = false }) => {
    // Obsidian palette — one dark world
    const c = {
        panel: 'bg-[#0f0f0f] border-r border-[#1f1f1f]',
        title: 'text-[#f2f1ec]', titleIcon: 'text-[#8a8a85]',
        closeBtn: 'hover:bg-[#1a1a1a] text-[#8a8a85] hover:text-[#f2f1ec]',
        sectionLabel: 'text-[#555550]',
        itemHover: 'hover:bg-[#1a1a1a]',
        chip: 'bg-[#141414] border-[#262626] text-[#8a8a85] group-hover:border-[#22d3ee]/40 group-hover:text-[#22d3ee]',
        chipDisabled: 'bg-[#141414] border-[#1f1f1f] text-[#3d3d3d]',
        cmd: 'text-[#d6d5cf]', cmdDisabled: 'text-[#4a4a45]',
        desc: 'text-[#8a8a85]', descDisabled: 'text-[#3d3d3d]',
        footer: 'border-t border-[#1f1f1f]',
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-[#14130f]/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={`fixed top-0 left-0 h-full w-72 sm:w-80 ${c.panel} z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-full p-5">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-7">
                        <h2 className={`text-[15px] font-bold ${c.title} flex items-center gap-2 font-grotesk tracking-wide`}>
                            <Terminal size={16} className={c.titleIcon} />
                            <span>System Control</span>
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded-lg transition-colors ${c.closeBtn}`}
                        >
                            <X size={17} />
                        </button>
                    </div>

                    {/* Commands */}
                    <div className="flex-1 overflow-y-auto">
                        <h3 className={`text-[10px] font-semibold ${c.sectionLabel} uppercase tracking-[0.15em] mb-3 px-1 font-mono`}>
                            Secret Commands
                        </h3>
                        <div className="space-y-0.5">
                            {secretCommands.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (!isDisabled) {
                                            onCommandSelect(item.cmd);
                                            onClose();
                                        }
                                    }}
                                    disabled={isDisabled}
                                    className={`w-full text-left group p-2.5 rounded-xl transition-all ${isDisabled ? 'opacity-40 cursor-not-allowed' : c.itemHover}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-colors ${isDisabled ? c.chipDisabled : c.chip}`}>
                                            <ChevronRight size={12} />
                                        </div>
                                        <div>
                                            <code className={`text-sm font-medium font-mono block ${isDisabled ? c.cmdDisabled : c.cmd}`}>
                                                {item.cmd}
                                            </code>
                                            <p className={`text-xs ${isDisabled ? c.descDisabled : c.desc}`}>
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`pt-5 ${c.footer} mt-auto`}>
                        <button
                            onClick={() => {
                                if (!isDisabled) {
                                    onClear();
                                    onClose();
                                }
                            }}
                            disabled={isDisabled}
                            className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl transition-colors border text-sm font-medium ${
                                isDisabled
                                    ? 'bg-red-500/5 text-red-500/30 border-red-500/8 cursor-not-allowed'
                                    : 'bg-red-500/8 hover:bg-red-500/15 text-red-500/70 hover:text-red-400 border-red-500/15 hover:border-red-500/30'
                            }`}
                        >
                            <Trash2 size={15} />
                            <span>Clear Chat History</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// Mounted for the whole chat session and re-rendered by every streaming tick
// otherwise — its props only change when the sidebar actually opens or locks.
export default React.memo(Sidebar);
