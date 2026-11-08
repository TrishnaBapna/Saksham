import React from 'react';
import { GameItem, GameDifficulty } from '../../../types/index.js';
import { ArrowLeft, Pause, Play, RotateCcw, Clock, Sparkles } from 'lucide-react';

interface GameHeaderProps {
  game: GameItem;
  currentDifficulty: GameDifficulty;
  onChangeDifficulty: (diff: GameDifficulty) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onExit: () => void;
  elapsedSeconds: number;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  currentDifficulty,
  onChangeDifficulty,
  isPaused,
  onTogglePause,
  onRestart,
  onExit,
  elapsedSeconds
}) => {
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
    <div className="bg-white rounded-3xl p-4 border border-purple-200 shadow-soft-purple space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-lavender-50 border border-purple-200 text-purple-700 hover:bg-lavender-100 transition shadow-2xs"
            aria-label="Exit game and return to Mind Games library"
            title="Exit activity"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-saksham-darkText">
              {game.title}
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-gray-500">
              <span className="font-semibold text-purple-700">{game.categoryLabel}</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>{formatTime(elapsedSeconds)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Subtle Auto-Adaptive Indicator (Non-interactive peaceful badge) */}
          <span
            className="px-2.5 py-1.5 rounded-xl border border-purple-200 bg-lavender-50 text-[11px] font-bold text-purple-900 shadow-2xs inline-flex items-center gap-1"
            title="Difficulty adapts automatically to your comfort"
          >
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>Auto-Adaptive</span>
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
            onClick={onTogglePause}
            className={`p-2 rounded-xl transition ${
              isPaused
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-lavender-50 hover:bg-lavender-100 text-purple-700 border border-purple-200 shadow-2xs'
            }`}
            title={isPaused ? 'Resume' : 'Pause'}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Restart */}
          <button
            onClick={onRestart}
            className="p-2 rounded-xl bg-lavender-50 hover:bg-lavender-100 text-purple-700 border border-purple-200 transition shadow-2xs"
            title="Restart activity"
            aria-label="Restart activity"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isPaused && (
        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-xs text-amber-900 text-center font-medium animate-fadeIn">
          ⏸️ Activity is paused. Take your time to rest! Tap ▶ Resume whenever you are ready.
        </div>
      )}
    </div>
  );
};
