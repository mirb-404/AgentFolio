import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ActionButtonsProps {
    prompts: string[];
    onSelect: (prompt: string) => void;
    isDisabled?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ prompts, onSelect, isDisabled = false }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [prompts]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="relative group w-full max-w-full">
            {/* Left Arrow */}
            <div className={`absolute left-0 top-0 bottom-2 z-10 flex items-center justify-center w-10 transition-opacity duration-200 ${showLeftArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#121212] to-transparent pointer-events-none" />
                <button
                    onClick={() => scroll('left')}
                    className="relative z-10 p-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#8a8a85] hover:text-[#f2f1ec] hover:border-[#3d3d3d] rounded-full transition-all"
                    aria-label="Scroll left"
                >
                    <ChevronLeft size={14} />
                </button>
            </div>

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex overflow-x-auto gap-1.5 pb-2 px-2 scrollbar-hide snap-x snap-mandatory scroll-px-10"
            >
                {prompts.map((prompt, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            if (!isDisabled) {
                                setTimeout(() => onSelect(prompt), 0);
                            }
                        }}
                        disabled={isDisabled}
                        className={`whitespace-nowrap px-3 py-1.5 sm:px-3.5 sm:py-1.5 bg-[#0f0f0f] border border-[#232323] rounded-full text-[11px] sm:text-xs text-[#8a8a85] snap-start shrink-0 transition-all duration-150
                            ${isDisabled
                                ? 'opacity-30 cursor-not-allowed'
                                : 'hover:bg-[#1a1a1a] hover:border-[#22d3ee]/30 hover:text-[#f2f1ec] hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                            }`}
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            {/* Right Arrow */}
            <div className={`absolute right-0 top-0 bottom-2 z-10 flex items-center justify-center w-10 transition-opacity duration-200 ${showRightArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-gradient-to-l from-[#121212] to-transparent pointer-events-none" />
                <button
                    onClick={() => scroll('right')}
                    className="relative z-10 p-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#8a8a85] hover:text-[#f2f1ec] hover:border-[#3d3d3d] rounded-full transition-all"
                    aria-label="Scroll right"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default ActionButtons;
