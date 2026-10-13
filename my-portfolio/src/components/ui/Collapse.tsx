import React from 'react';

/**
 * Animated show/hide for content of unknown height — transitions
 * grid-template-rows between 0fr and 1fr, so nothing has to be measured.
 */
const Collapse: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => (
    <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        inert={!open}
    >
        <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
);

export default Collapse;
