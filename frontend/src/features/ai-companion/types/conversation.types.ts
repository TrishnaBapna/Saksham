/**
 * SAKSHAM — MILESTONE 7.3: CONVERSATIONAL ENGINE & SAFE ACTION PROTOCOLS
 * Master Conversation, Intent & Action Protocol Type Definitions
 */

import { WhitelistedAction } from '../../../types/index.js';
import { AshaExpression, ClinicalInteractionState } from './character.types.js';

export type IntentCategory =
  | 'GENERAL_CONVERSATION'
  | 'DAILY_ROUTINES'
  | 'REMINDERS'
  | 'MIND_GAMES'
  | 'LOVED_ONES'
  | 'NOTES'
  | 'CALENDAR'
  | 'NAVIGATION'
  | 'SAFETY_MEDICAL'
  | 'AMBIGUITY_FALLBACK';

export type IntentType =
  // Category A: Greeting & General
  | 'GREETING'
  | 'HOW_ARE_YOU'
  | 'GRATITUDE'
  | 'GENERAL_HELP'
  | 'CONVERSATIONAL_LANGUAGE_SWITCH'
  | 'WELLBEING_TIRED'
  | 'WELLBEING_CONFUSED'
  // Category B: Daily Routines & Activities
  | 'ROUTINES_TODAY'
  | 'ROUTINES_NEXT'
  | 'ROUTINES_START_NEXT'
  | 'ROUTINES_MEDICATION_STATUS'
  | 'ROUTINES_MEDICATION_UNCERTAINTY'
  | 'MEDICATION_DOUBLE_DOSE_GUARD'
  | 'ROUTINES_REMAINING'
  | 'ROUTINES_MEMORY_LAPSE'
  | 'ROUTINES_INCOMPLETE'
  // Category C: Reminders
  | 'REMINDERS_TODAY'
  | 'REMINDER_ADD'
  | 'REMINDER_NEXT'
  // Category D: Mind Games
  | 'GAMES_LIST'
  | 'GAMES_RECENT'
  | 'GAMES_UNPLAYED_RECENTLY'
  | 'GAMES_RECOMMEND'
  | 'GAMES_LAUNCH_SPECIFIC'
  | 'GAMES_EASY'
  // Category E: Loved Ones & Memories
  | 'LOVED_ONES_LIST'
  | 'LOVED_ONES_PERSON'
  | 'LOVED_ONES_ACTIVITY'
  | 'LOVED_ONES_VOICE'
  | 'LOVED_ONES_QUIZ'
  | 'LOVED_ONES_CLUE'
  | 'MEMORY_GRAPH_QUERY'
  // Category F: Notes
  | 'NOTES_LIST'
  | 'NOTES_READ_PINNED'
  | 'NOTES_CREATE'
  | 'NOTES_SEARCH'
  // Category G: Calendar
  | 'CALENDAR_TODAY'
  | 'CALENDAR_TOMORROW'
  | 'CALENDAR_WEEK'
  | 'CALENDAR_ADD'
  // Category H: Navigation
  | 'NAVIGATE_HOME'
  | 'NAVIGATE_HOME_GUIDE'
  | 'NAVIGATE_ROUTINES'
  | 'NAVIGATE_FAMILY'
  | 'NAVIGATE_GAMES'
  | 'NAVIGATE_PROFILE'
  | 'OPEN_NOTES'
  | 'OPEN_CALENDAR'
  | 'OPEN_CAMERA'
  | 'OPEN_TODO'
  | 'WELLBEING_ADAPT_EASIER'
  // Category I: Repeated Inquiries & Reassurance
  | 'REPEATED_TIME_QUERY'
  | 'REPEATED_DATE_QUERY'
  | 'REPEATED_LOCATION_QUERY'
  | 'REPEATED_FAMILY_QUERY'
  | 'CAREGIVER_ESCALATION'
  // Category J: Adaptive Personalized Support & Reassurance (Stage 3 Phase B)
  | 'INSTRUCTION_REPEAT'
  | 'ASSISTANCE_HINT'
  | 'ADAPTATION_MAKE_EASIER'
  | 'ADAPTATION_KEEP_LEVEL'
  | 'ADAPTATION_TRY_HARDER'
  | 'WELLBEING_REST_BREAK'
  | 'ADAPTATION_RESTORE_PREVIOUS'
  | 'ADAPTATION_DECLINE_CHANGE'
  | 'QUERY_ACTIVITY_CHANGE_RATIONALE'
  // Protocol, Safety & Ambiguity
  | 'EMERGENCY_DISTRESS'
  | 'RESTRICTED_ACTION'
  | 'CONFIRMATION_YES'
  | 'CONFIRMATION_NO'
  | 'AMBIGUOUS_QUERY'
  | 'UNKNOWN_FALLBACK';

export type ActionClass =
  | 'class1_read'          // Read-only info inspection
  | 'class2_navigate'      // In-app navigation / Launch activity runner
  | 'class3_consequential' // Data modifying (Notes, Calendar, Routines) - Requires Explicit Confirmation
  | 'class4_restricted'    // Clinical, medical or cross-user action - Prohibited
  | 'emergency';           // Urgent distress / Fallback to human care

export interface ExtractedEntities {
  time?: string;
  date?: 'today' | 'tomorrow' | 'week' | string;
  personName?: string;
  relationship?: string;
  gameName?: string;
  noteQuery?: string;
  routineTitle?: string;
  routineId?: string;
  rawQuery: string;
}

export type ActionExecutionStatus =
  | 'saved_locally'
  | 'synced_cloud'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'permission_denied'
  | 'duplicate_ignored';

export interface ActionExecutionResult {
  success: boolean;
  status: ActionExecutionStatus;
  message: string;
  speechHi: string;
  speechEn: string;
  retryAvailable?: boolean;
  pendingAction?: PendingConfirmation;
}

export interface PendingConfirmation {
  id: string;
  patientId?: string;
  actionType:
    | 'CREATE_REMINDER'
    | 'CREATE_ROUTINE'
    | 'CREATE_NOTE'
    | 'DELETE_NOTE'
    | 'CREATE_CALENDAR_EVENT'
    | 'DELETE_CALENDAR_EVENT';
  title: string;
  details: Record<string, any>;
  proposalText: string;
  createdAt: number;
  expiresAt: number; // 2 minutes (120,000ms) TTL
}

export interface ClarificationOption {
  label: string;
  query: string;
  description?: string;
}

export interface ConversationResult {
  speech: string;
  expression: AshaExpression;
  intent: IntentType;
  confidence: number;
  actionClass: ActionClass;
  clinicalState?: ClinicalInteractionState;
  suggestedAction?: {
    action: WhitelistedAction;
    targetId?: string;
    description: string;
  };
  pendingConfirmation?: PendingConfirmation;
  clarificationOptions?: ClarificationOption[];
  isEmergency?: boolean;
  missingInfoPrompt?: string;
  metadata?: Record<string, any>;
  isRealAI?: boolean;
  executionMode?: 'REAL_GEMINI_API' | 'LOCAL_SIMULATION_FALLBACK' | string;
  executionState?: 'LIVE_AI' | 'LOCAL_SIMULATION' | 'QUOTA_EXHAUSTED' | 'NETWORK_FAILURE' | 'MISSING_CREDENTIALS';
  modelUsed?: string;
  configNotice?: string;
  tokensRedacted?: number;
  latencyMs?: number;
}
