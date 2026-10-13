import React from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import { useAnimatedClose } from '../../lib/hooks';
import { resume, PAGE_SIZE } from '../../lib/resume';

/** Full-screen, scrollable view of every résumé page */
const ResumeViewer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [closing, close] = useAnimatedClose(onClose);

    return createPortal(
        <div className="fixed inset-0 z-[110] flex flex-col" role="dialog" aria-modal aria-label="Résumé">
            <div className={`${closing ? 'fade-out' : 'fade-in'} absolute inset-0 bg-black/70`} onClick={close} />

            <div className={`${closing ? 'fade-out' : 'fade-in'} relative z-10 h-14 shrink-0 flex items-center gap-2 px-3 sm:px-5 text-white`}>
                <span className="flex-1 text-[15px] font-medium truncate">Résumé · Mirang Bhandari</span>
                <a
                    href={resume.pdfUrl}
                    download={resume.fileName}
                    className="inline-flex items-center gap-2 rounded-full bg-white text-black px-3.5 py-1.5 text-sm font-medium hover:bg-white/85 transition-colors"
                >
                    <Download size={15} /> Download
                </a>
                <button onClick={close} aria-label="Close" className="size-9 grid place-items-center rounded-full hover:bg-white/15 transition-colors">
                    <X size={19} />
                </button>
            </div>

            {/* Clicking the dark margins closes; the pages themselves don't */}
            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 pb-8" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
                <div className={`${closing ? 'pop-out' : 'pop-in'} mx-auto w-full max-w-[820px] flex flex-col gap-4`}>
                    {resume.pages.map((src, i) => (
                        <img
                            key={src}
                            src={src}
                            alt={`Résumé page ${i + 1}`}
                            width={PAGE_SIZE.width}
                            height={PAGE_SIZE.height}
                            className="w-full h-auto rounded-md bg-white shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
                        />
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default ResumeViewer;
