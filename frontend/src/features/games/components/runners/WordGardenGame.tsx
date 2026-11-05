import React, { useState } from 'react';
import { GameDifficulty } from '../../../../types/index.js';
import { SpeechService } from '../../../../services/speechService.js';
import { BookOpen, Sparkles, Volume2, CheckCircle, HelpCircle } from 'lucide-react';

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

const WORD_PUZZLES: WordPuzzle[] = [
  {
    id: 'w-1',
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
    id: 'w-2',
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
    id: 'w-3',
    wordEn: 'MUSIC',
    wordHi: 'संगीत',
    displayLetters: ['M', 'U', '_', 'I', 'C'],
    missingIndex: 2,
    missingChar: 'S',
    options: ['S', 'N', 'R'],
    meaning: 'Soothing old songs and classical morning ragas',
    icon: '🎶'
  }
];

export const WordGardenGame: React.FC<WordGardenGameProps> = ({
  difficulty: _difficulty,
  onComplete
}) => {
  const [currentIdx] = useState(0);
  const [langMode, setLangMode] = useState<'en' | 'hi'>('en');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const puzzle = WORD_PUZZLES[currentIdx];

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

        <div className="flex items-center space-x-1 bg-lavender-100 p-0.5 rounded-xl border border-purple-200">
          <button
            type="button"
            onClick={() => setLangMode('en')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
              langMode === 'en' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-800'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLangMode('hi')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
              langMode === 'hi' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-800'
            }`}
          >
            हिंदी
          </button>
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

      {/* Word Box & Icon */}
      <div className="bg-gradient-to-r from-purple-50 via-lavender-50 to-pink-50 p-6 rounded-3xl border border-purple-200 text-center space-y-3">
        <div className="text-4xl">{puzzle.icon}</div>
        <p className="text-xs text-purple-800 font-medium">{puzzle.meaning}</p>

        {/* Letter tiles row */}
        <div className="flex justify-center space-x-2 sm:space-x-3 pt-2">
          {puzzle.displayLetters.map((letter, idx) => {
            const isMissingSlot = idx === puzzle.missingIndex;
            return (
              <div
                key={idx}
                className={`w-10 h-12 sm:w-12 sm:h-14 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-extrabold border-2 shadow-xs ${
                  isMissingSlot
                    ? isAnswered
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                      : 'bg-white border-dashed border-purple-400 text-purple-700 animate-pulse'
                    : 'bg-white border-purple-200 text-saksham-darkText'
                }`}
              >
                {isMissingSlot ? (isAnswered ? puzzle.missingChar : '?') : letter}
              </div>
            );
          })}
        </div>

        {/* Listen Button */}
        <button
          type="button"
          onClick={handleReadAloud}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50 transition shadow-2xs mt-2"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Listen to Meaning</span>
        </button>
      </div>

      {/* Missing letter choices */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-700 text-center">
          Tap the letter that completes the word:
        </p>

        <div className="flex justify-center space-x-3 sm:space-x-4">
          {puzzle.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectLetter(opt)}
              disabled={isAnswered}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-extrabold transition-all transform active:scale-95 shadow-sm ${
                selectedLetter === opt
                  ? opt === puzzle.missingChar
                    ? 'bg-emerald-100 border-emerald-400 ring-4 ring-emerald-200'
                    : 'bg-purple-50 border-purple-300'
                  : 'bg-white border-purple-200 hover:border-purple-400 hover:bg-lavender-50 text-purple-950'
              }`}
              aria-label={`Letter ${opt}`}
            >
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 flex items-center justify-center space-x-1">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>Words connect memories and warm thoughts</span>
      </div>
    </div>
  );
};
