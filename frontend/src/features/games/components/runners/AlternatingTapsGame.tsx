import React, { useState, useEffect } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { Activity, RotateCcw } from 'lucide-react';

interface AlternatingTapsGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  onComplete: () => void;
}

export const AlternatingTapsGame: React.FC<AlternatingTapsGameProps> = ({
  difficulty,
  pacing = 'balanced',
  onComplete,
}) => {
  const [tapCount, setTapCount] = useState<number>(0);
  const [expectedButton, setExpectedButton] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [feedback, setFeedback] = useState<string>('Start with the LEFT button, then alternate.');

  const getTargetTaps = () => {
    if (pacing === 'calm' || difficulty === 'Gentle') return 5;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 15;
    return 10;
  };

  const targetTaps = getTargetTaps();

  useEffect(() => {
    setTapCount(0);
    setExpectedButton('LEFT');
    setFeedback('Tap LEFT to start the smooth rhythm.');
  }, [difficulty, pacing]);

  const handleTap = (btn: 'LEFT' | 'RIGHT') => {
    if (btn !== expectedButton) return;

    audioSynthesizer.playTone(btn === 'LEFT' ? 330 : 440, 0.15);

    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (nextCount >= targetTaps) {
      audioSynthesizer.playChime('fanfare');
      setFeedback(`🎉 Wonderful motor rhythm! You completed all ${targetTaps} alternating taps!`);
      setTimeout(() => {
        onComplete();
      }, 1000);
      return;
    }

    const nextExpected = btn === 'LEFT' ? 'RIGHT' : 'LEFT';
    setExpectedButton(nextExpected);
    setFeedback(`Great! Now tap ${nextExpected}.`);
  };

  const handleReset = () => {
    setTapCount(0);
    setExpectedButton('LEFT');
    setFeedback('Start with the LEFT button, then alternate.');
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-6 text-center animate-fadeIn">
      {/* Title & Goal */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Activity className="w-3.5 h-3.5 text-teal-600" />
          <span>Alternating Finger Taps</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedback}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          Taps: {tapCount} / {targetTaps}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto bg-purple-100 rounded-full h-2.5 overflow-hidden mt-2">
          <div
            className="bg-teal-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${(tapCount / targetTaps) * 100}%` }}
          />
        </div>
      </div>

      {/* Alternating Buttons */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto p-2">
        {/* LEFT Button */}
        <button
          type="button"
          onClick={() => handleTap('LEFT')}
          disabled={expectedButton !== 'LEFT'}
          className={`py-6 sm:py-8 rounded-3xl font-black text-sm sm:text-base transition-all duration-200 flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer ${
            expectedButton === 'LEFT'
              ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white scale-105 ring-4 ring-teal-200 animate-pulse'
              : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'
          }`}
          aria-label="Tap Left Button"
        >
          <span className="text-2xl">👈</span>
          <span>LEFT</span>
        </button>

        {/* RIGHT Button */}
        <button
          type="button"
          onClick={() => handleTap('RIGHT')}
          disabled={expectedButton !== 'RIGHT'}
          className={`py-6 sm:py-8 rounded-3xl font-black text-sm sm:text-base transition-all duration-200 flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer ${
            expectedButton === 'RIGHT'
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white scale-105 ring-4 ring-indigo-200 animate-pulse'
              : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'
          }`}
          aria-label="Tap Right Button"
        >
          <span className="text-2xl">👉</span>
          <span>RIGHT</span>
        </button>
      </div>

      {/* Reset control */}
      <div className="pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition inline-flex items-center space-x-1.5 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restart Round</span>
        </button>
      </div>
    </div>
  );
};
