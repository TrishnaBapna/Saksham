import React, { useState, useEffect } from 'react';
import { GameDifficulty } from '../../../../types/index.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
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

const CARD_SYMBOL_NAMES: Record<string, Record<string, string>> = {
  '🌸': { en: 'Lotus Flower', hi: 'कमल का फूल', mr: 'कमळाचे फूल', bn: 'পদ্ম ফুল', ta: 'தாமரை மலர்', te: 'తామర పువ్వు', kn: 'ಕಮಲದ ಹೂವು' },
  '☕': { en: 'Warm Tea Cup', hi: 'गर्म चाय का कप', mr: 'गरम चहाचा कप', bn: 'গরম চায়ের কাপ', ta: 'சூடான தேநீர் கோப்பை', te: 'వెచ్చని టీ కప్పు', kn: 'ಬಿಸಿ ಚಹಾದ ಕಪ್' },
  '📖': { en: 'Story Book', hi: 'कहानी की किताब', mr: 'गोष्टींचे पुस्तक', bn: 'গল্পের বই', ta: 'கதைப் புத்தகம்', te: 'కథల పుస్తకం', kn: 'ಕಥೆಯ ಪುಸ್ತಕ' },
  '🐦': { en: 'Garden Songbird', hi: 'बागीचे की चिड़िया', mr: 'बागेतील पक्षी', bn: 'বাগানের পাখি', ta: 'தோட்டத்துப் பறவை', te: 'తోటలోని పక్షి', kn: 'ಉದ್ಯಾನದ ಹಕ್ಕಿ' },
  '🌿': { en: 'Jasmine Leaves', hi: 'चमेली की पत्तियाँ', mr: 'जाईची पाने', bn: 'বেলি পাতা', ta: 'மல்லிகை இலைகள்', te: 'మల్లె ఆకులు', kn: 'ಮಲ್ಲಿಗೆ ಎಲೆಗಳು' },
  '🔔': { en: 'Temple Bell', hi: 'मंदिर की घंटी', mr: 'मंदिराची घंटा', bn: 'মন্দিরের ঘণ্টা', ta: 'கோவில் மணி', te: 'గుడి గంట', kn: 'ದೇವಸ್ಥಾನದ ಗಂಟೆ' },
  '🕯️': { en: 'Peaceful Candle', hi: 'शांत मोमबत्ती', mr: 'शांत मेणबत्ती', bn: 'শান্ত মোমবাতি', ta: 'அமைதியான மெழுகுவர்த்தி', te: 'ప్రశాంతమైన కొవ్వొత్తి', kn: 'ಶಾಂತ ಮೇಣದಬತ್ತಿ' },
  '🎨': { en: 'Color Palette', hi: 'रंगों की थाली', mr: 'रंगांची थाळी', bn: 'রঙের প্লেট', ta: 'வண்ணத் தட்டு', te: 'రంగుల పలక', kn: 'ಬಣ್ಣಗಳ ಫಲಕ' },
};

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
  onComplete,
  onRequestHint,
}) => {
  const { t, language } = useLanguage();
  const getSymbolName = (sym: string, fallback: string) =>
    CARD_SYMBOL_NAMES[sym]?.[language] || CARD_SYMBOL_NAMES[sym]?.en || fallback;
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [hintedIndices, setHintedIndices] = useState<number[]>([]);

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
    setHintedIndices([]);
  };

  useEffect(() => {
    initializeGame();
  }, [difficulty]);

  const handleRequestHint = () => {
    if (isChecking) return;
    const nameCount: Record<string, number[]> = {};
    cards.forEach((c, idx) => {
      if (!c.isMatched) {
        if (!nameCount[c.name]) nameCount[c.name] = [];
        nameCount[c.name].push(idx);
      }
    });

    const pairIndices = Object.values(nameCount).find((indices) => indices.length >= 2);
    if (pairIndices) {
      const [idx1, idx2] = pairIndices;
      setHintedIndices([idx1, idx2]);
      onRequestHint?.();
      setTimeout(() => {
        setHintedIndices([]);
      }, 2500);
    }
  };

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
            {t('games.matched_count', { matchCount: String(matchCount), totalPairs: String(totalPairs) }) || (
              <>
                Matched: <strong className="text-purple-700">{matchCount}</strong> of{' '}
                <strong>{totalPairs}</strong> pairs
              </>
            )}
          </span>
        </span>
        <span className="text-gray-500">{t('games.tap_cards') || 'Tap cards to find pairs'}</span>
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
        {cards.map((card, idx) => {
          const isHinted = hintedIndices.includes(idx);
          return (
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
                  : isHinted
                  ? 'ring-4 ring-amber-400 border-amber-400 bg-amber-100 shadow-lg animate-pulse scale-105'
                  : 'bg-gradient-to-tr from-purple-600 to-pink-500 border-white hover:opacity-90 hover:shadow-md'
              }`}
              aria-label={
                card.isFlipped || card.isMatched
                  ? `${t('games_runner.card_showing' as any) === 'games_runner.card_showing' ? (({ en: 'Card showing', hi: 'दिख रहा कार्ड', mr: 'दिसणारे कार्ड', bn: 'কার্ডে আছে', ta: 'தெரியும் அட்டை', te: 'కనిపిస్తున్న కార్డు', kn: 'ಕಾಣುವ ಕಾರ್ಡ್' } as Record<string, string>)[language] || 'Card showing') : t('games_runner.card_showing' as any)} ${getSymbolName(card.symbol, card.name)}`
                  : `${({ en: 'Hidden card', hi: 'छिपा कार्ड', mr: 'लपलेले कार्ड', bn: 'লুকানো কার্ড', ta: 'மறைந்த அட்டை', te: 'దాచిన కార్డు', kn: 'ಮರೆಮಾಡಿದ ಕಾರ್ಡ್' } as Record<string, string>)[language] || 'Hidden card'} ${idx + 1}`
              }
            >
              {card.isFlipped || card.isMatched ? (
                <span className="animate-fadeIn">{card.symbol}</span>
              ) : isHinted ? (
                <span className="text-amber-800 text-lg font-extrabold animate-bounce">✨</span>
              ) : (
                <span className="text-white text-lg font-bold opacity-60">🌸</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Asha Gentle Hint Action */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={handleRequestHint}
          disabled={isChecking || matchCount === totalPairs || hintedIndices.length > 0}
          className={`px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs ${
            hintedIndices.length > 0
              ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-200'
              : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
          }`}
          aria-label={t('games.asha_hint') || "Asha's Gentle Hint"}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>{hintedIndices.length > 0 ? (t('games.asha_highlighting') || "Asha is softly highlighting a pair...") : (t('games.asha_hint') || "Asha's Gentle Hint")}</span>
        </button>
      </div>
    </div>
  );
};
