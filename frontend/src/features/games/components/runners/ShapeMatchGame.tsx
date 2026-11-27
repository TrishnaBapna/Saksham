import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GamePacing, GameRunMetrics } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { SpeechService } from '../../../../services/speechService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { Check, X, HelpCircle, Eye } from 'lucide-react';

interface ShapeMatchGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

const SHAPES_BY_DIFFICULTY: Record<GameDifficulty, { name: string; symbol: string; color: string }[]> = {
  Gentle: [
    { name: 'Star', symbol: '⭐', color: 'text-amber-500' },
    { name: 'Diamond', symbol: '🔷', color: 'text-blue-500' },
    { name: 'Circle', symbol: '🔴', color: 'text-rose-500' },
    { name: 'Square', symbol: '🟩', color: 'text-emerald-500' },
  ],
  Moderate: [
    { name: 'Star', symbol: '⭐', color: 'text-amber-500' },
    { name: 'Diamond', symbol: '🔷', color: 'text-blue-500' },
    { name: 'Circle', symbol: '🔴', color: 'text-rose-500' },
    { name: 'Square', symbol: '🟩', color: 'text-emerald-500' },
  ],
  Stimulating: [
    { name: 'Amber Star', symbol: '⭐', color: 'text-amber-500' },
    { name: 'Four-Point Star', symbol: '✴️', color: 'text-amber-600' },
    { name: 'Blue Circle', symbol: '🔵', color: 'text-blue-500' },
    { name: 'Rose Circle', symbol: '🔴', color: 'text-rose-500' },
    { name: 'Blue Diamond', symbol: '🔷', color: 'text-blue-500' },
    { name: 'Emerald Square', symbol: '🟩', color: 'text-emerald-500' },
  ],
};

export const ShapeMatchGame: React.FC<ShapeMatchGameProps> = ({
  difficulty,
  pacing = 'balanced',
  adaptiveParams,
  onComplete,
  onRequestHint,
}) => {
  const { t, language } = useLanguage();
  const preferences = useOptionalAccessibility()?.preferences;
  const resolved = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);
  const shapesPool = SHAPES_BY_DIFFICULTY[difficulty] || SHAPES_BY_DIFFICULTY.Gentle;

  const [prevShape, setPrevShape] = useState<typeof shapesPool[0] | null>(null);
  const [currentShape, setCurrentShape] = useState<typeof shapesPool[0]>(shapesPool[0]);
  const [isPrevVeiled, setIsPrevVeiled] = useState<boolean>(false);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [customFeedback, setCustomFeedback] = useState<string | null>(null);
  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const stepTimeRef = useRef(Date.now());
  const veilTimerRef = useRef<NodeJS.Timeout | null>(null);

  const shouldVeilPrev = difficulty === 'Moderate' || difficulty === 'Stimulating';

  const getTargetGoal = () => {
    if (adaptiveParams?.itemCount) {
      return Math.max(3, Math.min(10, adaptiveParams.itemCount));
    }
    if (pacing === 'calm' || difficulty === 'Gentle') return 3;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 7;
    return 5;
  };

  const targetGoal = getTargetGoal();

  const triggerPrevVeil = () => {
    if (veilTimerRef.current) clearTimeout(veilTimerRef.current);
    if (!shouldVeilPrev) {
      setIsPrevVeiled(false);
      return;
    }
    const glanceMs = difficulty === 'Moderate' ? 1600 : 1000;
    veilTimerRef.current = setTimeout(() => {
      setIsPrevVeiled(true);
    }, glanceMs);
  };

  const rollNextShape = (lastShape: typeof shapesPool[0]) => {
    const isMatch = Math.random() < 0.5;
    let next: typeof shapesPool[0];
    if (isMatch) {
      next = lastShape;
    } else {
      const candidates = shapesPool.filter((s) => s.name !== lastShape.name);
      next = candidates[Math.floor(Math.random() * candidates.length)];
    }
    setPrevShape(lastShape);
    setCurrentShape(next);
    setIsPrevVeiled(false);
    triggerPrevVeil();
  };

  useEffect(() => {
    const initial = shapesPool[Math.floor(Math.random() * shapesPool.length)];
    setCurrentShape(initial);
    rollNextShape(initial);
    setCorrectCount(0);
    setCustomFeedback(null);
    mistakesRef.current = 0;
    hintsRef.current = 0;
    reactionTimesRef.current = [];
    stepTimeRef.current = Date.now();
    return () => {
      if (veilTimerRef.current) clearTimeout(veilTimerRef.current);
    };
  }, [difficulty, pacing, adaptiveParams?.itemCount, adaptiveParams?.tier]);

  const SHAPE_LABELS: Record<string, Record<string, string>> = {
    en: { Star: 'Star', Diamond: 'Diamond', Circle: 'Circle', Square: 'Square', waiting: 'Waiting' },
    hi: { Star: 'तारा', Diamond: 'हीरा', Circle: 'वृत्त', Square: 'वर्ग', waiting: 'प्रतीक्षा' },
    mr: { Star: 'तारा', Diamond: 'हिरा', Circle: 'वर्तुळ', Square: 'चौरस', waiting: 'प्रतीक्षा' },
    bn: { Star: 'তারা', Diamond: 'হীরা', Circle: 'বৃত্ত', Square: 'বর্গ', waiting: 'অপেক্ষা' },
    ta: { Star: 'நட்சத்திரம்', Diamond: 'வைரம்', Circle: 'வட்டம்', Square: 'சதுரம்', waiting: 'காத்திருப்பு' },
    te: { Star: 'నక్షత్రం', Diamond: 'వజ్రం', Circle: 'వృత్తం', Square: 'చతురస్రం', waiting: 'వేచి ఉంది' },
    kn: { Star: 'ನಕ್ಷತ್ರ', Diamond: 'ವಜ್ರ', Circle: 'ವೃತ್ತ', Square: 'ಚೌಕ', waiting: 'ನಿರೀಕ್ಷೆ' },
  };
  const shapeLabel = (name: string) => SHAPE_LABELS[language]?.[name] || SHAPE_LABELS.en[name] || name;

  const handleDecision = (userClaimedMatch: boolean) => {
    if (!prevShape) return;

    const now = Date.now();
    reactionTimesRef.current.push(Math.max(100, now - stepTimeRef.current));
    stepTimeRef.current = now;

    const actuallyMatches = currentShape.name === prevShape.name;
    const isCorrect = userClaimedMatch === actuallyMatches;

    if (isCorrect) {
      audioSynthesizer.playChime('bell');
      const nextCount = correctCount + 1;
      setCorrectCount(nextCount);
      setCustomFeedback(
        t(`games_runner.shape_correct_${actuallyMatches ? 'match' : 'diff'}`) !==
          `games_runner.shape_correct_${actuallyMatches ? 'match' : 'diff'}`
          ? t(`games_runner.shape_correct_${actuallyMatches ? 'match' : 'diff'}`)
          : `Wonderful focus! That was ${actuallyMatches ? 'a Match' : 'Not a Match'}.`
      );

      if (nextCount >= targetGoal) {
        audioSynthesizer.playChime('fanfare');
        setCustomFeedback(`🎉 ${t('games_runner.shape_completed', { count: targetGoal }) !== 'games_runner.shape_completed' ? t('games_runner.shape_completed', { count: targetGoal }) : `Excellent attention! You completed ${targetGoal} shape observations!`}`);
        const metrics = buildGameRunMetrics({
          correctAnswers: nextCount,
          incorrectAnswers: mistakesRef.current,
          hintsUsed: hintsRef.current,
          reactionTimesMs: reactionTimesRef.current,
          completionStatus: 'completed',
        });
        metrics.mechanicMode = resolved.mode;
        metrics.appliedMechanics = resolved.mechanics.appliedMechanicsSummary;
        setTimeout(() => {
          onComplete(metrics);
        }, 1100);
        return;
      }
    } else {
      mistakesRef.current += 1;
      setIsPrevVeiled(false);
      audioSynthesizer.playChime('chime');
      setCustomFeedback(
        actuallyMatches
          ? (t('games_runner.shape_notice_same') !== 'games_runner.shape_notice_same' ? t('games_runner.shape_notice_same') : 'Notice: Both shapes were actually the same symbol!')
          : (t('games_runner.shape_notice_diff') !== 'games_runner.shape_notice_diff' ? t('games_runner.shape_notice_diff') : 'Notice: The shapes were different from each other!')
      );
    }

    rollNextShape(currentShape);
  };

  const handleHint = () => {
    if (prevShape) {
      hintsRef.current += 1;
      onRequestHint?.();
      setIsPrevVeiled(false);
      const prevName = shapeLabel(prevShape.name);
      const currName = shapeLabel(currentShape.name);
      const text =
        language === 'en'
          ? `Previous was ${prevName}, current is ${currName}.`
          : t('games_runner.shape_hint', { prev: prevName, curr: currName }) !== 'games_runner.shape_hint'
          ? t('games_runner.shape_hint', { prev: prevName, curr: currName })
          : `${prevName} → ${currName}`;
      setCustomFeedback(text);
      SpeechService.speak(text, undefined, undefined, SpeechService.getBCP47(language));
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
            {prevShape ? (isPrevVeiled ? '❔' : prevShape.symbol) : '—'}
          </div>
          <span className="text-xs font-bold text-purple-900 block">
            {prevShape ? (isPrevVeiled ? '1-Back Memory' : shapeLabel(prevShape.name)) : shapeLabel('waiting')}
          </span>
        </div>

        <span className="text-xl font-black text-purple-300">{t('games_runner.shape_vs') !== 'games_runner.shape_vs' ? t('games_runner.shape_vs') : 'vs'}</span>

        <div className="text-center space-y-1">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
            {t('games_runner.shape_current')}
          </span>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-purple-400 ring-2 ring-purple-100 flex items-center justify-center text-3xl sm:text-4xl shadow-md">
            {currentShape.symbol}
          </div>
          <span className="text-xs font-bold text-purple-900 block">
            {shapeLabel(currentShape.name)}
          </span>
        </div>
      </div>

      {/* Decision Buttons (Large accessible touch targets) */}
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => handleDecision(true)}
          className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[56px]"
          aria-label={t('games_runner.shape_same_btn') || 'Shapes Match'}
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{t('games_runner.shape_same_btn')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleDecision(false)}
          className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[56px]"
          aria-label={t('games_runner.shape_diff_btn') || 'Shapes Do Not Match'}
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
