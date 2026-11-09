import React, { useState } from 'react';
import type {
  AshaExpression,
  CharacterVisualizerProps,
} from './types/character.types.js';
import {
  ASHA_EXPRESSIONS_REGISTRY,
  resolveAshaExpression,
} from './config/characterExpressions.js';
import {
  Sparkles,
  Heart,
  Bell,
  Mic,
  Volume2,
  Shield,
  HeartHandshake,
  AlertCircle,
  Calendar,
  Compass,
  CheckCircle2,
  FileText,
  ThumbsUp,
  Image as ImageIcon,
  Users,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  Wind,
  Music,
  Zap,
  Award,
  Coffee,
  Moon,
  Smile,
  Check,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';

export const CharacterVisualizer: React.FC<CharacterVisualizerProps> = ({
  characterId = 'asha',
  state,
  expression: propExpression,
  mode = 'primary',
  className = '',
  size,
  showBadge = true,
  showLabel = false,
  showAura = true,
  highContrast = false,
  reducedMotion = false,
  onClick,
  ariaLabel: customAriaLabel,
}) => {
  const isAsha = characterId === 'asha';
  const { t } = useLanguage();
  const [imgLoadFailed, setImgLoadFailed] = useState<boolean>(false);

  // Resolve target expression (propExpression has precedence, then state, default 'neutral')
  const rawState = propExpression || state || 'neutral';
  const expressionId: AshaExpression = resolveAshaExpression(rawState);
  const meta = ASHA_EXPRESSIONS_REGISTRY[expressionId] || ASHA_EXPRESSIONS_REGISTRY.neutral;

  // Determine container dimensions based on mode and optional explicit size
  const defaultSize = mode === 'compact' ? 64 : 160;
  const dimension = size || defaultSize;

  // Accessible aria label: Preserves backward compatibility for legacy tests
  // Legacy test format: "${character} character is currently ${state}"
  const localizedLabel = (t ? t(meta.labelKey) : '') || meta.englishLabel;
  const characterName = isAsha ? 'Asha' : 'Kabir';
  const defaultAriaLabel = `${characterName} character is currently ${rawState}`;
  const ariaLabel = customAriaLabel || `${defaultAriaLabel}. ${localizedLabel}`;

  // Render expression icon badge
  const renderBadgeIcon = () => {
    const iconProps = { className: mode === 'compact' ? 'w-3 h-3' : 'w-4 h-4' };
    switch (meta.badgeIcon) {
      case 'Mic':
        return <Mic {...iconProps} />;
      case 'Volume2':
        return <Volume2 {...iconProps} />;
      case 'Sparkles':
        return <Sparkles {...iconProps} />;
      case 'Heart':
        return <Heart {...iconProps} />;
      case 'Shield':
        return <Shield {...iconProps} />;
      case 'HeartHandshake':
        return <HeartHandshake {...iconProps} />;
      case 'AlertCircle':
        return <AlertCircle {...iconProps} />;
      case 'Calendar':
        return <Calendar {...iconProps} />;
      case 'Bell':
        return <Bell {...iconProps} />;
      case 'Compass':
        return <Compass {...iconProps} />;
      case 'CheckCircle2':
        return <CheckCircle2 {...iconProps} />;
      case 'FileText':
        return <FileText {...iconProps} />;
      case 'ThumbsUp':
        return <ThumbsUp {...iconProps} />;
      case 'Image':
        return <ImageIcon {...iconProps} />;
      case 'Users':
        return <Users {...iconProps} />;
      case 'Lightbulb':
        return <Lightbulb {...iconProps} />;
      case 'HelpCircle':
        return <HelpCircle {...iconProps} />;
      case 'MessageCircle':
        return <MessageCircle {...iconProps} />;
      case 'Wind':
        return <Wind {...iconProps} />;
      case 'Music':
        return <Music {...iconProps} />;
      case 'Zap':
        return <Zap {...iconProps} />;
      case 'Award':
        return <Award {...iconProps} />;
      case 'Coffee':
        return <Coffee {...iconProps} />;
      case 'Moon':
        return <Moon {...iconProps} />;
      case 'Smile':
        return <Smile {...iconProps} />;
      case 'Check':
        return <Check {...iconProps} />;
      default:
        return <Sparkles {...iconProps} />;
    }
  };

  // State-specific animation class (respects reducedMotion)
  const getAnimationClass = () => {
    if (reducedMotion) return '';

    switch (expressionId) {
      case 'listening':
        return 'scale-105 transition-transform duration-300 ring-4 ring-purple-300 ring-offset-2';
      case 'explaining':
        return 'animate-pulse transition-all duration-300';
      case 'happy':
      case 'remembered':
        return 'scale-105 -rotate-2 transition-transform duration-300 ring-4 ring-pink-300 ring-offset-2';
      case 'alert_important':
        return 'animate-bounce ring-4 ring-red-400 ring-offset-2';
      case 'thinking':
      case 'clarifying':
        return 'rotate-2 transition-transform duration-300';
      case 'reminder':
        return 'scale-105 transition-transform duration-300 ring-4 ring-amber-300 ring-offset-2';
      case 'encouraging':
      case 'motivated':
        return 'scale-105 transition-transform duration-300 ring-4 ring-rose-300 ring-offset-2';
      case 'neutral':
      case 'calm':
      case 'relaxed':
      default:
        return 'transition-transform duration-500 hover:scale-102';
    }
  };

  // Render Kabir SVG chibi for backward compatibility
  const renderKabirSVG = () => (
    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#F5F3FF" />
      <path d="M 40 190 C 40 145, 70 142, 100 142 C 130 142, 160 145, 160 190 Z" fill="#4C1D95" />
      <path d="M 75 142 L 100 168 L 125 142 Z" fill="#DDD6FE" />
      <rect x="90" y="123" width="20" height="24" rx="6" fill="#F7D0B2" />
      <circle cx="100" cy="94" r="43" fill="#F7D0B2" />
      <circle cx="74" cy="104" r="7" fill="#FCA5A5" opacity="0.65" />
      <circle cx="126" cy="104" r="7" fill="#FCA5A5" opacity="0.65" />
      <path d="M 58 90 C 58 55, 142 55, 142 90 C 130 65, 70 65, 58 90 Z" fill="#292524" />
      <circle cx="83" cy="92" r="4.5" fill="#1E1B4B" />
      <circle cx="117" cy="92" r="4.5" fill="#1E1B4B" />
      <path d="M 89 112 Q 100 119, 111 112" stroke="#BE185D" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </svg>
  );

  // Render Asha Fallback SVG chibi (used when image fails or in test runners)
  const renderAshaSVG = () => (
    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#FAF5FF" />
      <g id="asha-hoodie">
        <path d="M 35 195 C 35 146, 68 140, 100 140 C 132 140, 165 146, 165 195 Z" fill="#A855F7" />
        <path d="M 64 140 C 76 164, 124 164, 136 140 C 124 154, 76 154, 64 140 Z" fill="#C084FC" />
        <path d="M 72 142 C 82 158, 118 158, 128 142 C 118 150, 82 150, 72 142 Z" fill="#D8B4FE" />
        <line x1="88" y1="150" x2="86" y2="175" stroke="#F3E8FF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="86" cy="176" r="2.2" fill="#E9D5FF" />
        <line x1="112" y1="150" x2="114" y2="175" stroke="#F3E8FF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="114" cy="176" r="2.2" fill="#E9D5FF" />
      </g>
      <rect x="90" y="123" width="20" height="24" rx="6" fill="#F7D0B2" />
      <circle cx="100" cy="94" r="43" fill="#F7D0B2" />
      <circle cx="74" cy="104" r="7" fill="#FCA5A5" opacity="0.65" />
      <circle cx="126" cy="104" r="7" fill="#FCA5A5" opacity="0.65" />
      <g id="asha-hair">
        <path d="M 52 94 C 48 50, 152 50, 148 94 C 142 62, 58 62, 52 94 Z" fill="#2E1C14" />
        <path d="M 55 90 C 46 112, 48 138, 62 144 C 54 122, 58 100, 55 90 Z" fill="#3E2723" />
        <path d="M 145 90 C 154 112, 152 138, 138 144 C 146 122, 142 100, 145 90 Z" fill="#3E2723" />
        <path d="M 56 86 C 75 68, 125 68, 144 86 C 130 76, 70 76, 56 86 Z" fill="#2E1C14" />
        <g id="purple-flower-clip" transform="translate(68, 74)">
          <circle cx="0" cy="-6" r="4.2" fill="#A855F7" />
          <circle cx="5.7" cy="-1.8" r="4.2" fill="#A855F7" />
          <circle cx="3.5" cy="4.8" r="4.2" fill="#A855F7" />
          <circle cx="-3.5" cy="4.8" r="4.2" fill="#A855F7" />
          <circle cx="-5.7" cy="-1.8" r="4.2" fill="#A855F7" />
          <circle cx="0" cy="0" r="3.2" fill="#FBBF24" />
          <circle cx="-0.8" cy="-0.8" r="1.2" fill="#FEF3C7" />
        </g>
      </g>
      <circle cx="83" cy="92" r="4.5" fill="#1E1B4B" />
      <circle cx="117" cy="92" r="4.5" fill="#1E1B4B" />
      <circle cx="85" cy="90" r="1.5" fill="#FFFFFF" />
      <circle cx="119" cy="90" r="1.5" fill="#FFFFFF" />
      <path d="M 86 110 Q 100 125, 114 110" stroke="#BE185D" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </svg>
  );

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      role="img"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {/* Visual Avatar Frame */}
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: dimension, height: dimension }}
      >
        {/* Soft Ambient Halo Aura */}
        {showAura && !highContrast && (
          <div
            className={`absolute inset-0 rounded-full blur-xl opacity-60 transition-colors duration-500 ${
              reducedMotion ? '' : 'animate-pulse'
            } ${meta.auraColor}`}
            style={{ animationDuration: '4s' }}
          />
        )}

        {/* Character Circle Container */}
        <div
          className={`relative z-10 w-full h-full rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
            highContrast
              ? 'border-4 border-amber-400 bg-neutral-950 shadow-none'
              : `bg-gradient-to-b from-purple-50 to-lavender-100 p-1 shadow-soft-purple border-2 ${
                  meta.borderRing || 'border-purple-200'
                }`
          } ${getAnimationClass()}`}
        >
          {isAsha ? (
            !imgLoadFailed ? (
              <img
                src={meta.assetPath}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover object-center rounded-full select-none pointer-events-none"
                loading="lazy"
                onError={() => setImgLoadFailed(true)}
              />
            ) : (
              renderAshaSVG()
            )
          ) : (
            renderKabirSVG()
          )}
        </div>

        {/* Floating Expression Badge */}
        {showBadge && (
          <span
            className={`absolute -top-1 -right-1 z-20 rounded-full shadow-lg flex items-center justify-center ${
              mode === 'compact' ? 'p-1' : 'p-1.5'
            } ${
              highContrast
                ? 'bg-amber-400 text-black border-2 border-black'
                : `${meta.badgeBg} ${meta.badgeTextColor}`
            } ${
              !reducedMotion && (expressionId === 'listening' || expressionId === 'reminder')
                ? 'animate-pulse'
                : !reducedMotion && (expressionId === 'happy' || expressionId === 'alert_important')
                ? 'animate-bounce'
                : ''
            }`}
            title={localizedLabel}
            aria-hidden="true"
          >
            {renderBadgeIcon()}
          </span>
        )}
      </div>

      {/* Localized Label Pill (Optional) */}
      {showLabel && mode === 'primary' && (
        <span
          className={`mt-2 px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-colors ${
            highContrast
              ? 'bg-amber-400 text-black border-2 border-black'
              : 'bg-purple-100/90 text-purple-900 border border-purple-200'
          }`}
        >
          {localizedLabel}
        </span>
      )}
    </div>
  );
};
