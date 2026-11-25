import React, { useState, useEffect } from 'react';
import { GameDifficulty } from '../../../../types/index.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { Shapes, CheckCircle, HelpCircle } from 'lucide-react';

interface PatternItem {
  difficulty: GameDifficulty;
  sequence: string[];
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface PatternMatchGameProps {
  difficulty: GameDifficulty;
  onComplete: () => void;
}

const ADAPTIVE_PATTERN_SETS: Record<GameDifficulty, PatternItem[]> = {
  Gentle: [
    {
      difficulty: 'Gentle',
      sequence: ['🔵', '🔺', '🔵', '🔺'],
      options: ['🔵', '🔺', '⭐'],
      correctAnswer: '🔵',
      explanation: 'The pattern alternates between Blue Circle and Red Triangle!'
    },
    {
      difficulty: 'Gentle',
      sequence: ['🌸', '🌿', '🌸', '🌿'],
      options: ['🌸', '🌿', '☕'],
      correctAnswer: '🌸',
      explanation: 'Lotus flower alternates with Jasmine leaf!'
    },
    {
      difficulty: 'Gentle',
      sequence: ['⭐', '🌙', '⭐', '🌙'],
      options: ['⭐', '🌙', '☀️'],
      correctAnswer: '⭐',
      explanation: 'Golden Star alternates with Silver Crescent Moon!'
    }
  ],
  Moderate: [
    {
      difficulty: 'Moderate',
      sequence: ['🌸', '🌿', '☕', '🌸', '🌿'],
      options: ['☕', '🌸', '⭐'],
      correctAnswer: '☕',
      explanation: 'Lotus, Leaf, and Tea Cup follow in a steady three-part rhythm!'
    },
    {
      difficulty: 'Moderate',
      sequence: ['🟡', '🟢', '🔵', '🟡', '🟢'],
      options: ['🔵', '🟡', '🔺'],
      correctAnswer: '🔵',
      explanation: 'Yellow, Green, and Blue flow in a calm tri-color sequence!'
    },
    {
      difficulty: 'Moderate',
      sequence: ['⭐', '⭐', '🌙', '⭐', '⭐'],
      options: ['🌙', '⭐', '☀️'],
      correctAnswer: '🌙',
      explanation: 'Two Stars are followed by one Crescent Moon!'
    }
  ],
  Stimulating: [
    {
      difficulty: 'Stimulating',
      sequence: ['🔴', '🔷', '🔶', '🟢', '🔴', '🔷'],
      options: ['🔶', '🟢', '🔴', '⭐'],
      correctAnswer: '🔶',
      explanation: 'Four colorful symbols progress in smooth circular harmony!'
    },
    {
      difficulty: 'Stimulating',
      sequence: ['🌸', '🌸', '🌿', '🌿', '☕', '☕', '🌸', '🌸'],
      options: ['🌿', '☕', '🌸', '⭐'],
      correctAnswer: '🌿',
      explanation: 'Each symbol repeats twice before gently passing to the next!'
    }
  ]
};

export const PatternMatchGame: React.FC<PatternMatchGameProps> = ({
  difficulty,
  onComplete
}) => {
  const { t } = useLanguage();
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const patternsForDifficulty = ADAPTIVE_PATTERN_SETS[difficulty] || ADAPTIVE_PATTERN_SETS.Gentle;
  const pattern = patternsForDifficulty[currentPatternIndex % patternsForDifficulty.length];

  useEffect(() => {
    setCurrentPatternIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setFeedback(null);
  }, [difficulty]);

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    if (option === pattern.correctAnswer) {
      setIsAnswered(true);
      setFeedback(`Wonderful! ${pattern.explanation} 🌸`);
      setTimeout(onComplete, 1400);
    } else {
      setFeedback(t('games.pattern_notice_rhythm') || 'Notice the rhythm of the shapes! Look at what came right after the last symbol.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-6">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between text-xs text-purple-900 font-semibold">
        <span className="flex items-center space-x-1.5">
          <Shapes className="w-4 h-4 text-purple-600" />
          <span>{t('games.pattern_sequence') || 'Pattern Recognition Sequence'}</span>
        </span>
        <span className="text-gray-500 font-medium">
          Adaptive Rhythm • {difficulty} ({pattern.sequence.length}-step sequence)
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start space-x-2 animate-fadeIn ${
            isAnswered
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
              : 'bg-lavender-50 border-purple-200 text-purple-900'
          }`}
        >
          {isAnswered ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* Pattern Row */}
      <div className="bg-lavender-50/70 p-6 rounded-3xl border border-purple-200 text-center space-y-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {t('games.pattern_observed') || 'Observed Pattern'}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {pattern.sequence.map((symbol, idx) => (
            <div
              key={idx}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-purple-200 shadow-xs flex items-center justify-center text-2xl"
            >
              {symbol}
            </div>
          ))}

          {/* Missing slot with question mark */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-600 text-white shadow-md flex items-center justify-center text-xl font-bold animate-pulse">
            ?
          </div>
        </div>

        <p className="text-xs text-gray-600 font-medium">
          {t('games.pattern_choose_next') || 'Choose the symbol that comes next:'}
        </p>
      </div>

      {/* Options Row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {pattern.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectOption(opt)}
            disabled={isAnswered}
            className={`p-4 rounded-2xl border text-center transition transform active:scale-95 flex flex-col items-center justify-center space-y-1 ${
              selectedOption === opt
                ? opt === pattern.correctAnswer
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-200 shadow-md'
                  : 'bg-rose-100 border-rose-300 text-rose-950'
                : 'bg-white hover:bg-lavender-50 border-purple-200 shadow-2xs hover:shadow-xs'
            }`}
            aria-label={`Option ${idx + 1}: ${opt}`}
          >
            <span className="text-3xl">{opt}</span>
            <span className="text-[10px] font-bold text-purple-800">{t('games.pattern_choice', { num: String(idx + 1) }) || `Choice ${idx + 1}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
