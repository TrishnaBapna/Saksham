import React from 'react';
import { GameItem, GameDifficulty } from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { ArrowLeft, Pause, Play, RotateCcw, Clock, Sparkles, HelpCircle } from 'lucide-react';

interface GameHeaderProps {
  game: GameItem;
  currentDifficulty: GameDifficulty;
  onChangeDifficulty: (diff: GameDifficulty) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onExit: () => void;
  elapsedSeconds: number;
  onHelp?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  currentDifficulty,
  onChangeDifficulty,
  isPaused,
  onTogglePause,
  onRestart,
  onExit,
  elapsedSeconds,
  onHelp
}) => {
  const { t } = useLanguage();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const difficulties: GameDifficulty[] = ['Gentle', 'Moderate', 'Stimulating'];

  const cycleDifficulty = () => {
    const idx = difficulties.indexOf(currentDifficulty);
    const next = difficulties[(idx + 1) % difficulties.length];
    onChangeDifficulty(next);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-purple-200 shadow-soft-purple space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          {/* Predictable, Clearly Labeled Exit Action */}
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center space-x-1.5 px-3 py-2 min-h-[44px] rounded-2xl bg-lavender-50 border border-purple-200 text-purple-900 hover:bg-lavender-100 transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
            aria-label="Exit game and return to Mind Games library"
            title="Exit activity"
          >
            <ArrowLeft className="w-4 h-4 text-purple-700" aria-hidden="true" />
            <span className="font-bold text-xs">{t('games.back_to_games') || 'Back to games'}</span>
          </button>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-saksham-darkText">
              {t(`game.${game.id}.title`) || game.title}
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-gray-500">
              <span className="font-semibold text-purple-700">{t(`game.category.${game.category}`) || game.categoryLabel}</span>
              <span>•</span>
              <span className="flex items-center space-x-1" aria-label={`Time elapsed: ${formatTime(elapsedSeconds)}`}>
                <Clock className="w-3 h-3 text-gray-400" aria-hidden="true" />
                <span>{formatTime(elapsedSeconds)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Reorientation / Help Action */}
          {onHelp && (
            <button
              type="button"
              onClick={onHelp}
              className="inline-flex items-center space-x-1 px-3 py-2 min-h-[44px] rounded-2xl bg-lavender-50 hover:bg-lavender-100 border border-purple-200 text-purple-800 font-bold text-xs transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer"
              aria-label="Help and orientation"
              title="Help and orientation"
            >
              <HelpCircle className="w-4 h-4 text-purple-600" aria-hidden="true" />
              <span>{t('games.help_button') || 'Help'}</span>
            </button>
          )}

          {/* Subtle Auto-Adaptive Indicator */}
          <span
            className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl border border-purple-200 bg-lavender-50 text-[11px] font-bold text-purple-900 shadow-2xs items-center gap-1"
            title="Difficulty adapts automatically to your comfort"
          >
            <Sparkles className="w-3 h-3 text-purple-600" aria-hidden="true" />
            <span>{t('games.auto_adaptive') || 'Auto-Adaptive'}</span>
          </span>

          {/* Accessible / Test override hook (hidden from patient visual interface) */}
          <button
            onClick={cycleDifficulty}
            className="sr-only"
            title="Switch difficulty"
            aria-label={`Current difficulty: ${currentDifficulty}. Click to change.`}
          >
            Level: {currentDifficulty}
          </button>

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={onTogglePause}
            className={`p-2.5 min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center transition cursor-pointer ${
              isPaused
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-lavender-50 hover:bg-lavender-100 text-purple-700 border border-purple-200 shadow-2xs'
            }`}
            title={isPaused ? 'Resume game' : 'Pause game'}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? <Play className="w-4 h-4 ml-0.5" aria-hidden="true" /> : <Pause className="w-4 h-4" aria-hidden="true" />}
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={onRestart}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-2xl bg-lavender-50 hover:bg-lavender-100 text-purple-700 border border-purple-200 flex items-center justify-center transition shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
            title="Restart activity"
            aria-label="Restart activity"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isPaused && (
        <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-900 text-center font-medium animate-fadeIn">
          ⏸️ Activity is paused. Take your time to rest! Tap ▶ Resume whenever you are ready.
        </div>
      )}
    </div>
  );
};
