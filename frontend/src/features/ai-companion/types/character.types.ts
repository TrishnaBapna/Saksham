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
