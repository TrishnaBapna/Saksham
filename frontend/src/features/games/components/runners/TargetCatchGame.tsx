import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GamePacing, GameRunMetrics } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { Target, RotateCcw } from 'lucide-react';

interface TargetCatchGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
}

export const TargetCatchGame: React.FC<TargetCatchGameProps> = ({
  difficulty,
  pacing = 'balanced',
  adaptiveParams,
  onComplete,
}) => {
  const { t, language } = useLanguage();
  const preferences = useOptionalAccessibility()?.preferences;
  const resolvedGameplay = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);
  const showDistractorLeaves =
    resolvedGameplay.mechanics.distractorSimilarity !== 'distinct' && resolvedGameplay.distractorCap > 0;
  const usesRuleSwitch = resolvedGameplay.mechanics.ruleComplexity >= 3 || difficulty === 'Stimulating';

  const [catches, setCatches] = useState<number>(0);
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);
  const [distractorPositions, setDistractorPositions] = useState<Array<{ x: number; y: number; icon: string }>>([]);
  const [statusKind, setStatusKind] = useState<'intro' | 'caught' | 'distractor' | 'done'>('intro');
  const [isSpawned, setIsSpawned] = useState<boolean>(false);

  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reactionTimesRef = useRef<number[]>([]);
  const mistakesRef = useRef<number>(0);
  const spawnedAtRef = useRef<number>(Date.now());

  const getTargetGoal = () => {
    if (adaptiveParams?.itemCount) {
      return Math.max(3, Math.min(10, adaptiveParams.itemCount));
    }
    if (pacing === 'calm' || difficulty === 'Gentle') return 3;
    if (pacing === 'agile' || difficulty === 'Stimulating') return 7;
    return 5;
  };

  const getSpawnDelay = () => {
    const base =
      pacing === 'calm' || difficulty === 'Gentle'
        ? 1000
        : pacing === 'agile' || difficulty === 'Stimulating'
        ? 450
        : 650;
    const mult = adaptiveParams?.timeAllowanceMultiplier ?? 1;
    return Math.round(base * mult);
  };

  const goal = getTargetGoal();
  const switchPhaseThreshold = Math.ceil(goal / 2);
  const activeGoalSymbol = usesRuleSwitch && catches >= switchPhaseThreshold ? '🌸' : '🦋';

  const spawnNext = () => {
    setIsSpawned(false);
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);

    const delay = getSpawnDelay();
    spawnTimerRef.current = setTimeout(() => {
      const x = Math.floor(Math.random() * 68) + 12;
      const y = Math.floor(Math.random() * 58) + 16;
      setTargetPosition({ x, y });
      if (showDistractorLeaves) {
        const leafCount = usesRuleSwitch ? Math.min(2, resolvedGameplay.distractorCap) : 1;
        const icons = ['🍂', '🍁'];
        const leaves = Array.from({ length: leafCount }).map((_, idx) => ({
          x: (x + 28 + idx * 23) % 75 + 10,
          y: (y + 24 + idx * 19) % 62 + 14,
          icon: icons[idx % icons.length],
        }));
        setDistractorPositions(leaves);
      } else {
        setDistractorPositions([]);
      }
      setIsSpawned(true);
      spawnedAtRef.current = Date.now();
    }, delay);
  };

  useEffect(() => {
    setCatches(0);
    setStatusKind('intro');
    reactionTimesRef.current = [];
    mistakesRef.current = 0;
    spawnNext();

    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, [difficulty, pacing, adaptiveParams?.itemCount, adaptiveParams?.tier]);

  const handleHit = () => {
    if (!isSpawned) return;

    reactionTimesRef.current.push(Math.max(100, Date.now() - spawnedAtRef.current));
    audioSynthesizer.playChime('bell');
    const nextCatches = catches + 1;
    setCatches(nextCatches);

    if (nextCatches >= goal) {
      setIsSpawned(false);
      audioSynthesizer.playChime('fanfare');
      setStatusKind('done');
      const metrics = buildGameRunMetrics({
        correctAnswers: nextCatches,
        incorrectAnswers: mistakesRef.current,
        hintsUsed: 0,
        reactionTimesMs: reactionTimesRef.current,
        completionStatus: 'completed',
        mechanicMode: resolvedGameplay.mode,
        appliedMechanics: resolvedGameplay.mechanics.appliedMechanicsSummary,
      });
      setTimeout(() => {
        onComplete(metrics);
      }, 1000);
      return;
    }

    setStatusKind('caught');
    spawnNext();
  };

  const handleDistractorTap = () => {
    mistakesRef.current += 1;
    audioSynthesizer.playTone(280, 0.12);
    setStatusKind('distractor');
  };

  const handleRestart = () => {
    setCatches(0);
    setStatusKind('intro');
    mistakesRef.current = 0;
    spawnNext();
  };

  const feedbackText =
    statusKind === 'done'
      ? t('games_runner.target_done', { goal })
      : statusKind === 'distractor'
      ? `That is a drifting autumn leaf — tap the bright ${activeGoalSymbol} target!`
      : statusKind === 'caught'
      ? `${catches} / ${goal}`
      : t('games_runner.target_catch_intro', { goal });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title & Goal */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Target className="w-3.5 h-3.5 text-rose-500" />
          <span>{t('games_runner.target_title')}</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedbackText}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          {catches} / {goal}
        </p>
      </div>

        {usesRuleSwitch && (
          <div
            data-testid="target-catch-phase-rule"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-900"
          >
            {catches >= switchPhaseThreshold
              ? 'Phase 2 Rule Shift: Catch 🌸 Lotus Blossoms!'
              : `Phase 1: Catch 🦋 (${switchPhaseThreshold - catches} more before 🌸 switch)`}
          </div>
        )}

        {/* Target Arena */}
        <div className="relative w-full h-56 sm:h-64 bg-gradient-to-b from-lavender-50 to-pink-50/40 rounded-3xl border-2 border-purple-100 overflow-hidden shadow-inner flex items-center justify-center">
          {!isSpawned && catches < goal && (
            <div className="text-xs font-bold text-purple-400 animate-pulse">
              {t('games_runner.target_waiting')}
            </div>
          )}

          {isSpawned &&
            distractorPositions.map((leaf, idx) => (
              <button
                key={`leaf-${idx}`}
                type="button"
                onClick={handleDistractorTap}
                style={{ position: 'absolute', left: `${leaf.x}%`, top: `${leaf.y}%` }}
                className="w-12 h-12 -translate-x-1/2 -translate-y-1/2 bg-amber-100/90 border border-amber-300 rounded-full flex items-center justify-center text-xl shadow-xs cursor-pointer"
                aria-label="Drifting leaf distractor"
              >
                <span>{leaf.icon}</span>
              </button>
            ))}

          {isSpawned && targetPosition && (
            <button
              type="button"
              onClick={handleHit}
              style={{
                position: 'absolute',
                left: `${targetPosition.x}%`,
                top: `${targetPosition.y}%`,
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-amber-400 to-rose-500 hover:from-amber-300 hover:to-rose-400 active:scale-90 rounded-full flex flex-col items-center justify-center text-white text-2xl sm:text-3xl shadow-lg border-2 border-white ring-4 ring-rose-200/60 cursor-pointer animate-in zoom-in-50 duration-150"
              aria-label={t('games_runner.target_catch_aria' as any) === 'games_runner.target_catch_aria' ? (({ en: 'Catch Target', hi: 'लक्ष्य पकड़ें', mr: 'लक्ष्य पकडा', bn: 'লক্ষ্য ধরুন', ta: 'இலக்கைப் பிடிக்கவும்', te: 'లక్ష్యాన్ని పట్టుకోండి', kn: 'ಗುರಿಯನ್ನು ಹಿಡಿಯಿರಿ' } as Record<string, string>)[language] || 'Catch Target') : t('games_runner.target_catch_aria' as any)}
            >
              <span>{activeGoalSymbol}</span>
            </button>
          )}
        </div>

      {/* Reset */}
      <div className="pt-2 border-t border-purple-100">
        <button
          type="button"
          onClick={handleRestart}
          className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition inline-flex items-center space-x-1.5 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('games_runner.target_new_round')}</span>
        </button>
      </div>
    </div>
  );
};
