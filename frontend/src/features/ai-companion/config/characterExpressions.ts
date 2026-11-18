/**
 * SAKSHAM — MILESTONE 7.1: ASHA 30-EXPRESSION MATRIX REGISTRY & LOOKUP
 * Source of Truth for Character Emotion Metadata, Priorities & Category Groupings
 */

import type { CharacterState } from '../../../types/index.js';
import type {
  AshaExpression,
  AshaExpressionCategory,
  ExpressionMetadata,
} from '../types/character.types.js';

/**
 * Mapping from legacy 8-state system to the 30-expression engine
 */
export const LEGACY_STATE_TO_EXPRESSION: Record<CharacterState, AshaExpression> = {
  idle: 'neutral',
  greeting: 'happy',
  listening: 'listening',
  speaking: 'explaining',
  thinking: 'thinking',
  happy: 'happy',
  reminder: 'reminder',
  encouraging: 'encouraging',
};

/**
 * Inverse mapping for backward compatibility when callers query legacy state
 */
export const EXPRESSION_TO_LEGACY_STATE: Record<AshaExpression, CharacterState> = {
  neutral: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  explaining: 'speaking',
  acknowledging: 'listening',
  surprised: 'happy',

  happy: 'happy',
  encouraging: 'encouraging',
  reassuring: 'happy',
  comforting: 'encouraging',
  concerned: 'listening',
  empathetic: 'encouraging',

  reminder: 'reminder',
  alert_important: 'reminder',
  guiding: 'speaking',
  confirming: 'happy',
  noting_saving: 'speaking',
  done_completed: 'happy',

  helping_recall: 'thinking',
  referring_past: 'thinking',
  recognizing: 'happy',
  clarifying: 'thinking',
  checking_understanding: 'listening',
  remembered: 'happy',

  calm: 'idle',
  relaxed: 'idle',
  motivated: 'encouraging',
  proud: 'happy',
  a_little_tired: 'idle',
  rest_suggestion: 'reminder',
};

/**
 * Category Metadata
 */
export interface CategoryInfo {
  id: AshaExpressionCategory;
  labelKey: string;
  englishLabel: string;
  iconName: string;
  description: string;
}

export const ASHA_CATEGORIES: CategoryInfo[] = [
  {
    id: 'conversation',
    labelKey: 'character.category_conversation',
    englishLabel: 'General / Conversation',
    iconName: 'MessageSquare',
    description: 'Natural interactive conversational cues for dialogue, listening, and thinking',
  },
  {
    id: 'emotional_support',
    labelKey: 'character.category_emotional_support',
    englishLabel: 'Emotional Support',
    iconName: 'Heart',
    description: 'Empathetic expressions for reassurance, comfort, celebrating small steps, and calming anxiety',
  },
  {
    id: 'reminders',
    labelKey: 'character.category_reminders',
    englishLabel: 'Reminders / Guidance',
    iconName: 'Bell',
    description: 'Task guidance, schedule alerts, checklist completion, and routine prompts',
  },
  {
    id: 'memory_recall',
    labelKey: 'character.category_memory_recall',
    englishLabel: 'Memory & Recall',
    iconName: 'Brain',
    description: 'Specialized cognitive support for remembering loved ones, recognizing cues, and gentle memory retrieval',
  },
  {
    id: 'wellbeing',
    labelKey: 'character.category_wellbeing',
    englishLabel: 'Mood & Well-being',
    iconName: 'Sun',
    description: 'Calming, motivation, rest suggestions, and gentle pacing alignment',
  },
];

/**
 * Full Registry of all 30 Expressions (5 Categories x 6 Expressions)
 */
export const ASHA_EXPRESSIONS_REGISTRY: Record<AshaExpression, ExpressionMetadata> = {
  // -------------------------------------------------------------
  // Category 1: General / Conversation
  // -------------------------------------------------------------
  neutral: {
    id: 'neutral',
    labelKey: 'character.expr_neutral',
    descriptionKey: 'character.desc_neutral',
    category: 'conversation',
    categoryLabelKey: 'character.category_conversation',
    priority: 1,
    defaultDurationMs: 0, // ambient/sticky
    returnState: 'neutral',
    assetPath: '/assets/character/asha/neutral.png',
    badgeIcon: 'Smile',
    badgeBg: 'bg-purple-100',
    badgeTextColor: 'text-purple-700',
    auraColor: 'bg-purple-200/50',
    borderRing: 'ring-purple-200',
    englishLabel: 'Neutral',
  },
  listening: {
    id: 'listening',
    labelKey: 'character.expr_listening',
    descriptionKey: 'character.desc_listening',
    category: 'conversation',
    categoryLabelKey: 'character.category_conversation',
    priority: 2,
    defaultDurationMs: 6000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/listening.png',
    badgeIcon: 'Mic',
    badgeBg: 'bg-violet-600',
    badgeTextColor: 'text-white',
    auraColor: 'bg-violet-300/60',
    borderRing: 'ring-violet-400',
    englishLabel: 'Listening',
  },
  thinking: {
    id: 'thinking',
    labelKey: 'character.expr_thinking',
    descriptionKey: 'character.desc_thinking',
    category: 'conversation',
    categoryLabelKey: 'character.category_conversation',
    priority: 2,
    defaultDurationMs: 4000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/thinking.png',
    badgeIcon: 'Sparkles',
    badgeBg: 'bg-amber-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-amber-200/60',
    borderRing: 'ring-amber-300',
    englishLabel: 'Thinking',
  },
  explaining: {
    id: 'explaining',
    labelKey: 'character.expr_explaining',
    descriptionKey: 'character.desc_explaining',
    category: 'conversation',
    categoryLabelKey: 'character.category_conversation',
    priority: 2,
    defaultDurationMs: 5000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/explaining.png',
    badgeIcon: 'Volume2',
    badgeBg: 'bg-purple-600',
    badgeTextColor: 'text-white',
    auraColor: 'bg-purple-300/60',
    borderRing: 'ring-purple-400',
    englishLabel: 'Explaining',
  },
  acknowledging: {
    id: 'acknowledging',
    labelKey: 'character.expr_acknowledging',
    descriptionKey: 'character.desc_acknowledging',
    category: 'conversation',
    categoryLabelKey: 'character.category_conversation',
    priority: 2,
    defaultDurationMs: 3500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/acknowledging.png',
    badgeIcon: 'Check',
    badgeBg: 'bg-emerald-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-emerald-200/60',
    borderRing: 'ring-emerald-300',
    englishLabel: 'Acknowledging',
  },
  surprised: {
    id: 'surprised',
    labelKey: 'character.expr_surprised',
    descriptionKey: 'character.desc_surprised',
    category: 'conversation',
    categoryLabelKey: 'character.category_conversation',
    priority: 2,
    defaultDurationMs: 3000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/surprised.png',
    badgeIcon: 'HelpCircle',
    badgeBg: 'bg-indigo-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-indigo-200/60',
    borderRing: 'ring-indigo-300',
    englishLabel: 'Surprised',
  },

  // -------------------------------------------------------------
  // Category 2: Emotional Support
  // -------------------------------------------------------------
  happy: {
    id: 'happy',
    labelKey: 'character.expr_happy',
    descriptionKey: 'character.desc_happy',
    category: 'emotional_support',
    categoryLabelKey: 'character.category_emotional_support',
    priority: 3,
    defaultDurationMs: 4000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/happy.png',
    badgeIcon: 'Sparkles',
    badgeBg: 'bg-pink-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-pink-300/60',
    borderRing: 'ring-pink-400',
    englishLabel: 'Happy',
  },
  encouraging: {
    id: 'encouraging',
    labelKey: 'character.expr_encouraging',
    descriptionKey: 'character.desc_encouraging',
    category: 'emotional_support',
    categoryLabelKey: 'character.category_emotional_support',
    priority: 3,
    defaultDurationMs: 4500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/encouraging.png',
    badgeIcon: 'Heart',
    badgeBg: 'bg-rose-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-rose-300/60',
    borderRing: 'ring-rose-400',
    englishLabel: 'Encouraging',
  },
  reassuring: {
    id: 'reassuring',
    labelKey: 'character.expr_reassuring',
    descriptionKey: 'character.desc_reassuring',
    category: 'emotional_support',
    categoryLabelKey: 'character.category_emotional_support',
    priority: 3,
    defaultDurationMs: 5000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/reassuring.png',
    badgeIcon: 'Shield',
    badgeBg: 'bg-teal-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-teal-200/60',
    borderRing: 'ring-teal-300',
    englishLabel: 'Reassuring',
  },
  comforting: {
    id: 'comforting',
    labelKey: 'character.expr_comforting',
    descriptionKey: 'character.desc_comforting',
    category: 'emotional_support',
    categoryLabelKey: 'character.category_emotional_support',
    priority: 3,
    defaultDurationMs: 5000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/comforting.png',
    badgeIcon: 'HeartHandshake',
    badgeBg: 'bg-rose-400',
    badgeTextColor: 'text-white',
    auraColor: 'bg-rose-200/60',
    borderRing: 'ring-rose-300',
    englishLabel: 'Comforting',
  },
  concerned: {
    id: 'concerned',
    labelKey: 'character.expr_concerned',
    descriptionKey: 'character.desc_concerned',
    category: 'emotional_support',
    categoryLabelKey: 'character.category_emotional_support',
    priority: 3,
    defaultDurationMs: 5000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/concerned.png',
    badgeIcon: 'AlertCircle',
    badgeBg: 'bg-sky-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-sky-200/60',
    borderRing: 'ring-sky-300',
    englishLabel: 'Concerned',
  },
  empathetic: {
    id: 'empathetic',
    labelKey: 'character.expr_empathetic',
    descriptionKey: 'character.desc_empathetic',
    category: 'emotional_support',
    categoryLabelKey: 'character.category_emotional_support',
    priority: 3,
    defaultDurationMs: 5000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/empathetic.png',
    badgeIcon: 'Heart',
    badgeBg: 'bg-fuchsia-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-fuchsia-200/60',
    borderRing: 'ring-fuchsia-300',
    englishLabel: 'Empathetic',
  },

  // -------------------------------------------------------------
  // Category 3: Reminders / Guidance
  // -------------------------------------------------------------
  reminder: {
    id: 'reminder',
    labelKey: 'character.expr_reminder',
    descriptionKey: 'character.desc_reminder',
    category: 'reminders',
    categoryLabelKey: 'character.category_reminders',
    priority: 4,
    defaultDurationMs: 6000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/reminder.png',
    badgeIcon: 'Calendar',
    badgeBg: 'bg-amber-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-amber-300/60',
    borderRing: 'ring-amber-400',
    englishLabel: 'Reminder',
  },
  alert_important: {
    id: 'alert_important',
    labelKey: 'character.expr_alert_important',
    descriptionKey: 'character.desc_alert_important',
    category: 'reminders',
    categoryLabelKey: 'character.category_reminders',
    priority: 5,
    defaultDurationMs: 8000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/alert_important.png',
    badgeIcon: 'Bell',
    badgeBg: 'bg-red-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-red-300/70',
    borderRing: 'ring-red-400',
    englishLabel: 'Alert / Important',
  },
  guiding: {
    id: 'guiding',
    labelKey: 'character.expr_guiding',
    descriptionKey: 'character.desc_guiding',
    category: 'reminders',
    categoryLabelKey: 'character.category_reminders',
    priority: 4,
    defaultDurationMs: 5000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/guiding.png',
    badgeIcon: 'Compass',
    badgeBg: 'bg-indigo-600',
    badgeTextColor: 'text-white',
    auraColor: 'bg-indigo-200/60',
    borderRing: 'ring-indigo-300',
    englishLabel: 'Guiding',
  },
  confirming: {
    id: 'confirming',
    labelKey: 'character.expr_confirming',
    descriptionKey: 'character.desc_confirming',
    category: 'reminders',
    categoryLabelKey: 'character.category_reminders',
    priority: 4,
    defaultDurationMs: 4000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/confirming.png',
    badgeIcon: 'CheckCircle2',
    badgeBg: 'bg-emerald-600',
    badgeTextColor: 'text-white',
    auraColor: 'bg-emerald-300/60',
    borderRing: 'ring-emerald-400',
    englishLabel: 'Confirming',
  },
  noting_saving: {
    id: 'noting_saving',
    labelKey: 'character.expr_noting_saving',
    descriptionKey: 'character.desc_noting_saving',
    category: 'reminders',
    categoryLabelKey: 'character.category_reminders',
    priority: 4,
    defaultDurationMs: 4000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/noting_saving.png',
    badgeIcon: 'FileText',
    badgeBg: 'bg-violet-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-violet-200/60',
    borderRing: 'ring-violet-300',
    englishLabel: 'Noting / Saving',
  },
  done_completed: {
    id: 'done_completed',
    labelKey: 'character.expr_done_completed',
    descriptionKey: 'character.desc_done_completed',
    category: 'reminders',
    categoryLabelKey: 'character.category_reminders',
    priority: 4,
    defaultDurationMs: 4500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/done_completed.png',
    badgeIcon: 'ThumbsUp',
    badgeBg: 'bg-green-600',
    badgeTextColor: 'text-white',
    auraColor: 'bg-green-300/60',
    borderRing: 'ring-green-400',
    englishLabel: 'Done / Completed',
  },

  // -------------------------------------------------------------
  // Category 4: Memory & Recall
  // -------------------------------------------------------------
  helping_recall: {
    id: 'helping_recall',
    labelKey: 'character.expr_helping_recall',
    descriptionKey: 'character.desc_helping_recall',
    category: 'memory_recall',
    categoryLabelKey: 'character.category_memory_recall',
    priority: 3,
    defaultDurationMs: 5000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/helping_recall.png',
    badgeIcon: 'Image',
    badgeBg: 'bg-purple-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-purple-200/60',
    borderRing: 'ring-purple-300',
    englishLabel: 'Helping Recall',
  },
  referring_past: {
    id: 'referring_past',
    labelKey: 'character.expr_referring_past',
    descriptionKey: 'character.desc_referring_past',
    category: 'memory_recall',
    categoryLabelKey: 'character.category_memory_recall',
    priority: 3,
    defaultDurationMs: 5000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/referring_past.png',
    badgeIcon: 'Users',
    badgeBg: 'bg-purple-600',
    badgeTextColor: 'text-white',
    auraColor: 'bg-purple-300/60',
    borderRing: 'ring-purple-400',
    englishLabel: 'Referring to Past',
  },
  recognizing: {
    id: 'recognizing',
    labelKey: 'character.expr_recognizing',
    descriptionKey: 'character.desc_recognizing',
    category: 'memory_recall',
    categoryLabelKey: 'character.category_memory_recall',
    priority: 3,
    defaultDurationMs: 4500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/recognizing.png',
    badgeIcon: 'Lightbulb',
    badgeBg: 'bg-amber-400',
    badgeTextColor: 'text-amber-950',
    auraColor: 'bg-amber-200/60',
    borderRing: 'ring-amber-300',
    englishLabel: 'Recognizing',
  },
  clarifying: {
    id: 'clarifying',
    labelKey: 'character.expr_clarifying',
    descriptionKey: 'character.desc_clarifying',
    category: 'memory_recall',
    categoryLabelKey: 'character.category_memory_recall',
    priority: 2,
    defaultDurationMs: 4500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/clarifying.png',
    badgeIcon: 'HelpCircle',
    badgeBg: 'bg-sky-600',
    badgeTextColor: 'text-white',
    auraColor: 'bg-sky-200/60',
    borderRing: 'ring-sky-300',
    englishLabel: 'Clarifying',
  },
  checking_understanding: {
    id: 'checking_understanding',
    labelKey: 'character.expr_checking_understanding',
    descriptionKey: 'character.desc_checking_understanding',
    category: 'memory_recall',
    categoryLabelKey: 'character.category_memory_recall',
    priority: 2,
    defaultDurationMs: 4500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/checking_understanding.png',
    badgeIcon: 'MessageCircle',
    badgeBg: 'bg-indigo-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-indigo-200/60',
    borderRing: 'ring-indigo-300',
    englishLabel: 'Checking Understanding',
  },
  remembered: {
    id: 'remembered',
    labelKey: 'character.expr_remembered',
    descriptionKey: 'character.desc_remembered',
    category: 'memory_recall',
    categoryLabelKey: 'character.category_memory_recall',
    priority: 3,
    defaultDurationMs: 4500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/remembered.png',
    badgeIcon: 'Sparkles',
    badgeBg: 'bg-pink-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-pink-300/60',
    borderRing: 'ring-pink-400',
    englishLabel: 'Remembered!',
  },

  // -------------------------------------------------------------
  // Category 5: Mood & Well-being
  // -------------------------------------------------------------
  calm: {
    id: 'calm',
    labelKey: 'character.expr_calm',
    descriptionKey: 'character.desc_calm',
    category: 'wellbeing',
    categoryLabelKey: 'character.category_wellbeing',
    priority: 1,
    defaultDurationMs: 6000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/calm.png',
    badgeIcon: 'Wind',
    badgeBg: 'bg-cyan-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-cyan-200/60',
    borderRing: 'ring-cyan-300',
    englishLabel: 'Calm',
  },
  relaxed: {
    id: 'relaxed',
    labelKey: 'character.expr_relaxed',
    descriptionKey: 'character.desc_relaxed',
    category: 'wellbeing',
    categoryLabelKey: 'character.category_wellbeing',
    priority: 1,
    defaultDurationMs: 6000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/relaxed.png',
    badgeIcon: 'Music',
    badgeBg: 'bg-violet-400',
    badgeTextColor: 'text-white',
    auraColor: 'bg-violet-200/60',
    borderRing: 'ring-violet-300',
    englishLabel: 'Relaxed',
  },
  motivated: {
    id: 'motivated',
    labelKey: 'character.expr_motivated',
    descriptionKey: 'character.desc_motivated',
    category: 'wellbeing',
    categoryLabelKey: 'character.category_wellbeing',
    priority: 3,
    defaultDurationMs: 4500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/motivated.png',
    badgeIcon: 'Zap',
    badgeBg: 'bg-amber-500',
    badgeTextColor: 'text-white',
    auraColor: 'bg-amber-300/60',
    borderRing: 'ring-amber-400',
    englishLabel: 'Motivated',
  },
  proud: {
    id: 'proud',
    labelKey: 'character.expr_proud',
    descriptionKey: 'character.desc_proud',
    category: 'wellbeing',
    categoryLabelKey: 'character.category_wellbeing',
    priority: 3,
    defaultDurationMs: 4500,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/proud.png',
    badgeIcon: 'Award',
    badgeBg: 'bg-purple-600',
    badgeTextColor: 'text-white',
    auraColor: 'bg-purple-300/60',
    borderRing: 'ring-purple-400',
    englishLabel: 'Proud',
  },
  a_little_tired: {
    id: 'a_little_tired',
    labelKey: 'character.expr_a_little_tired',
    descriptionKey: 'character.desc_a_little_tired',
    category: 'wellbeing',
    categoryLabelKey: 'character.category_wellbeing',
    priority: 2,
    defaultDurationMs: 6000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/a_little_tired.png',
    badgeIcon: 'Coffee',
    badgeBg: 'bg-amber-700',
    badgeTextColor: 'text-white',
    auraColor: 'bg-amber-200/60',
    borderRing: 'ring-amber-300',
    englishLabel: 'A Little Tired',
  },
  rest_suggestion: {
    id: 'rest_suggestion',
    labelKey: 'character.expr_rest_suggestion',
    descriptionKey: 'character.desc_rest_suggestion',
    category: 'wellbeing',
    categoryLabelKey: 'character.category_wellbeing',
    priority: 4,
    defaultDurationMs: 7000,
    returnState: 'neutral',
    assetPath: '/assets/character/asha/rest_suggestion.png',
    badgeIcon: 'Moon',
    badgeBg: 'bg-indigo-700',
    badgeTextColor: 'text-white',
    auraColor: 'bg-indigo-300/60',
    borderRing: 'ring-indigo-400',
    englishLabel: 'Rest Suggestion',
  },
};

/**
 * Array of all 30 expressions in canonical order
 */
export const ALL_ASHA_EXPRESSIONS: AshaExpression[] = Object.keys(
  ASHA_EXPRESSIONS_REGISTRY
) as AshaExpression[];

/**
 * Helper to get all expressions in a category
 */
export function getExpressionsByCategory(category: AshaExpressionCategory): ExpressionMetadata[] {
  return ALL_ASHA_EXPRESSIONS.map((id) => ASHA_EXPRESSIONS_REGISTRY[id]).filter(
    (meta) => meta.category === category
  );
}

/**
 * Resolve any input state (legacy or 30-expression) to valid AshaExpression
 */
export function resolveAshaExpression(input?: string | null): AshaExpression {
  if (!input) return 'neutral';
  if (input in ASHA_EXPRESSIONS_REGISTRY) {
    return input as AshaExpression;
  }
  if (input in LEGACY_STATE_TO_EXPRESSION) {
    return LEGACY_STATE_TO_EXPRESSION[input as CharacterState];
  }
  return 'neutral';
}

/**
 * Mapping of all 30 Asha expressions to the 15 canvas rig expression layers and gestures
 */
export const ASHA_EXPRESSION_TO_CANVAS_RIG: Record<
  AshaExpression,
  { expressionIndex: number; defaultGesture: 'neutral' | 'wave' | 'comfort' | 'explain' | 'cheer' | 'walk' }
> = {
  // Category 1: Conversation
  neutral: { expressionIndex: 0, defaultGesture: 'neutral' },
  listening: { expressionIndex: 10, defaultGesture: 'neutral' },
  thinking: { expressionIndex: 2, defaultGesture: 'neutral' },
  explaining: { expressionIndex: 9, defaultGesture: 'explain' },
  acknowledging: { expressionIndex: 4, defaultGesture: 'comfort' },
  surprised: { expressionIndex: 3, defaultGesture: 'neutral' },

  // Category 2: Emotional Support
  happy: { expressionIndex: 1, defaultGesture: 'wave' },
  encouraging: { expressionIndex: 5, defaultGesture: 'cheer' },
  reassuring: { expressionIndex: 4, defaultGesture: 'comfort' },
  comforting: { expressionIndex: 7, defaultGesture: 'comfort' },
  concerned: { expressionIndex: 11, defaultGesture: 'comfort' },
  empathetic: { expressionIndex: 7, defaultGesture: 'comfort' },

  // Category 3: Reminders / Guidance
  reminder: { expressionIndex: 14, defaultGesture: 'explain' },
  alert_important: { expressionIndex: 14, defaultGesture: 'explain' },
  guiding: { expressionIndex: 13, defaultGesture: 'explain' },
  confirming: { expressionIndex: 12, defaultGesture: 'neutral' },
  noting_saving: { expressionIndex: 9, defaultGesture: 'explain' },
  done_completed: { expressionIndex: 8, defaultGesture: 'cheer' },

  // Category 4: Memory & Recall
  helping_recall: { expressionIndex: 2, defaultGesture: 'neutral' },
  referring_past: { expressionIndex: 12, defaultGesture: 'comfort' },
  recognizing: { expressionIndex: 1, defaultGesture: 'wave' },
  clarifying: { expressionIndex: 12, defaultGesture: 'neutral' },
  checking_understanding: { expressionIndex: 6, defaultGesture: 'neutral' },
  remembered: { expressionIndex: 8, defaultGesture: 'cheer' },

  // Category 5: Mood & Well-being
  calm: { expressionIndex: 4, defaultGesture: 'comfort' },
  relaxed: { expressionIndex: 0, defaultGesture: 'neutral' },
  motivated: { expressionIndex: 5, defaultGesture: 'cheer' },
  proud: { expressionIndex: 8, defaultGesture: 'cheer' },
  a_little_tired: { expressionIndex: 7, defaultGesture: 'comfort' },
  rest_suggestion: { expressionIndex: 4, defaultGesture: 'comfort' },
};

/**
 * Helper to resolve canvas rig expression index & default gesture from any input string
 */
export function resolveCanvasRigState(input?: string | number | null): {
  expressionIndex: number;
  defaultGesture: 'neutral' | 'wave' | 'comfort' | 'explain' | 'cheer' | 'walk';
} {
  if (typeof input === 'number') {
    const validIdx = Math.max(0, Math.min(14, input));
    return { expressionIndex: validIdx, defaultGesture: 'neutral' };
  }
  const resolved = resolveAshaExpression(input);
  return ASHA_EXPRESSION_TO_CANVAS_RIG[resolved] || { expressionIndex: 0, defaultGesture: 'neutral' };
}

