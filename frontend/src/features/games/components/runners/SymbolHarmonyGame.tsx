import React, { useEffect, useRef, useState } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GameRunMetrics } from '../../../../types/index.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { CheckCircle, Compass, HelpCircle, Sparkles } from 'lucide-react';

interface SymbolHarmonyGameProps {
  difficulty: GameDifficulty;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
  onRequestHint?: () => void;
}

interface MandalaMotif {
  id: string;
  label: string;
  glyph: string;
  symmetryCue: string;
}

const MOTIFS: MandalaMotif[] = [
  { id: 'lotus-8', label: 'Eight-Petal Lotus', glyph: '❇️', symmetryCue: 'Even 8-point star symmetry' },
  { id: 'chakra', label: 'Solar Wheel', glyph: '☸️', symmetryCue: 'Balanced circular spokes' },
  { id: 'star-4', label: 'Diamond Rangoli', glyph: '💠', symmetryCue: 'Four-corner diamond frame' },
  { id: 'hibiscus', label: 'Floral Ring', glyph: '🏵️', symmetryCue: 'Soft rosette center ring' },
  { id: 'compass', label: 'Garden Star', glyph: '✴️', symmetryCue: 'Eight radiating points' },
];

export const SymbolHarmonyGame: React.FC<SymbolHarmonyGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete,
  onRequestHint,
}) => {
  const preferences = useOptionalAccessibility()?.preferences;
  const resolved = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);

  const [stage, setStage] = useState(0);
  const [target, setTarget] = useState<MandalaMotif>(MOTIFS[0]);
  const [options, setOptions] = useState<MandalaMotif[]>([]);
  const [showSymmetryClue, setShowSymmetryClue] = useState(
    resolved.mechanics.clueLevel === 'automatic'
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const totalStages = difficulty === 'Stimulating' ? 2 : 1;
  const mistakesRef = useRef(0);
  const hintsRef = useRef(0);
  const correctRef = useRef(0);
  const startRef = useRef(Date.now());

  const setupStage = (stageIdx: number) => {
    const chosenTarget = MOTIFS[stageIdx % MOTIFS.length];
    const others = MOTIFS.filter((m) => m.id !== chosenTarget.id);
    const choiceCount = difficulty === 'Gentle' ? 3 : 4;
    const pickedOptions = [chosenTarget, ...others.slice(0, choiceCount - 1)].sort(
      () => Math.random() - 0.5
    );
    setTarget(chosenTarget);
    setOptions(pickedOptions);
    setShowSymmetryClue(resolved.mechanics.clueLevel === 'automatic');
    setFeedback(null);
  };

  useEffect(() => {
    setStage(0);
    setCompleted(false);
    mistakesRef.current = 0;
    hintsRef.current = 0;
    correctRef.current = 0;
    startRef.current = Date.now();
    setupStage(0);
  }, [difficulty, resolved.mode]);

  const handleSelectMotif = (motif: MandalaMotif) => {
    if (completed) return;
    if (motif.id === target.id) {
      correctRef.current += 1;
      if (stage + 1 >= totalStages) {
        setCompleted(true);
        setFeedback('Harmonious! You completed the symmetric Rangoli pattern! ✨');
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
        const nextStage = stage + 1;
        setStage(nextStage);
        setFeedback('Beautiful match! Here is the next symmetrical quadrant.');
        setTimeout(() => setupStage(nextStage), 700);
      }
    } else {
      mistakesRef.current += 1;
      setShowSymmetryClue(true);
      setFeedback(`Compare the outer edge shape closely — clue: ${target.symmetryCue}.`);
    }
  };

  const handleHint = () => {
    hintsRef.current += 1;
    onRequestHint?.();
    setShowSymmetryClue(true);
    setFeedback(`Symmetry Clue: Look for ${target.symmetryCue.toLowerCase()}.`);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-soft-purple space-y-5 text-center">
      <div className="border-b border-purple-100 pb-3 flex items-center justify-between gap-2 flex-wrap text-xs font-semibold text-purple-900">
        <span className="flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-purple-600" />
          <span>Symmetric Symbol Harmony</span>
        </span>
        <span className="text-purple-700 bg-lavender-50 px-2.5 py-0.5 rounded-full border border-purple-200">
          {difficulty === 'Gentle'
            ? 'Direct Pair Match'
            : difficulty === 'Moderate'
            ? 'Mandala Petal Match'
            : `Mirrored Quadrant (${stage + 1}/${totalStages})`}
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

      {difficulty === 'Stimulating' ? (
        <div className="bg-lavender-50 p-5 rounded-3xl border border-purple-200 space-y-3 max-w-xs mx-auto">
          <p className="text-xs font-bold text-purple-800">Complete the Symmetrical 2×2 Rangoli:</p>
          <div className="grid grid-cols-2 gap-2 max-w-[140px] mx-auto">
            <div className="h-16 rounded-2xl bg-white border border-purple-200 flex items-center justify-center text-3xl">
              {target.glyph}
            </div>
            <div className="h-16 rounded-2xl bg-white border border-purple-200 flex items-center justify-center text-3xl">
              {target.glyph}
            </div>
            <div className="h-16 rounded-2xl bg-white border border-purple-200 flex items-center justify-center text-3xl">
              {target.glyph}
            </div>
            <div className="h-16 rounded-2xl bg-purple-600 text-white font-black flex items-center justify-center text-xl">
              ?
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-lavender-50 p-5 rounded-3xl border border-purple-200 space-y-2 max-w-xs mx-auto">
          <span className="text-[11px] font-bold uppercase text-purple-700 block">
            Target Rangoli Motif
          </span>
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white border-2 border-purple-300 flex items-center justify-center text-4xl shadow-xs">
            {target.glyph}
          </div>
          {showSymmetryClue && (
            <p className="text-xs font-medium text-purple-900">{target.symmetryCue}</p>
          )}
        </div>
      )}

      <div className={`grid gap-3 max-w-md mx-auto ${options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {options.map((motif) => (
          <button
            key={motif.id}
            type="button"
            onClick={() => handleSelectMotif(motif)}
            disabled={completed}
            aria-label={`Motif choice: ${motif.label}`}
            className="p-4 min-h-[82px] rounded-2xl bg-white hover:bg-lavender-50 border-2 border-purple-200 flex flex-col items-center justify-center gap-1 transition cursor-pointer"
          >
            <span className="text-3xl">{motif.glyph}</span>
            {difficulty === 'Gentle' && (
              <span className="text-[11px] font-bold text-purple-900 leading-tight">{motif.label}</span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleHint}
        disabled={completed}
        className="px-4 py-2 min-h-[44px] rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span>Symmetry Clue</span>
      </button>
    </div>
  );
};
