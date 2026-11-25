import React, { useState, useEffect } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { SpeechService } from '../../../../services/speechService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { Check, X, HelpCircle, Eye } from 'lucide-react';

interface ShapeMatchGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  onComplete: () => void;
}

const SHAPES = [
  { name: 'Star', symbol: '⭐', color: 'text-amber-500' },
  { name: 'Diamond', symbol: '🔷', color: 'text-blue-500' },
  { name: 'Circle', symbol: '🔴', color: 'text-rose-500' },
  { name: 'Square', symbol: '🟩', color: 'text-emerald-500' },
];

export const ShapeMatchGame: React.FC<ShapeMatchGameProps> = ({
  difficulty,
  pacing = 'balanced',
  onComplete,
}) => {
  const { t } = useLanguage();
  const [prevShape, setPrevShape] = useState<typeof SHAPES[0] | null>(null);
  const [currentShape, setCurrentShape] = useState<typeof SHAPES[0]>(SHAPES[0]);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [customFeedback, setCustomFeedback] = useState<string | null>(null);

  const getTargetGoal = () => {
    if (pacing === 'calm' || difficulty === 'Gentle') return 3;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 7;
    return 5;
  };

  const targetGoal = getTargetGoal();

  const rollNextShape = (lastShape: typeof SHAPES[0]) => {
    // 50% probability of match for clean exercise
    const isMatch = Math.random() < 0.5;
    let next: typeof SHAPES[0];
    if (isMatch) {
      next = lastShape;
    } else {
      const candidates = SHAPES.filter((s) => s.name !== lastShape.name);
      next = candidates[Math.floor(Math.random() * candidates.length)];
    }
    setPrevShape(lastShape);
    setCurrentShape(next);
  };

  useEffect(() => {
    const initial = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    setCurrentShape(initial);
    rollNextShape(initial);
    setCorrectCount(0);
    setCustomFeedback(null);
  }, [difficulty, pacing]);

  const handleDecision = (userClaimedMatch: boolean) => {
    if (!prevShape) return;

    const actuallyMatches = currentShape.name === prevShape.name;
    const isCorrect = userClaimedMatch === actuallyMatches;

    if (isCorrect) {
      audioSynthesizer.playChime('bell');
      const nextCount = correctCount + 1;
      setCorrectCount(nextCount);
      setCustomFeedback(`Wonderful focus! That was ${actuallyMatches ? 'a Match' : 'Not a Match'}.`);

      if (nextCount >= targetGoal) {
        audioSynthesizer.playChime('fanfare');
        setCustomFeedback(`🎉 Excellent attention! You completed ${targetGoal} shape observations!`);
        setTimeout(() => {
          onComplete();
        }, 1100);
        return;
      }
    } else {
      audioSynthesizer.playChime('chime');
      setCustomFeedback(
        actuallyMatches
          ? 'Notice: Both shapes were actually the same symbol!'
          : 'Notice: The shapes were different from each other!'
      );
    }

    rollNextShape(currentShape);
  };

  const handleHint = () => {
    if (prevShape) {
      const text = `Previous was ${prevShape.name}, current is ${currentShape.name}.`;
      setCustomFeedback(text);
      SpeechService.speak(text);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title & Goal */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Eye className="w-3.5 h-3.5 text-purple-600" />
          <span>{t('games_runner.shape_title')}</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {customFeedback || t('games_runner.shape_compare')}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          {correctCount} / {targetGoal}
        </p>
      </div>

      {/* Shapes Display Comparison */}
      <div className="flex items-center justify-center gap-4 sm:gap-8 p-4 bg-lavender-50/50 rounded-2xl border border-purple-100 max-w-sm mx-auto">
        <div className="text-center space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            {t('games_runner.shape_previous')}
          </span>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-dashed border-purple-200 flex items-center justify-center text-3xl sm:text-4xl shadow-2xs">
            {prevShape ? prevShape.symbol : '—'}
          </div>
          <span className="text-xs font-bold text-purple-900 block">
            {prevShape ? prevShape.name : 'Waiting'}
          </span>
        </div>

        <span className="text-xl font-black text-purple-300">vs</span>

        <div className="text-center space-y-1">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
            {t('games_runner.shape_current')}
          </span>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-purple-400 ring-2 ring-purple-100 flex items-center justify-center text-3xl sm:text-4xl shadow-md">
            {currentShape.symbol}
          </div>
          <span className="text-xs font-bold text-purple-900 block">
            {currentShape.name}
          </span>
        </div>
      </div>

      {/* Decision Buttons (Large accessible touch targets) */}
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => handleDecision(true)}
          className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[56px]"
          aria-label="Shapes Match"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{t('games_runner.shape_same_btn')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleDecision(false)}
          className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[56px]"
          aria-label="Shapes Do Not Match"
        >
          <X className="w-5 h-5 stroke-[3]" />
          <span>{t('games_runner.shape_diff_btn')}</span>
        </button>
      </div>

      {/* Hint helper */}
      <div className="pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={handleHint}
          className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition inline-flex items-center space-x-1.5 min-h-[44px]"
        >
          <HelpCircle className="w-4 h-4 text-purple-600" />
          <span>{t('games_runner.need_hint')}</span>
        </button>
      </div>
    </div>
  );
};
