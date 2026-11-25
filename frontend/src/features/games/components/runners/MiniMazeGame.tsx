import React, { useState, useEffect } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { Compass, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface MiniMazeGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  onComplete: () => void;
}

export const MiniMazeGame: React.FC<MiniMazeGameProps> = ({
  difficulty,
  onComplete,
}) => {
  const { t } = useLanguage();
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stepsTaken, setStepsTaken] = useState<number>(0);
  const [feedbackKey, setFeedbackKey] = useState<'intro' | 'arrived' | 'walking' | 'pond' | 'boundary'>('intro');

  const getGridSize = (diff: GameDifficulty) => {
    switch (diff) {
      case 'Gentle':
        return 3; // 3x3 open garden
      case 'Moderate':
        return 4; // 4x4 gentle pathway
      case 'Stimulating':
        return 4; // 4x4 with a peaceful pond obstacle
      default:
        return 3;
    }
  };

  const gridSize = getGridSize(difficulty);
  const goalPos = { x: gridSize - 1, y: gridSize - 1 };

  // Obstacle (peaceful pond) for Stimulating difficulty
  const isObstacle = (x: number, y: number) => {
    if (difficulty === 'Stimulating') {
      return x === 1 && y === 1;
    }
    return false;
  };

  useEffect(() => {
    setPlayerPos({ x: 0, y: 0 });
    setStepsTaken(0);
    setFeedbackKey('intro');
  }, [difficulty]);

  const move = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    let newX = playerPos.x;
    let newY = playerPos.y;

    if (dir === 'UP' && playerPos.y > 0) newY--;
    if (dir === 'DOWN' && playerPos.y < gridSize - 1) newY++;
    if (dir === 'LEFT' && playerPos.x > 0) newX--;
    if (dir === 'RIGHT' && playerPos.x < gridSize - 1) newX++;

    // Check obstacle collision
    if (isObstacle(newX, newY)) {
      audioSynthesizer.playTone(280, 0.12);
      setFeedbackKey('pond');
      return;
    }

    // Check boundary
    if (newX === playerPos.x && newY === playerPos.y) {
      audioSynthesizer.playTone(300, 0.1);
      setFeedbackKey('boundary');
      return;
    }

    audioSynthesizer.playTone(400 + (newX + newY) * 50, 0.15);
    setPlayerPos({ x: newX, y: newY });
    setStepsTaken((s) => s + 1);

    if (newX === goalPos.x && newY === goalPos.y) {
      audioSynthesizer.playChime('fanfare');
      setFeedbackKey('arrived');
      setTimeout(() => {
        onComplete();
      }, 1000);
    } else {
      setFeedbackKey('walking');
    }
  };

  const handleRestart = () => {
    setPlayerPos({ x: 0, y: 0 });
    setStepsTaken(0);
    setFeedbackKey('intro');
  };

  const feedbackText =
    feedbackKey === 'arrived'
      ? t('games_runner.maze_arrived')
      : feedbackKey === 'pond'
      ? 'A peaceful garden pond is there! Walk gently around it 🌸'
      : feedbackKey === 'boundary'
      ? 'That way is a boundary! Try another peaceful direction.'
      : feedbackKey === 'walking'
      ? 'Walking along the gentle path...'
      : t('games_runner.maze_intro', { size: gridSize });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Compass className="w-3.5 h-3.5 text-teal-600" />
          <span>{t('games_runner.maze_title')} • {difficulty} ({gridSize}x{gridSize})</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedbackText}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          Steps taken: {stepsTaken} • Target destination: Cozy Home 🏡
        </p>
      </div>

      {/* Grid Maze */}
      <div
        className={`grid gap-2 mx-auto p-3 bg-lavender-50/70 rounded-3xl border border-purple-100 ${
          gridSize === 3 ? 'grid-cols-3 max-w-[240px]' : 'grid-cols-4 max-w-[300px]'
        }`}
      >
        {Array.from({ length: gridSize }).map((_, y) =>
          Array.from({ length: gridSize }).map((_, x) => {
            const isPlayer = playerPos.x === x && playerPos.y === y;
            const isHome = x === goalPos.x && y === goalPos.y;
            const isPond = isObstacle(x, y);

            return (
              <div
                key={`${x}-${y}`}
                className={`${gridSize === 3 ? 'h-16' : 'h-13'} rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 shadow-2xs border ${
                  isPlayer
                    ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-300 ring-2 ring-rose-200 scale-105'
                    : isHome
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-teal-300'
                    : isPond
                    ? 'bg-blue-100 border-blue-300 text-blue-600'
                    : 'bg-white border-purple-100'
                }`}
                aria-label={
                  isPlayer
                    ? 'Player position'
                    : isHome
                    ? 'Home destination'
                    : isPond
                    ? 'Garden pond obstacle'
                    : 'Path tile'
                }
              >
                {isPlayer ? '🏃' : isHome ? '🏡' : isPond ? '🪷' : ''}
              </div>
            );
          })
        )}
      </div>

      {/* Direction Controls */}
      <div className="space-y-2 max-w-[240px] mx-auto pt-1">
        <button
          type="button"
          onClick={() => move('UP')}
          className="w-16 h-12 mx-auto bg-lavender-100 hover:bg-lavender-200 text-purple-900 rounded-2xl flex items-center justify-center border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
          aria-label="Move Up"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => move('LEFT')}
            className="w-16 h-12 bg-lavender-100 hover:bg-lavender-200 text-purple-900 rounded-2xl flex items-center justify-center border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
            aria-label="Move Left"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition shadow-2xs"
            title="Restart Maze"
            aria-label="Restart Maze"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => move('RIGHT')}
            className="w-16 h-12 bg-lavender-100 hover:bg-lavender-200 text-purple-900 rounded-2xl flex items-center justify-center border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
            aria-label="Move Right"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => move('DOWN')}
          className="w-16 h-12 mx-auto bg-lavender-100 hover:bg-lavender-200 text-purple-900 rounded-2xl flex items-center justify-center border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
          aria-label="Move Down"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
