import React, { useState, useEffect } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
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
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stepsTaken, setStepsTaken] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('Guide the friendly runner to the cozy home!');

  useEffect(() => {
    setPlayerPos({ x: 0, y: 0 });
    setStepsTaken(0);
    setFeedback('Use the directional buttons to walk home safely.');
  }, [difficulty]);

  const move = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    let newX = playerPos.x;
    let newY = playerPos.y;

    if (dir === 'UP' && playerPos.y > 0) newY--;
    if (dir === 'DOWN' && playerPos.y < 2) newY++;
    if (dir === 'LEFT' && playerPos.x > 0) newX--;
    if (dir === 'RIGHT' && playerPos.x < 2) newX++;

    if (newX === playerPos.x && newY === playerPos.y) {
      audioSynthesizer.playTone(300, 0.1);
      setFeedback('That way is a boundary! Try another peaceful direction.');
      return;
    }

    audioSynthesizer.playTone(400 + (newX + newY) * 60, 0.15);
    setPlayerPos({ x: newX, y: newY });
    setStepsTaken((s) => s + 1);

    if (newX === 2 && newY === 2) {
      audioSynthesizer.playChime('fanfare');
      setFeedback('🏡 Wonderful! You arrived safely at home!');
      setTimeout(() => {
        onComplete();
      }, 1000);
    } else {
      setFeedback('Walking along the gentle path...');
    }
  };

  const handleRestart = () => {
    setPlayerPos({ x: 0, y: 0 });
    setStepsTaken(0);
    setFeedback('Use the directional buttons to walk home safely.');
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Compass className="w-3.5 h-3.5 text-teal-600" />
          <span>Mini Maze Navigator</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedback}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          Steps taken: {stepsTaken}
        </p>
      </div>

      {/* 3x3 Grid Maze */}
      <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto p-3 bg-lavender-50/70 rounded-3xl border border-purple-100">
        {[0, 1, 2].map((y) =>
          [0, 1, 2].map((x) => {
            const isPlayer = playerPos.x === x && playerPos.y === y;
            const isHome = x === 2 && y === 2;

            return (
              <div
                key={`${x}-${y}`}
                className={`h-16 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 shadow-2xs border ${
                  isPlayer
                    ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-300 ring-2 ring-rose-200 scale-105'
                    : isHome
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-teal-300'
                    : 'bg-white border-purple-100'
                }`}
                aria-label={
                  isPlayer ? 'Player position' : isHome ? 'Home destination' : 'Path tile'
                }
              >
                {isPlayer ? '🏃' : isHome ? '🏡' : ''}
              </div>
            );
          })
        )}
      </div>

      {/* Directional Pad */}
      <div className="space-y-1.5 max-w-xs mx-auto">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => move('UP')}
            className="w-14 h-14 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold flex items-center justify-center transition shadow-xs cursor-pointer min-h-[44px]"
            aria-label="Move Up"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => move('LEFT')}
            className="w-14 h-14 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold flex items-center justify-center transition shadow-xs cursor-pointer min-h-[44px]"
            aria-label="Move Left"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => move('DOWN')}
            className="w-14 h-14 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold flex items-center justify-center transition shadow-xs cursor-pointer min-h-[44px]"
            aria-label="Move Down"
          >
            <ArrowDown className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => move('RIGHT')}
            className="w-14 h-14 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold flex items-center justify-center transition shadow-xs cursor-pointer min-h-[44px]"
            aria-label="Move Right"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Restart */}
      <div className="pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={handleRestart}
          className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition inline-flex items-center space-x-1.5 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Position</span>
        </button>
      </div>
    </div>
  );
};
