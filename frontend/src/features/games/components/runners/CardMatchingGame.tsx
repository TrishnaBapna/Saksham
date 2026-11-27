import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { Sparkles, Eye } from 'lucide-react';

interface CardItem {
  id: number;
  symbol: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface CardMatchingGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

const CARD_SYMBOL_NAMES: Record<string, Record<string, string>> = {
  '🌸': { en: 'Lotus Flower', hi: 'कमल का फूल', mr: 'कमळाचे फूल', bn: 'পদ্ম ফুল', ta: 'தாமரை மலர்', te: 'తామర పువ్వు', kn: 'ಕಮಲದ ಹೂವು' },
  '☕': { en: 'Warm Tea Cup', hi: 'गर्म चाय का कप', mr: 'गरम चहाचा कप', bn: 'গরম চায়ের কাপ', ta: 'சூடான தேநீர் கோப்பை', te: 'వెచ్చని టీ కప్పు', kn: 'ಬಿಸಿ ಚಹಾದ ಕಪ್' },
  '📖': { en: 'Story Book', hi: 'कहानी की किताब', mr: 'गोष्टींचे पुस्तक', bn: 'গল্পের বই', ta: 'கதைப் புத்தகம்', te: 'కథల పుస్తకం', kn: 'ಕಥೆಯ ಪುಸ್ತಕ' },
  '🐦': { en: 'Garden Songbird', hi: 'बागीचे की चिड़िया', mr: 'बागेतील पक्षी', bn: 'বাগানের পাখি', ta: 'தோட்டத்துப் பறவை', te: 'తోటలోని పక్షి', kn: 'ಉದ್ಯಾನದ ಹಕ್ಕಿ' },
  '🌿': { en: 'Jasmine Leaves', hi: 'चमेली की पत्तियाँ', mr: 'जाईची पाने', bn: 'বেলি পাতা', ta: 'மல்லிகை இலைகள்', te: 'మల్లె ఆకులు', kn: 'ಮಲ್ಲಿಗೆ ಎಲೆಗಳು' },
  '🌱': { en: 'Young Sprout', hi: 'नन्हा अंकुर', mr: 'कोवळा अंकुर', bn: 'নতুন অঙ্কুর', ta: 'இளம் தளிர்', te: 'లేత మొలక', kn: 'ಚಿಗುರು ಎಲೆ' },
  '🌺': { en: 'Hibiscus Bloom', hi: 'गुड़हल का फूल', mr: 'जास्वंदाचे फूल', bn: 'জবা ফুল', ta: 'செம்பருத்தி மலர்', te: 'మందార పువ్వు', kn: 'ದಾಸವಾಳ ಹೂವು' },
  '🌼': { en: 'Marigold Blossom', hi: 'गेंदे का फूल', mr: 'झेंडूचे फूल', bn: 'গাঁদা ফুল', ta: 'சாமந்தி மலர்', te: 'బంతి పువ్వు', kn: 'ಚೆಂಡು ಹೂವು' },
  '🌻': { en: 'Bright Sunflower', hi: 'सूरजमुखी', mr: 'सूर्यफूल', bn: 'সূর্যমুখী', ta: 'சூரியகாந்தி', te: 'పొద్దుతిరుగుడు', kn: 'ಸೂರ್ಯಕಾಂತಿ' },
  '🫖': { en: 'Warm Tea Kettle', hi: 'चाय की केतली', mr: 'चहाची किटली', bn: 'চায়ের কেতলি', ta: 'தேநீர் கெட்டில்', te: 'టీ కెటిల్', kn: 'ಚಹಾ ಕೆಟಲ್' },
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

const HIGH_SIMILARITY_SYMBOLS_POOL = [
  { symbol: '🌸', name: 'Lotus Flower' },
  { symbol: '🌺', name: 'Hibiscus Bloom' },
  { symbol: '🌼', name: 'Marigold Blossom' },
  { symbol: '🌻', name: 'Bright Sunflower' },
  { symbol: '☕', name: 'Warm Tea Cup' },
  { symbol: '🫖', name: 'Warm Tea Kettle' },
  { symbol: '🌿', name: 'Jasmine Leaves' },
  { symbol: '🌱', name: 'Young Sprout' }
];

export const CardMatchingGame: React.FC<CardMatchingGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete,
  onRequestHint,
}) => {
  const { t, language } = useLanguage();
  const preferences = useOptionalAccessibility()?.preferences;
  const resolvedGameplay = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);
  const usesSimilarSymbols = resolvedGameplay.mechanics.distractorSimilarity === 'similar';
  const previewAllowed = resolvedGameplay.mechanics.previewEnabled && resolvedGameplay.mechanics.previewDurationMs > 0;
  const previewMs = resolvedGameplay.mechanics.previewDurationMs || 2200;

  const getSymbolName = (sym: string, fallback: string) =>
    CARD_SYMBOL_NAMES[sym]?.[language] || CARD_SYMBOL_NAMES[sym]?.en || fallback;
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [hintedIndices, setHintedIndices] = useState<number[]>([]);
  const mistakesRef = useRef(0);
  const consecutiveMissesRef = useRef(0);
  const hintsRef = useRef(0);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reactionTimesRef = useRef<number[]>([]);
  const lastInteractionRef = useRef<number>(Date.now());

  const getPairCount = (diff: GameDifficulty) => {
    if (adaptiveParams?.itemCount) {
      return Math.max(2, Math.min(SYMBOLS_POOL.length, adaptiveParams.itemCount));
    }
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
  const mismatchDelayMs = adaptiveParams?.memorizationDelayMs ?? (difficulty === 'Gentle' ? 1400 : 1150);

  const initializeGame = () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    const pairCount = getPairCount(difficulty);
    const activePool = usesSimilarSymbols ? HIGH_SIMILARITY_SYMBOLS_POOL : SYMBOLS_POOL;
    const chosen = activePool.slice(0, pairCount);
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
    setIsPreviewing(false);
    setMatchCount(0);
    setHintedIndices([]);
    mistakesRef.current = 0;
    consecutiveMissesRef.current = 0;
    hintsRef.current = 0;
    reactionTimesRef.current = [];
    lastInteractionRef.current = Date.now();
  };

  useEffect(() => {
    initializeGame();
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [difficulty, adaptiveParams?.itemCount, adaptiveParams?.tier]);

  const handlePreviewCards = () => {
    if (!previewAllowed || isChecking || isPreviewing || matchCount === totalPairs) return;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    hintsRef.current += 1;
    setIsPreviewing(true);
    setCards((prev) => prev.map((c) => (c.isMatched ? c : { ...c, isFlipped: true })));
    previewTimerRef.current = setTimeout(() => {
      setCards((prev) => prev.map((c) => (c.isMatched ? c : { ...c, isFlipped: false })));
      setSelectedCards([]);
      setIsPreviewing(false);
    }, previewMs);
  };

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
      hintsRef.current += 1;
      onRequestHint?.();
      setTimeout(() => {
        setHintedIndices([]);
      }, 2500);
    }
  };

  const triggerAutoSoftHint = (deckSnapshot: CardItem[]) => {
    const nameCount: Record<string, number[]> = {};
    deckSnapshot.forEach((c, idx) => {
      if (!c.isMatched) {
        if (!nameCount[c.name]) nameCount[c.name] = [];
        nameCount[c.name].push(idx);
      }
    });
    const pairIndices = Object.values(nameCount).find((indices) => indices.length >= 2);
    if (pairIndices) {
      setHintedIndices([pairIndices[0], pairIndices[1]]);
      setTimeout(() => setHintedIndices([]), 2500);
    }
  };

  const handleCardClick = (index: number) => {
    if (isChecking || isPreviewing) return;
    if (cards[index].isMatched || cards[index].isFlipped) return;

    const now = Date.now();
    reactionTimesRef.current.push(Math.max(100, now - lastInteractionRef.current));
    lastInteractionRef.current = now;

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
        consecutiveMissesRef.current = 0;
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
            const metrics = buildGameRunMetrics({
              correctAnswers: nextCount,
              incorrectAnswers: mistakesRef.current,
              hintsUsed: hintsRef.current,
              reactionTimesMs: reactionTimesRef.current,
              completionStatus: 'completed',
              mechanicMode: resolvedGameplay.mode,
              appliedMechanics: resolvedGameplay.mechanics.appliedMechanicsSummary,
            });
            setTimeout(() => onComplete(metrics), 800);
          }
        }, 500);
      } else {
        // No match - gentle flip back with no shame
        mistakesRef.current += 1;
        consecutiveMissesRef.current += 1;
        setTimeout(() => {
          const resetDeck = [...cards];
          resetDeck[firstIdx].isFlipped = false;
          resetDeck[secondIdx].isFlipped = false;
          setCards(resetDeck);
          setSelectedCards([]);
          setIsChecking(false);
          if (
            resolvedGameplay.mechanics.clueLevel === 'automatic' &&
            consecutiveMissesRef.current >= 2
          ) {
            consecutiveMissesRef.current = 0;
            triggerAutoSoftHint(resetDeck);
          }
        }, mismatchDelayMs);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      {/* Game Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-purple-900 border-b border-purple-100 pb-3">
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
        <div className="flex items-center gap-2">
          {usesSimilarSymbols ? (
            <span data-testid="card-matching-high-similarity-badge" className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
              Fine Visual Pairs • No Preview
            </span>
          ) : previewAllowed && (
            <button
              type="button"
              onClick={handlePreviewCards}
              disabled={isChecking || isPreviewing || matchCount === totalPairs}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>{isPreviewing ? 'Previewing cards...' : `Quick Preview (${(previewMs / 1000).toFixed(1)}s)`}</span>
            </button>
          )}
          <span className="text-gray-500">{t('games.tap_cards') || 'Tap cards to find pairs'}</span>
        </div>
      </div>

      {resolvedGameplay.mechanics.showFirstAnchor && cards.length > 0 && !cards[0].isMatched && (
        <div
          data-testid="card-matching-first-anchor"
          className="px-3.5 py-2 rounded-2xl bg-lavender-50 border border-purple-200 text-xs text-purple-900 font-semibold flex items-center justify-center gap-2"
        >
          <span>🌸 Memory Anchor: Card #1 holds <strong>{cards[0].symbol} {getSymbolName(cards[0].symbol, cards[0].name)}</strong></span>
        </div>
      )}

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
