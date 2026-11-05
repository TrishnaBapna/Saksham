import React, { useState, useEffect } from 'react';
import { GameDifficulty } from '../../../../types/index.js';
import { Sparkles } from 'lucide-react';

interface CardItem {
  id: number;
  symbol: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface CardMatchingGameProps {
  difficulty: GameDifficulty;
  onComplete: () => void;
  onRequestHint?: () => void;
}

const SYMBOLS_POOL = [
  { symbol: '🌸', name: 'Lotus Flower' },
  { symbol: '☕', name: 'Warm Tea Cup' },
  { symbol: '📖', name: 'Story Book' },
  { symbol: '🐦', name: 'Garden Songbird' },
  { symbol: '🌿', name: 'Jasmine Leaves' },
  { symbol: '🔔', name: 'Temple Bell' },
  { symbol: '🕯️', name: 'Peaceful Candle' },
  { symbol: '🎨', name: 'Color Palette' }
];

export const CardMatchingGame: React.FC<CardMatchingGameProps> = ({
  difficulty,
  onComplete
}) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  const getPairCount = (diff: GameDifficulty) => {
    switch (diff) {
      case 'Gentle':
        return 3; // 6 cards
      case 'Moderate':
        return 6; // 12 cards
      case 'Stimulating':
        return 8; // 16 cards
      default:
        return 3;
    }
  };

  const totalPairs = getPairCount(difficulty);

  const initializeGame = () => {
    const pairCount = getPairCount(difficulty);
    const chosen = SYMBOLS_POOL.slice(0, pairCount);
    const deck: CardItem[] = [];

    chosen.forEach((item, index) => {
      deck.push({
        id: index * 2,
        symbol: item.symbol,
        name: item.name,
        isFlipped: false,
        isMatched: false
      });
      deck.push({
        id: index * 2 + 1,
        symbol: item.symbol,
        name: item.name,
        isFlipped: false,
        isMatched: false
      });
    });

    // Shuffle gently
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setSelectedCards([]);
    setIsChecking(false);
    setMatchCount(0);
  };

  useEffect(() => {
    initializeGame();
  }, [difficulty]);

  const handleCardClick = (index: number) => {
    if (isChecking) return;
    if (cards[index].isMatched || cards[index].isFlipped) return;

    // Flip clicked card
    const updated = [...cards];
    updated[index].isFlipped = true;
    setCards(updated);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setIsChecking(true);
      const [firstIdx, secondIdx] = newSelected;
      const firstCard = updated[firstIdx];
      const secondCard = updated[secondIdx];

      if (firstCard.name === secondCard.name) {
        // Match found!
        setTimeout(() => {
          const matchedDeck = [...cards];
          matchedDeck[firstIdx].isMatched = true;
          matchedDeck[secondIdx].isMatched = true;
          setCards(matchedDeck);
          setSelectedCards([]);
          setIsChecking(false);
          const nextCount = matchCount + 1;
          setMatchCount(nextCount);

          if (nextCount === totalPairs) {
            setTimeout(onComplete, 800);
          }
        }, 500);
      } else {
        // No match - gentle flip back with no shame
        setTimeout(() => {
          const resetDeck = [...cards];
          resetDeck[firstIdx].isFlipped = false;
          resetDeck[secondIdx].isFlipped = false;
          setCards(resetDeck);
          setSelectedCards([]);
          setIsChecking(false);
        }, 1200);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      {/* Game Status */}
      <div className="flex items-center justify-between text-xs font-semibold text-purple-900 border-b border-purple-100 pb-3">
        <span className="flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>
            Matched: <strong className="text-purple-700">{matchCount}</strong> of{' '}
            <strong>{totalPairs}</strong> pairs
          </span>
        </span>
        <span className="text-gray-500">Tap cards to find pairs</span>
      </div>

      {/* Cards Grid */}
      <div
        className={`grid gap-3 sm:gap-4 ${
          totalPairs === 3
            ? 'grid-cols-3 max-w-sm mx-auto'
            : totalPairs === 6
            ? 'grid-cols-3 sm:grid-cols-4 max-w-md mx-auto'
            : 'grid-cols-4 max-w-lg mx-auto'
        }`}
      >
        {cards.map((card, idx) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleCardClick(idx)}
            disabled={card.isMatched || card.isFlipped || isChecking}
            className={`aspect-square rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl transition-all duration-300 transform active:scale-95 shadow-sm border-2 ${
              card.isMatched
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 opacity-90 cursor-default'
                : card.isFlipped
                ? 'bg-lavender-50 border-purple-400 ring-2 ring-purple-200'
                : 'bg-gradient-to-tr from-purple-600 to-pink-500 border-white hover:opacity-90 hover:shadow-md'
            }`}
            aria-label={
              card.isFlipped || card.isMatched
                ? `Card showing ${card.name}`
                : `Hidden card ${idx + 1}`
            }
          >
            {card.isFlipped || card.isMatched ? (
              <span className="animate-fadeIn">{card.symbol}</span>
            ) : (
              <span className="text-white text-lg font-bold opacity-60">🌸</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
