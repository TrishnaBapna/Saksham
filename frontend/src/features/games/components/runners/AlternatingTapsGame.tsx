import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GamePacing, GameRunMetrics } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { Activity, RotateCcw } from 'lucide-react';

interface AlternatingTapsGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
}

export const AlternatingTapsGame: React.FC<AlternatingTapsGameProps> = ({
  difficulty,
  pacing = 'balanced',
  adaptiveParams,
  onComplete,
}) => {
  const { t } = useLanguage();
  const [tapCount, setTapCount] = useState<number>(0);
  const [expectedButton, setExpectedButton] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [statusKind, setStatusKind] = useState<'start' | 'next' | 'done'>('start');
  const reactionTimesRef = useRef<number[]>([]);
  const lastTapRef = useRef(Date.now());

  const getTargetTaps = () => {
    if (adaptiveParams?.itemCount) {
      return Math.max(5, Math.min(20, adaptiveParams.itemCount));
    }
    if (pacing === 'calm' || difficulty === 'Gentle') return 5;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 15;
    return 10;
  };

  const targetTaps = getTargetTaps();

  useEffect(() => {
    setTapCount(0);
    setExpectedButton('LEFT');
    setStatusKind('start');
    reactionTimesRef.current = [];
    lastTapRef.current = Date.now();
  }, [difficulty, pacing, adaptiveParams?.itemCount, adaptiveParams?.tier]);

  const handleTap = (btn: 'LEFT' | 'RIGHT') => {
    if (btn !== expectedButton) return;

    const now = Date.now();
    reactionTimesRef.current.push(Math.max(80, now - lastTapRef.current));
    lastTapRef.current = now;

    audioSynthesizer.playTone(btn === 'LEFT' ? 330 : 440, 0.15);

    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (nextCount >= targetTaps) {
      audioSynthesizer.playChime('fanfare');
      setStatusKind('done');
      const metrics = buildGameRunMetrics({
        correctAnswers: nextCount,
        incorrectAnswers: 0,
        hintsUsed: 0,
        reactionTimesMs: reactionTimesRef.current,
        completionStatus: 'completed',
      });
      setTimeout(() => {
        onComplete(metrics);
      }, 1000);
      return;
    }

    const nextExpected = btn === 'LEFT' ? 'RIGHT' : 'LEFT';
    setExpectedButton(nextExpected);
    setStatusKind('next');
  };

  const handleReset = () => {
    setTapCount(0);
    setExpectedButton('LEFT');
    setStatusKind('start');
  };

  const feedbackText =
    statusKind === 'done'
      ? t('games_runner.taps_done', { total: targetTaps })
      : statusKind === 'next'
      ? t('games_runner.taps_next', {
          side: expectedButton === 'LEFT' ? t('games_runner.taps_left') : t('games_runner.taps_right'),
        })
      : t('games_runner.taps_start');

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-6 text-center animate-fadeIn">
      {/* Title & Goal */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Activity className="w-3.5 h-3.5 text-teal-600" />
          <span>{t('games_runner.taps_title')}</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedbackText}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          {t('games_runner.taps_count', { count: tapCount, total: targetTaps })}
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
          aria-label={t('games_runner.taps_left')}
        >
          <span className="text-2xl">👈</span>
          <span>{t('games_runner.taps_left')}</span>
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
          aria-label={t('games_runner.taps_right')}
        >
          <span className="text-2xl">👉</span>
          <span>{t('games_runner.taps_right')}</span>
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
          <span>{t('games_runner.math_restart')}</span>
        </button>
      </div>
    </div>
  );
};
