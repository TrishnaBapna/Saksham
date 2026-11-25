import { WhitelistedAction } from '../types/index.js';
import { PatientContext } from './patientContextService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import {
  ActionClass,
  ClarificationOption,
  IntentType,
  PendingConfirmation,
  AshaRuntimeState,
  AshaResponseProvenance,
} from '../features/ai-companion/types/conversation.types.js';
import { AshaExpression } from '../features/ai-companion/types/character.types.js';

export interface AIResponse {
  speech: string;
  characterState: 'greeting' | 'listening' | 'speaking' | 'thinking' | 'happy' | 'reminder' | 'encouraging';
  expression?: AshaExpression;
  intent?: IntentType;
  confidence?: number;
  actionClass?: ActionClass;
  suggestedAction?: {
    action: WhitelistedAction;
    targetId?: string;
    description: string;
  };
  pendingConfirmation?: PendingConfirmation;
  clarificationOptions?: ClarificationOption[];
  isEmergency?: boolean;
  isRealAI?: boolean;
  runtimeState?: AshaRuntimeState;
  responseSource?: AshaResponseProvenance;
  executionMode?: 'REAL_GEMINI_API' | 'LOCAL_RESIDENT_SLM' | 'LOCAL_SIMULATION_FALLBACK';
  modelUsed?: string;
  configNotice?: string;
  tokensRedacted?: number;
  latencyMs?: number;
  metadata?: Record<string, any>;
  newRoutine?: {
    title: string;
    scheduledTime: string;
    category?: string;
  };
}

export const PERMITTED_ACTIONS: WhitelistedAction[] = [
  'NAVIGATE_HOME',
  'NAVIGATE_ROUTINES',
  'NAVIGATE_LOVED_ONES',
  'NAVIGATE_MIND_GAMES',
  'NAVIGATE_ROOM_MEMORY',
  'TRIGGER_ROUTINE_REMINDER',
  'SHOW_FAMILY_MEMBER',
  'TRIGGER_ASSISTANCE_TRAY',
  'OPEN_NOTES',
  'OPEN_CALENDAR',
  'OPEN_UTILITIES',
  'LAUNCH_ROUTINE_RUNNER',
  'CALL_CAREGIVER',
];

/**
 * Maps high-fidelity 30-expression engine state into backward-compatible 8-state representation.
 */
const mapExpressionToLegacyState = (
  expression: AshaExpression,
  actionClass?: ActionClass
): 'greeting' | 'listening' | 'speaking' | 'thinking' | 'happy' | 'reminder' | 'encouraging' => {
  if (actionClass === 'emergency') return 'encouraging';
  switch (expression) {
    case 'listening':
      return 'listening';
    case 'thinking':
    case 'clarifying':
    case 'checking_understanding':
      return 'thinking';
    case 'happy':
    case 'remembered':
    case 'proud':
      return 'happy';
    case 'reminder':
      return 'reminder';
    case 'encouraging':
    case 'reassuring':
    case 'comforting':
    case 'concerned':
    case 'empathetic':
    case 'motivated':
      return 'encouraging';
    default:
      return 'speaking';
  }
};

/**
 * Local Contextual Intent Parser.
 * Uses real patient data from PatientContext to produce truthful, reassuring responses
 * with zero external paid LLM calls (100% Spark Free Plan compliant).
 * Delegates to Milestone 7.3 ConversationEngine.
 */
export const parseAIIntentLocally = (
  transcript: string,
  context?: PatientContext,
  language: string = 'en',
  responseLanguage?: string
): AIResponse => {
  const result = ConversationEngine.processSync(transcript, context, language, responseLanguage);

  const characterState = mapExpressionToLegacyState(result.expression, result.actionClass);

  return {
    speech: result.speech,
    characterState,
    expression: result.expression,
    intent: result.intent,
    confidence: result.confidence,
    actionClass: result.actionClass,
    suggestedAction: result.suggestedAction,
    pendingConfirmation: result.pendingConfirmation,
    clarificationOptions: result.clarificationOptions,
    isEmergency: result.isEmergency,
    isRealAI: result.metadata?.isRealAI,
    runtimeState: result.runtimeState || result.metadata?.runtimeState,
    responseSource: result.responseSource || result.metadata?.responseSource,
    executionMode: result.metadata?.executionMode,
    modelUsed: result.metadata?.modelUsed,
    configNotice: result.metadata?.configNotice,
    tokensRedacted: result.metadata?.tokensRedacted,
    latencyMs: result.metadata?.latencyMs,
    metadata: result.metadata,
  };
};

export const queryAICompanion = async (
  transcript: string,
  _currentScreen = 'home',
  language = 'en',
  context?: PatientContext,
  authUid?: string,
  responseLanguage?: string
): Promise<AIResponse> => {
  // Authoritative local intent resolution using patient context (100% Spark Free Plan compliant)
  const result = await ConversationEngine.process(transcript, context, language, authUid, responseLanguage);
  const characterState = mapExpressionToLegacyState(result.expression, result.actionClass);

  return {
    speech: result.speech,
    characterState,
    expression: result.expression,
    intent: result.intent,
    confidence: result.confidence,
    actionClass: result.actionClass,
    suggestedAction: result.suggestedAction,
    pendingConfirmation: result.pendingConfirmation,
    clarificationOptions: result.clarificationOptions,
    isEmergency: result.isEmergency,
    isRealAI: result.metadata?.isRealAI,
    runtimeState: result.runtimeState || result.metadata?.runtimeState,
    responseSource: result.responseSource || result.metadata?.responseSource,
    executionMode: result.metadata?.executionMode,
    modelUsed: result.metadata?.modelUsed,
    configNotice: result.metadata?.configNotice,
    tokensRedacted: result.metadata?.tokensRedacted,
    latencyMs: result.metadata?.latencyMs,
    metadata: result.metadata,
  };
};
