import React, { useState, useEffect, useRef } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { Target, RotateCcw } from 'lucide-react';

interface TargetCatchGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  onComplete: () => void;
}

export const TargetCatchGame: React.FC<TargetCatchGameProps> = ({
  difficulty,
  pacing = 'balanced',
  onComplete,
}) => {
  const [catches, setCatches] = useState<number>(0);
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);
  const [feedback, setFeedback] = useState<string>('Tap the butterfly when it appears!');
  const [isSpawned, setIsSpawned] = useState<boolean>(false);

  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getTargetGoal = () => {
    if (pacing === 'calm' || difficulty === 'Gentle') return 3;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 7;
    return 5;
  };

  const getSpawnDelay = () => {
    if (pacing === 'calm' || difficulty === 'Gentle') return 1000;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 450;
    return 650;
  };

  const goal = getTargetGoal();

  const spawnNext = () => {
    setIsSpawned(false);
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);

    const delay = getSpawnDelay();
    spawnTimerRef.current = setTimeout(() => {
      // Position percentages (from 10% to 80% to keep comfortably within bounds)
      const x = Math.floor(Math.random() * 70) + 10;
      const y = Math.floor(Math.random() * 60) + 15;
      setTargetPosition({ x, y });
      setIsSpawned(true);
    }, delay);
  };

  useEffect(() => {
    setCatches(0);
    setFeedback(`Catch Target 1 of ${goal}...`);
    spawnNext();

    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, [difficulty, pacing]);

  const handleHit = () => {
    if (!isSpawned) return;

    audioSynthesizer.playChime('bell');
    const nextCatches = catches + 1;
    setCatches(nextCatches);

    if (nextCatches >= goal) {
      setIsSpawned(false);
      audioSynthesizer.playChime('fanfare');
      setFeedback(`🎉 Excellent reflexes! You caught all ${goal} friendly targets!`);
      setTimeout(() => {
        onComplete();
      }, 1000);
      return;
    }

    setFeedback(`Caught ${nextCatches} of ${goal}! Getting ready...`);
    spawnNext();
  };

  const handleRestart = () => {
    setCatches(0);
    setFeedback(`Catch Target 1 of ${goal}...`);
    spawnNext();
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title & Goal */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Target className="w-3.5 h-3.5 text-rose-500" />
          <span>Rapid Target Catch</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedback}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          Caught: {catches} / {goal}
        </p>
      </div>

      {/* Target Arena */}
      <div className="relative w-full h-56 sm:h-64 bg-gradient-to-b from-lavender-50 to-pink-50/40 rounded-3xl border-2 border-purple-100 overflow-hidden shadow-inner flex items-center justify-center">
        {!isSpawned && catches < goal && (
          <div className="text-xs font-bold text-purple-400 animate-pulse">
            Waiting for next target... 🌿
          </div>
        )}

        {isSpawned && targetPosition && (
          <button
            type="button"
            onClick={handleHit}
            style={{
              position: 'absolute',
              left: `${targetPosition.x}%`,
              top: `${targetPosition.y}%`,
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-amber-400 to-rose-500 hover:from-amber-300 hover:to-rose-400 active:scale-90 rounded-full flex flex-col items-center justify-center text-white text-2xl sm:text-3xl shadow-lg border-2 border-white ring-4 ring-rose-200/60 cursor-pointer animate-in zoom-in-50 duration-150"
            aria-label="Catch Target"
          >
            <span>🦋</span>
          </button>
        )}
      </div>

      {/* Reset */}
      <div className="pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={handleRestart}
          className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition inline-flex items-center space-x-1.5 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Start New Round</span>
        </button>
      </div>
    </div>
  );
};
