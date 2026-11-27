import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { Search, Sparkles, CheckCircle, HelpCircle } from 'lucide-react';

interface VisualSearchGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
}

const SEARCH_ITEM_NAMES: Record<string, Record<string, string>> = {
  '🌸': { en: 'Pink Lotus', hi: 'गुलाबी कमल', mr: 'गुलाबी कमळ', bn: 'গোলাপি পদ্ম', ta: 'இளஞ்சிவப்பு தாமரை', te: 'గులాబీ తామర', kn: 'ಗುಲಾಬಿ ಕಮಲ' },
  '🌿': { en: 'Jasmine Leaf', hi: 'चमेली का पत्ता', mr: 'जाईचे पान', bn: 'বেলি পাতা', ta: 'மல்லிகை இலை', te: 'మల్లె ఆకు', kn: 'ಮಲ್ಲಿಗೆ ಎಲೆ' },
  '🍂': { en: 'Autumn Leaf', hi: 'पतझड़ का पत्ता', mr: 'सुकलेले पान', bn: 'শরতের পাতা', ta: 'இலையுதிர் இலை', te: 'ఆకురాలే ఆకు', kn: 'ಶರತ್ಕಾಲದ ಎಲೆ' },
  '🐦': { en: 'Little Bird', hi: 'छोटी चिड़िया', mr: 'छोटी चिमणी', bn: 'ছোট পাখি', ta: 'சின்னப் பறவை', te: 'చిన్న పక్షి', kn: 'ಪುಟ್ಟ ಹಕ್ಕಿ' },
  '☕': { en: 'Warm Cup', hi: 'गर्म कप', mr: 'गरम कप', bn: 'গরম চায়ের কাপ', ta: 'சூடான கோப்பை', te: 'వెచ్చని కప్పు', kn: 'ಬಿಸಿ ಕಪ್' },
  '📖': { en: 'Story Book', hi: 'कहानी की किताब', mr: 'गोष्टींचे पुस्तक', bn: 'গল্পের বই', ta: 'கதைப் புத்தகம்', te: 'కథల పుస్తకం', kn: 'ಕಥೆಯ ಪುಸ್ತಕ' },
  '🔔': { en: 'Temple Bell', hi: 'मंदिर की घंटी', mr: 'मंदिराची घंटा', bn: 'মন্দিরের ঘণ্টা', ta: 'கோவில் மணி', te: 'గుడి గంట', kn: 'ದೇವಸ್ಥಾನದ ಗಂಟೆ' },
  '⭐': { en: 'Golden Star', hi: 'सुनहरा तारा', mr: 'सोनेरी तारा', bn: 'সোনালি তারা', ta: 'பொன் நட்சத்திரம்', te: 'బంగారు నక్షత్రం', kn: 'ಚಿನ್ನದ ನಕ್ಷತ್ರ' },
};

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
  adaptiveParams,
  onComplete
}) => {
  const { t, language } = useLanguage();
  const getLocalizedItemName = (sym: string, fallback: string) =>
    SEARCH_ITEM_NAMES[sym]?.[language] || SEARCH_ITEM_NAMES[sym]?.en || fallback;
  const getGridSize = (diff: GameDifficulty) => {
    if (adaptiveParams?.gridSize) {
      return Math.max(6, Math.min(20, adaptiveParams.gridSize));
    }
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
  const mistakesRef = useRef(0);
  const startRef = useRef(Date.now());

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
    mistakesRef.current = 0;
    startRef.current = Date.now();
  };

  useEffect(() => {
    initialize();
  }, [difficulty, adaptiveParams?.gridSize, adaptiveParams?.tier]);

  const localizedTargetName = getLocalizedItemName(targetItem.symbol, targetItem.name);

  const handleItemClick = (isTarget: boolean) => {
    if (isFound) return;

    if (isTarget) {
      setIsFound(true);
      setFeedback(t('games.found_target', { name: localizedTargetName }) || `Wonderful! You found the ${localizedTargetName} ${targetItem.symbol}! 🌸`);
      const metrics = buildGameRunMetrics({
        correctAnswers: 1,
        incorrectAnswers: mistakesRef.current,
        hintsUsed: 0,
        reactionTimesMs: [Date.now() - startRef.current],
        completionStatus: 'completed',
      });
      setTimeout(() => onComplete(metrics), 1200);
    } else {
      mistakesRef.current += 1;
      setFeedback(t('games.keep_scanning', { name: localizedTargetName }) || `That is a peaceful symbol! Keep scanning for the ${localizedTargetName} ${targetItem.symbol}.`);
    }
  };

  const visualUi = (
    {
      hi: { levelPrefix: 'स्तर:', itemAria: (sym: string) => `चिह्न: ${sym}` },
      mr: { levelPrefix: 'पातळी:', itemAria: (sym: string) => `घटक: ${sym}` },
      bn: { levelPrefix: 'স্তর:', itemAria: (sym: string) => `বস্তু: ${sym}` },
      ta: { levelPrefix: 'நிலை:', itemAria: (sym: string) => `பொருள்: ${sym}` },
      te: { levelPrefix: 'స్థాయి:', itemAria: (sym: string) => `వస్తువు: ${sym}` },
      kn: { levelPrefix: 'ಹಂತ:', itemAria: (sym: string) => `ವಸ್ತು: ${sym}` },
    } as Record<string, any>
  )[language] || {
    levelPrefix: 'Level:',
    itemAria: (sym: string) => `Item: ${sym}`,
  };
  const localizedDiff = t(`games.difficulty_${difficulty.toLowerCase()}` as any) || difficulty;

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
              {t('games.find_target', { name: localizedTargetName }) || `Find the ${localizedTargetName}`}
            </h3>
          </div>
        </div>

        <span className="text-xs font-bold text-purple-800 bg-white/80 px-2.5 py-1 rounded-full border border-purple-200 shadow-2xs">
          {visualUi.levelPrefix} {localizedDiff}
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
          gridItems.length <= 9
            ? 'grid-cols-3 max-w-xs mx-auto'
            : gridItems.length <= 16
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
            aria-label={visualUi.itemAria(item.symbol)}
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
