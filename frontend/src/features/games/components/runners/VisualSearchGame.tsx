import React, { useState, useEffect } from 'react';
import { GameDifficulty } from '../../../../types/index.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { Search, Sparkles, CheckCircle, HelpCircle } from 'lucide-react';

interface VisualSearchGameProps {
  difficulty: GameDifficulty;
  onComplete: () => void;
}

const SEARCH_POOL = [
  { symbol: '🌸', name: 'Pink Lotus' },
  { symbol: '🌿', name: 'Jasmine Leaf' },
  { symbol: '🍂', name: 'Autumn Leaf' },
  { symbol: '🐦', name: 'Little Bird' },
  { symbol: '☕', name: 'Warm Cup' },
  { symbol: '📖', name: 'Story Book' },
  { symbol: '🔔', name: 'Temple Bell' },
  { symbol: '⭐', name: 'Golden Star' }
];

export const VisualSearchGame: React.FC<VisualSearchGameProps> = ({
  difficulty,
  onComplete
}) => {
  const { t } = useLanguage();
  const getGridSize = (diff: GameDifficulty) => {
    switch (diff) {
      case 'Gentle':
        return 9; // 3x3
      case 'Moderate':
        return 16; // 4x4
      case 'Stimulating':
        return 20; // 4x5
      default:
        return 9;
    }
  };

  const [targetItem, setTargetItem] = useState<{ symbol: string; name: string }>(SEARCH_POOL[0]);
  const [gridItems, setGridItems] = useState<{ id: number; symbol: string; isTarget: boolean }[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFound, setIsFound] = useState(false);

  const initialize = () => {
    const size = getGridSize(difficulty);
    const chosenTarget = SEARCH_POOL[Math.floor(Math.random() * SEARCH_POOL.length)];
    setTargetItem(chosenTarget);

    const distractors = SEARCH_POOL.filter((i) => i.symbol !== chosenTarget.symbol);
    const targetIndex = Math.floor(Math.random() * size);

    const items: { id: number; symbol: string; isTarget: boolean }[] = [];
    for (let i = 0; i < size; i++) {
      if (i === targetIndex) {
        items.push({ id: i, symbol: chosenTarget.symbol, isTarget: true });
      } else {
        const randDistractor = distractors[Math.floor(Math.random() * distractors.length)];
        items.push({ id: i, symbol: randDistractor.symbol, isTarget: false });
      }
    }

    setGridItems(items);
    setFeedback(null);
    setIsFound(false);
  };

  useEffect(() => {
    initialize();
  }, [difficulty]);

  const handleItemClick = (isTarget: boolean) => {
    if (isFound) return;

    if (isTarget) {
      setIsFound(true);
      setFeedback(t('games.found_target', { name: targetItem.name }) || `Wonderful! You found the ${targetItem.name} ${targetItem.symbol}! 🌸`);
      setTimeout(onComplete, 1200);
    } else {
      setFeedback(t('games.keep_scanning', { name: targetItem.name }) || `That is a peaceful symbol! Keep scanning for the ${targetItem.name} ${targetItem.symbol}.`);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      {/* Target Banner */}
      <div className="bg-gradient-to-r from-purple-100 via-lavender-50 to-pink-50 p-4 rounded-2xl border border-purple-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-purple-300 flex items-center justify-center text-3xl shadow-xs">
            {targetItem.symbol}
          </div>
          <div>
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center space-x-1">
              <Search className="w-3 h-3 text-purple-500" />
              <span>{t('games.target_to_spot') || 'Target to Spot'}</span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-saksham-darkText">
              {t('games.find_target', { name: targetItem.name }) || `Find the ${targetItem.name}`}
            </h3>
          </div>
        </div>

        <span className="text-xs font-bold text-purple-800 bg-white/80 px-2.5 py-1 rounded-full border border-purple-200 shadow-2xs">
          Level: {difficulty}
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start space-x-2 animate-fadeIn ${
            isFound
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
              : 'bg-lavender-50 border-purple-200 text-purple-900'
          }`}
        >
          {isFound ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid of items */}
      <div
        className={`grid gap-3 ${
          gridItems.length === 9
            ? 'grid-cols-3 max-w-xs mx-auto'
            : gridItems.length === 16
            ? 'grid-cols-4 max-w-sm mx-auto'
            : 'grid-cols-4 sm:grid-cols-5 max-w-md mx-auto'
        }`}
      >
        {gridItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item.isTarget)}
            className={`aspect-square rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl transition-all duration-200 transform active:scale-95 border-2 ${
              isFound && item.isTarget
                ? 'bg-emerald-100 border-emerald-400 ring-4 ring-emerald-200 animate-bounce'
                : 'bg-lavender-50 border-purple-200 hover:border-purple-400 hover:bg-white shadow-2xs'
            }`}
            aria-label={`Item: ${item.symbol}`}
          >
            <span>{item.symbol}</span>
          </button>
        ))}
      </div>

      <div className="text-center text-xs text-gray-500 flex items-center justify-center space-x-1">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>{t('games.scan_comfort_pace') || 'Scan row by row at your own comfortable pace'}</span>
      </div>
    </div>
  );
};
