/**
 * SAKSHAM — MILESTONE 7.1: HIGH-FIDELITY ASHA CHARACTER ENGINE & 30-EXPRESSION MATRIX
 * Core Type Definitions & Presentation Mode Specifications
 */

import type { CharacterId, CharacterState } from '../../../types/index.js';

/**
 * 5 Expression Categories
 */
export type AshaExpressionCategory =
  | 'conversation'       // General / Conversation
  | 'emotional_support'  // Emotional Support
  | 'reminders'          // Reminders / Guidance
  | 'memory_recall'      // Memory & Recall
  | 'wellbeing';         // Mood & Well-being

/**
 * 30 Distinct Context-Aware Expressions across 5 Categories (6 each)
 */
export type AshaExpression =
  // Category 1: General / Conversation
  | 'neutral'
  | 'listening'
  | 'thinking'
  | 'explaining'
  | 'acknowledging'
  | 'surprised'
  // Category 2: Emotional Support
  | 'happy'
  | 'encouraging'
  | 'reassuring'
  | 'comforting'
  | 'concerned'
  | 'empathetic'
  // Category 3: Reminders / Guidance
  | 'reminder'
  | 'alert_important'
  | 'guiding'
  | 'confirming'
  | 'noting_saving'
  | 'done_completed'
  // Category 4: Memory & Recall
  | 'helping_recall'
  | 'referring_past'
  | 'recognizing'
  | 'clarifying'
  | 'checking_understanding'
  | 'remembered'
  // Category 5: Mood & Well-being
  | 'calm'
  | 'relaxed'
  | 'motivated'
  | 'proud'
  | 'a_little_tired'
  | 'rest_suggestion';

/**
 * Presentation Modes for Asha
 * - primary: prominent, full-expression display for conversational sanctuary
 * - compact: smaller, non-obtrusive companion display for Daily Routines & Mind Games
 */
export type CharacterMode = 'primary' | 'compact';

/**
 * Priority levels for expression transitions
 * 1 = Ambient / Idle (neutral, calm, relaxed)
 * 2 = Conversational (listening, explaining, thinking, surprised)
 * 3 = Supportive / Memory (happy, comforting, recognized, reassuring)
 * 4 = Routine / Task (reminder, guiding, noting, done, rest_suggestion)
 * 5 = Critical Alert (alert_important)
 */
export type ExpressionPriority = 1 | 2 | 3 | 4 | 5;

/**
 * Comprehensive Metadata for an Expression
 */
export interface ExpressionMetadata {
  id: AshaExpression;
  labelKey: string;
  descriptionKey: string;
  category: AshaExpressionCategory;
  categoryLabelKey: string;
  priority: ExpressionPriority;
  defaultDurationMs: number;
  returnState: AshaExpression;
  assetPath: string;
  badgeIcon: string;
  badgeBg: string;
  badgeTextColor: string;
  auraColor: string;
  borderRing: string;
  englishLabel: string;
}

/**
 * Visualizer Component Props with backward compatibility
 */
export interface CharacterVisualizerProps {
  characterId?: CharacterId;
  state?: CharacterState | AshaExpression;
  expression?: AshaExpression;
  mode?: CharacterMode;
  className?: string;
  size?: number;
  priority?: ExpressionPriority;
  showBadge?: boolean;
  showLabel?: boolean;
  showAura?: boolean;
  highContrast?: boolean;
  reducedMotion?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * 7 Clinical Interaction States for Dementia-Care Pacing & Communication
 */
export type ClinicalInteractionState =
  | 'Friendly'           // Ambient, welcoming, casual conversation
  | 'Reassuring'         // Anxiety reduction, memory lapse reassurance, repetitive queries
  | 'Guiding'            // Step-by-step task/routine pacing, medication adherence
  | 'Listening'          // Patient speaking or speech input active
  | 'Encouraging'        // Mind game milestone, routine completion, motivation
  | 'AssistanceNeeded'   // Mild confusion, repeated unhandled queries
  | 'CaregiverEscalation'; // Urgent safety, distress, explicit caregiver request

export interface ClinicalPacingConfig {
  state: ClinicalInteractionState;
  speechRate: number;      // e.g. 0.92 for gentle pacing
  speechPitch: number;     // e.g. 1.05 for warm pitch
  maxSentenceWords: number;// e.g. 12 words for dementia cognitive ease
  recommendedExpression: AshaExpression;
  recommendedGesture: 'neutral' | 'wave' | 'comfort' | 'explain' | 'cheer' | 'walk';
  description: string;
}

/**
 * Pacing specifications across the 7 clinical interaction states
 */
export const CLINICAL_PACING_REGISTRY: Record<ClinicalInteractionState, ClinicalPacingConfig> = {
  Friendly: {
    state: 'Friendly',
    speechRate: 0.95,
    speechPitch: 1.05,
    maxSentenceWords: 15,
    recommendedExpression: 'happy',
    recommendedGesture: 'wave',
    description: 'Warm, respectful greeting and welcoming companionship',
  },
  Reassuring: {
    state: 'Reassuring',
    speechRate: 0.88,
    speechPitch: 1.0,
    maxSentenceWords: 12,
    recommendedExpression: 'reassuring',
    recommendedGesture: 'comfort',
    description: 'Gentle validation and calming repetitive inquiry reassurance',
  },
  Guiding: {
    state: 'Guiding',
    speechRate: 0.90,
    speechPitch: 1.02,
    maxSentenceWords: 10,
    recommendedExpression: 'guiding',
    recommendedGesture: 'explain',
    description: 'Direct step-by-step guidance for daily activities and routines',
  },
  Listening: {
    state: 'Listening',
    speechRate: 0.92,
    speechPitch: 1.0,
    maxSentenceWords: 14,
    recommendedExpression: 'listening',
    recommendedGesture: 'neutral',
    description: 'Attentive, unhurried presence while patient speaks or thinks',
  },
  Encouraging: {
    state: 'Encouraging',
    speechRate: 0.94,
    speechPitch: 1.08,
    maxSentenceWords: 14,
    recommendedExpression: 'encouraging',
    recommendedGesture: 'cheer',
    description: 'Uplifting celebration of completed routines and cognitive efforts',
  },
  AssistanceNeeded: {
    state: 'AssistanceNeeded',
    speechRate: 0.86,
    speechPitch: 0.98,
    maxSentenceWords: 10,
    recommendedExpression: 'clarifying',
    recommendedGesture: 'comfort',
    description: 'Supportive clarification offering simple, low-effort choices',
  },
  CaregiverEscalation: {
    state: 'CaregiverEscalation',
    speechRate: 0.88,
    speechPitch: 1.0,
    maxSentenceWords: 12,
    recommendedExpression: 'alert_important',
    recommendedGesture: 'comfort',
    description: 'Direct, clear connection to designated human caregiver or emergency support',
  },
};

