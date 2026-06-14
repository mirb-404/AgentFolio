import React from 'react';

interface LogoMarkProps {
    /** Pixel size of the square mark */
    size?: number;
    /** Stroke color — inherits text color by default */
    className?: string;
    /** Accent color of the orbiting agent node */
    accent?: string;
    /** Disable the orbit animation (e.g. reduced motion contexts) */
    animated?: boolean;
}

/**
 * AgentFolio mark — geometric "A" with a single agent-node orbiting it.
 * One-color strokes (currentColor) so it works on light and dark; the
 * orbiting dot is the only accent. Scales from favicon to hero.
 */
const LogoMark: React.FC<LogoMarkProps> = ({ size = 36, className = '', accent = '#22d3ee', animated = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        aria-label="AgentFolio"
        role="img"
    >
        {/* The A */}
        <path
            d="M9.5 40 L24 9.5 L38.5 40"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M16 28.5 H32"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
        />

        {/* Orbit ring */}
        <ellipse
            cx="24" cy="18" rx="17" ry="6.5"
            transform="rotate(-16 24 18)"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.28"
        />

        {/* Agent node on the orbit */}
        {animated ? (
            <circle r="2.6" fill={accent}>
                <animateMotion
                    dur="7s"
                    repeatCount="indefinite"
                    path="M40.34,13.31 A17,6.5 -16 1,1 7.66,22.69 A17,6.5 -16 1,1 40.34,13.31"
                />
            </circle>
        ) : (
            <circle cx="40.34" cy="13.31" r="2.6" fill={accent} />
        )}
    </svg>
);

export default LogoMark;
