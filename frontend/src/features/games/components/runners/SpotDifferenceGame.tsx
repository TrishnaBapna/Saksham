import React, { useEffect, useRef, useState } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { CheckCircle, Eye, HelpCircle, Sparkles } from 'lucide-react';

interface SpotDifferenceGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

interface SceneSlot {
  id: number;
  symbolA: string;
  symbolB: string;
  label: string;
  isChanged: boolean;
}

export const SpotDifferenceGame: React.FC<SpotDifferenceGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete,
  onRequestHint,
}) => {
  const preferences = useOptionalAccessibility()?.preferences;
  const resolved = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);

  const [slots, setSlots] = useState<SceneSlot[]>([]);
  const [foundIds, setFoundIds] = useState<number[]>([]);
  const [hintedSlotId, setHintedSlotId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const gentleScene: SceneSlot[] = [
      { id: 0, symbolA: '🌸', symbolB: '🌸', label: 'Pink Lotus', isChanged: false },
      { id: 1, symbolA: '🫖', symbolB: '📖', label: 'Table Spot', isChanged: true },
      { id: 2, symbolA: '🪑', symbolB: '🪑', label: 'Porch Chair', isChanged: false },
      { id: 3, symbolA: '🪟', symbolB: '🪟', label: 'Sun Window', isChanged: false },
    ];

    const moderateScene: SceneSlot[] = [
      { id: 0, symbolA: '🌸', symbolB: '🌸', label: 'Vase', isChanged: false },
      { id: 1, symbolA: '🫖', symbolB: '☕', label: 'Tea Spot', isChanged: true },
      { id: 2, symbolA: '🪑', symbolB: '🪑', label: 'Chair', isChanged: false },
      { id: 3, symbolA: '🕰️', symbolB: '⏰', label: 'Clock', isChanged: true },
      { id: 4, symbolA: '🪴', symbolB: '🪴', label: 'Fern', isChanged: false },
      { id: 5, symbolA: '📖', symbolB: '📖', label: 'Book', isChanged: false },
    ];

    const stimScene: SceneSlot[] = [
      { id: 0, symbolA: '🌸', symbolB: '🌺', label: 'Blossom Corner', isChanged: true },
      { id: 1, symbolA: '🌿', symbolB: '🌿', label: 'Leaf', isChanged: false },
      { id: 2, symbolA: '☕', symbolB: '☕', label: 'Tea Cup', isChanged: false },
      { id: 3, symbolA: '🕰️', symbolB: '🕰️', label: 'Mantle Clock', isChanged: false },
      { id: 4, symbolA: '🖼️', symbolB: '🪟', label: 'Wall Frame', isChanged: true },
      { id: 5, symbolA: '🪴', symbolB: '🪴', label: 'Plant', isChanged: false },
      { id: 6, symbolA: '🕯️', symbolB: '🕯️', label: 'Candle', isChanged: false },
      { id: 7, symbolA: '📖', symbolB: '📖', label: 'Album', isChanged: false },
      { id: 8, symbolA: '🪑', symbolB: '🪑', label: 'Settee', isChanged: false },
    ];

    const chosen =
      difficulty === 'Gentle'
        ? gentleScene
        : difficulty === 'Moderate' || resolved.distractorCap <= 2
        ? moderateScene
        : stimScene;

    setSlots(chosen);
    setFoundIds([]);
    setHintedSlotId(resolved.mechanics.clueLevel === 'automatic' ? chosen.find((s) => s.isChanged)?.id ?? null : null);
    setFeedback(null);
    setCompleted(false);
    mistakesRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  }, [difficulty, resolved.distractorCap]);

  const totalChanges = slots.filter((s) => s.isChanged).length;

  const handleTileTap = (slot: SceneSlot) => {
    if (completed) return;
    if (!slot.isChanged) {
      mistakesRef.current += 1;
      setFeedback(`That "${slot.label}" looks identical in both rooms — keep scanning calmly!`);
      return;
    }

    if (foundIds.includes(slot.id)) return;
    const nextFound = [...foundIds, slot.id];
    setFoundIds(nextFound);
    setHintedSlotId(null);

    if (nextFound.length >= totalChanges) {
      setCompleted(true);
      setFeedback('Sharp gentle eyes! You spotted every peaceful change between the two rooms! 🌸');
      const metrics = buildGameRunMetrics({
        correctAnswers: nextFound.length,
        incorrectAnswers: mistakesRef.current,
        hintsUsed: hintsRef.current,
        reactionTimesMs: [Date.now() - startRef.current],
        completionStatus: 'completed',
      });
      metrics.mechanicMode = resolved.mode;
      metrics.appliedMechanics = resolved.mechanics.appliedMechanicsSummary;
      setTimeout(() => onComplete(metrics), 900);
    } else {
      setFeedback(`Found 1 difference! (${nextFound.length}/${totalChanges}) — notice one more detail.`);
    }
  };

  const handleHint = () => {
    const remaining = slots.find((s) => s.isChanged && !foundIds.includes(s.id));
    if (remaining) {
      hintsRef.current += 1;
      onRequestHint?.();
      setHintedSlotId(remaining.id);
      setFeedback(`Gentle Clue: Compare the highlighted tile near the ${remaining.label.toLowerCase()}.`);
    }
  };

  const gridCols = slots.length === 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between gap-2 flex-wrap text-xs font-semibold text-purple-900">
        <span className="flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-teal-600" />
          <span>Spot the Peaceful Change</span>
        </span>
        <span className="text-purple-700 bg-lavender-50 px-2.5 py-0.5 rounded-full border border-purple-200">
          Spotted: {foundIds.length} / {totalChanges} ({difficulty})
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
            completed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
              : 'bg-lavender-50 border-purple-200 text-purple-900'
          }`}
        >
          {completed ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <HelpCircle className="w-4 h-4 text-purple-600" />}
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Scene A (Reference) */}
        <div className="p-4 rounded-2xl bg-lavender-50/70 border border-purple-200 space-y-2 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
            Scene A • Peaceful Morning
          </span>
          <div className={`grid ${gridCols} gap-2 max-w-[230px] mx-auto`}>
            {slots.map((slot) => (
              <div
                key={`a-${slot.id}`}
                className="aspect-square rounded-xl bg-white border border-purple-100 flex items-center justify-center text-2xl sm:text-3xl shadow-2xs"
                aria-label={`Reference ${slot.label}`}
              >
                {slot.symbolA}
              </div>
            ))}
          </div>
        </div>

        {/* Scene B (Interactive Spot Difference) */}
        <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-300 space-y-2 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block">
            Scene B • Tap What Changed
          </span>
          <div className={`grid ${gridCols} gap-2 max-w-[230px] mx-auto`}>
            {slots.map((slot) => {
              const isFound = foundIds.includes(slot.id);
              const isHint = hintedSlotId === slot.id;
              return (
                <button
                  key={`b-${slot.id}`}
                  type="button"
                  onClick={() => handleTileTap(slot)}
                  disabled={completed}
                  aria-label={`Scene B tile ${slot.label}`}
                  className={`aspect-square rounded-xl border-2 flex items-center justify-center text-2xl sm:text-3xl transition cursor-pointer ${
                    isFound
                      ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-200'
                      : isHint
                      ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200'
                      : 'bg-white hover:bg-lavender-50 border-purple-200'
                  }`}
                >
                  {slot.symbolB}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleHint}
          disabled={completed}
          className="px-4 py-2 min-h-[44px] rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Gentle Spot Clue</span>
        </button>
      </div>
    </div>
  );
};
