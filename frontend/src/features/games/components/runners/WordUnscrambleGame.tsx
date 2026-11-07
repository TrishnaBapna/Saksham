import React, { useState, useEffect } from 'react';
import { GameDifficulty, GamePacing } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { SpeechService } from '../../../../services/speechService.js';
import { BookOpen, HelpCircle, Eye, RotateCcw } from 'lucide-react';

interface WordUnscrambleGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  onComplete: () => void;
}

interface WordPuzzle {
  word: string;
  hint: string;
  meaning: string;
}

const PUZZLES: WordPuzzle[] = [
  { word: 'SMILE', hint: 'A warm and cheerful expression on your face', meaning: 'Brings joy to everyone around' },
  { word: 'HEALTH', hint: 'Feeling strong, peaceful, and well in body and mind', meaning: 'Your greatest natural treasure' },
  { word: 'HARMONY', hint: 'Living in peace, kindness, and balance', meaning: 'A calm and balanced state' },
  { word: 'PEACE', hint: 'Quiet tranquility and calm in your heart', meaning: 'Restful stillness' },
  { word: 'BLOOM', hint: 'What a flower does in the warm morning sunshine', meaning: 'Opening fresh and cheerful' },
];

export const WordUnscrambleGame: React.FC<WordUnscrambleGameProps> = ({
  difficulty,
  onComplete,
}) => {
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState<number>(0);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [placedIndices, setPlacedIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string>('Tap the letters in the correct order to spell the word!');
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const activePuzzle = PUZZLES[currentPuzzleIdx] || PUZZLES[0];

  const scramble = (str: string): string[] => {
    const arr = str.split('');
    // Keep shuffling until it does not equal the target word
    let shuffled = [...arr];
    for (let attempts = 0; attempts < 10; attempts++) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (shuffled.join('') !== str) break;
    }
    return shuffled;
  };

  const loadPuzzle = (idx: number) => {
    const puzzle = PUZZLES[idx % PUZZLES.length];
    setCurrentPuzzleIdx(idx % PUZZLES.length);
    setScrambledLetters(scramble(puzzle.word));
    setPlacedIndices([]);
    setIsRevealed(false);
    setFeedback(`Unscramble this ${puzzle.word.length}-letter word:`);
  };

  useEffect(() => {
    loadPuzzle(0);
  }, [difficulty]);

  const currentConstructedWord = placedIndices.map((i) => scrambledLetters[i]).join('');

  const handleLetterTap = (scrambledIdx: number) => {
    if (placedIndices.includes(scrambledIdx)) {
      // Remove it
      setPlacedIndices((prev) => prev.filter((i) => i !== scrambledIdx));
      audioSynthesizer.playTone(350, 0.1);
      return;
    }

    const nextIndices = [...placedIndices, scrambledIdx];
    setPlacedIndices(nextIndices);
    audioSynthesizer.playTone(450 + nextIndices.length * 40, 0.15);

    const formed = nextIndices.map((i) => scrambledLetters[i]).join('');
    if (formed.length === activePuzzle.word.length) {
      if (formed === activePuzzle.word) {
        audioSynthesizer.playChime('fanfare');
        setFeedback(`✨ Beautiful! The word is "${activePuzzle.word}"!`);
        setTimeout(() => {
          onComplete();
        }, 1200);
      } else {
        audioSynthesizer.playChime('chime');
        setFeedback(`Almost! Let's rethink. Tap a letter to remove it, or use a hint.`);
      }
    }
  };

  const handleClear = () => {
    setPlacedIndices([]);
    setFeedback(`Unscramble this ${activePuzzle.word.length}-letter word:`);
  };

  const handleHint = () => {
    setFeedback(`Gentle Clue: ${activePuzzle.hint}`);
    SpeechService.speak(activePuzzle.hint);
  };

  const handleReveal = () => {
    setIsRevealed(true);
    setFeedback(`The comforting word is: ${activePuzzle.word}`);
    audioSynthesizer.playChime('bell');
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
          <span>Word Unscramble</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedback}
        </h3>
        <p className="text-xs text-gray-500">
          Hint: "{activePuzzle.hint}"
        </p>
      </div>

      {/* Answer Slots Display */}
      <div className="flex justify-center items-center gap-2 max-w-sm mx-auto p-2">
        {Array.from({ length: activePuzzle.word.length }).map((_, slotIdx) => {
          const char = isRevealed
            ? activePuzzle.word[slotIdx]
            : currentConstructedWord[slotIdx] || '';

          return (
            <div
              key={slotIdx}
              className={`w-12 h-14 rounded-2xl flex items-center justify-center font-black text-xl border-2 transition-all shadow-xs ${
                char
                  ? 'bg-purple-600 text-white border-purple-600 scale-102'
                  : 'bg-purple-50 text-transparent border-dashed border-purple-300'
              }`}
            >
              {char || '·'}
            </div>
          );
        })}
      </div>

      {/* Scrambled Letter Tiles */}
      <div className="flex flex-wrap justify-center gap-2.5 max-w-sm mx-auto p-2">
        {scrambledLetters.map((letter, idx) => {
          const isPlaced = placedIndices.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleLetterTap(idx)}
              disabled={isRevealed}
              className={`w-12 h-12 rounded-2xl font-black text-lg transition-all duration-200 shadow-sm flex items-center justify-center cursor-pointer min-h-[48px] min-w-[48px] ${
                isPlaced
                  ? 'bg-gray-200 text-gray-400 border border-gray-300 opacity-50'
                  : 'bg-white hover:bg-purple-50 text-purple-900 border-2 border-purple-300 hover:border-purple-500 active:scale-95'
              }`}
              aria-label={`Letter tile ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Action Buttons: Clear, Hint, Reveal */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={handleClear}
          className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition flex items-center space-x-1 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear Letters</span>
        </button>

        <button
          type="button"
          onClick={handleHint}
          className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition flex items-center space-x-1 min-h-[44px]"
        >
          <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
          <span>Need a Hint?</span>
        </button>

        <button
          type="button"
          onClick={handleReveal}
          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition flex items-center space-x-1 min-h-[44px]"
        >
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <span>Reveal Word</span>
        </button>
      </div>
    </div>
  );
};
