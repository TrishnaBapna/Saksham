import {
  AdaptiveGameplayMode,
  GameAdaptiveParameters,
  GameDifficulty,
  GameMechanicProfile,
} from '../../../types/index.js';
import { AshaPersonalizationPreferences } from '../../ai-companion/types/ashaContext.types.js';

export type AdaptiveAccessibilityInput = Partial<AshaPersonalizationPreferences> & {
  reducedClutter?: boolean;
};

export interface ResolvedAdaptiveGameplay {
  difficulty: GameDifficulty;
  mode: AdaptiveGameplayMode;
  mechanics: GameMechanicProfile;
  distractorCap: number;
  avoidFastTransitions: boolean;
  highContrastBoost: boolean;
  largeHitTargets: boolean;
}

const DEFAULT_FALLBACK_MECHANICS: Record<GameDifficulty, GameMechanicProfile> = {
  Gentle: {
    mode: 'guided_preview',
    modeLabel: 'Guided Preview',
    previewEnabled: true,
    previewDurationMs: 2200,
    initialRevealCount: 2,
    showFirstAnchor: true,
    clueLevel: 'automatic',
    distractorSimilarity: 'distinct',
    ruleComplexity: 1,
    requiresRecallWithoutRef: false,
    multiStepStages: 1,
    feedbackTone: 'reassuring_guided',
    appliedMechanicsSummary: ['Visual preview and first-step guidance active'],
  },
  Moderate: {
    mode: 'standard_recall',
    modeLabel: 'Balanced Recall',
    previewEnabled: true,
    previewDurationMs: 1100,
    initialRevealCount: 0,
    showFirstAnchor: false,
    clueLevel: 'on_demand',
    distractorSimilarity: 'moderate',
    ruleComplexity: 2,
    requiresRecallWithoutRef: false,
    multiStepStages: 2,
    feedbackTone: 'balanced',
    appliedMechanicsSummary: ['Balanced independent recall with on-demand hints'],
  },
  Stimulating: {
    mode: 'independent_challenge',
    modeLabel: 'Independent Challenge',
    previewEnabled: false,
    previewDurationMs: 0,
    initialRevealCount: 0,
    showFirstAnchor: false,
    clueLevel: 'minimal',
    distractorSimilarity: 'similar',
    ruleComplexity: 3,
    requiresRecallWithoutRef: true,
    multiStepStages: 2,
    feedbackTone: 'independent',
    appliedMechanicsSummary: ['Multi-step recall and fine visual discrimination'],
  },
};

/**
 * Resolves the authoritative gameplay mechanics for a runner while strictly preserving
 * the patient's explicit accessibility preferences (reduced motion, reduced clutter, contrast, touch size).
 */
const MECHANIC_MODE_LABELS: Record<AdaptiveGameplayMode, string> = {
  guided_preview: 'Guided Preview',
  supported_recognition: 'Supported Recognition',
  standard_recall: 'Balanced Recall',
  independent_challenge: 'Independent Challenge',
};

/**
 * Maps internal AdaptiveGameplayMode tokens into clear, non-diagnostic caregiver & doctor labels.
 */
export function formatMechanicModeLabel(mode?: AdaptiveGameplayMode): string {
  if (!mode) return 'Standard Pace';
  return MECHANIC_MODE_LABELS[mode] || 'Standard Pace';
}

export function resolveAdaptiveGameplay(
  difficulty: GameDifficulty,
  adaptiveParams?: GameAdaptiveParameters,
  accessibilityPrefs?: AdaptiveAccessibilityInput | null
): ResolvedAdaptiveGameplay {
  const baseMechanics: GameMechanicProfile =
    adaptiveParams?.mechanics || DEFAULT_FALLBACK_MECHANICS[difficulty] || DEFAULT_FALLBACK_MECHANICS.Gentle;

  const reducedMotion = Boolean(accessibilityPrefs?.reducedMotion);
  const reducedClutter = Boolean(
    accessibilityPrefs?.reducedVisualClutter ?? accessibilityPrefs?.reducedClutter
  );
  const highContrastBoost = Boolean(accessibilityPrefs?.highContrast);
  const largeHitTargets = Boolean(accessibilityPrefs?.largeTouchTargets);

  // Accessibility never gets overridden by difficulty progression:
  // reducedClutter caps distractors and favors clearer spacing; reducedMotion widens preview gently.
  const effectiveMechanics: GameMechanicProfile = {
    ...baseMechanics,
    previewDurationMs:
      reducedMotion && baseMechanics.previewEnabled
        ? Math.max(baseMechanics.previewDurationMs, 2400)
        : baseMechanics.previewDurationMs,
    clueLevel:
      reducedClutter && baseMechanics.clueLevel === 'minimal'
        ? 'on_demand'
        : baseMechanics.clueLevel,
  };

  return {
    difficulty,
    mode: effectiveMechanics.mode,
    mechanics: effectiveMechanics,
    distractorCap: reducedClutter ? 2 : 99,
    avoidFastTransitions: reducedMotion,
    highContrastBoost,
    largeHitTargets,
  };
}
