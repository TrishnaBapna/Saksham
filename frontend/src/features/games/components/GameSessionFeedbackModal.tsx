import React, { useState } from 'react';
import { GameItem, GameDifficulty } from '../../../types/index.js';
import { Sparkles, Heart, RotateCcw, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

interface GameSessionFeedbackModalProps {
  game: GameItem;
  difficulty: GameDifficulty;
  elapsedSeconds: number;
  onPlayAgain: () => void;
  onFinish: (feedback?: 'Loved it' | 'Relaxing' | 'Just right' | 'A bit tricky') => void;
}

export const GameSessionFeedbackModal: React.FC<GameSessionFeedbackModalProps> = ({
  game,
  difficulty: _difficulty,
  elapsedSeconds,
  onPlayAgain,
  onFinish
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState<
    'Loved it' | 'Relaxing' | 'Just right' | 'A bit tricky' | undefined
  >('Relaxing');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} seconds`;
    return `${m} min ${s > 0 ? `${s}s` : ''}`;
  };

  const feedbackOptions: {
    label: 'Loved it' | 'Relaxing' | 'Just right' | 'A bit tricky';
    icon: string;
    desc: string;
  }[] = [
    { label: 'Relaxing', icon: '🌿', desc: 'That felt comfortable' },
    { label: 'Just right', icon: '👍', desc: 'Comfortable rhythm' },
    { label: 'A bit tricky', icon: '🤔', desc: 'I’d like something easier' },
    { label: 'Loved it', icon: '❤️', desc: 'Loved this activity' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Activity Completed Celebration"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-purple-200 shadow-2xl space-y-5 text-center">
        {/* Celebration Header */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center mx-auto shadow-md">
          <Sparkles className="w-8 h-8 text-yellow-200" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-saksham-darkText">
            Wonderful Participation!
          </h2>
          <p className="text-xs text-purple-700 font-semibold mt-1">
            You completed {game.title}
          </p>
          <div className="inline-flex items-center space-x-1.5 text-xs text-gray-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 mt-2">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span>Time spent enjoying: {formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Clinical Disclaimer Safeguard */}
        <div className="bg-lavender-50 p-3 rounded-2xl border border-purple-200 text-[11px] text-purple-900 flex items-start space-x-2 text-left">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Cognitive Wellness Note:</strong> This activity is designed purely for supportive mental engagement. It is not an IQ test or clinical assessment.
          </span>
        </div>

        {/* How did this feel? */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold text-gray-700 flex items-center space-x-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>How did this activity feel for you? (Optional)</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {feedbackOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSelectedFeedback(opt.label)}
                className={`p-2.5 rounded-2xl border text-xs font-bold transition flex items-center space-x-2 ${
                  selectedFeedback === opt.label
                    ? 'border-purple-600 bg-purple-100 text-purple-950 ring-2 ring-purple-300'
                    : 'border-purple-100 bg-white hover:bg-lavender-50 text-gray-700'
                }`}
              >
                <span className="text-base">{opt.icon}</span>
                <div className="text-left leading-tight">
                  <div>{opt.label}</div>
                  <div className="text-[10px] text-gray-500 font-normal">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-2xl bg-lavender-100 hover:bg-lavender-200 text-purple-900 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            onClick={() => onFinish(selectedFeedback)}
            className="flex-1 py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition"
          >
            <span>Explore More</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
