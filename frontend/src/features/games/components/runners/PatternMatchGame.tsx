import React, { useState, useEffect } from 'react';
import { GameDifficulty } from '../../../../types/index.js';
import { Shapes, Sparkles, CheckCircle, HelpCircle } from 'lucide-react';

interface PatternItem {
  sequence: string[];
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface PatternMatchGameProps {
  difficulty: GameDifficulty;
  onComplete: () => void;
}

const PATTERN_SETS: PatternItem[] = [
  {
    sequence: ['🔵', '🔺', '🔵', '🔺'],
    options: ['🔵', '🔺', '⭐'],
    correctAnswer: '🔵',
    explanation: 'The pattern alternates between Blue Circle and Red Triangle!'
  },
  {
    sequence: ['🌸', '🌿', '🌸', '🌿'],
    options: ['🌸', '🌿', '☕'],
    correctAnswer: '🌸',
    explanation: 'Lotus flower alternates with Jasmine leaf!'
  },
  {
    sequence: ['⭐', '🌙', '⭐', '🌙'],
    options: ['⭐', '🌙', '☀️'],
    correctAnswer: '⭐',
    explanation: 'Golden Star alternates with Silver Crescent Moon!'
  },
  {
    sequence: ['🟡', '🟢', '🟡', '🟢'],
    options: ['🟡', '🟢', '🔵'],
    correctAnswer: '🟡',
    explanation: 'Yellow circle follows Green circle!'
  }
];

export const PatternMatchGame: React.FC<PatternMatchGameProps> = ({
  difficulty: _difficulty,
  onComplete
}) => {
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pattern = PATTERN_SETS[currentPatternIndex];

  useEffect(() => {
    setCurrentPatternIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setFeedback(null);
  }, []);

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    if (option === pattern.correctAnswer) {
      setIsAnswered(true);
      setFeedback(`Wonderful! ${pattern.explanation} 🌸`);
      setTimeout(onComplete, 1400);
    } else {
      setFeedback('Notice the rhythm of the shapes! Look at what came right after the last symbol.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-6">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between text-xs text-purple-900 font-semibold">
        <span className="flex items-center space-x-1.5">
          <Shapes className="w-4 h-4 text-purple-600" />
          <span>Pattern Recognition Sequence</span>
        </span>
        <span className="text-gray-500">What comes next?</span>
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
      <div className="bg-lavender-50/70 p-5 rounded-3xl border border-purple-200 flex items-center justify-center space-x-2 sm:space-x-4">
        {pattern.sequence.map((sym, idx) => (
          <div
            key={idx}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 border-purple-200 flex items-center justify-center text-2xl sm:text-3xl shadow-xs"
          >
            {sym}
          </div>
        ))}

        {/* Question Target Slot */}
        <div
          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 border-dashed flex items-center justify-center text-2xl sm:text-3xl transition-all ${
            isAnswered
              ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
              : 'bg-purple-100/60 border-purple-400 text-purple-700 animate-pulse'
          }`}
        >
          {isAnswered ? pattern.correctAnswer : '?'}
        </div>
      </div>

      {/* Options Selection */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-700 text-center">
          Choose the symbol that comes next:
        </p>
        <div className="flex justify-center space-x-3 sm:space-x-5">
          {pattern.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(opt)}
              disabled={isAnswered}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-center text-3xl sm:text-4xl transition-all transform active:scale-95 shadow-sm ${
                selectedOption === opt
                  ? opt === pattern.correctAnswer
                    ? 'bg-emerald-100 border-emerald-400 ring-4 ring-emerald-200'
                    : 'bg-purple-50 border-purple-300'
                  : 'bg-white border-purple-200 hover:border-purple-400 hover:bg-lavender-50'
              }`}
              aria-label={`Option ${idx + 1}: ${opt}`}
            >
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 flex items-center justify-center space-x-1">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>Look for the rhythm and symmetry</span>
      </div>
    </div>
  );
};
