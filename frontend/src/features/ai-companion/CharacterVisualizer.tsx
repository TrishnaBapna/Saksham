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
            /* Asha: Lavender Scarf / Tunic */
            <g>
              <path
                d="M 40 190 C 40 150, 70 145, 100 145 C 130 145, 160 150, 160 190 Z"
                fill="#7C3AED"
              />
              {/* Soft purple scarf */}
              <path
                d="M 65 145 C 80 160, 120 160, 135 145 C 130 170, 70 170, 65 145 Z"
                fill="#C084FC"
              />
            </g>
          ) : (
            /* Kabir: Lilac Vest / Shirt */
            <g>
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
          <rect x="90" y="125" width="20" height="22" rx="6" fill="#F7D0B2" />

          {/* Head */}
          <circle cx="100" cy="95" r="42" fill="#F7D0B2" />

          {/* Rosy Cheeks */}
          <circle cx="75" cy="105" r="7" fill="#FCA5A5" opacity="0.6" />
          <circle cx="125" cy="105" r="7" fill="#FCA5A5" opacity="0.6" />

          {/* Hair */}
          {isAsha ? (
            /* Asha Hair: Soft dark waves with purple hair pin */
            <g>
              <path
                d="M 58 92 C 55 55, 145 55, 142 92 C 138 65, 62 65, 58 92 Z"
                fill="#1C1917"
              />
              <path
                d="M 58 90 C 52 110, 54 135, 64 140 C 60 115, 62 95, 58 90 Z"
                fill="#1C1917"
              />
              <path
                d="M 142 90 C 148 110, 146 135, 136 140 C 140 115, 138 95, 142 90 Z"
                fill="#1C1917"
              />
              {/* Pretty floral hairpin */}
              <circle cx="68" cy="72" r="5" fill="#E879F9" />
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
