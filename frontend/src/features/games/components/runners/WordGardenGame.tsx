import React, { useState, useEffect } from 'react';
import { GameDifficulty } from '../../../../types/index.js';
import { SpeechService } from '../../../../services/speechService.js';
import { BookOpen, Volume2, CheckCircle, HelpCircle } from 'lucide-react';

interface WordPuzzle {
  id: string;
  wordEn: string;
  wordHi: string;
  displayLetters: string[];
  missingIndex: number;
  missingChar: string;
  options: string[];
  meaning: string;
  icon: string;
}

interface WordGardenGameProps {
  difficulty: GameDifficulty;
  onComplete: () => void;
}

const ADAPTIVE_WORD_PUZZLES: Record<GameDifficulty, WordPuzzle[]> = {
  Gentle: [
    {
      id: 'w-gentle-1',
      wordEn: 'GARDEN',
      wordHi: 'बगीचा',
      displayLetters: ['G', 'A', 'R', '_', 'E', 'N'],
      missingIndex: 3,
      missingChar: 'D',
      options: ['D', 'B', 'P'],
      meaning: 'A peaceful place with green plants and blooming flowers',
      icon: '🌸'
    },
    {
      id: 'w-gentle-2',
      wordEn: 'WATER',
      wordHi: 'पानी',
      displayLetters: ['W', 'A', '_', 'E', 'R'],
      missingIndex: 2,
      missingChar: 'T',
      options: ['T', 'S', 'L'],
      meaning: 'Fresh, clear water to keep your body refreshed',
      icon: '💧'
    },
    {
      id: 'w-gentle-3',
      wordEn: 'MUSIC',
      wordHi: 'संगीत',
      displayLetters: ['M', 'U', '_', 'I', 'C'],
      missingIndex: 2,
      missingChar: 'S',
      options: ['S', 'N', 'R'],
      meaning: 'Soothing old songs and classical morning ragas',
      icon: '🎶'
    }
  ],
  Moderate: [
    {
      id: 'w-mod-1',
      wordEn: 'FLOWER',
      wordHi: 'फूल',
      displayLetters: ['F', 'L', '_', 'W', 'E', 'R'],
      missingIndex: 2,
      missingChar: 'O',
      options: ['O', 'U', 'A', 'E'],
      meaning: 'Fragrant natural petals brightening the room',
      icon: '🌺'
    },
    {
      id: 'w-mod-2',
      wordEn: 'SUNSHINE',
      wordHi: 'धूप',
      displayLetters: ['S', 'U', 'N', '_', 'H', 'I', 'N', 'E'],
      missingIndex: 3,
      missingChar: 'S',
      options: ['S', 'C', 'Z', 'T'],
      meaning: 'Gentle morning warmth pouring through the window',
      icon: '☀️'
    }
  ],
  Stimulating: [
    {
      id: 'w-stim-1',
      wordEn: 'COMFORT',
      wordHi: 'सुकून',
      displayLetters: ['C', 'O', 'M', '_', 'O', 'R', 'T'],
      missingIndex: 3,
      missingChar: 'F',
      options: ['F', 'P', 'V', 'T'],
      meaning: 'A warm feeling of physical peace and emotional ease',
      icon: '🕊️'
    },
    {
      id: 'w-stim-2',
      wordEn: 'BLOSSOM',
      wordHi: 'बहार',
      displayLetters: ['B', 'L', 'O', '_', 'S', 'O', 'M'],
      missingIndex: 3,
      missingChar: 'S',
      options: ['S', 'Z', 'C', 'R'],
      meaning: 'When lovely flower buds open into full spring blooms',
      icon: '🌷'
    }
  ]
};

export const WordGardenGame: React.FC<WordGardenGameProps> = ({
  difficulty,
  onComplete
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [langMode, setLangMode] = useState<'en' | 'hi'>('en');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const puzzles = ADAPTIVE_WORD_PUZZLES[difficulty] || ADAPTIVE_WORD_PUZZLES.Gentle;
  const puzzle = puzzles[currentIdx % puzzles.length];

  useEffect(() => {
    setCurrentIdx(0);
    setSelectedLetter(null);
    setIsAnswered(false);
    setFeedback(null);
  }, [difficulty]);

  const handleSelectLetter = (char: string) => {
    setSelectedLetter(char);
    if (char === puzzle.missingChar) {
      setIsAnswered(true);
      setFeedback(`Beautiful! The word is "${puzzle.wordEn}" (${puzzle.wordHi})! 🌸`);
      SpeechService.speak(puzzle.wordEn, () => {}, () => {});
      setTimeout(onComplete, 1400);
    } else {
      setFeedback(`Good try! Think of: "${puzzle.meaning}".`);
    }
  };

  const handleReadAloud = () => {
    const textToRead = langMode === 'en' ? puzzle.wordEn : `${puzzle.wordHi} (${puzzle.wordEn})`;
    SpeechService.speak(`The word is ${textToRead}. ${puzzle.meaning}`, () => {}, () => {});
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-6">
      {/* Header and Language Selector */}
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between text-xs text-purple-900 font-semibold">
        <div className="flex items-center space-x-1.5">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span>Word Garden & Language Recall</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-purple-700 bg-lavender-50 px-2 py-0.5 rounded-full border border-purple-200">
            {difficulty} ({puzzle.options.length} Letter Choices)
          </span>

          <div className="flex items-center space-x-1 bg-lavender-100 p-0.5 rounded-xl border border-purple-200">
            <button
              type="button"
              onClick={() => setLangMode('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                langMode === 'en' ? 'bg-purple-600 text-white shadow-2xs' : 'text-purple-800 hover:bg-white'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLangMode('hi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                langMode === 'hi' ? 'bg-purple-600 text-white shadow-2xs' : 'text-purple-800 hover:bg-white'
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>
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

      {/* Target Word Display */}
      <div className="bg-lavender-50/70 p-6 rounded-3xl border border-purple-200 text-center space-y-4">
        <div className="text-3xl mx-auto">{puzzle.icon}</div>

        <div className="space-y-1">
          <div className="text-xs font-bold text-purple-800 tracking-wider">
            {langMode === 'hi' ? `शब्द संकेत: ${puzzle.wordHi}` : 'Word Meaning Clue:'}
          </div>
          <p className="text-xs sm:text-sm text-gray-700 font-medium max-w-md mx-auto">
            "{puzzle.meaning}"
          </p>
        </div>

        {/* Word Display with Missing Letter */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {puzzle.displayLetters.map((char, idx) => (
            <div
              key={idx}
              className={`w-11 h-12 sm:w-12 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black transition-all ${
                char === '_'
                  ? selectedLetter && isAnswered
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-purple-600 text-white shadow-md animate-pulse'
                  : 'bg-white text-saksham-darkText border border-purple-200 shadow-2xs'
              }`}
            >
              {char === '_' ? (isAnswered ? puzzle.missingChar : '?') : char}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleReadAloud}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white border border-purple-200 text-purple-700 text-xs font-bold hover:bg-lavender-50 transition shadow-2xs"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Read Clue Aloud</span>
          </button>
        </div>
      </div>

      {/* Letter Options */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-gray-700 text-center">
          Tap the letter that completes the word:
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {puzzle.options.map((char, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectLetter(char)}
              disabled={isAnswered}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border text-xl sm:text-2xl font-extrabold transition transform active:scale-95 flex items-center justify-center ${
                selectedLetter === char
                  ? char === puzzle.missingChar
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-200 shadow-md'
                    : 'bg-rose-100 border-rose-300 text-rose-950'
                  : 'bg-white hover:bg-lavender-50 border-purple-200 text-purple-950 shadow-xs hover:shadow-sm'
              }`}
              aria-label={`Letter ${char}`}
            >
              {char}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
