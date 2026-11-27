import React, { useEffect, useRef, useState } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { CheckCircle, HelpCircle, Sparkles } from 'lucide-react';

interface EverydayHelpersGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

interface HelperNeedPair {
  id: string;
  needLabel: string;
  objectLabel: string;
  emoji: string;
}

const PAIRS: HelperNeedPair[] = [
  { id: 'read', needLabel: 'Reading the morning newspaper', objectLabel: 'Reading Glasses', emoji: '👓' },
  { id: 'tea', needLabel: 'Pouring soothing hot ginger tea', objectLabel: 'Brass Kettle', emoji: '🫖' },
  { id: 'garden', needLabel: 'Stepping into the sunny garden', objectLabel: 'Straw Sun Hat', emoji: '👒' },
  { id: 'rest', needLabel: 'Keeping warm during an evening breeze', objectLabel: 'Woolen Shawl', emoji: '🧣' },
  { id: 'lock', needLabel: 'Locking the courtyard door gently', objectLabel: 'Door Keys', emoji: '🔑' },
];

export const EverydayHelpersGame: React.FC<EverydayHelpersGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete,
  onRequestHint,
}) => {
  const preferences = useOptionalAccessibility()?.preferences;
  const resolved = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);

  const [pairedIds, setPairedIds] = useState<string[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string>('read');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const startRef = useRef(Date.now());

  const requiredPairs = difficulty === 'Gentle' ? 1 : difficulty === 'Moderate' ? 3 : 2;
  const activePairs = PAIRS.slice(0, difficulty === 'Gentle' ? 2 : difficulty === 'Moderate' ? 3 : 5);
  const stimRequiredIds = ['read', 'rest'];

  useEffect(() => {
    setPairedIds([]);
    setSelectedNeedId('read');
    setFeedback(
      difficulty === 'Gentle'
        ? 'Tip: Pick the comforting helper shown with the reading task.'
        : null
    );
    setCompleted(false);
    mistakesRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  }, [difficulty, resolved.mode]);

  const finishWithMetrics = (correct: number) => {
    setCompleted(true);
    const metrics = buildGameRunMetrics({
      correctAnswers: correct,
      incorrectAnswers: mistakesRef.current,
      hintsUsed: hintsRef.current,
      reactionTimesMs: [Date.now() - startRef.current],
      completionStatus: 'completed',
    });
    metrics.mechanicMode = resolved.mode;
    metrics.appliedMechanics = resolved.mechanics.appliedMechanicsSummary;
    setTimeout(() => onComplete(metrics), 900);
  };

  const handleObjectTap = (obj: HelperNeedPair) => {
    if (completed) return;

    if (difficulty === 'Gentle') {
      if (obj.id === 'read') {
        setPairedIds(['read']);
        setFeedback('Wonderful! Reading Glasses make morning reading peaceful and crisp! 🌸');
        finishWithMetrics(1);
      } else {
        mistakesRef.current += 1;
        setFeedback('That helps with another task — think of what rests by the newspaper!');
      }
      return;
    }

    if (difficulty === 'Moderate') {
      if (obj.id === selectedNeedId) {
        const nextPaired = pairedIds.includes(obj.id) ? pairedIds : [...pairedIds, obj.id];
        setPairedIds(nextPaired);
        const remaining = activePairs.find((p) => !nextPaired.includes(p.id));
        if (remaining) {
          setSelectedNeedId(remaining.id);
          setFeedback(`Connected ${obj.objectLabel}! Now pair: ${remaining.needLabel}.`);
        } else {
          setFeedback('All 3 everyday helpers matched seamlessly!');
          finishWithMetrics(nextPaired.length);
        }
      } else {
        mistakesRef.current += 1;
        const activeNeed = activePairs.find((p) => p.id === selectedNeedId);
        setFeedback(`Look gently for what helps with "${activeNeed?.needLabel}".`);
      }
      return;
    }

    // Stimulating: Pick the 2-object helper kit needed for "Cozy evening veranda reading" (Glasses + Shawl)
    if (stimRequiredIds.includes(obj.id)) {
      const next = pairedIds.includes(obj.id) ? pairedIds : [...pairedIds, obj.id];
      setPairedIds(next);
      if (next.length >= requiredPairs) {
        setFeedback('Complete kit ready! Reading Glasses and Woolen Shawl keep you cozy!');
        finishWithMetrics(next.length);
      } else {
        setFeedback(`Added ${obj.objectLabel}! Pick 1 more helper for cozy veranda reading.`);
      }
    } else {
      mistakesRef.current += 1;
      setFeedback(`"${obj.objectLabel}" is lovely, though for evening veranda reading think of vision + warmth!`);
    }
  };

  const handleHint = () => {
    hintsRef.current += 1;
    onRequestHint?.();
    if (difficulty === 'Stimulating') {
      setFeedback('Gentle Clue: Look for something to help your eyes read AND something to keep warm.');
    } else {
      const target = activePairs.find((p) => p.id === selectedNeedId) || activePairs[0];
      setFeedback(`Helpful Hint: "${target.needLabel}" pairs with ${target.emoji} ${target.objectLabel}.`);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5 text-center">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between gap-2 flex-wrap text-xs font-semibold text-purple-900">
        <span className="flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Everyday Object Helpers</span>
        </span>
        <span className="text-purple-700 bg-lavender-50 px-2.5 py-0.5 rounded-full border border-purple-200">
          {difficulty === 'Gentle'
            ? 'Guided Pairing'
            : difficulty === 'Moderate'
            ? `Connect 3 Pairs (${pairedIds.length}/3)`
            : `2-Object Kit (${pairedIds.length}/2)`}
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
          <HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {difficulty === 'Moderate' ? (
        <div className="flex flex-wrap justify-center gap-2">
          {activePairs.map((pair) => {
            const done = pairedIds.includes(pair.id);
            const active = selectedNeedId === pair.id;
            return (
              <button
                key={pair.id}
                type="button"
                onClick={() => !done && setSelectedNeedId(pair.id)}
                disabled={done || completed}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold border-2 transition cursor-pointer ${
                  done
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 line-through'
                    : active
                    ? 'bg-purple-600 border-purple-700 text-white'
                    : 'bg-lavender-50 border-purple-200 text-purple-900'
                }`}
              >
                {pair.needLabel}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-lavender-50/70 border border-purple-200 text-sm font-extrabold text-saksham-darkText">
          {difficulty === 'Gentle'
            ? 'Task: Reading the morning newspaper'
            : 'Goal: Prepare a 2-object kit for cozy evening veranda reading'}
        </div>
      )}

      <div className={`grid gap-3 ${activePairs.length <= 2 ? 'grid-cols-2 max-w-sm mx-auto' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {activePairs.map((obj) => {
          const isPicked = pairedIds.includes(obj.id);
          return (
            <button
              key={`obj-${obj.id}`}
              type="button"
              onClick={() => handleObjectTap(obj)}
              disabled={isPicked || completed}
              className={`p-4 min-h-[76px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                isPicked
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                  : 'bg-white hover:bg-lavender-50 border-purple-200 text-purple-950'
              }`}
            >
              <span className="text-3xl">{obj.emoji}</span>
              <span className="text-xs font-bold">{obj.objectLabel}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleHint}
        disabled={completed}
        className="px-4 py-2 min-h-[44px] rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span>Gentle Functional Clue</span>
      </button>
    </div>
  );
};
