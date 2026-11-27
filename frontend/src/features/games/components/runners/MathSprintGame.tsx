import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GamePacing, GameRunMetrics } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { PlusCircle, RotateCcw } from 'lucide-react';

interface MathSprintGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
}

interface MathQuestion {
  a: number;
  b: number;
  ans: number;
  operator: '+' | '-';
  isMissingOperand: boolean;
  equationText: string;
  options: number[];
}

export const MathSprintGame: React.FC<MathSprintGameProps> = ({
  difficulty,
  pacing = 'balanced',
  adaptiveParams,
  onComplete,
}) => {
  const { t, language } = useLanguage();
  const preferences = useOptionalAccessibility()?.preferences;
  const resolvedGameplay = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);
  const showCountingDotsByDefault = resolvedGameplay.mechanics.showFirstAnchor;
  const allowSubtraction = difficulty === 'Moderate' || difficulty === 'Stimulating';
  const allowMissingOperand = difficulty === 'Stimulating' || resolvedGameplay.mechanics.requiresRecallWithoutRef;

  const [question, setQuestion] = useState<MathQuestion>({
    a: 2,
    b: 3,
    ans: 5,
    operator: '+',
    isMissingOperand: false,
    equationText: '2 + 3 = ?',
    options: [4, 5, 6],
  });
  const [showDotsHelper, setShowDotsHelper] = useState<boolean>(showCountingDotsByDefault);
  const [round, setRound] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [feedbackKey, setFeedbackKey] = useState<'choose' | 'correct' | 'done' | 'try_next'>('choose');
  const [wrongAnsVal, setWrongAnsVal] = useState<number>(5);
  const correctRef = useRef(0);
  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const questionStartRef = useRef(Date.now());

  const totalRounds = adaptiveParams?.itemCount
    ? Math.max(3, Math.min(8, adaptiveParams.itemCount))
    : pacing === 'calm' || difficulty === 'Gentle'
    ? 3
    : 5;

  const generateQuestion = (targetRound = 1) => {
    let min = 1, max = 8;
    if (difficulty === 'Stimulating' || pacing === 'agile') {
      min = 8;
      max = 22;
    } else if (difficulty === 'Moderate') {
      min = 5;
      max = 15;
    }

    const rawA = Math.floor(Math.random() * (max - min + 1)) + min;
    const rawB = Math.floor(Math.random() * (max - min + 1)) + min;
    const useSub = allowSubtraction && targetRound % 2 === 0;
    const a = useSub ? Math.max(rawA, rawB) : rawA;
    const b = useSub ? Math.min(rawA, rawB) : rawB;

    const isMissingOperand = allowMissingOperand && targetRound % 2 === 1;
    let ans: number;
    let operator: '+' | '-' = useSub ? '-' : '+';
    let equationText: string;

    if (isMissingOperand) {
      const sum = a + b;
      ans = b;
      operator = '+';
      equationText = `${a} + ? = ${sum}`;
    } else if (operator === '-') {
      ans = Math.max(1, a - b);
      equationText = `${a} - ${a - ans} = ?`;
    } else {
      ans = a + b;
      equationText = `${a} + ${b} = ?`;
    }

    const optionTargetCount = adaptiveParams?.choiceCount
      ? Math.max(3, Math.min(4, adaptiveParams.choiceCount))
      : 3;

    const offset1 = Math.random() > 0.5 ? 2 : -2;
    const offset2 = Math.random() > 0.5 ? 3 : -3;
    const wrong1 = Math.max(1, ans + offset1);
    const wrong2 = Math.max(1, ans + offset2);

    const rawOptions = [ans, wrong1, wrong2];
    const uniqueOptions = Array.from(new Set(rawOptions));
    while (uniqueOptions.length < optionTargetCount) {
      uniqueOptions.push(ans + uniqueOptions.length + 1);
    }
    const options = uniqueOptions.sort(() => Math.random() - 0.5);

    setQuestion({ a, b, ans, operator, isMissingOperand, equationText, options });
    questionStartRef.current = Date.now();
  };

  useEffect(() => {
    setRound(1);
    setScore(0);
    setShowDotsHelper(showCountingDotsByDefault);
    setFeedbackKey('choose');
    correctRef.current = 0;
    mistakesRef.current = 0;
    hintsRef.current = 0;
    reactionTimesRef.current = [];
    generateQuestion(1);
  }, [difficulty, pacing, adaptiveParams?.itemCount, adaptiveParams?.tier]);

  const handleSelectOption = (chosen: number) => {
    reactionTimesRef.current.push(Math.max(100, Date.now() - questionStartRef.current));

    if (chosen === question.ans) {
      audioSynthesizer.playChime('bell');
      correctRef.current += 1;
      const nextScore = score + 10;
      setScore(nextScore);

      if (round >= totalRounds) {
        audioSynthesizer.playChime('fanfare');
        setFeedbackKey('done');
        const metrics = buildGameRunMetrics({
          correctAnswers: correctRef.current,
          incorrectAnswers: mistakesRef.current,
          hintsUsed: hintsRef.current,
          reactionTimesMs: reactionTimesRef.current,
          completionStatus: 'completed',
          mechanicMode: resolvedGameplay.mode,
          appliedMechanics: resolvedGameplay.mechanics.appliedMechanicsSummary,
        });
        setTimeout(() => {
          onComplete(metrics);
        }, 1100);
        return;
      }

      const nextRound = round + 1;
      setRound(nextRound);
      setFeedbackKey('correct');
      generateQuestion(nextRound);
    } else {
      mistakesRef.current += 1;
      audioSynthesizer.playChime('chime');
      setWrongAnsVal(question.ans);
      setFeedbackKey('try_next');
      if (round >= totalRounds) {
        const metrics = buildGameRunMetrics({
          correctAnswers: correctRef.current,
          incorrectAnswers: mistakesRef.current,
          hintsUsed: hintsRef.current,
          reactionTimesMs: reactionTimesRef.current,
          completionStatus: 'completed',
          mechanicMode: resolvedGameplay.mode,
          appliedMechanics: resolvedGameplay.mechanics.appliedMechanicsSummary,
        });
        setTimeout(() => {
          onComplete(metrics);
        }, 1200);
        return;
      }
      setTimeout(() => {
        const nextRound = round + 1;
        setRound(nextRound);
        generateQuestion(nextRound);
      }, 1200);
    }
  };

  const handleRestart = () => {
    setRound(1);
    setScore(0);
    setFeedbackKey('choose');
    correctRef.current = 0;
    mistakesRef.current = 0;
    hintsRef.current = 0;
    reactionTimesRef.current = [];
    generateQuestion(1);
  };

  const feedbackText =
    feedbackKey === 'correct'
      ? t('games_runner.math_correct')
      : feedbackKey === 'done'
      ? t('games_runner.math_done', { total: totalRounds })
      : feedbackKey === 'try_next'
      ? t('games_runner.math_try_next', { ans: wrongAnsVal })
      : t('games_runner.math_choose');

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-6 text-center animate-fadeIn">
      {/* Title & Goal */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
          <span>{t('games_runner.math_title')}</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedbackText}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          {t('games_runner.math_progress', { round, total: totalRounds, score })}
        </p>
      </div>

      {/* Arithmetic Equation Box */}
      <div className="p-6 bg-lavender-50/70 rounded-3xl border border-purple-200 max-w-xs mx-auto shadow-inner space-y-2">
        {question.isMissingOperand && (
          <div className="text-[11px] font-bold text-indigo-800 bg-indigo-50 inline-block px-2.5 py-0.5 rounded-full border border-indigo-200">
            Find the Missing Number
          </div>
        )}
        <div className="text-3xl sm:text-4xl font-black text-purple-950 font-mono tracking-wider">
          {question.equationText}
        </div>
        {showDotsHelper && question.a <= 10 && question.b <= 10 && !question.isMissingOperand ? (
          <div
            data-testid="math-counting-dots"
            className="text-xs font-bold text-purple-800 pt-1 flex items-center justify-center gap-2 flex-wrap"
          >
            <span className="text-amber-600 tracking-tighter">{'●'.repeat(question.a)}</span>
            <span>{question.operator}</span>
            <span className="text-indigo-600 tracking-tighter">{'●'.repeat(question.b)}</span>
          </div>
        ) : (
          !question.isMissingOperand &&
          !showDotsHelper &&
          question.a <= 15 &&
          question.b <= 15 && (
            <div>
              <button
                type="button"
                onClick={() => {
                  hintsRef.current += 1;
                  setShowDotsHelper(true);
                }}
                className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
              >
                Show Visual Dots Helper
              </button>
            </div>
          )
        )}
      </div>

      {/* Multiple Choice Options */}
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto p-1">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectOption(opt)}
            className="py-4 rounded-2xl bg-white hover:bg-purple-600 hover:text-white text-purple-950 font-black text-xl border-2 border-purple-200 hover:border-purple-600 shadow-md transition-all duration-200 active:scale-95 cursor-pointer min-h-[56px]"
            aria-label={`${({ en: 'Option', hi: 'विकल्प', mr: 'पर्याय', bn: 'বিকল্প', ta: 'விருப்பம்', te: 'ఎంపిక', kn: 'ಆಯ್ಕೆ' } as Record<string, string>)[language] || 'Option'} ${opt}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Restart */}
      <div className="pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={handleRestart}
          className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition inline-flex items-center space-x-1.5 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('games_runner.math_restart')}</span>
        </button>
      </div>
    </div>
  );
};
