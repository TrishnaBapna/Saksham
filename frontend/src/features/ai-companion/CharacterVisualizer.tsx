import React from 'react';
import { CharacterId, CharacterState } from '../../types/index.js';
import { Sparkles, Heart, Bell, Mic, Volume2 } from 'lucide-react';

interface CharacterVisualizerProps {
  characterId: CharacterId;
  state: CharacterState;
  className?: string;
  size?: number;
}

export const CharacterVisualizer: React.FC<CharacterVisualizerProps> = ({
  characterId,
  state,
  className = '',
  size = 140,
}) => {
  const isAsha = characterId === 'asha';

  // State-dependent badge / accessory
  const renderStateBadge = () => {
    switch (state) {
      case 'listening':
        return (
          <span className="absolute -top-1 -right-1 bg-violet-600 text-white p-1.5 rounded-full shadow-lg animate-pulse" title="Listening to you">
            <Mic className="w-4 h-4" />
          </span>
        );
      case 'speaking':
        return (
          <span className="absolute -top-1 -right-1 bg-purple-600 text-white p-1.5 rounded-full shadow-lg animate-bounce" title="Speaking">
            <Volume2 className="w-4 h-4" />
          </span>
        );
      case 'thinking':
        return (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full shadow-lg animate-spin" style={{ animationDuration: '3s' }} title="Thinking">
            <Sparkles className="w-4 h-4" />
          </span>
        );
      case 'happy':
        return (
          <span className="absolute -top-1 -right-1 bg-pink-500 text-white p-1.5 rounded-full shadow-lg animate-bounce" title="Happy">
            <Sparkles className="w-4 h-4" />
          </span>
        );
      case 'reminder':
        return (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full shadow-lg animate-pulse" title="Routine Reminder">
            <Bell className="w-4 h-4" />
          </span>
        );
      case 'encouraging':
        return (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white p-1.5 rounded-full shadow-lg animate-pulse" title="You are doing great!">
            <Heart className="w-4 h-4" />
          </span>
        );
      default:
        return null;
    }
  };

  // State-specific animation class
  const getAnimationClass = () => {
    switch (state) {
      case 'listening':
        return 'scale-105 transition-transform duration-300 ring-4 ring-purple-300 ring-offset-2';
      case 'speaking':
        return 'animate-pulse transition-all duration-300';
      case 'happy':
        return 'scale-105 -rotate-2 transition-transform duration-300 ring-4 ring-pink-300 ring-offset-2';
      case 'greeting':
        return 'rotate-1 transition-transform duration-300';
      case 'thinking':
        return 'rotate-2 transition-transform duration-300';
      case 'reminder':
        return 'scale-105 transition-transform duration-300 ring-4 ring-amber-300 ring-offset-2';
      case 'encouraging':
        return 'scale-105 transition-transform duration-300 ring-4 ring-rose-300 ring-offset-2';
      case 'idle':
      default:
        return 'transition-transform duration-500 hover:scale-102';
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${isAsha ? 'Asha' : 'Kabir'} character is currently ${state}`}
    >
      {/* Background Soft Aura */}
      <div
        className={`absolute inset-0 rounded-full blur-xl opacity-60 transition-colors duration-500 ${
          state === 'listening'
            ? 'bg-purple-300'
            : state === 'happy' || state === 'encouraging'
            ? 'bg-pink-200'
            : state === 'reminder'
            ? 'bg-amber-200'
            : 'bg-lavender-200'
        }`}
      />

      {/* SVG Avatar Container */}
      <div
        className={`relative z-10 w-full h-full rounded-full bg-gradient-to-b from-purple-100 to-lavender-100 p-1.5 shadow-soft-purple border-2 border-purple-200 flex items-center justify-center overflow-hidden ${getAnimationClass()}`}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle background glow circle */}
          <circle cx="100" cy="100" r="95" fill={isAsha ? '#FAF5FF' : '#F5F3FF'} />

          {/* Shoulders / Attire */}
          {isAsha ? (
            /* Asha: Cozy Lavender Hoodie with Hood Neckline & Drawstrings */
            <g id="asha-hoodie">
              {/* Main hoodie body */}
              <path
                d="M 35 195 C 35 146, 68 140, 100 140 C 132 140, 165 146, 165 195 Z"
                fill="#A855F7"
              />
              {/* Cozy folded hoodie hood collar */}
              <path
                d="M 64 140 C 76 164, 124 164, 136 140 C 124 154, 76 154, 64 140 Z"
                fill="#C084FC"
              />
              <path
                d="M 72 142 C 82 158, 118 158, 128 142 C 118 150, 82 150, 72 142 Z"
                fill="#D8B4FE"
              />
              {/* Hoodie drawstrings with aglets */}
              <line x1="88" y1="150" x2="86" y2="175" stroke="#F3E8FF" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="86" cy="176" r="2.2" fill="#E9D5FF" />
              <line x1="112" y1="150" x2="114" y2="175" stroke="#F3E8FF" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="114" cy="176" r="2.2" fill="#E9D5FF" />
            </g>
          ) : (
            /* Kabir: Lilac Vest / Shirt */
            <g id="kabir-attire">
              <path
                d="M 40 190 C 40 145, 70 142, 100 142 C 130 142, 160 145, 160 190 Z"
                fill="#4C1D95"
              />
              {/* Lilac collared vest */}
              <path
                d="M 75 142 L 100 168 L 125 142 Z"
                fill="#DDD6FE"
              />
            </g>
          )}

          {/* Neck */}
          <rect x="90" y="123" width="20" height="24" rx="6" fill="#F7D0B2" />

          {/* Head - Chibi Proportions */}
          <circle cx="100" cy="94" r="43" fill="#F7D0B2" />

          {/* Rosy Cheeks */}
          <circle cx="74" cy="104" r="7" fill="#FCA5A5" opacity="0.65" />
          <circle cx="126" cy="104" r="7" fill="#FCA5A5" opacity="0.65" />

          {/* Hair */}
          {isAsha ? (
            /* Asha Hair: Soft Wavy Dark/Brown Hair with Purple Flower Clip */
            <g id="asha-hair">
              {/* Back Hair Volume */}
              <path
                d="M 52 94 C 48 50, 152 50, 148 94 C 142 62, 58 62, 52 94 Z"
                fill="#2E1C14"
              />
              {/* Left Wavy Tresses */}
              <path
                d="M 55 90 C 46 112, 48 138, 62 144 C 54 122, 58 100, 55 90 Z"
                fill="#3E2723"
              />
              {/* Right Wavy Tresses */}
              <path
                d="M 145 90 C 154 112, 152 138, 138 144 C 146 122, 142 100, 145 90 Z"
                fill="#3E2723"
              />
              {/* Front Bangs with gentle side swoop */}
              <path
                d="M 56 86 C 75 68, 125 68, 144 86 C 130 76, 70 76, 56 86 Z"
                fill="#2E1C14"
              />
              {/* Purple 5-Petal Flower Hair Clip on Left Hair */}
              <g id="purple-flower-clip" transform="translate(68, 74)">
                {/* 5 Petals */}
                <circle cx="0" cy="-6" r="4.2" fill="#A855F7" />
                <circle cx="5.7" cy="-1.8" r="4.2" fill="#A855F7" />
                <circle cx="3.5" cy="4.8" r="4.2" fill="#A855F7" />
                <circle cx="-3.5" cy="4.8" r="4.2" fill="#A855F7" />
                <circle cx="-5.7" cy="-1.8" r="4.2" fill="#A855F7" />
                {/* Center Pistil (Golden Yellow) */}
                <circle cx="0" cy="0" r="3.2" fill="#FBBF24" />
                <circle cx="-0.8" cy="-0.8" r="1.2" fill="#FEF3C7" />
              </g>
            </g>
          ) : (
            /* Kabir Hair: Neat, modern side-part */
            <path
              d="M 58 90 C 58 55, 142 55, 142 90 C 130 65, 70 65, 58 90 Z"
              fill="#292524"
            />
          )}

          {/* Eyes (State dependent) */}
          {state === 'happy' || state === 'encouraging' ? (
            /* Joyful crinkled eyes */
            <g stroke="#1E1B4B" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M 75 92 Q 83 85, 91 92" />
              <path d="M 109 92 Q 117 85, 125 92" />
            </g>
          ) : state === 'thinking' ? (
            /* Contemplative upward eyes */
            <g fill="#1E1B4B">
              <circle cx="83" cy="88" r="4.5" />
              <circle cx="117" cy="88" r="4.5" />
              <circle cx="85" cy="86" r="1.5" fill="#FFFFFF" />
              <circle cx="119" cy="86" r="1.5" fill="#FFFFFF" />
            </g>
          ) : (
            /* Friendly open eyes */
            <g fill="#1E1B4B">
              <circle cx="83" cy="92" r="4.5" />
              <circle cx="117" cy="92" r="4.5" />
              <circle cx="85" cy="90" r="1.5" fill="#FFFFFF" />
              <circle cx="119" cy="90" r="1.5" fill="#FFFFFF" />
            </g>
          )}

          {/* Eyebrows */}
          <g stroke="#1E1B4B" strokeWidth="2.2" strokeLinecap="round">
            {state === 'thinking' ? (
              <>
                <path d="M 75 80 Q 83 75, 91 81" />
                <path d="M 109 82 Q 117 78, 125 79" />
              </>
            ) : (
              <>
                <path d="M 75 82 Q 83 79, 91 82" />
                <path d="M 109 82 Q 117 79, 125 82" />
              </>
            )}
          </g>

          {/* Mouth (State dependent) */}
          {state === 'speaking' ? (
            <path
              d="M 88 112 Q 100 126, 112 112 Q 100 118, 88 112 Z"
              fill="#BE185D"
            />
          ) : state === 'happy' || state === 'greeting' ? (
            <path
              d="M 86 110 Q 100 125, 114 110"
              stroke="#BE185D"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M 89 112 Q 100 119, 111 112"
              stroke="#BE185D"
              strokeWidth="2.8"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Hand Wave gesture for Greeting */}
          {state === 'greeting' && (
            <g className="animate-bounce" style={{ transformOrigin: '160px 140px' }}>
              <circle cx="160" cy="135" r="11" fill="#F7D0B2" />
              <path d="M 152 130 Q 160 120, 168 130" stroke="#F7D0B2" strokeWidth="4" />
            </g>
          )}
        </svg>
      </div>

      {/* Floating State Badge */}
      {renderStateBadge()}
    </div>
  );
};
