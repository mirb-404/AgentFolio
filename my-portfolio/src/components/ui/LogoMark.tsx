import React from 'react';

// A chat bubble with a spark cut out of it — one colour, inherits currentColor
const BUBBLE = 'M7.5 2.5H16.5A5.5 5.5 0 0 1 22 8V13A5.5 5.5 0 0 1 16.5 18.5H10.6L6.95 21.55A.7.7 0 0 1 5.8 21.01V18.24A5.5 5.5 0 0 1 2 13V8A5.5 5.5 0 0 1 7.5 2.5Z';
const SPARK = 'M12 6C12.45 8.75 13.25 9.6 16.5 10.5C13.25 11.4 12.45 12.25 12 15C11.55 12.25 10.75 11.4 7.5 10.5C10.75 9.6 11.55 8.75 12 6Z';

const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} role="img" aria-label="AgentFolio">
        <path fill="currentColor" fillRule="evenodd" d={`${BUBBLE} ${SPARK}`} />
    </svg>
);

export default LogoMark;
