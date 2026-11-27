import React, { useEffect, useRef, useState } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { CheckCircle, HelpCircle, Sparkles } from 'lucide-react';

interface HouseholdRiddlesGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

interface RiddleItem {
  id: string;
  riddle: string;
  secondClue: string;
  answer: string;
  emoji: string;
  gentleDistractors: string[];
  closeDistractors: string[];
}

const RIDDLE_BANK: RiddleItem[] = [
  {
    id: 'kettle',
    riddle: 'I rest on the kitchen counter and whistle softly when warm morning tea water is ready.',
    secondClue: 'It has a handle and spout for pouring hot water.',
    answer: 'Tea Kettle',
    emoji: '🫖',
    gentleDistractors: ['Story Book', 'Woolen Shawl'],
    closeDistractors: ['Tea Cup', 'Thermos Flask', 'Water Jug'],
  },
  {
    id: 'glasses',
    riddle: 'I rest beside the bedside lamp and help make newspaper letters clear every morning.',
    secondClue: 'They rest comfortably across your nose with two gentle lenses.',
    answer: 'Reading Glasses',
    emoji: '👓',
    gentleDistractors: ['Temple Bell', 'Coffee Table'],
    closeDistractors: ['Magnifying Glass', 'Wristwatch', 'Lamp Shade'],
  },
  {
    id: 'clock',
    riddle: 'My hands move gently in a steady circle so you always know when afternoon tea arrives.',
    secondClue: 'It ticks calmly above the living room shelf.',
    answer: 'Mantle Clock',
    emoji: '🕰️',
    gentleDistractors: ['Jasmine Leaf', 'Tea Cup'],
    closeDistractors: ['Calendar', 'Door Bell', 'Picture Frame'],
  },
];

export const HouseholdRiddlesGame: React.FC<HouseholdRiddlesGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete,
  onRequestHint,
}) => {
  const preferences = useOptionalAccessibility()?.preferences;
  const resolved = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);

  const [riddleIdx, setRiddleIdx] = useState(0);
  const [showSecondClue, setShowSecondClue] = useState(
    resolved.mechanics.clueLevel === 'automatic'
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const totalStages = difficulty === 'Gentle' ? 1 : difficulty === 'Moderate' ? 2 : 3;
  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const correctRef = useRef(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setRiddleIdx(0);
    setShowSecondClue(resolved.mechanics.clueLevel === 'automatic');
    setFeedback(null);
    setCompleted(false);
    mistakesRef.current = 0;
    hintsRef.current = 0;
    correctRef.current = 0;
    startRef.current = Date.now();
  }, [difficulty, resolved.mode]);

  const current = RIDDLE_BANK[riddleIdx % RIDDLE_BANK.length];
  const distractors =
    difficulty === 'Gentle' ? current.gentleDistractors : current.closeDistractors;
  const choices = [current.answer, ...distractors.slice(0, difficulty === 'Gentle' ? 2 : 3)];

  const handleChooseWord = (choice: string) => {
    if (completed) return;
    if (choice === current.answer) {
      correctRef.current += 1;
      if (riddleIdx + 1 >= totalStages) {
        setCompleted(true);
        setFeedback(`Wonderful! "${current.answer}" solved the riddle gracefully! 🌸`);
        const metrics = buildGameRunMetrics({
          correctAnswers: correctRef.current,
          incorrectAnswers: mistakesRef.current,
          hintsUsed: hintsRef.current,
          reactionTimesMs: [Date.now() - startRef.current],
          completionStatus: 'completed',
        });
        metrics.mechanicMode = resolved.mode;
        metrics.appliedMechanics = resolved.mechanics.appliedMechanicsSummary;
        setTimeout(() => onComplete(metrics), 900);
      } else {
        const nextIdx = riddleIdx + 1;
        setRiddleIdx(nextIdx);
        setShowSecondClue(resolved.mechanics.clueLevel === 'automatic');
        setFeedback('Great thinking! Here is the next household clue.');
      }
    } else {
      mistakesRef.current += 1;
      setShowSecondClue(true);
      setFeedback(`Gentle Hint: ${current.secondClue}`);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5 text-center">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between gap-2 flex-wrap text-xs font-semibold text-purple-900">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-purple-600" />
          <span>Household Word Riddles</span>
        </span>
        <span className="text-purple-700 bg-lavender-50 px-2.5 py-0.5 rounded-full border border-purple-200">
          Riddle {riddleIdx + 1} / {totalStages} ({difficulty})
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center justify-center gap-2 ${
            completed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
              : 'bg-lavender-50 border-purple-200 text-purple-900'
          }`}
        >
          {completed ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <HelpCircle className="w-4 h-4 text-purple-600" />}
          <span>{feedback}</span>
        </div>
      )}

      <div className="bg-lavender-50/70 p-5 rounded-3xl border border-purple-200 space-y-3">
        {difficulty === 'Gentle' && (
          <div className="text-4xl" aria-hidden="true">
            {current.emoji}
          </div>
        )}
        <p className="text-sm sm:text-base font-bold text-saksham-darkText max-w-md mx-auto">
          "{current.riddle}"
        </p>
        {showSecondClue && (
          <p className="text-xs font-medium text-purple-800 bg-white/90 px-3 py-1.5 rounded-xl border border-purple-100 inline-block">
            💡 Second Clue: {current.secondClue}
          </p>
        )}
      </div>

      <div className={`grid gap-3 max-w-md mx-auto ${choices.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => handleChooseWord(choice)}
            disabled={completed}
            className="p-3.5 min-h-[52px] rounded-2xl bg-white hover:bg-lavender-50 border-2 border-purple-200 text-purple-950 font-bold text-sm transition cursor-pointer"
          >
            {choice}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          hintsRef.current += 1;
          onRequestHint?.();
          setShowSecondClue(true);
        }}
        disabled={completed || showSecondClue}
        className="px-4 py-2 min-h-[44px] rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span>Show Helpful Clue</span>
      </button>
    </div>
  );
};
