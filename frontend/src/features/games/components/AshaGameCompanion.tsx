import React, { useState, useEffect } from 'react';
import { SpeechService } from '../../../services/speechService.js';
import { Volume2, VolumeX, Lightbulb, Heart, Coffee } from 'lucide-react';

interface AshaGameCompanionProps {
  instructions: string;
  hint?: string;
  onTakeBreak?: () => void;
}

export const AshaGameCompanion: React.FC<AshaGameCompanionProps> = ({
  instructions,
  hint,
  onTakeBreak
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeMessage, setActiveMessage] = useState<string>(instructions);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setActiveMessage(instructions);
    setShowHint(false);
  }, [instructions]);

  useEffect(() => {
    return () => {
      SpeechService.cancelSpeech();
    };
  }, []);

  const handleReadAloud = (textToSpeak: string) => {
    if (isSpeaking) {
      SpeechService.cancelSpeech();
      setIsSpeaking(false);
      return;
    }

    SpeechService.speak(
      textToSpeak,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleOfferHint = () => {
    const hintText = hint || 'Look for common colors or shapes that match what you saw first.';
    setActiveMessage(`Gentle Hint: ${hintText}`);
    setShowHint(true);
    handleReadAloud(`Here is a gentle hint: ${hintText}`);
  };

  const handleEncourage = () => {
    const praises = [
      'You are doing wonderfully! There is no hurry at all.',
      'Take your time. We are enjoying this together!',
      'Wonderful effort! Every step is a positive moment.'
    ];
    const picked = praises[Math.floor(Math.random() * praises.length)];
    setActiveMessage(picked);
    handleReadAloud(picked);
  };

  const handleBreak = () => {
    const breakMsg = 'Remember, you can pause or stop whenever you like. Taking a break is part of good care!';
    setActiveMessage(breakMsg);
    handleReadAloud(breakMsg);
    if (onTakeBreak) onTakeBreak();
  };

  return (
    <div className="bg-gradient-to-r from-lavender-100 via-purple-50 to-pink-50 p-4 rounded-3xl border border-purple-200 shadow-soft-purple space-y-3">
      {/* Top Banner */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-xs flex-shrink-0">
            🌸
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-purple-950">Asha AI Companion</span>
              <span className="text-[10px] font-bold text-purple-700 bg-white/80 px-2 py-0.5 rounded-full border border-purple-200">
                Supportive Guide
              </span>
            </div>
            <p className="text-xs text-purple-900 mt-1 leading-relaxed font-medium">
              "{activeMessage}"
            </p>
          </div>
        </div>

        {/* Read Aloud Button */}
        <button
          onClick={() => handleReadAloud(activeMessage)}
          className={`p-2.5 rounded-2xl transition flex-shrink-0 ${
            isSpeaking
              ? 'bg-purple-600 text-white animate-pulse'
              : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs'
          }`}
          title={isSpeaking ? 'Stop Asha voice' : 'Listen to instructions'}
          aria-label={isSpeaking ? 'Stop Asha voice' : 'Listen to instructions'}
        >
          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Action Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-purple-200/60">
        <button
          onClick={handleOfferHint}
          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
            showHint
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-white text-purple-800 border border-purple-200 hover:bg-lavender-100'
          }`}
          aria-label="Ask Asha for a gentle hint"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          <span>Need a Hint?</span>
        </button>

        <button
          onClick={handleEncourage}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-purple-800 border border-purple-200 hover:bg-lavender-100 transition shadow-2xs"
          aria-label="Get warm encouragement"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>Encourage Me</span>
        </button>

        <button
          onClick={handleBreak}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-purple-800 border border-purple-200 hover:bg-lavender-100 transition shadow-2xs"
          aria-label="Take a gentle break"
        >
          <Coffee className="w-3.5 h-3.5 text-purple-600" />
          <span>Take a Break</span>
        </button>
      </div>
    </div>
  );
};
