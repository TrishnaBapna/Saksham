/**
 * SAKSHAM 2.0 — Adaptive Assistance Engine
 *
 * Implements Module 3: Adaptive Assistance Engine
 * - Deterministic, explainable support option recommender
 * - Powered by explicit user-approved feedback history from Seven-Day Trial & routine interactions
 * - Fully functional offline with zero remote AI dependency
 * - Strictly respects clinical boundaries: NEVER alters medication, medical instructions, or clinical directives
 */

import type {
  AssistanceCategory,
  AssistanceOption,
  AssistanceRecommendationResult,
  ReportedDifficultyRecord,
  UserSupportProfile,
  Task,
} from '@/types/firestore';

export interface AssistanceEngineInput {
  task?: Task | { id?: number | string; label?: string; time?: string };
  userProfile?: Partial<UserSupportProfile>;
  recordedFeedback?: ReportedDifficultyRecord[];
  isOnline?: boolean;
}

const CATALOG_OPTIONS: Record<AssistanceCategory, Omit<AssistanceOption, 'confidence' | 'explanation'>> = {
  step_by_step: {
    category: 'step_by_step',
    label: '1-Step-At-A-Time Guidance',
    description: 'Break task down into single calm checkboxes with chime confirmation.',
    actionType: 'open_guided_runner',
  },
  larger_controls: {
    category: 'larger_controls',
    label: 'Larger Touch Targets',
    description: 'Enlarge buttons and spacing to make tapping comfortable during motor tremor.',
    actionType: 'enable_large_targets',
  },
  voice_guidance: {
    category: 'voice_guidance',
    label: 'Spoken Audio Guidance',
    description: 'Have the step read aloud softly using device speech synthesis.',
    actionType: 'read_aloud',
  },
  text_simplification: {
    category: 'text_simplification',
    label: 'Simplified Plain Instructions',
    description: 'Display concise 1-sentence prompt with zero clutter.',
    actionType: 'simplify_text',
  },
  visual_cues: {
    category: 'visual_cues',
    label: 'Visual & Picture Cue',
    description: 'Show visual iconography and contextual reminder card.',
    actionType: 'show_visual_card',
  },
  repeated_instructions: {
    category: 'repeated_instructions',
    label: 'Repeat Instruction',
    description: 'Play auditory chime and re-read the cue from the beginning.',
    actionType: 'repeat_cue',
  },
  alternative_communication: {
    category: 'alternative_communication',
    label: 'Quick Yes / No / Need Clue Tap',
    description: 'High-contrast large prompt for non-verbal response.',
    actionType: 'open_quick_tap',
  },
  caregiver_assistance: {
    category: 'caregiver_assistance',
    label: 'Request Caregiver Support',
    description: 'Send gentle WhatsApp or notification request to your trusted caregiver.',
    actionType: 'notify_caregiver',
  },
};

/**
 * Recommends adaptive assistance options based on prior helpful ratings
 */
export function getAdaptiveAssistanceRecommendations(
  input: AssistanceEngineInput
): AssistanceRecommendationResult {
  const profile = input.userProfile;
  const feedback = input.recordedFeedback || [];
  const adaptiveEnabled = profile?.adaptiveAssistanceEnabled !== false;

  if (!adaptiveEnabled) {
    return {
      recommendedOptions: [],
      explanation: 'Adaptive assistance is disabled in your settings.',
      basedOnPriorHelpfulCount: 0,
      adaptiveEnabled: false,
    };
  }

  // Count helpful and unhelpful occurrences per assistance category
  const helpfulCounts: Partial<Record<AssistanceCategory, number>> = {};
  const unhelpfulCounts: Partial<Record<AssistanceCategory, number>> = {};

  feedback.forEach((entry) => {
    if (!entry.assistanceSelected) return;
    if (entry.helpfulRating === 'helpful') {
      helpfulCounts[entry.assistanceSelected] = (helpfulCounts[entry.assistanceSelected] || 0) + 1;
    } else if (entry.helpfulRating === 'unhelpful') {
      unhelpfulCounts[entry.assistanceSelected] = (unhelpfulCounts[entry.assistanceSelected] || 0) + 1;
    }
  });

  const candidates: AssistanceOption[] = [];

  // Evaluate each category deterministically
  (Object.keys(CATALOG_OPTIONS) as AssistanceCategory[]).forEach((cat) => {
    const helpful = helpfulCounts[cat] || 0;
    const unhelpful = unhelpfulCounts[cat] || 0;

    // Suppress options that the user explicitly found unhelpful unless there are more helpful ratings
    if (unhelpful > 0 && helpful <= unhelpful) {
      return;
    }

    let confidence = 0.5; // baseline
    let explanation = 'Offered as standard calm assistance.';

    if (helpful > 0) {
      confidence = Math.min(0.95, 0.6 + helpful * 0.15);
      explanation = `Offered because you rated this helpful on ${helpful} past ${helpful === 1 ? 'task' : 'tasks'}.`;
    } else if (profile?.guidanceStyle === 'step_by_step' && cat === 'step_by_step') {
      confidence = 0.8;
      explanation = 'Matches your chosen step-by-step guidance preference.';
    } else if (profile?.textSizePreference === 'large' && cat === 'larger_controls') {
      confidence = 0.8;
      explanation = 'Matches your chosen large text & touch targets preference.';
    } else if (profile?.voiceAssistanceEnabled && cat === 'voice_guidance') {
      confidence = 0.75;
      explanation = 'Matches your preferred voice assistance setting.';
    }

    candidates.push({
      ...CATALOG_OPTIONS[cat],
      confidence,
      explanation,
    });
  });

  // Sort candidates by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Take top 3 options to avoid overwhelming the patient
  const topRecommendations = candidates.slice(0, 3);
  const primary = topRecommendations[0];

  const totalHelpful = Object.values(helpfulCounts).reduce((sum, n) => (sum || 0) + (n || 0), 0) || 0;

  let overallExplanation = '';
  if (primary && totalHelpful > 0) {
    overallExplanation = `Suggested based on ${totalHelpful} user-confirmed helpful feedback entries.`;
  } else if (primary) {
    overallExplanation = `Suggested from your onboarding profile settings.`;
  } else {
    overallExplanation = `Standard calm assistance options available.`;
  }

  return {
    recommendedOptions: topRecommendations,
    primaryRecommendation: primary,
    explanation: overallExplanation,
    basedOnPriorHelpfulCount: totalHelpful,
    adaptiveEnabled: true,
  };
}
