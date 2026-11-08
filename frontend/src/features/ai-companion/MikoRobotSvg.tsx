import React from 'react';

interface MikoRobotSvgProps {
  size?: number;
  className?: string;
  expression?: 'waving' | 'happy' | 'thinking' | 'reminder';
  animated?: boolean;
}

export const MikoRobotSvg: React.FC<MikoRobotSvgProps> = ({
  size = 76,
  className = '',
  animated = true,
}) => {
  const animFloat = animated ? 'animate-companion-float' : '';
  const animEyes = animated ? 'animate-miko-eyes' : '';
  const animAntenna = animated ? 'animate-miko-antenna' : '';
  const animWave = animated ? 'animate-companion-wave' : '';
  const chassisColor = '#38BDF8';

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`eldora-character-svg drop-shadow-md select-none shrink-0 ${animFloat} ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Miko Companion Robot"
    >
      {/* Soft Background Aura */}
      <circle cx="60" cy="60" r="50" fill="#E0F2FE" fillOpacity="0.7" />

      {/* Miko Antenna with Glowing Orb */}
      <g className={animAntenna}>
        <rect x="58" y="14" width="4" height="12" rx="2" fill="#94A3B8" />
        <circle cx="60" cy="14" r="6" fill="#38BDF8" />
        <circle cx="60" cy="14" r="3" fill="#FFFFFF" />
      </g>

      {/* Robot Body / Lower Base */}
      <ellipse cx="60" cy="104" rx="28" ry="10" fill="#CBD5E1" />
      {/* Rollers / Tracks */}
      <rect x="36" y="96" width="48" height="12" rx="6" fill="#334155" />
      <circle cx="44" cy="102" r="3" fill="#64748B" />
      <circle cx="60" cy="102" r="3" fill="#64748B" />
      <circle cx="76" cy="102" r="3" fill="#64748B" />

      {/* Miko Torso */}
      <rect x="38" y="70" width="44" height="30" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      {/* Heart / Health Indicator Badge on Chest */}
      <rect x="50" y="76" width="20" height="16" rx="8" fill="#F0FDF4" stroke="#86EFAC" strokeWidth="1.5" />
      <path
        d="M60 81C59 79.5 56.5 80 56.5 82C56.5 84 60 86.5 60 86.5C60 86.5 63.5 84 63.5 82C63.5 80 61 79.5 60 81Z"
        fill="#10B981"
      />

      {/* Left Cute Arm (Waving) */}
      <g className={animWave}>
        <path d="M38 76C30 74 20 62 24 56C28 50 34 60 38 72Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="23" cy="55" r="5" fill={chassisColor} />
      </g>

      {/* Right Arm (Relaxed) */}
      <path d="M82 76C88 80 94 88 90 92C86 96 82 86 82 78Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
      <circle cx="90" cy="91" r="4" fill={chassisColor} />

      {/* Miko Robot Head (Curved Capsule) */}
      <rect x="30" y="24" width="60" height="48" rx="22" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      {/* Ear Pieces */}
      <rect x="25" y="38" width="6" height="18" rx="3" fill={chassisColor} />
      <rect x="89" y="38" width="6" height="18" rx="3" fill={chassisColor} />

      {/* Face Screen (Glossy Dark Display) */}
      <rect x="36" y="30" width="48" height="36" rx="16" fill="#0F172A" />

      {/* Animated Expressive LED Eyes */}
      <g className={animEyes}>
        {/* Left Eye (Happy Curved Arch) */}
        <path d="M44 46C44 42 48 40 52 42" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="51" cy="44" r="1.5" fill="#FFFFFF" />

        {/* Right Eye (Happy Curved Arch) */}
        <path d="M68 42C72 40 76 42 76 46" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="69" cy="44" r="1.5" fill="#FFFFFF" />
      </g>

      {/* Gentle Cheerful Blush */}
      <circle cx="43" cy="54" r="2.5" fill="#38BDF8" fillOpacity="0.4" />
      <circle cx="77" cy="54" r="2.5" fill="#38BDF8" fillOpacity="0.4" />
    </svg>
  );
};
