import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GamePacing, GameRunMetrics } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { Activity, RotateCcw } from 'lucide-react';

type TapSide = 'LEFT' | 'CENTER' | 'RIGHT';

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
  const preferences = useOptionalAccessibility()?.preferences;
  const resolvedGameplay = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);

  const sequencePattern: TapSide[] =
    resolvedGameplay.mechanics.ruleComplexity >= 3 || difficulty === 'Stimulating'
      ? ['LEFT', 'CENTER', 'RIGHT']
      : resolvedGameplay.mechanics.ruleComplexity === 2 || difficulty === 'Moderate'
      ? ['LEFT', 'LEFT', 'RIGHT']
      : ['LEFT', 'RIGHT'];
  const hasCenterZone = sequencePattern.includes('CENTER');

  const [tapCount, setTapCount] = useState<number>(0);
  const [expectedButton, setExpectedButton] = useState<TapSide>(sequencePattern[0]);
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
    setExpectedButton(sequencePattern[0]);
    setStatusKind('start');
    reactionTimesRef.current = [];
    lastTapRef.current = Date.now();
  }, [difficulty, pacing, adaptiveParams?.itemCount, adaptiveParams?.tier]);

  const handleTap = (btn: TapSide) => {
    if (btn !== expectedButton) return;

    const now = Date.now();
    reactionTimesRef.current.push(Math.max(80, now - lastTapRef.current));
    lastTapRef.current = now;

    audioSynthesizer.playTone(btn === 'LEFT' ? 330 : btn === 'CENTER' ? 392 : 440, 0.15);

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
        mechanicMode: resolvedGameplay.mode,
        appliedMechanics: resolvedGameplay.mechanics.appliedMechanicsSummary,
      });
      setTimeout(() => {
        onComplete(metrics);
      }, 1000);
      return;
    }

    const nextExpected = sequencePattern[nextCount % sequencePattern.length];
    setExpectedButton(nextExpected);
    setStatusKind('next');
  };

  const handleReset = () => {
    setTapCount(0);
    setExpectedButton(sequencePattern[0]);
    setStatusKind('start');
  };

  const feedbackText =
    statusKind === 'done'
      ? t('games_runner.taps_done', { total: targetTaps })
      : statusKind === 'next'
      ? expectedButton === 'CENTER'
        ? 'Now tap CENTER'
        : t('games_runner.taps_next', {
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

      {/* Rhythm Pattern Strip */}
      <div
        data-testid="taps-rhythm-pattern"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lavender-50 border border-purple-200 text-[11px] font-bold text-purple-900"
      >
        <span>Rhythm Cycle:</span>
        <span>{sequencePattern.join(' → ')}</span>
      </div>

      {/* Alternating / Multi-Zone Buttons */}
      <div className={`grid gap-3 mx-auto p-2 ${hasCenterZone ? 'grid-cols-3 max-w-md' : 'grid-cols-2 max-w-sm'}`}>
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

        {hasCenterZone && (
          <button
            type="button"
            onClick={() => handleTap('CENTER')}
            disabled={expectedButton !== 'CENTER'}
            className={`py-6 sm:py-8 rounded-3xl font-black text-sm sm:text-base transition-all duration-200 flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer ${
              expectedButton === 'CENTER'
                ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white scale-105 ring-4 ring-purple-200 animate-pulse'
                : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'
            }`}
            aria-label="Tap Center Button"
          >
            <span className="text-2xl">🙌</span>
            <span>CENTER</span>
          </button>
        )}

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
