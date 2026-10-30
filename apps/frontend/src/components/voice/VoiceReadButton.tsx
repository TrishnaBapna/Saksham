import React, { useState } from 'react';
import { voiceService } from '@/services/voiceService';

interface VoiceReadButtonProps {
  textToRead: string;
  className?: string;
  ariaLabel?: string;
}

export const VoiceReadButton: React.FC<VoiceReadButtonProps> = ({
  textToRead,
  className = '',
  ariaLabel = 'Read aloud',
}) => {
  const [speaking, setSpeaking] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speaking) {
      voiceService.stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      voiceService.speak(textToRead, () => {
        setSpeaking(false);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={speaking ? 'Stop reading' : ariaLabel}
      title={speaking ? 'Stop reading' : 'Read aloud with voice assistance'}
      className={`inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500 ${
        speaking
          ? 'bg-teal-600 text-white animate-pulse'
          : 'bg-gray-100/90 text-gray-700 hover:bg-teal-100 hover:text-teal-800'
      } ${className}`}
    >
      <span className="text-sm" aria-hidden="true">
        {speaking ? '🔊' : '🔈'}
      </span>
      <span className="sr-only">{speaking ? 'Stop reading' : ariaLabel}</span>
    </button>
  );
};
