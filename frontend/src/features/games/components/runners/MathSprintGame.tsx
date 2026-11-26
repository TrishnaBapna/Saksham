import React, { useState, useEffect } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { PlusCircle, RotateCcw } from 'lucide-react';

interface MathSprintGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  onComplete: () => void;
}

export const MathSprintGame: React.FC<MathSprintGameProps> = ({
  difficulty,
  pacing = 'balanced',
  onComplete,
}) => {
  const { t } = useLanguage();
  const [question, setQuestion] = useState<{ a: number; b: number; ans: number; options: number[] }>({
    a: 2,
    b: 3,
    ans: 5,
    options: [4, 5, 6],
  });
  const [round, setRound] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [feedbackKey, setFeedbackKey] = useState<'choose' | 'correct' | 'done' | 'try_next'>('choose');
  const [wrongAnsVal, setWrongAnsVal] = useState<number>(5);

  const totalRounds = pacing === 'calm' || difficulty === 'Gentle' ? 3 : 5;

  const generateQuestion = () => {
    let min = 1, max = 8;
    if (pacing === 'balanced' || difficulty === 'Moderate') {
      min = 5;
      max = 15;
    } else if (pacing === 'agile' || difficulty === 'Stimulating') {
      min = 10;
      max = 25;
    }

    const a = Math.floor(Math.random() * (max - min + 1)) + min;
    const b = Math.floor(Math.random() * (max - min + 1)) + min;
    const ans = a + b;

    const offset1 = Math.random() > 0.5 ? 2 : -2;
    const offset2 = Math.random() > 0.5 ? 3 : -3;
    const wrong1 = Math.max(1, ans + offset1);
    const wrong2 = Math.max(1, ans + offset2);

    const rawOptions = [ans, wrong1, wrong2];
    const uniqueOptions = Array.from(new Set(rawOptions));
    while (uniqueOptions.length < 3) {
      uniqueOptions.push(ans + uniqueOptions.length + 1);
    }
    const options = uniqueOptions.sort(() => Math.random() - 0.5);

    setQuestion({ a, b, ans, options });
  };

  useEffect(() => {
    setRound(1);
    setScore(0);
    setFeedbackKey('choose');
    generateQuestion();
  }, [difficulty, pacing]);

  const handleSelectOption = (chosen: number) => {
    if (chosen === question.ans) {
      audioSynthesizer.playChime('bell');
      const nextScore = score + 10;
      setScore(nextScore);

      if (round >= totalRounds) {
        audioSynthesizer.playChime('fanfare');
        setFeedbackKey('done');
        setTimeout(() => {
          onComplete();
        }, 1100);
        return;
      }

      setRound((r) => r + 1);
      setFeedbackKey('correct');
      generateQuestion();
    } else {
      audioSynthesizer.playChime('chime');
      setWrongAnsVal(question.ans);
      setFeedbackKey('try_next');
      setTimeout(() => {
        setRound((r) => r + 1);
        generateQuestion();
      }, 1200);
    }
  };

  const handleRestart = () => {
    setRound(1);
    setScore(0);
    setFeedbackKey('choose');
    generateQuestion();
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
      <div className="p-6 bg-lavender-50/70 rounded-3xl border border-purple-200 max-w-xs mx-auto shadow-inner">
        <span className="text-3xl sm:text-4xl font-black text-purple-950 font-mono tracking-wider">
          {question.a} + {question.b} = ?
        </span>
      </div>

      {/* Multiple Choice Options */}
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto p-1">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectOption(opt)}
            className="py-4 rounded-2xl bg-white hover:bg-purple-600 hover:text-white text-purple-950 font-black text-xl border-2 border-purple-200 hover:border-purple-600 shadow-md transition-all duration-200 active:scale-95 cursor-pointer min-h-[56px]"
            aria-label={`${({ en: 'Option', hi: 'विकल्प', mr: 'पर्याय', bn: 'বিকল্প', ta: 'விருப்பம்', te: 'ఎంపిక', kn: 'ಆಯ್ಕೆ' } as Record<string, string>)[useLanguage().language] || 'Option'} ${opt}`}
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
