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

const ADAPTIVE_WORD_PUZZLES: Record<GameDifficulty, WordPuzzle[]> = {
  Gentle: [
    { word: 'CALM', hint: 'Feeling quiet, peaceful, and still inside', meaning: 'Restful tranquility' },
    { word: 'HOPE', hint: 'A bright, cheerful feeling for tomorrow', meaning: 'Looking forward with warmth' },
    { word: 'WARM', hint: 'Comforting like morning sunshine or hot tea', meaning: 'Gentle pleasant heat' },
    { word: 'CARE', hint: 'Kindness, attention, and love for yourself and family', meaning: 'Nourishing kindness' },
  ],
  Moderate: [
    { word: 'SMILE', hint: 'A warm and cheerful expression on your face', meaning: 'Brings joy to everyone around' },
    { word: 'PEACE', hint: 'Quiet tranquility and calm in your heart', meaning: 'Restful stillness' },
    { word: 'BLOOM', hint: 'What a flower does in the warm morning sunshine', meaning: 'Opening fresh and cheerful' },
    { word: 'WATER', hint: 'Fresh, clear hydration for the body', meaning: 'Pure refreshing nourishment' },
  ],
  Stimulating: [
    { word: 'HEALTH', hint: 'Feeling strong, peaceful, and well in body and mind', meaning: 'Your greatest natural treasure' },
    { word: 'HARMONY', hint: 'Living in peace, kindness, and balance', meaning: 'A calm and balanced state' },
    { word: 'GARDEN', hint: 'A peaceful outdoor space with blooming flowers', meaning: 'Nature surrounding your home' },
    { word: 'NATURE', hint: 'The beauty of green trees, rivers, and skies', meaning: 'Earth’s peaceful creation' },
  ]
};

export const WordUnscrambleGame: React.FC<WordUnscrambleGameProps> = ({
  difficulty,
  onComplete,
}) => {
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState<number>(0);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [placedIndices, setPlacedIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string>('Tap the letters in the correct order to spell the word!');
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const puzzles = ADAPTIVE_WORD_PUZZLES[difficulty] || ADAPTIVE_WORD_PUZZLES.Gentle;
  const activePuzzle = puzzles[currentPuzzleIdx % puzzles.length] || puzzles[0];

  const scramble = (str: string): string[] => {
    const arr = str.split('');
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
    const puzzle = puzzles[idx % puzzles.length];
    setCurrentPuzzleIdx(idx % puzzles.length);
    setScrambledLetters(scramble(puzzle.word));
    setPlacedIndices([]);
    setIsRevealed(false);
    setFeedback(`Unscramble this ${puzzle.word.length}-letter word:`);
  };

  useEffect(() => {
    loadPuzzle(0);
  }, [difficulty]);

  const handleLetterTap = (scrambledIdx: number) => {
    if (placedIndices.includes(scrambledIdx)) {
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
    audioSynthesizer.playTone(550, 0.2);
    setFeedback(`Gentle Clue: Starts with "${activePuzzle.word[0]}". ${activePuzzle.hint}`);
    SpeechService.speak(`Starts with ${activePuzzle.word[0]}. ${activePuzzle.hint}`);
  };

  const handleReveal = () => {
    setIsRevealed(true);
    setFeedback(`The comforting word is: "${activePuzzle.word}" - ${activePuzzle.meaning} 🌿`);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
          <span>Word Unscramble • {difficulty} ({activePuzzle.word.length} Letters)</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedback}
        </h3>
        <p className="text-xs text-gray-600">
          Meaning: {activePuzzle.meaning}
        </p>

        {difficulty === 'Gentle' && (
          <p className="text-[11px] font-bold text-purple-700 bg-lavender-50 px-2.5 py-0.5 rounded-full inline-block border border-purple-200 mt-1">
            🌱 First Letter Anchor: Starts with "{activePuzzle.word[0]}"
          </p>
        )}
      </div>

      {/* Answer Slots */}
      <div className="flex items-center justify-center gap-2 max-w-[340px] mx-auto p-3 bg-lavender-50/70 rounded-2xl border border-purple-100 min-h-[64px]">
        {Array.from({ length: activePuzzle.word.length }).map((_, idx) => {
          const letterPlaced = placedIndices[idx] !== undefined ? scrambledLetters[placedIndices[idx]] : '';
          return (
            <div
              key={idx}
              className={`w-12 h-14 rounded-2xl flex items-center justify-center text-xl font-black border-2 transition-all ${
                letterPlaced
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs scale-105'
                  : 'bg-white border-purple-200 text-gray-300 border-dashed'
              }`}
            >
              {letterPlaced}
            </div>
          );
        })}
      </div>

      {/* Scrambled Letter Tiles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500">Tap letters below in order:</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-[340px] mx-auto">
          {scrambledLetters.map((char, idx) => {
            const isUsed = placedIndices.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleLetterTap(idx)}
                className={`w-12 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold border transition-all cursor-pointer ${
                  isUsed
                    ? 'bg-gray-100 border-gray-200 text-gray-300 opacity-40 scale-95'
                    : 'bg-white hover:bg-lavender-50 border-purple-300 text-purple-900 shadow-2xs hover:shadow-xs active:scale-95'
                }`}
                aria-label={`Letter tile ${char}`}
              >
                {char}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-3.5 py-1.5 rounded-xl bg-lavender-50 hover:bg-lavender-100 text-purple-700 font-bold text-xs border border-purple-200 transition shadow-2xs flex items-center space-x-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        <button
          type="button"
          onClick={handleHint}
          className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition shadow-2xs flex items-center space-x-1"
        >
          <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
          <span>Need a Clue?</span>
        </button>

        {!isRevealed && (
          <button
            type="button"
            onClick={handleReveal}
            className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition shadow-2xs flex items-center space-x-1"
            aria-label="Reveal Word"
          >
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            <span>Reveal Word</span>
          </button>
        )}
      </div>
    </div>
  );
};
