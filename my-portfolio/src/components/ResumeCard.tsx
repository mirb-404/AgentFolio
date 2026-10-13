import React, { useState } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { resume } from '../lib/resume';
import ResumeViewer from './ResumeViewer';

/** In-chat résumé: first-page preview that opens a full viewer, plus download */
const ResumeCard: React.FC = () => {
    const [open, setOpen] = useState(false);
    const pageCount = resume.pages.length;

    return (
        <div className="w-full max-w-md rounded-2xl border border-line p-3 flex gap-4">
            <button
                onClick={() => setOpen(true)}
                aria-label="Preview résumé"
                className="group relative shrink-0 w-[120px] sm:w-[136px] aspect-[1587/2245] rounded-lg overflow-hidden border border-line bg-white"
            >
                <img src={resume.thumbUrl} alt="" className="w-full h-full object-cover object-top" />
                <span className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/25 transition-colors">
                    <Maximize2 size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
            </button>

            <div className="flex-1 min-w-0 flex flex-col py-1">
                <h3 className="text-[15px] font-medium text-fg">Résumé</h3>
                <p className="text-sm text-subtle">{pageCount} {pageCount === 1 ? 'page' : 'pages'} · PDF</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    <button
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-fg hover:bg-hover transition-colors"
                    >
                        <Maximize2 size={14} /> Preview
                    </button>
                    <a
                        href={resume.pdfUrl}
                        download={resume.fileName}
                        className="inline-flex items-center gap-1.5 rounded-full bg-fg text-bg px-3.5 py-1.5 text-sm font-medium hover:opacity-85 transition-opacity"
                    >
                        <Download size={14} /> Download
                    </a>
                </div>
            </div>

            {open && <ResumeViewer onClose={() => setOpen(false)} />}
        </div>
    );
};

export default ResumeCard;
