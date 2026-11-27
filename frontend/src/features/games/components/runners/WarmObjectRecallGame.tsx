import React, { useEffect, useRef, useState } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { Brain, CheckCircle, Eye, HelpCircle, Sparkles } from 'lucide-react';

interface WarmObjectRecallGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

interface TrayItem {
  id: string;
  symbol: string;
  label: string;
  clue: string;
}

const HOUSEHOLD_ITEMS: TrayItem[] = [
  { id: 'kettle', symbol: '🫖', label: 'Tea Kettle', clue: 'Warms fresh herbal morning tea' },
  { id: 'glasses', symbol: '👓', label: 'Reading Glasses', clue: 'Helps read stories clearly' },
  { id: 'keys', symbol: '🔑', label: 'Brass Keys', clue: 'Keeps the front door safe' },
  { id: 'cup', symbol: '☕', label: 'Warm Tea Cup', clue: 'Held while relaxing on the veranda' },
  { id: 'book', symbol: '📖', label: 'Story Book', clue: 'Filled with favorite memories' },
  { id: 'clock', symbol: '🕰️', label: 'Mantle Clock', clue: 'Tells the calm afternoon hour' },
  { id: 'lamp', symbol: '🛋️', label: 'Cozy Cushion', clue: 'Soft comfort beside the sofa' },
  { id: 'bell', symbol: '🔔', label: 'Prayer Bell', clue: 'Rings softly during morning prayer' },
  { id: 'flower', symbol: '🪷', label: 'Fresh Lotus', clue: 'Brightens the courtyard vase' },
];

export const WarmObjectRecallGame: React.FC<WarmObjectRecallGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete,
  onRequestHint,
}) => {
  const preferences = useOptionalAccessibility()?.preferences;
  const resolved = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);

  const [phase, setPhase] = useState<'observe' | 'recall'>('observe');
  const [trayItems, setTrayItems] = useState<TrayItem[]>([]);
  const [gridChoices, setGridChoices] = useState<TrayItem[]>([]);
  const [targetSwapItems, setTargetSwapItems] = useState<TrayItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showClue, setShowClue] = useState(resolved.mechanics.clueLevel === 'automatic');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const isStimulating = difficulty === 'Stimulating';
    const isModerate = difficulty === 'Moderate';
    const count = isStimulating ? 6 : isModerate ? 5 : 4;
    const chosen = HOUSEHOLD_ITEMS.slice(0, count);
    setTrayItems(chosen);

    if (isStimulating) {
      // Stimulating: Spot what changed / swapped onto tray after observation
      const swappedNew = HOUSEHOLD_ITEMS.slice(count, count + 2);
      const alteredDisplay = [...chosen.slice(0, count - 2), ...swappedNew];
      setTargetSwapItems(swappedNew);
      setGridChoices(alteredDisplay.sort(() => Math.random() - 0.5));
    } else if (isModerate) {
      // Moderate: Select 3 tray items out of mixed tray+distractor field
      const distractors = HOUSEHOLD_ITEMS.slice(count, Math.min(HOUSEHOLD_ITEMS.length, count + 3));
      const pool = [...chosen.slice(0, 3), ...distractors].sort(() => Math.random() - 0.5);
      setTargetSwapItems(chosen.slice(0, 3));
      setGridChoices(pool);
    } else {
      // Gentle: Recognition of 1 target item from 2 clear choices
      const target = chosen[0];
      const distractor = HOUSEHOLD_ITEMS[count] || HOUSEHOLD_ITEMS[HOUSEHOLD_ITEMS.length - 1];
      setTargetSwapItems([target]);
      setGridChoices([target, distractor]);
    }

    setPhase('observe');
    setSelectedIds([]);
    setShowClue(resolved.mechanics.clueLevel === 'automatic');
    setFeedback(null);
    setSolved(false);
    mistakesRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  }, [difficulty, resolved.mode]);

  const handleToggleChoice = (item: TrayItem) => {
    if (solved) return;
    if (difficulty === 'Gentle') {
      const target = targetSwapItems[0];
      if (item.id === target.id) {
        setSolved(true);
        setSelectedIds([item.id]);
        setFeedback(`Wonderful! ${item.label} was indeed resting on your tray! 🌸`);
        const metrics = buildGameRunMetrics({
          correctAnswers: 1,
          incorrectAnswers: mistakesRef.current,
          hintsUsed: hintsRef.current,
          reactionTimesMs: [Date.now() - startRef.current],
          completionStatus: 'completed',
        });
        metrics.mechanicMode = resolved.mode;
        metrics.appliedMechanics = resolved.mechanics.appliedMechanicsSummary;
        setTimeout(() => onComplete(metrics), 900);
      } else {
        mistakesRef.current += 1;
        setShowClue(true);
        setFeedback(`Gentle hint: Think of the item that ${target.clue.toLowerCase()}.`);
      }
      return;
    }

    // Multi-selection for Moderate (recall 3 items) & Stimulating (identify 2 newly placed changes)
    const expectedIds = new Set(targetSwapItems.map((i) => i.id));
    if (!expectedIds.has(item.id)) {
      mistakesRef.current += 1;
      setFeedback(
        difficulty === 'Stimulating'
          ? 'That item was already on the original tray — look closely for what changed!'
          : 'Good look! Try recalling which items were resting on the earlier tray.'
      );
      return;
    }

    const nextSelected = selectedIds.includes(item.id)
      ? selectedIds
      : [...selectedIds, item.id];
    setSelectedIds(nextSelected);

    if (nextSelected.length >= targetSwapItems.length) {
      setSolved(true);
      setFeedback('Lovely observation and memory! Every item matched calmly. ✨');
      const metrics = buildGameRunMetrics({
        correctAnswers: nextSelected.length,
        incorrectAnswers: mistakesRef.current,
        hintsUsed: hintsRef.current,
        reactionTimesMs: [Date.now() - startRef.current],
        completionStatus: 'completed',
      });
      metrics.mechanicMode = resolved.mode;
      metrics.appliedMechanics = resolved.mechanics.appliedMechanicsSummary;
      setTimeout(() => onComplete(metrics), 900);
    }
  };

  const handleHintClick = () => {
    hintsRef.current += 1;
    onRequestHint?.();
    setShowClue(true);
    const remaining = targetSwapItems.find((i) => !selectedIds.includes(i.id));
    if (remaining) {
      setFeedback(`Gentle Clue: Look for "${remaining.clue.toLowerCase()}" (${remaining.symbol}).`);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between gap-2 flex-wrap text-xs font-semibold text-purple-900">
        <span className="flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-purple-600" />
          <span>Warm Object Recall</span>
        </span>
        <span className="text-purple-700 bg-lavender-50 px-2.5 py-0.5 rounded-full border border-purple-200">
          {difficulty === 'Gentle'
            ? 'Guided Observation (4 items)'
            : difficulty === 'Moderate'
            ? 'Covered Tray Recall (Select 3)'
            : 'Change-Detection Recall (Spot 2 New)'}
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
            solved
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
              : 'bg-lavender-50 border-purple-200 text-purple-900'
          }`}
        >
          {solved ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <HelpCircle className="w-4 h-4 text-purple-600" />}
          <span>{feedback}</span>
        </div>
      )}

      {phase === 'observe' ? (
        <div className="space-y-4 text-center">
          <p className="text-xs sm:text-sm font-semibold text-gray-700">
            Take a calm look at these comforting objects resting on your tray:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {trayItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-lavender-50 border border-purple-200 flex flex-col items-center gap-1.5"
              >
                <span className="text-3xl">{item.symbol}</span>
                {difficulty !== 'Stimulating' && (
                  <span className="text-xs font-bold text-purple-950">{item.label}</span>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPhase('recall')}
            className="px-6 py-3 min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm transition cursor-pointer inline-flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>I am Ready to Recall</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-sm sm:text-base font-extrabold text-saksham-darkText">
              {difficulty === 'Gentle'
                ? 'Which of these comforting objects was on your tray?'
                : difficulty === 'Moderate'
                ? `Tap ${targetSwapItems.length} objects that were resting on the tray (${selectedIds.length}/${targetSwapItems.length})`
                : `The tray was gently rearranged! Spot the ${targetSwapItems.length} newly added objects (${selectedIds.length}/${targetSwapItems.length})`}
            </h3>
            {showClue && targetSwapItems[0] && (
              <p className="text-xs text-purple-800 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 inline-block">
                💡 Helper Clue: {targetSwapItems[0].clue}
              </p>
            )}
          </div>

          <div className={`grid gap-3 ${gridChoices.length <= 2 ? 'grid-cols-2 max-w-md mx-auto' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {gridChoices.map((item) => {
              const isPicked = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleChoice(item)}
                  disabled={solved}
                  className={`p-4 min-h-[76px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                    isPicked
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-200'
                      : 'bg-white hover:bg-lavender-50 border-purple-200 text-purple-950'
                  }`}
                >
                  <span className="text-3xl">{item.symbol}</span>
                  <span className="text-xs font-bold">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleHintClick}
              disabled={solved}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Gentle Clue</span>
            </button>
            <button
              type="button"
              onClick={() => setPhase('observe')}
              disabled={solved}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold cursor-pointer"
            >
              Peek Tray Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
