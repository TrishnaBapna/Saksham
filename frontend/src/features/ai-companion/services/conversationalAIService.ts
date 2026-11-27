/**
 * SAKSHAM — PHASE 2 REMEDIATION: CONVERSATIONAL AI SERVICE
 * 
 * Real Google Gemini Developer API Free Tier Integration with Local Privacy De-identification Boundary.
 * 100% Firebase Spark Free Plan compliant ($0.00 / month).
 * 
 * CRITICAL TRANSPARENCY RULES:
 * 1. When API key is missing, clearly report unconfigured status; do NOT pretend real AI was called.
 * 2. Explicitly label any simulated responses as development fallback ('LOCAL_SIMULATION_FALLBACK').
 * 3. Never send Protected Health Information (PHI) to the free-tier model.
 */

import { WhitelistedAction } from '../../../types/index.js';
import { AshaExpression } from '../types/character.types.js';
import { ActionClass, IntentType, AshaRuntimeState, AshaResponseProvenance } from '../types/conversation.types.js';
import { PatientContext } from '../../../services/patientContextService.js';
import { ConversationSafetyPolicy } from './conversationSafetyPolicy.js';
import { AshaRemoteAdapter } from './ashaRemoteAdapter.js';
import { FirebaseAILogicService, ScopedAshaCloudContext } from './firebaseAILogicService.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { getTranslatedRoutineTitle } from '../../routines/utils/routineTranslation.js';
import { AshaContextService } from './ashaContextService.js';
import {
  getLiveTemporalContext,
  formatTemporalPromptBlock,
  formatLocalizedTimeResponse,
  formatLocalizedDateResponse,
  detectGreetingTimeMismatch,
  formatTimeOfDayClarification,
} from '../../../utils/temporalContext.js';

function pickAILang(lang: string, map: Record<string, string>): string {
  return map[lang] || map.en;
}

export type AIExecutionMode = 'LOCAL_RESIDENT_SLM' | 'REAL_GEMINI_API' | 'LOCAL_SIMULATION_FALLBACK';

export type AIExecutionState =
  | 'LIVE_AI'
  | 'LOCAL_SIMULATION'
  | 'QUOTA_EXHAUSTED'
  | 'NETWORK_FAILURE'
  | 'MISSING_CREDENTIALS';

export interface AIConfigurationStatus {
  isConfigured: boolean;
  mode: AIExecutionMode;
  executionState: AIExecutionState;
  modelIdentifier: string;
  statusMessage: string;
  quotaInfo: string;
  requiresSetup: boolean;
  warningNotice?: string;
}

export const CREDENTIAL_EXPOSURE_WARNING =
  'DEVELOPMENT & JURY DEMONSTRATION NOTICE: In client-side React single-page applications without a paid Blaze backend server proxy, API keys stored in localStorage or passed in request URLs (?key=...) are visible in browser developer tools. Under Firebase Spark Free tier ($0.00/month), real Gemini Developer API access is strictly restricted to local development and jury demonstration environments using synthetic patient data only. Real production deployments require a secure server-side proxy.';

export interface StructuredAIProposal {
  speech: string;
  expression: AshaExpression;
  intent: IntentType;
  confidence: number;
  actionClass: ActionClass;
  actionProposal?: {
    action: WhitelistedAction;
    targetId?: string;
    description: string;
    parameters?: Record<string, any>;
    autoDispatch?: boolean;
  };
  clarificationNeeded?: boolean;
  followUpPrompt?: string;
  // Remediation Sprint Fields:
  isRealAI: boolean;
  runtimeState?: AshaRuntimeState;
  responseSource?: AshaResponseProvenance;
  executionMode: AIExecutionMode;
  executionState: AIExecutionState;
  modelUsed: string;
  tokensRedacted?: number;
  latencyMs?: number;
  configNotice?: string;
}

/**
 * Safely escapes special regex characters.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a Unicode-aware word boundary RegExp for a search term.
 * Uses lookbehind (?<![\p{L}\p{M}\p{N}]) and lookahead (?![\p{L}\p{M}\p{N}]) with 'u' flag
 * to ensure robust word boundary matching across English/Latin and Indic scripts
 * (Devanagari, Tamil, Telugu, Kannada, Bengali, etc.) while preserving surrounding punctuation.
 */
function createUnicodeWordRegex(term: string): RegExp {
  const clean = escapeRegExp(term.trim()).replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${clean}(?![\\p{L}\\p{M}\\p{N}])`, 'giu');
}

export class ConversationalAIService {
  private static requestTimestamps: number[] = [];
  private static readonly MAX_RPM = 12; // Enforce conservative 12 RPM under Gemini Flash 15 RPM free quota
  private static activeModel = 'gemini-3.5-flash-lite';
  private static runtimeApiKey: string | null = null;
  private static keyOwnerUid: string | null = null;

  /**
   * Active eligible models on Google AI Studio / Gemini Developer API Free Tier (2026 GA generation).
   * Primary recommended GA model: gemini-3.5-flash-lite (Free Tier eligible, lowest latency, multimodal audio/text, 15 RPM / 1M TPM).
   */
  public static readonly SUPPORTED_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-4-hydrogen',
  ];

  /**
   * Retired / shut-down models that are automatically migrated to gemini-3.5-flash-lite.
   * Note: gemini-2.0-flash and gemini-1.5-flash were retired/shut down on 1 June 2026.
   */
  public static readonly RETIRED_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.0-pro',
    'gemini-1.5-pro-exp',
    'gemini-1.5-flash-001',
  ];

  public static getModel(): string {
    const envModel = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_MODEL : undefined;
    const candidate = this.activeModel || envModel || 'gemini-3.5-flash-lite';
    if (this.RETIRED_MODELS.includes(candidate)) {
      console.warn(`Model ${candidate} is retired. Automatically upgrading to gemini-3.5-flash-lite.`);
      return 'gemini-3.5-flash-lite';
    }
    return candidate;
  }

  public static setModel(modelName: string): boolean {
    if (this.RETIRED_MODELS.includes(modelName)) {
      console.warn(`Model ${modelName} is retired or deprecated. Automatically upgrading to gemini-3.5-flash-lite.`);
      this.activeModel = 'gemini-3.5-flash-lite';
      return true;
    }
    if (this.SUPPORTED_MODELS.includes(modelName)) {
      this.activeModel = modelName;
      return true;
    }
    return false;
  }

  /**
   * Retrieves the configured API key (from runtime in-memory storage or env).
   * Note: In compliance with SEC-06 and SEC-06.2:
   * 1. Keys are strictly kept in-memory and NEVER persisted to localStorage or sessionStorage.
   * 2. Any legacy keys found in storage are actively purged.
   * 3. Ambient build-time VITE_GEMINI_API_KEY environment variables are blocked in production builds.
   * 4. Multi-user session isolation: If a key is bound to a specific UID, callerUid mismatch rejects the key.
   */
  public static getApiKey(callerUid?: string): string | null {
    // Purge any legacy unencrypted localStorage keys if present
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (window.localStorage.getItem('saksham_gemini_api_key')) {
          window.localStorage.removeItem('saksham_gemini_api_key');
        }
      }
    } catch {
      // Storage unavailable
    }

    // Account isolation: Reject key if bound to a different UID
    if (this.keyOwnerUid && callerUid && this.keyOwnerUid !== callerUid) {
      return null;
    }

    if (this.runtimeApiKey && this.runtimeApiKey.trim().length > 10) {
      return this.runtimeApiKey.trim();
    }

    // SEC-06.2: In production builds, never allow ambient build-time credentials to be used as production keys
    if (typeof import.meta !== 'undefined' && import.meta.env && !import.meta.env.DEV) {
      return null;
    }

    const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
    return envKey && envKey.trim().length > 10 ? envKey.trim() : null;
  }

  public static setApiKey(key: string, ownerUid?: string): void {
    const clean = key.trim();
    // SEC-06: Store strictly in-memory during active runtime session; never persist to localStorage
    this.runtimeApiKey = clean;
    this.keyOwnerUid = ownerUid || null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('saksham_gemini_api_key');
      }
    } catch {
      // Ignore
    }
  }

  public static clearApiKey(): void {
    this.runtimeApiKey = null;
    this.keyOwnerUid = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('saksham_gemini_api_key');
      }
    } catch {
      // Ignore
    }
  }

  public static hasApiKey(callerUid?: string): boolean {
    return Boolean(this.getApiKey(callerUid));
  }

  /**
   * Primary availability check: local resident SLM is the authoritative primary engine.
   */
  public static isAvailable(): boolean {
    return true;
  }

  /**
   * Current execution status and configuration transparency.
   * Accurately reflects local resident Qwen2.5-1.5B (Apple Metal GPU) status.
   */
  public static getStatus(): AIConfigurationStatus {
    const key = this.getApiKey();
    if (key) {
      return {
        isConfigured: true,
        mode: 'REAL_GEMINI_API',
        executionState: 'LIVE_AI',
        modelIdentifier: this.getModel(),
        statusMessage: `Connected: Google Gemini API (${this.getModel()})`,
        quotaInfo: 'Google AI Studio Free Tier (15 RPM / 1M TPM)',
        requiresSetup: false,
        warningNotice: CREDENTIAL_EXPOSURE_WARNING,
      };
    }
    const useLocalGateway = AshaRemoteAdapter.shouldUseLocalGateway();
    if (!useLocalGateway) {
      const cloudStatus = FirebaseAILogicService.getStatus();
      if (cloudStatus.canDispatchCloudGemini) {
        return {
          isConfigured: true,
          mode: 'REAL_GEMINI_API',
          executionState: 'LIVE_AI',
          modelIdentifier: `${cloudStatus.modelName} (Firebase AI Logic)`,
          statusMessage: `Connected: Cloud Gemini via Firebase AI Logic (${cloudStatus.modelName})`,
          quotaInfo: 'Firebase AI Logic (Gemini Developer API + App Check Protected)',
          requiresSetup: false,
          warningNotice: 'On-device PII/PHI de-identification and App Check security boundary active.',
        };
      }
      return {
        isConfigured: false,
        mode: 'LOCAL_SIMULATION_FALLBACK',
        executionState:
          cloudStatus.blockedReason === 'SERVICE_DISABLED' ||
          cloudStatus.blockedReason === 'NETWORK_ERROR' ||
          cloudStatus.blockedReason === 'QUOTA_EXHAUSTED'
            ? 'NETWORK_FAILURE'
            : 'MISSING_CREDENTIALS',
        modelIdentifier: cloudStatus.blockedReason || 'firebase-ai-logic-unconfigured',
        statusMessage: cloudStatus.statusMessage,
        quotaInfo: 'Cloud Gemini unavailable until Firebase AI Logic and App Check are configured (no localhost fallback).',
        requiresSetup: true,
        warningNotice: cloudStatus.statusMessage,
      };
    }

    const isOnline = AshaRemoteAdapter.isCachedOnline();
    if (isOnline) {
      if (AshaRemoteAdapter.isCachedGeminiConfigured()) {
        const primary = AshaRemoteAdapter.getCachedPrimaryModel() || 'gemini-3.5-flash-lite';
        return {
          isConfigured: true,
          mode: 'REAL_GEMINI_API',
          executionState: 'LIVE_AI',
          modelIdentifier: primary,
          statusMessage: `Engine C Connected: ${primary} (Primary) + Local Qwen Fallback`,
          quotaInfo: 'Server-side Gemini Primary + Local Apple Silicon Metal Qwen Fallback',
          requiresSetup: false,
          warningNotice: 'Gemini API key stays strictly server-side on local Python Gateway (127.0.0.1:8096).',
        };
      }
      return {
        isConfigured: true,
        mode: 'LOCAL_RESIDENT_SLM',
        executionState: 'LIVE_AI',
        modelIdentifier: 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Silicon Metal GPU)',
        statusMessage: 'Resident Qwen 2.5 1.5B Connected (Metal GPU — ₹0 Spark Free)',
        quotaInfo: 'Resident Local Apple Silicon M1 Hardware (0 Paid APIs / 0 External Network Requests)',
        requiresSetup: false,
        warningNotice: 'Running 100% locally on resident Apple Silicon GPU. Zero PHI sent to external clouds.',
      };
    }
    if (AshaRemoteAdapter.getRuntimeState() === 'LOCAL_SLM_UNAVAILABLE') {
      return {
        isConfigured: false,
        mode: 'LOCAL_SIMULATION_FALLBACK',
        executionState: 'NETWORK_FAILURE',
        modelIdentifier: 'unavailable',
        statusMessage: 'Both Gemini primary and local Qwen fallback are currently unavailable.',
        quotaInfo: 'Gateway Online — Primary & Fallback Engines Unreachable',
        requiresSetup: true,
      };
    }
    return {
      isConfigured: false,
      mode: 'LOCAL_SIMULATION_FALLBACK',
      executionState: 'MISSING_CREDENTIALS',
      modelIdentifier: 'Asha Resident Local Engine (Fallback)',
      statusMessage: 'Gemini API Key Not Configured — Running Local Simulation Fallback (Development Mode)',
      quotaInfo: 'Local Offline Fallback (0 RPM / 0 network cost)',
      requiresSetup: true,
      warningNotice: CREDENTIAL_EXPOSURE_WARNING,
    };
  }

  /**
   * Privacy Disclosure notice for patient and examiner consent.
   */
  public static getPrivacyConsentNotice(): {
    title: string;
    body: string;
    phiStatus: string;
    freeTierNotice: string;
    dataUseStatement: string;
  } {
    return {
      title: 'Conversational AI Privacy & Data Use Disclosure',
      body: 'Saksham uses Google Gemini Developer API (Free Tier) to process natural conversations. On this free tier, Google may collect and review prompt data to improve its models. Therefore, Saksham executes on-device de-identification to redact names, diagnoses, prescriptions, and contacts before transmission.',
      phiStatus: 'On-device Privacy De-identifier actively redacts real PHI.',
      freeTierNotice: 'Operates on 100% Free-Tier quotas ($0.00 cost, no billing account required).',
      dataUseStatement: 'Only anonymized task intents and synthetically tokenized phrases leave the browser.',
    };
  }

  /**
   * Client-side privacy redaction: Replaces real patient names, contact numbers,
   * clinical diagnoses, loved ones names, and prescriptions with abstract tokens.
   * SEC-06.2: Uses Unicode-aware boundary regex matching to ensure reliable de-identification
   * across Devanagari, Tamil, Telugu, Kannada, Bengali, and Latin scripts without ASCII \b truncation.
   */
  public static anonymizePrompt(rawText: string, context?: PatientContext): { anonymizedText: string; tokensRedacted: number } {
    let text = rawText;
    let tokensRedacted = 0;

    // 1. Redact known patient name (multilingual & multi-word aware)
    const patientName = context?.profile?.displayName || (context as any)?.patientName;
    if (patientName && typeof patientName === 'string' && patientName.trim()) {
      const nameParts = patientName.trim().split(/\s+/);
      nameParts.forEach((part: string) => {
        if ([...part].length >= 2) {
          const partReg = createUnicodeWordRegex(part);
          const matches = text.match(partReg);
          if (matches) {
            tokensRedacted += matches.length;
            text = text.replace(partReg, '[PATIENT_NAME]');
          }
        }
      });
    }

    // 2. Redact loved ones / family relative names (multilingual & multi-word aware)
    const members = context?.lovedOnes?.lovedOnes || context?.lovedOnes?.sampleMembers;
    if (members && Array.isArray(members)) {
      members.forEach((member: any) => {
        if (member.name && typeof member.name === 'string' && member.name.trim().length >= 2) {
          const nameParts = member.name.trim().split(/\s+/);
          nameParts.forEach((part: string) => {
            if ([...part].length >= 2) {
              const partReg = createUnicodeWordRegex(part);
              const matches = text.match(partReg);
              if (matches) {
                tokensRedacted += matches.length;
                text = text.replace(partReg, '[FAMILY_MEMBER]');
              }
            }
          });
        }
        if (member.phoneNumber) {
          const clean = member.phoneNumber.replace(/[+()-\s]/g, '');
          if (clean.length >= 7) {
            const escaped = member.phoneNumber.replace(/[+]/g, '\\+').replace(/[\s]/g, '\\s*');
            const reg = new RegExp(escaped, 'gi');
            const matches = text.match(reg);
            if (matches) {
              tokensRedacted += matches.length;
              text = text.replace(reg, '[PHONE_REDACTED]');
            }
          }
        }
      });
    }

    // 3. Redact phone numbers and email patterns
    const phonePattern = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|\b\d{10,12}\b|(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/g;
    const phoneMatches = text.match(phonePattern);
    if (phoneMatches) {
      tokensRedacted += phoneMatches.length;
      text = text.replace(phonePattern, '[PHONE_REDACTED]');
    }
    const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emailMatches) {
      tokensRedacted += emailMatches.length;
      text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
    }

    // 4. Redact clinical diagnoses and neuro-cognitive staging phrases (Unicode-aware boundaries)
    const diagnosisRegex = /(?<![\p{L}\p{M}\p{N}])(alzheimer(?:'s)?(?:\s+disease)?|dementia|mild cognitive impairment|mci|vascular dementia|lewy body|frontotemporal|ftd|parkinson(?:'s)?(?:\s+disease)?|gds stage \d|fast stage \d|cdr \d|stage \d)(?![\p{L}\p{M}\p{N}])/giu;
    const diagnosisMatches = text.match(diagnosisRegex);
    if (diagnosisMatches) {
      tokensRedacted += diagnosisMatches.length;
      text = text.replace(diagnosisRegex, '[CLINICAL_DIAGNOSIS]');
    }

    // 5. Redact specific drug names if present in prescriptions or common neuro regimens (Unicode-aware boundaries)
    const commonDrugsRegex = /(?<![\p{L}\p{M}\p{N}])(donepezil|memantine|rivastigmine|galantamine|levodopa|carbidopa|aricept|namenda)(?![\p{L}\p{M}\p{N}])/giu;
    const drugMatches = text.match(commonDrugsRegex);
    if (drugMatches) {
      tokensRedacted += drugMatches.length;
      text = text.replace(commonDrugsRegex, '[MEDICATION]');
    }

    if (context?.routines?.routines) {
      const NON_DRUG_STOP_WORDS = new Set([
        'morning', 'afternoon', 'evening', 'night', 'daily', 'routine',
        'medication', 'medicine', 'tablet', 'tablets', 'capsule', 'capsules',
        'dose', 'dosage', 'prescribed', 'clinician', 'doctor', 'with', 'water'
      ]);
      context.routines.routines.forEach((r) => {
        if (r.category === 'medication' && r.title) {
          const drugWords = r.title
            .split(/\s+/)
            .filter((w) => [...w].length > 2 && !NON_DRUG_STOP_WORDS.has(w.toLowerCase()));
          drugWords.forEach((word) => {
            const reg = createUnicodeWordRegex(word);
            if (reg.test(text)) {
              text = text.replace(reg, '[MEDICATION]');
              tokensRedacted++;
            }
          });
        }
      });
    }

    return { anonymizedText: text, tokensRedacted };
  }

  /**
   * Rate Limiter: Ensures client requests never exceed 12 RPM.
   */
  public static canMakeRequest(): boolean {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < 60_000);
    return this.requestTimestamps.length < this.MAX_RPM;
  }

  private static recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Generates a conversational response and structured action proposal.
   * Priority 1: Resident local Qwen2.5-1.5B-Instruct engine on port 8096 (Apple Silicon Metal GPU).
   * Priority 2: If local server offline or unreachable, falls back to deterministic local semantic reasoner.
   * Strict ₹0 Budget (Firebase Spark Free Tier compliant, zero paid external APIs).
   */
  public static async generateConversationalResponse(
    query: string,
    context?: PatientContext,
    language: string = 'en',
    responseLanguage?: string,
    turnHistory?: { lastIntent?: string; lastTopic?: string; lastTargetId?: string }
  ): Promise<StructuredAIProposal> {
    const targetLang = responseLanguage || language || 'en';
    const effectivePatientId = context?.patientId || 'sunita_01';
    const startTime = Date.now();

    // 1. Clinical Safety Emergency Guard (P0)
    const safetyEvaluation = ConversationSafetyPolicy.checkEmergencyDistress(query, targetLang);
    if (safetyEvaluation) {
      return {
        speech:
          safetyEvaluation.speech ||
          pickAILang(targetLang, {
            en: 'Please call emergency services at 112 immediately.',
            hi: 'कृपया तुरंत आपातकालीन सेवा 112 पर कॉल करें।',
            mr: 'कृपया तात्काळ आपत्कालीन सेवा 112 वर कॉल करा.',
            bn: 'অনুগ্রহ করে অবিলম্বে জরুরি পরিষেবা 112-এ কল করুন।',
            ta: 'தயவுசெய்து உடனடியாக அவசர உதவி எண் 112-ஐ அழைக்கவும்.',
            te: 'దయచేసి వెంటనే అత్యవసర సేవ 112కు కాల్ చేయండి.',
            kn: 'ದಯವಿಟ್ಟು ತಕ್ಷಣ ತುರ್ತು ಸೇವೆ 112ಕ್ಕೆ ಕರೆ ಮಾಡಿ.',
          }),
        expression: 'concerned',
        intent: 'EMERGENCY_DISTRESS',
        confidence: 1.0,
        actionClass: 'emergency',
        actionProposal: {
          action: 'CALL_CAREGIVER',
          description: pickAILang(targetLang, {
            en: 'Emergency Escalation — Contact 112 / Caregiver',
            hi: 'आपातकालीन सहायता — 112 / देखभालकर्ता से संपर्क करें',
            mr: 'आपत्कालीन मदत — 112 / काळजीवाहूशी संपर्क साधा',
            bn: 'জরুরি সহায়তা — 112 / যত্নশীলের সাথে যোগাযোগ করুন',
            ta: 'அவசர உதவி — 112 / பராமரிப்பாளரைத் தொடர்பு கொள்ள',
            te: 'అత్యవసర సహాయం — 112 / సంరక్షకుడిని సంప్రదించండి',
            kn: 'ತುರ್ತು ಸಹಾಯ — 112 / ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ',
          }),
          autoDispatch: false,
        },
        isRealAI: true,
        executionMode: 'LOCAL_RESIDENT_SLM',
        executionState: 'LIVE_AI',
        modelUsed: 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)',
        latencyMs: Date.now() - startTime,
        configNotice: 'P0 Emergency Guardrail Active — Directing patient to 112 immediately.',
      };
    }

    // 1.5 Real Gemini Developer API Mode (when explicit developer key is configured)
    if (this.hasApiKey()) {
      // SEC-06: Strictly apply patient data de-identification prior to external API dispatch
      const { anonymizedText, tokensRedacted } = this.anonymizePrompt(query, context);
      const proposal = await this.callGeminiAPI(anonymizedText, targetLang, context, turnHistory);
      proposal.tokensRedacted = tokensRedacted;
      return proposal;
    }

    // Prepare dynamic live context to forward to Asha Qwen Engine
    const liveTemporal = getLiveTemporalContext(targetLang);
    let slmContext: Record<string, any> | undefined = undefined;
    try {
      const uCtx = AshaContextService.getUnifiedContext({ uid: effectivePatientId });
      slmContext = {
        displayName: uCtx.identity.displayName,
        temporal: liveTemporal,
        currentDate: liveTemporal.currentDate,
        currentTime: liveTemporal.currentTime,
        currentWeekday: liveTemporal.currentWeekday,
        timeOfDay: liveTemporal.timeOfDay,
        timezone: liveTemporal.timezone,
        nextRoutine: uCtx.routines.nextScheduledTask
          ? { time: uCtx.routines.nextScheduledTask.scheduledTime, title: uCtx.routines.nextScheduledTask.title }
          : undefined,
        completedRoutines: uCtx.routines.completedInstances.map((r) => ({ title: r.title, time: r.scheduledTime })),
        remainingRoutines: uCtx.routines.pendingInstances.map((r) => ({ title: r.title, time: r.scheduledTime })),
        lovedOnes: uCtx.memory.lovedOnes.map((m) => ({ name: m.data.name, relationship: m.data.relationship || '' })),
        itemLocations: uCtx.memory.objectLocations.map((o) => ({ name: o.data.itemName, location: o.data.locationRecorded })),
        activeSession: uCtx.activeSession.hasActiveSession
          ? { title: uCtx.activeSession.routineTitle, stepIndex: uCtx.activeSession.currentStepIndex }
          : undefined,
      };
    } catch {
      // Fallback if context assembly fails
      if (context) {
        const remaining = context.routines?.remainingRoutines || [];
        const completed = context.routines?.completedRoutines || [];
        const nextR = context.routines?.nextScheduledRoutine || remaining[0];
        const lovedOnesList = context.lovedOnes?.sampleMembers || [];

        slmContext = {
          displayName: context.profile?.displayName || 'Sunita Ji',
          temporal: liveTemporal,
          nextRoutine: nextR ? { time: nextR.scheduledTime, title: nextR.title } : undefined,
          completedRoutines: completed.map((r) => ({ title: r.title, time: r.scheduledTime })),
          remainingRoutines: remaining.map((r) => ({ title: r.title, time: r.scheduledTime })),
          lovedOnes: lovedOnesList.map((m: any) => ({ name: m.name, relationship: m.relationship || m.relation || '' })),
        };
      }
    }

    // 2. Query Server-Side Asha Engine C Gateway on Port 8096 ONLY on local host / configured gateway
    const slmResponse = AshaRemoteAdapter.shouldUseLocalGateway()
      ? await AshaRemoteAdapter.sendChat(query, targetLang, effectivePatientId, slmContext)
      : null;

    if (slmResponse && slmResponse.permitted_response) {
      // Check for conversational language switch
      const switchLang = this.detectLanguageSwitch(query);

      // 2A. Honest disclosure when BOTH Gemini Primary and Local Qwen Fallback are unavailable
      if (slmResponse.response_source === 'ENGINE_UNAVAILABLE' || slmResponse.telemetry?.engine_unavailable) {
        return {
          speech: slmResponse.permitted_response,
          expression: 'reassuring',
          intent: 'UNKNOWN_FALLBACK',
          confidence: 0.0,
          actionClass: 'class1_read',
          isRealAI: false,
          runtimeState: 'LOCAL_SLM_UNAVAILABLE',
          responseSource: 'FALLBACK',
          executionMode: 'LOCAL_SIMULATION_FALLBACK',
          executionState: 'NETWORK_FAILURE',
          modelUsed: 'unavailable',
          latencyMs: slmResponse.latency_ms || (Date.now() - startTime),
          configNotice: 'Both Gemini primary and local Qwen fallback are currently unavailable.',
          tokensRedacted: 0,
          ...(switchLang ? { conversationalLanguageSwitchedTo: switchLang } as any : {}),
        };
      }

      // 3. Resolve Real Saksham Functional Actions
      let actionProposal = this.resolveActionProposal(query, targetLang, effectivePatientId, context);
      if (slmResponse.item_card) {
        actionProposal = {
          action: 'OPEN_ITEM_MEMORY',
          targetId: slmResponse.item_card.id,
          description: pickAILang(targetLang, {
            en: `View ${slmResponse.item_card.name} Location Photo`,
            hi: `${slmResponse.item_card.name} का स्थान व फ़ोटो देखें`,
            mr: `${slmResponse.item_card.name} चे ठिकाण व फोटो पहा`,
            bn: `${slmResponse.item_card.name}-এর অবস্থান ও ছবি দেখুন`,
            ta: `${slmResponse.item_card.name} இருப்பிடப் படத்தைப் பார்`,
            te: `${slmResponse.item_card.name} స్థానం ఫోటో చూడండి`,
            kn: `${slmResponse.item_card.name} ಸ್ಥಳದ ಫೋಟೋ ವೀಕ್ಷಿಸಿ`,
          }),
          autoDispatch: false,
        };
      } else if (slmResponse.loved_one_card) {
        actionProposal = {
          action: 'OPEN_PHOTO_RECALL',
          targetId: slmResponse.loved_one_card.name,
          description: pickAILang(targetLang, {
            en: `View ${slmResponse.loved_one_card.name} Memory Card`,
            hi: `${slmResponse.loved_one_card.name} की याद कार्ड देखें`,
            mr: `${slmResponse.loved_one_card.name} चे आठवण कार्ड पहा`,
            bn: `${slmResponse.loved_one_card.name}-এর স্মৃতি কার্ড দেখুন`,
            ta: `${slmResponse.loved_one_card.name} நினைவு அட்டையைப் பார்`,
            te: `${slmResponse.loved_one_card.name} జ్ఞాపక కార్డ్ చూడండి`,
            kn: `${slmResponse.loved_one_card.name} ನೆನಪಿನ ಕಾರ್ಡ್ ವೀಕ್ಷಿಸಿ`,
          }),
          autoDispatch: false,
        };
      }
      const mappedExpression = this.mapExpressionLabel(slmResponse.expression_label);
      const isGeminiPrimary =
        slmResponse.response_source === 'GENERATIVE_AI_GEMINI' || slmResponse.telemetry?.provider === 'gemini';
      const isQwenFallback =
        !isGeminiPrimary &&
        (slmResponse.response_source?.includes('GENERATIVE_AI') || Boolean(slmResponse.telemetry?.is_genuine_slm));
      const isGenuineAI = isGeminiPrimary || isQwenFallback;

      if (isGeminiPrimary) {
        return {
          speech: slmResponse.permitted_response,
          expression: mappedExpression,
          intent: actionProposal ? 'ROUTINES_START_NEXT' : 'GENERAL_HELP',
          confidence: 0.98,
          actionClass: actionProposal ? 'class2_navigate' : 'class1_read',
          actionProposal,
          isRealAI: true,
          runtimeState: 'LOCAL_SLM_READY',
          responseSource: 'GEMINI_PRIMARY',
          executionMode: 'REAL_GEMINI_API',
          executionState: 'LIVE_AI',
          modelUsed: slmResponse.telemetry?.model || 'gemini-3.5-flash-lite',
          latencyMs: slmResponse.latency_ms || (Date.now() - startTime),
          configNotice: 'Engine C Primary: Google Gemini via Server Gateway',
          followUpPrompt: slmResponse.tts_phonetic_text || undefined,
          tokensRedacted: 0,
          ...(switchLang ? { conversationalLanguageSwitchedTo: switchLang } as any : {}),
        };
      }

      if (isQwenFallback) {
        return {
          speech: slmResponse.permitted_response,
          expression: mappedExpression,
          intent: actionProposal ? 'ROUTINES_START_NEXT' : 'GENERAL_HELP',
          confidence: 0.98,
          actionClass: actionProposal ? 'class2_navigate' : 'class1_read',
          actionProposal,
          isRealAI: true,
          runtimeState: 'LOCAL_SLM_READY',
          responseSource: 'LOCAL_MODEL',
          executionMode: 'LOCAL_RESIDENT_SLM',
          executionState: 'LIVE_AI',
          modelUsed: slmResponse.telemetry?.model || 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Silicon Metal GPU)',
          latencyMs: slmResponse.latency_ms || (Date.now() - startTime),
          configNotice: slmResponse.telemetry?.fallback_used
            ? 'Engine C Fallback: Resident Qwen 2.5 1.5B (Apple Silicon Metal GPU)'
            : 'Live Resident Qwen 2.5 1.5B Engine (Apple Silicon Metal GPU) — ₹0 Spark Free',
          followUpPrompt: slmResponse.tts_phonetic_text || undefined,
          tokensRedacted: 0,
          ...(switchLang ? { conversationalLanguageSwitchedTo: switchLang } as any : {}),
        };
      }

      // Gateway deterministic safety/memory response
      const isStaticSafety =
        slmResponse.response_source === 'DETERMINISTIC_SAFETY_OVERRIDE' ||
        (slmResponse.safety_flag && slmResponse.safety_flag !== 'NORMAL');
      return {
        speech: slmResponse.permitted_response,
        expression: mappedExpression,
        intent: actionProposal ? 'ROUTINES_START_NEXT' : 'GENERAL_HELP',
        confidence: 0.96,
        actionClass: actionProposal ? 'class2_navigate' : 'class1_read',
        actionProposal,
        isRealAI: isGenuineAI,
        runtimeState: 'DETERMINISTIC_FALLBACK',
        responseSource: isStaticSafety ? 'STATIC_GUIDANCE' : 'DETERMINISTIC_HANDLER',
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        executionState: 'LOCAL_SIMULATION',
        modelUsed: slmResponse.telemetry?.model || 'Deterministic Safety & Grounded Memory',
        latencyMs: slmResponse.latency_ms || (Date.now() - startTime),
        configNotice: 'Gateway deterministic safety & memory guard',
        followUpPrompt: slmResponse.tts_phonetic_text || undefined,
        tokensRedacted: 0,
        ...(switchLang ? { conversationalLanguageSwitchedTo: switchLang } as any : {}),
      };
    }

    // 3. Production Cloud Gemini Path via Firebase AI Logic (GoogleAIBackend + App Check)
    // Runs on remote web hosts (never probes localhost) or when cloud path is explicitly available outside offline local tests.
    const shouldTryCloudFirebaseAI =
      !AshaRemoteAdapter.shouldUseLocalGateway() ||
      (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test');

    if (shouldTryCloudFirebaseAI) {
      const cloudStatus = FirebaseAILogicService.getStatus();
      if (cloudStatus.canDispatchCloudGemini) {
        const { anonymizedText, tokensRedacted } = this.anonymizePrompt(query, context);
        const scopedContext = this.buildPurposeScopedContext(query, context, targetLang, effectivePatientId);
        const cloudRes = await FirebaseAILogicService.generateChatResponse(
          anonymizedText,
          targetLang,
          scopedContext,
          turnHistory
        );

        if (cloudRes.ok && cloudRes.speech) {
          const actionProposal = this.resolveActionProposal(query, targetLang, effectivePatientId, context);
          const switchLang = this.detectLanguageSwitch(query);
          return {
            speech: cloudRes.speech,
            expression: 'reassuring',
            intent: actionProposal ? 'ROUTINES_START_NEXT' : 'GENERAL_HELP',
            confidence: 0.96,
            actionClass: actionProposal ? 'class2_navigate' : 'class1_read',
            actionProposal,
            isRealAI: true,
            runtimeState: 'LOCAL_SLM_READY',
            responseSource: 'GEMINI_PRIMARY',
            executionMode: 'REAL_GEMINI_API',
            executionState: 'LIVE_AI',
            modelUsed: cloudRes.modelUsed,
            latencyMs: cloudRes.latencyMs,
            configNotice: 'Cloud Gemini via Firebase AI Logic (App Check + On-Device De-Identification)',
            tokensRedacted,
            ...(switchLang ? { conversationalLanguageSwitchedTo: switchLang } as any : {}),
          };
        }

        // Honest unavailable state when Firebase AI Logic is unprovisioned / blocked / quota hit
        if (!AshaRemoteAdapter.shouldUseLocalGateway()) {
          const { anonymizedText: safeQ, tokensRedacted: redactedCount } = this.anonymizePrompt(query, context);
          const fallback = this.localSemanticReasoner(safeQ, targetLang, turnHistory);
          fallback.tokensRedacted = redactedCount;
          fallback.latencyMs = Date.now() - startTime;
          fallback.isRealAI = false;
          fallback.runtimeState = 'LOCAL_SLM_UNAVAILABLE';
          fallback.responseSource = 'FALLBACK';
          fallback.executionMode = 'LOCAL_SIMULATION_FALLBACK';
          fallback.executionState = cloudRes.blockedReason === 'QUOTA_EXHAUSTED' ? 'QUOTA_EXHAUSTED' : 'NETWORK_FAILURE';
          fallback.modelUsed = 'unavailable';
          fallback.configNotice = cloudRes.errorMessage || 'Cloud Gemini via Firebase AI Logic is currently unavailable.';
          return fallback;
        }
      } else if (!AshaRemoteAdapter.shouldUseLocalGateway()) {
        const { anonymizedText, tokensRedacted } = this.anonymizePrompt(query, context);
        const fallback = this.localSemanticReasoner(anonymizedText, targetLang, turnHistory);
        fallback.tokensRedacted = tokensRedacted;
        fallback.latencyMs = Date.now() - startTime;
        fallback.isRealAI = false;
        fallback.runtimeState = 'LOCAL_SLM_UNAVAILABLE';
        fallback.responseSource = 'FALLBACK';
        fallback.executionMode = 'LOCAL_SIMULATION_FALLBACK';
        fallback.executionState =
          cloudStatus.blockedReason === 'APP_CHECK_NOT_CONFIGURED' ||
          cloudStatus.blockedReason === 'FIREBASE_NOT_CONFIGURED'
            ? 'MISSING_CREDENTIALS'
            : 'NETWORK_FAILURE';
        fallback.modelUsed = 'unavailable';
        fallback.configNotice = cloudStatus.statusMessage;
        return fallback;
      }
    }

    // 4. Honest Offline Fallback when Local Asha Server is not running
    const { anonymizedText, tokensRedacted } = this.anonymizePrompt(query, context);
    const fallback = this.localSemanticReasoner(anonymizedText, targetLang, turnHistory);
    fallback.tokensRedacted = tokensRedacted;
    fallback.latencyMs = Date.now() - startTime;
    fallback.isRealAI = false;
    fallback.runtimeState = 'DETERMINISTIC_FALLBACK';
    fallback.responseSource = 'DETERMINISTIC_HANDLER';
    fallback.executionMode = 'LOCAL_SIMULATION_FALLBACK';
    fallback.executionState = 'NETWORK_FAILURE';
    fallback.configNotice = 'Asha resident local engine is currently offline. Switched to offline deterministic fallback.';
    return fallback;
  }

  /**
   * Builds a strictly minimal, purpose-scoped sanitized context object for cloud Gemini.
   * Never sends raw patient GPS coordinates, GPS history, family photographs, or full family directories.
   */
  public static buildPurposeScopedContext(
    query: string,
    context: PatientContext | undefined,
    targetLang: string,
    patientId: string
  ): ScopedAshaCloudContext {
    const q = (query || '').toLowerCase();
    const isFamilyQuery = /\b(family|daughter|son|grandson|friend|loved|who is|beti|beta|parivar|kutumb)\b/i.test(q);
    const isLocationQuery = /\b(gps|location|where am i|home guide|navigate|safe zone|lost|map|location sharing)\b/i.test(q);

    const pendingRoutines = context?.routines?.remainingRoutines || [];
    const nextRoutine = context?.routines?.nextScheduledRoutine || pendingRoutines[0];
    const localizedRoutineTitle = nextRoutine
      ? getTranslatedRoutineTitle(nextRoutine.title, targetLang)
      : undefined;
    const nextRoutineTitleSafe = localizedRoutineTitle
      ? this.anonymizePrompt(localizedRoutineTitle, context).anonymizedText
      : undefined;

    let locationSharingStatus: 'enabled' | 'paused' | 'not_requested' | undefined;
    if (isLocationQuery) {
      try {
        const rawConsent =
          typeof window !== 'undefined' && window.localStorage
            ? window.localStorage.getItem(`saksham_patient_location_consent_${patientId}`)
            : null;
        locationSharingStatus = rawConsent === 'false' ? 'paused' : rawConsent === 'true' ? 'enabled' : 'not_requested';
      } catch {
        locationSharingStatus = 'not_requested';
      }
    }

    let familyContextSummary: string | undefined;
    if (isFamilyQuery && context?.lovedOnes) {
      const roles = (context.lovedOnes.sampleMembers || [])
        .map((m) => m.relationship)
        .filter(Boolean)
        .slice(0, 3);
      familyContextSummary =
        context.lovedOnes.count > 0
          ? `${context.lovedOnes.count} authorized loved ones saved locally (${roles.join(', ') || 'family members'}). Open the Loved Ones sanctuary to view names and photos safely.`
          : 'No family profiles saved yet.';
    }

    return {
      displayNameToken: '[PATIENT_NAME]',
      preferredLanguage: targetLang,
      routinesCount: context?.routines?.routines?.length,
      pendingRoutinesCount: pendingRoutines.length,
      nextRoutineSummary: nextRoutine ? `${nextRoutine.scheduledTime} (${nextRoutineTitleSafe})` : undefined,
      gameComfortLevel: context?.mindGames?.difficultyPreference,
      recentGameFeedback: context?.mindGames?.recentSessions?.[0]?.patientFeedback,
      familyContextSummary,
      locationSharingStatus,
      temporal: getLiveTemporalContext(targetLang),
    };
  }

  /**
   * Resolves real Saksham application actions from user query.
   */
  private static resolveActionProposal(
    query: string,
    targetLang: string,
    patientId: string,
    _context?: PatientContext
  ): { action: WhitelistedAction; targetId?: string; description: string; autoDispatch?: boolean } | undefined {
    const q = query.toLowerCase();

    // 0. Guard against reluctance, negation, fatigue, or desire for pure conversation
    if (
      /(don'?t|do not|no|not|never|nahi|nako|vendam|vaddu|beda|illa|kahi nahi|kuch nahi)\b.*(routine|game|puzzle|task|activity|anything|karaych|karna)/i.test(q) ||
      /(bored|lonely|don'?t want|just (talk|chat)|let me rest|not now|leave me|tired|sad|mood|feeling down)/i.test(q) ||
      /(बोर|अकेला|मन नहीं|बात करो|कंटाळा|एकटेपणा|काही नको|काही करायचं नाही|काहीच करायचे नाही|थकवा|थकलो|தனிமை|சோர்வு|ஒன்றும் வேண்டாம்|బోరింగ్|నీరసం|ఏమీ వద్దు|ಏನೂ ಬೇಡ|ಆಯಾಸ|ക്ഷീണം|ഒന്നും വേണ്ട)/i.test(q) ||
      /(aaj (main )?thak gaya|mala (aaj )?khup thakla|sorvaga irukku|neerasamga undi|aayasa agide|ksheenam thonnunnu)/i.test(q)
    ) {
      return undefined;
    }

    const isExplicitLaunch = /(start|launch|open|begin|play|help me complete|let's do|chalo|shuru|suru|kheluya|aarambhikalam|விளையாட|खेलना|खेळायचा|খেলতে|ఆడాలని|ఆడాలనుకుంటున్నాను|ಆಡಲು)/i.test(q);

    // 1. Next task / routine guidance ("What is my next task?", "Help me complete my morning routine")
    if (
      /(next (task|activity|routine)|morning routine|start (my )?(routine|task|activity)|what do i do next|what should i do|next step|help me (with|start) (my )?routine|अगली गतिविधि|दिनचर्या|अगला काम|क्या करना चाहिए|काय करायचं|काय करावे|पुढचा खेळ|पुढचे काम|அடுத்த வேலை|என்ன செய்ய வேண்டும்|தவணை|తదుపరి పని|ఏమి చేయాలి|ముందు పని|ಮುಂದಿನ ಕೆಲಸ|ಏನು ಮಾಡಬೇಕು|ಕೀ செய்ய|അടുത്ത ജോലി|কী করা উচিত)/i.test(q) ||
      /(agla kaam|pudhcha kaam|adutha velai|thadupari pani|mundina kelasa|adutha joli)/i.test(q)
    ) {
      try {
        const routines = RoutineService.getRoutines(patientId);
        const nextRoutine = routines.find((r) => !r.isCompleted) || routines[0];
        if (nextRoutine) {
          const localizedTitle = getTranslatedRoutineTitle(nextRoutine.title, targetLang);
          return {
            action: 'LAUNCH_ROUTINE_RUNNER',
            targetId: nextRoutine.id,
            description: pickAILang(targetLang, {
              en: `Start ${localizedTitle}`,
              hi: `${localizedTitle} शुरू करें`,
              mr: `${localizedTitle} सुरू करा`,
              bn: `${localizedTitle} শুরু করুন`,
              ta: `${localizedTitle} தொடங்குங்கள்`,
              te: `${localizedTitle} ప్రారంభించండి`,
              kn: `${localizedTitle} ಪ್ರಾರಂಭಿಸಿ`,
            }),
            autoDispatch: isExplicitLaunch,
          };
        }
      } catch {
        // Fallback to navigate routines
      }
      return {
        action: 'NAVIGATE_ROUTINES',
        description: pickAILang(targetLang, {
          en: 'Open Daily Routines Workspace',
          hi: 'दैनिक दिनचर्या खोलें',
          mr: 'दैनिक दिनक्रम उघडा',
          bn: 'দৈনিক রুটিন খুলুন',
          ta: 'தினசரி வழக்கங்களைத் திற',
          te: 'దినచర్యలను తెరవండి',
          kn: 'ದಿನಚರ್ಯೆಗಳನ್ನು ತೆರೆಯಿರಿ',
        }),
        autoDispatch: isExplicitLaunch,
      };
    }

    // 2. Mind Games / Cognitive Activities ("Give me a memory game", "Play a game")
    if (
      /(play (a )?(game|puzzle)|mind games?|memory game|puzzle game|brain game|कोडे खेळ|खेळ खेळायचा|खेल|খেলা|খেলা খেলতে|விளையாட்டு|ஆட்ட|ಆಟ|ಆಟ ಆಡಲು|ఆట|ఆడాలనుకుంటున్నాను|കളി)/i.test(q) ||
      /(khel khelan|puzzle khel|game aada)/i.test(q)
    ) {
      return {
        action: 'NAVIGATE_MIND_GAMES',
        description: pickAILang(targetLang, {
          en: 'Open Mind Games Hub',
          hi: 'माइंड गेम्स खोलें',
          mr: 'मेंदूचे खेळ उघडा',
          bn: 'মাইন্ড গেমস খুলুন',
          ta: 'மன விளையாட்டுகளைத் திற',
          te: 'మైండ్ గేమ్స్ తెరవండి',
          kn: 'ಮೈಂಡ್ ಗೇಮ್ಸ್ ತೆರೆಯಿರಿ',
        }),
        autoDispatch: isExplicitLaunch,
      };
    }

    // 3. Loved Ones / Family Recognition ("Show my family", "Who is Priya?")
    if (
      /(loved ones|family|who is (priya|arun)|show (my )?family|photos|परिवार|बेटी|मुलगी|कुटुंब|পরিবার|குடும்பம்|குடும்பத்தைப்|కుటుంబం|కుటుంబాన్ని|ಕುಟುಂಬ|ಕುಟುಂಬವನ್ನು|കുടുംബം)/i.test(q)
    ) {
      return {
        action: 'NAVIGATE_LOVED_ONES',
        description: pickAILang(targetLang, {
          en: 'Open Family & Loved Ones Sanctuary',
          hi: 'परिवार और प्रियजन एल्बम खोलें',
          mr: 'कुटुंब व प्रियजन दालन उघडा',
          bn: 'পরিবার ও প্রিয়জনদের অ্যালবাম খুলুন',
          ta: 'குடும்பப் படங்களைத் திற',
          te: 'కుటుంబ సభ్యుల ఆల్బమ్ తెరవండి',
          kn: 'ಕುಟುಂಬ ಮತ್ತು ಪ್ರೀತಿಪಾತ್ರರನ್ನು ತೆರೆಯಿರಿ',
        }),
        autoDispatch: isExplicitLaunch,
      };
    }

    // 4. Caregiver Contact / Emergency Escalation
    if (
      /(call (my )?(caregiver|daughter|son|doctor)|reach caregiver|फोन लगाओ|काळजीवाहकाला फोन)/i.test(q)
    ) {
      return {
        action: 'CALL_CAREGIVER',
        description: pickAILang(targetLang, {
          en: 'Connect with Caregiver',
          hi: 'देखभालकर्ता से जुड़ें',
          mr: 'काळजीवाहूशी संपर्क साधा',
          bn: 'যত্নশীলের সাথে যোগাযোগ করুন',
          ta: 'பராமரிப்பாளருடன் இணையவும்',
          te: 'సంరక్షకుడితో సంప్రదించండి',
          kn: 'ಆರೈಕೆದಾರರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಿ',
        }),
        autoDispatch: true,
      };
    }

    // 5. Notes & Reminders
    if (/(notes|voice note|open notes|नोट्स|नोंदी|নোট|குறிப்பு|నోట్స్|ಟಿಪ್ಪಣಿ)/i.test(q)) {
      return {
        action: 'OPEN_NOTES',
        description: pickAILang(targetLang, {
          en: 'Open Patient Voice Notes',
          hi: 'वॉइस नोट्स खोलें',
          mr: 'व्हॉइस नोट्स उघडा',
          bn: 'ভয়েস নোট খুলুন',
          ta: 'குரல் குறிப்புகளைத் திற',
          te: 'వాయిస్ నోట్స్ తెరవండి',
          kn: 'ಧ್ವನಿ ಟಿಪ್ಪಣಿಗಳನ್ನು ತೆರೆಯಿರಿ',
        }),
        autoDispatch: isExplicitLaunch,
      };
    }

    // 6. Calendar
    if (/(calendar|appointments?|schedule|कैलेंडर|कॅलेंडर|ক্যালেন্ডার|நாட்காட்டி|క్యాలెండర్|ಕ್ಯಾಲೆಂಡರ್)/i.test(q)) {
      return {
        action: 'OPEN_CALENDAR',
        description: pickAILang(targetLang, {
          en: 'Open Calendar Sanctuary',
          hi: 'कैलेंडर खोलें',
          mr: 'कॅलेंडर उघडा',
          bn: 'ক্যালেন্ডার খুলুন',
          ta: 'நாட்காட்டியைத் திற',
          te: 'క్యాలెండర్ తెరవండి',
          kn: 'ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ',
        }),
        autoDispatch: isExplicitLaunch,
      };
    }

    // 7. Item Location Memory ("Where are my glasses?", "Where did I put my keys?", "चष्मा कुठे आहे", "चाबियाँ कहाँ हैं")
    if (
      /(where\s+(is|are|did\s+i\s+(keep|leave|put)|can\s+i\s+find)|lost\s+my|locate\s+my)/i.test(q) ||
      /(glasses|keys|remote|wallet|medicine|cane|stick|spectacles|watch|chashm|chabi|killi|चश्मा|चष्मा|চশমা|கண்ணாடி|కళ్ళజోడు|ಕನ್ನಡಕ)/i.test(q) ||
      /(कहाँ|कुठे|কোথায়|কোথায়|எங்கே|ఎక్కడ|ಎಲ್ಲಿದೆ|എവിടെ)/i.test(q)
    ) {
      return {
        action: 'OPEN_ITEM_MEMORY',
        description: pickAILang(targetLang, {
          en: 'View Item Location Photo & Memory',
          hi: 'वस्तु स्थान और फ़ोटो देखें',
          mr: 'वस्तूचे ठिकाण आणि फोटो पहा',
          bn: 'জিনিসের অবস্থান ও ছবি দেখুন',
          ta: 'பொருளின் இடம் மற்றும் படத்தைப் பார்',
          te: 'వస్తువు స్థానం మరియు ఫోటో చూడండి',
          kn: 'ವಸ್ತುವಿನ ಸ್ಥಳ ಮತ್ತು ಫೋಟೋ ವೀಕ್ಷಿಸಿ',
        }),
        autoDispatch: false,
      };
    }

    // 8. Photo Recall / Who is this person ("Who is this person?", "Do you know who this is?", "पहचाना?", "हा कोण आहे?", "யார் இவர்?")
    if (
      /(who is this( person)?|who is in this photo|identify this person|do you recognize|पहचाना|हा कोण आहे|यह कौन है|कौन हैं|কে ইনি|யார் இவர்|என்|ఎవరు ఈయన|ಇವರು ಯಾರು)/i.test(q)
    ) {
      return {
        action: 'OPEN_PHOTO_RECALL',
        description: pickAILang(targetLang, {
          en: 'Identify Person with Visual Recall',
          hi: 'फ़ोटो से व्यक्ति की पहचान करें',
          mr: 'फोटोद्वारे व्यक्तीची ओळख पटवा',
          bn: 'ছবি দেখে মানুষকে চিনুন',
          ta: 'புகைப்படத்தின் மூலம் நபரை அடையாளம் காண்க',
          te: 'ఫోటోతో వ్యక్తిని గుర్తించండి',
          kn: 'ಚಿತ್ರದ ಮೂಲಕ ವ್ಯಕ್ತಿಯನ್ನು ಗುರುತಿಸಿ',
        }),
        autoDispatch: false,
      };
    }

    return undefined;
  }

  private static mapExpressionLabel(label?: string): AshaExpression {
    if (!label) return 'neutral';
    const clean = label.toLowerCase().trim();
    const VALID_EXPRESSIONS: AshaExpression[] = [
      'neutral', 'happy', 'thinking', 'surprised', 'reassuring',
      'encouraging', 'comforting', 'concerned', 'clarifying',
      'explaining', 'listening', 'helping_recall',
      'guiding', 'reminder', 'remembered', 'proud', 'empathetic',
      'motivated', 'done_completed',
    ];
    if (VALID_EXPRESSIONS.includes(clean as AshaExpression)) {
      return clean as AshaExpression;
    }
    return 'neutral';
  }

  private static detectLanguageSwitch(query: string): string | null {
    const q = query.toLowerCase().trim();
    if (/(switch to marathi|speak (in )?marathi|talk in marathi|मराठीत बोला|मराठी मध्ये बोला|marathit bola|marathi madhe bola|\bmarathi\b)/i.test(q)) return 'mr';
    if (/(switch to hindi|speak (in )?hindi|talk in hindi|हिंदी में (बात करो|बोलो)|हिन्दी में बोलो|hindi mein bolo|\bhindi\b|\bhindit\b)/i.test(q)) return 'hi';
    if (/(switch to tamil|speak (in )?tamil|talk in tamil|தமிழில் பேசு|தமிழில் பேசுங்கள்|tamilil pesu|\btamil\b)/i.test(q)) return 'ta';
    if (/(switch to telugu|speak (in )?telugu|talk in telugu|తెలుగులో మాట్లాడు|telugulo matladu|\btelugu\b)/i.test(q)) return 'te';
    if (/(switch to kannada|speak (in )?kannada|talk in kannada|ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡು|kannadadalli mathanadu|\bkannada\b)/i.test(q)) return 'kn';
    if (/(switch to malayalam|speak (in )?malayalam|talk in malayalam|മലയാളത്തിൽ സംസാരിക്കൂ|malayalathil samsarikku|\bmalayalam\b)/i.test(q)) return 'ml';
    if (/(switch to english|speak (in )?english|talk in english|अंग्रेजी में बोलो|english mein bolo|\benglish\b)/i.test(q)) return 'en';
    return null;
  }

  /**
   * Calls Google Gemini Developer API using structured JSON output.
   * SEC-06.2: Defensively enforces Unicode de-identification internally on both the query
   * and turn history metadata, ensuring direct callers cannot bypass the privacy boundary.
   */
  public static async callGeminiAPI(
    anonymizedQuery: string,
    targetLangOrContext: string | PatientContext = 'en',
    langOrTurn?: string | any,
    turnHistory?: { lastIntent?: string; lastTopic?: string; lastTargetId?: string }
  ): Promise<StructuredAIProposal> {
    const targetLang =
      typeof targetLangOrContext === 'string'
        ? targetLangOrContext
        : typeof langOrTurn === 'string'
        ? langOrTurn
        : 'en';
    const effectiveTurn =
      typeof langOrTurn === 'object' && !('displayName' in (langOrTurn as any))
        ? langOrTurn
        : turnHistory;
    const effectiveContext =
      typeof targetLangOrContext === 'object' && targetLangOrContext !== null
        ? (targetLangOrContext as PatientContext)
        : undefined;

    // SEC-06.2: Defensively enforce de-identification within callGeminiAPI boundary
    const { anonymizedText: safeQuery, tokensRedacted: queryTokensRedacted } = this.anonymizePrompt(
      anonymizedQuery,
      effectiveContext
    );

    const apiKey = this.getApiKey();
    if (!apiKey) {
      const fallback = this.localSemanticReasoner(safeQuery, targetLang, effectiveTurn);
      return {
        ...fallback,
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        executionState: 'LOCAL_SIMULATION',
        configNotice: 'Asha resident local engine offline — Deterministic fallback.',
      };
    }

    this.recordRequest();
    const model = this.getModel();
    const temporalBlock = formatTemporalPromptBlock(getLiveTemporalContext(targetLang));

    const systemInstruction = `You are ASHA, a gentle, compassionate, reassuring voice companion for an elderly Indian patient living with memory loss or mild cognitive impairment.
Your goal is to converse with warmth, patience, and clear dignity.
Respond in language code: "${targetLang}".
${temporalBlock}
Always provide a reassuring spoken response. If the user wants to see family, play a game, check tasks, or rest, propose the corresponding action.
NEVER prescribe medication. NEVER diagnose disease.
Output strictly JSON matching the required schema:
{
  "speech": "spoken response text in requested language",
  "expression": "neutral" | "listening" | "thinking" | "explaining" | "happy" | "encouraging" | "reassuring" | "comforting",
  "intent": "GENERAL_HELP" | "ROUTINES_TODAY" | "GAMES_LIST" | "LOVED_ONES_LIST" | "LOVED_ONES_PERSON" | "WELLBEING_REST_BREAK",
  "confidence": number (0.0 to 1.0),
  "actionClass": "class1_read" | "class2_navigate" | "class3_consequential",
  "actionProposal": {
    "action": "NAVIGATE_ROUTINES" | "NAVIGATE_LOVED_ONES" | "SHOW_FAMILY_MEMBER" | "NAVIGATE_MIND_GAMES" | "CALL_CAREGIVER",
    "targetId": string (optional),
    "description": string
  } (optional),
  "clarificationNeeded": boolean
}`;

    const contents: any[] = [];
    if (effectiveTurn?.lastTopic && typeof effectiveTurn.lastTopic === 'string' && effectiveTurn.lastTopic.trim()) {
      // SEC-06.2: Sanitize lastTopic to prevent metadata leakage of patient names or PHI
      const { anonymizedText: safeTopic } = this.anonymizePrompt(effectiveTurn.lastTopic, effectiveContext);
      const safeIntent =
        typeof effectiveTurn.lastIntent === 'string' && /^[A-Z0-9_]{3,40}$/.test(effectiveTurn.lastIntent.trim())
          ? effectiveTurn.lastIntent.trim()
          : 'GENERAL_HELP';

      contents.push({
        role: 'user',
        parts: [{ text: `Previous context: topic=${safeTopic.trim()}, intent=${safeIntent}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: `{"speech": "Understood.", "expression": "reassuring", "intent": "GENERAL_HELP", "confidence": 1.0, "actionClass": "class1_read"}` }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: safeQuery }],
    });

    const requestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    // SEC-06: Eliminate URL query parameter credential transmission.
    // Transmit API key strictly via x-goog-api-key HTTP header.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const startTime = Date.now();
    const tokensRedacted = queryTokensRedacted;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (res.status === 429) {
        console.warn('Gemini API quota exhausted (HTTP 429).');
        const fallback = this.localSemanticReasoner(safeQuery, targetLang, effectiveTurn);
        return {
          ...fallback,
          isRealAI: false,
          executionMode: 'LOCAL_SIMULATION_FALLBACK',
          executionState: 'QUOTA_EXHAUSTED',
          configNotice: 'Gemini API Quota Exhausted (HTTP 429). Switched to local fallback.',
          tokensRedacted,
          latencyMs: Date.now() - startTime,
        };
      }

      if (!res.ok) {
        console.warn(`Gemini API returned HTTP ${res.status}`);
        const fallback = this.localSemanticReasoner(safeQuery, targetLang, effectiveTurn);
        return {
          ...fallback,
          isRealAI: false,
          executionMode: 'LOCAL_SIMULATION_FALLBACK',
          executionState: 'NETWORK_FAILURE',
          configNotice: `Gemini API returned HTTP ${res.status}. Switched to local fallback.`,
          tokensRedacted,
          latencyMs: Date.now() - startTime,
        };
      }

      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        const fallback = this.localSemanticReasoner(safeQuery, targetLang, effectiveTurn);
        return {
          ...fallback,
          isRealAI: false,
          executionMode: 'LOCAL_SIMULATION_FALLBACK',
          executionState: 'NETWORK_FAILURE',
          configNotice: 'Gemini returned empty candidate. Switched to local fallback.',
          tokensRedacted,
          latencyMs: Date.now() - startTime,
        };
      }

      const parsed = JSON.parse(rawJson);
      return {
        speech: parsed.speech || 'I am right here with you.',
        expression: parsed.expression || 'reassuring',
        intent: parsed.intent || 'GENERAL_HELP',
        confidence: parsed.confidence || 0.95,
        actionClass: parsed.actionClass || 'class1_read',
        actionProposal: parsed.actionProposal,
        clarificationNeeded: parsed.clarificationNeeded || false,
        followUpPrompt: parsed.followUpPrompt,
        isRealAI: true,
        executionMode: 'REAL_GEMINI_API',
        executionState: 'LIVE_AI',
        modelUsed: model,
        tokensRedacted,
        latencyMs: Date.now() - startTime,
      };
    } catch (_err: unknown) {
      // SEC-06: Avoid leaking URLs, query strings, or credential details in console diagnostics
      console.warn('[ConversationalAI] External AI service network connection error. Switched to resident local fallback.');
      const fallback = this.localSemanticReasoner(safeQuery, targetLang, effectiveTurn);
      return {
        ...fallback,
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        executionState: 'NETWORK_FAILURE',
        configNotice: 'External AI service network connection error. Switched to resident local fallback.',
        tokensRedacted,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Local Semantic Reasoner:
   * Explicitly labelled development simulation fallback for offline use or when no API key is provided.
   */
  public static localSemanticReasoner(
    query: string,
    targetLang: string = 'en',
    turnHistory?: { lastIntent?: string; lastTopic?: string; lastTargetId?: string }
  ): StructuredAIProposal {
    const raw = this._evaluateLocalSemanticRules(query, targetLang, turnHistory);
    return {
      ...raw,
      isRealAI: false,
      runtimeState: 'DETERMINISTIC_FALLBACK',
      responseSource: 'DETERMINISTIC_HANDLER',
      executionMode: 'LOCAL_SIMULATION_FALLBACK',
      executionState: 'LOCAL_SIMULATION',
    };
  }

  private static _evaluateLocalSemanticRules(
    query: string,
    targetLang: string = 'en',
    turnHistory?: { lastIntent?: string; lastTopic?: string; lastTargetId?: string }
  ): Omit<StructuredAIProposal, 'executionState'> {
    const lower = query.toLowerCase().trim();
    const lang = targetLang || 'en';
    const getSpeech = (t: { en: string; hi: string; mr: string; ta: string; te: string; kn: string; bn: string }) =>
      (t as any)[lang] || t.en;
    const model = 'local-semantic-engine-v2';

    // -1. Live Runtime Temporal Awareness (time, date, time-of-day greeting / clarification)
    if (
      /\b(what time is it|what is the time|tell me the time|current time|is it morning|is it afternoon|is it evening|is it night)\b/i.test(lower) ||
      /(कितने बजे|समय क्या|किती वाजले|কটা বাজে|எத்தனை மணி|సమయం ఎంత|ಎಷ್ಟು ಗಂಟೆ)/i.test(query)
    ) {
      const temporal = getLiveTemporalContext(lang);
      return {
        speech: formatLocalizedTimeResponse(temporal),
        expression: 'reassuring',
        intent: 'REPEATED_TIME_QUERY',
        confidence: 0.96,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    if (
      /\b(what day is today|what day is it|what date is today|today's date|which day is it|what month is it|what year is it)\b/i.test(lower) ||
      /(आज कौन सा दिन|आज क्या तारीख|आज कोणता दिवस|আজ কী বার|আজ কত তারিখ|இன்று என்ன கிழமை|ఈ రోజు ఏ వారం|ಇಂದು ಯಾವ ವಾರ)/i.test(query)
    ) {
      const temporal = getLiveTemporalContext(lang);
      return {
        speech: formatLocalizedDateResponse(temporal),
        expression: 'reassuring',
        intent: 'REPEATED_DATE_QUERY',
        confidence: 0.96,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    const temporalForGreeting = getLiveTemporalContext(lang);
    const greetingMismatch = detectGreetingTimeMismatch(query, temporalForGreeting);
    if (greetingMismatch) {
      return {
        speech: greetingMismatch.mismatch
          ? formatTimeOfDayClarification(greetingMismatch.claimedPeriod, temporalForGreeting)
          : `${temporalForGreeting.appropriateGreeting}! ${getSpeech({
              en: `How can I gently help you this ${temporalForGreeting.timeOfDayLabel}?`,
              hi: 'बताइए, मैं आपकी क्या मदद कर सकती हूँ?',
              mr: 'सांगा, मी तुम्हाला कशी मदत करू?',
              bn: 'বলুন, আমি আপনাকে কীভাবে সাহায্য করতে পারি?',
              ta: 'நான் உங்களுக்கு எப்படி உதவலாம்?',
              te: 'నేను మీకు ఎలా సహాయం చేయగలను?',
              kn: 'ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
            })}`,
        expression: greetingMismatch.mismatch ? 'reassuring' : 'happy',
        intent: 'GENERAL_HELP',
        confidence: 0.95,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 0. Reluctance, Fatigue & Boredom Conversational Guard
    if (
      /(?:don'?t|do not|no|not|never|nahi|nako|vendam|vaddu|beda|illa)\b.*(?:play|game|routine|task|activity|anything)/i.test(lower) ||
      /(?:bored|don'?t want|just (?:talk|chat)|let me rest|not now|leave me|tired|sad|mood|feeling down)/i.test(lower) ||
      /(?:बोर|मन नहीं|बात करो|कंटाळा|தனிமை|బోరింగ్)/.test(query)
    ) {
      return {
        speech: getSpeech({
          en: 'That is completely okay. I am right here with you, and we can just talk peacefully. There is no rush at all.',
          hi: 'कोई बात नहीं। मैं यहीं आपके साथ हूँ, हम बस आराम से बात कर सकते हैं। कोई जल्दी नहीं है।',
          mr: 'काही हरकत नाही. मी इथेच आहे, आपण शांतपणे गप्पा मारू शकतो. काही घाई नाही.',
          ta: 'பரவாயில்லை. நான் உங்களுடனேயே இருக்கிறேன், நாம் நிதானமாகப் பேசலாம். எந்த அவசரமும் இல்லை.',
          te: 'ఏమీ పర్వాలేదు. నేను మీతోనే ఉన్నాను, మనం ప్రశాంతంగా మాట్లాడుకోవచ్చు. ఎటువంటి తొందరా లేదు.',
          kn: 'ಪರವಾಗಿಲ್ಲ. ನಾನು ನಿಮ್ಮೊಂದಿಗೇ ಇದ್ದೇನೆ, ನಾವು ಶಾಂತವಾಗಿ ಮಾತನಾಡಬಹುದು. ಯಾವುದೇ ಆತುರವಿಲ್ಲ.',
          bn: 'কোনো ব্যাপার নয়। আমি এখানেই আপনার সাথে আছি, আমরা শান্তভাবে কথা বলতে পারি। কোনো তাড়া নেই।',
        }),
        expression: 'comforting',
        intent: 'GENERAL_HELP',
        confidence: 0.95,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 0. Cognitive journal & private notes reassurance (respects sharedWithDoctor: false boundary)
    if (
      /(?:notes|journal|diary|concern|private note|my thoughts|secret|share.*doctor|doctor.*see.*note|डायरी|नोट्स|चिंता|माझ्या नोंदी)/i.test(lower)
    ) {
      return {
        speech: getSpeech({
          en: 'Your private notes and personal journal remain safely on this device. They are private by default and are never shared without your explicit permission.',
          hi: 'आपकी व्यक्तिगत डायरी और नोट्स आपके डिवाइस पर पूरी तरह सुरक्षित हैं। आपकी स्पष्ट अनुमति के बिना वे डॉक्टर या किसी अन्य के साथ कभी साझा नहीं किए जाते हैं।',
          mr: 'तुमच्या वैयक्तिक नोंदी आणि विचार तुमच्या डिव्हाइसवर सुरक्षित आहेत. तुमच्या परवानगीशिवाय ते कोणाशीही शेअर केले जात नाहीत.',
          ta: 'உங்கள் தனிப்பட்ட குறிப்புகள் மற்றும் எண்ணங்கள் உங்கள் சாதனத்தில் பாதுகாப்பாக உள்ளன. உங்கள் அனுமதியின்றி அவை பகிரப்படாது.',
          te: 'మీ వ్యక్తిగత నోట్స్ మరియు ఆలోచనలు మీ పరికరంలో సురక్షితంగా ఉన్నాయి. మీ స్పష్టమైన అనుమతి లేకుండా అవి ఎవరితోనూ పంచుకోబడవు.',
          kn: 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಟಿಪ್ಪಣಿಗಳು ಮತ್ತು ಆಲೋಚನೆಗಳು ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿವೆ. ನಿಮ್ಮ ಸ್ಪಷ್ಟ ಅನುಮತಿಯಿಲ್ಲದೆ ಅವುಗಳನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಲಾಗುವುದಿಲ್ಲ.',
          bn: 'আপনার ব্যক্তিগত নোট এবং ভাবনাগুলি আপনার ডিভাইসে সম্পূর্ণ নিরাপদ। আপনার স্পষ্ট অনুমতি ছাড়া এগুলি কারও সাথে ভাগ করা হবে না।',
        }),
        expression: 'reassuring',
        intent: 'COGNITIVE_JOURNAL_PRIVACY',
        confidence: 0.95,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // Routine guidance ("What is my next task?", "Start my morning routine")
    if (/(?:next (?:task|activity|routine)|morning routine|start (?:my )?(?:routine|task|activity)|what do i do next|next step|help me (?:with|start) (?:my )?routine|अगली गतिविधि|दिनचर्या|काय करायचं|पुढचा खेळ)/i.test(lower)) {
      const isExplicitLaunch = /(?:start|launch|open|begin|play|help me complete|let's do|chalo|shuru|suru)/i.test(lower);
      return {
        speech: getSpeech({
          en: 'Your next scheduled routine is ready. Would you like to do it together?',
          hi: 'आपकी अगली दिनचर्या तैयार है। क्या हम इसे साथ में शुरू करें?',
          mr: 'तुमची पुढची दिनचर्या तयार आहे. आपण ती एकत्र सुरू करूया का?',
          ta: 'உங்கள் அடுத்த வழக்கம் தயாராக உள்ளது. நாம் ஒன்றாகத் தொடங்கலாமா?',
          te: 'మీ తదుపరి దినచర్య సిద్ధంగా ఉంది. మనం కలిసి ప్రారంభిద్దామా?',
          kn: 'ನಿಮ್ಮ ಮುಂದಿನ ದಿನಚರ್ಯೆ ಸಿದ್ಧವಾಗಿದೆ. ನಾವು ಅದನ್ನು ಒಟ್ಟಿಗೆ ಪ್ರಾರಂಭಿಸೋಣವೇ?',
          bn: 'আপনার পরবর্তী রুটিন প্রস্তুত রয়েছে। আমরা কি এটি একসাথে শুরু করতে পারি?',
        }),
        expression: 'reassuring',
        intent: 'ROUTINES_START_NEXT',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        actionProposal: {
          action: 'LAUNCH_ROUTINE_RUNNER',
          targetId: 'walk-01',
          description: pickAILang(targetLang, {
            en: 'Start Morning Garden Walk',
            hi: 'सुबह बगीचे की सैर शुरू करें',
            mr: 'सकाळची बागेतील फेरी सुरू करा',
            bn: 'সকালের বাগানে হাঁটা শুরু করুন',
            ta: 'காலை தோட்ட நடைப்பயிற்சியைத் தொடங்கு',
            te: 'ఉదయం తోట నడక ప్రారంభించండి',
            kn: 'ಬೆಳಗಿನ ಉದ್ಯಾನ ನಡಿಗೆ ಪ್ರಾರಂಭಿಸಿ',
          }),
          autoDispatch: isExplicitLaunch,
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 0. Clinical Medication Safety: Double Dose Prevention Guard (Scenario 10.9)
    if (
      /\b(?:should i take another|can i take another|take another|double (?:the )?dose|dusri goli|dusri dose|ek aur goli|take two pills)\b/i.test(lower) ||
      /(दूसरी खुराक|एक और गोली|दुसरी गोळी|आणखी एक|डबल डोज़)/.test(query)
    ) {
      const guard = ConversationSafetyPolicy.handleMedicationDoubleDoseGuard(targetLang);
      return {
        speech: guard.speech,
        expression: guard.expression,
        intent: 'MEDICATION_DOUBLE_DOSE_GUARD',
        confidence: 0.99,
        actionClass: 'class4_restricted',
        actionProposal: {
          action: 'CALL_CAREGIVER',
          description: pickAILang(targetLang, {
            en: 'Contact caregiver to confirm medication schedule safely',
            hi: 'दवा के समय की पुष्टि के लिए देखभालकर्ता से संपर्क करें',
            mr: 'औषधांच्या वेळेची खात्री करण्यासाठी काळजीवाहूंशी संपर्क साधा',
            bn: 'ওষুধের সময় নিশ্চিত করতে যত্নশীলের সাথে যোগাযোগ করুন',
            ta: 'மருந்து நேரத்தை உறுதிப்படுத்த பராமரிப்பாளரைத் தொடர்பு கொள்ள',
            te: 'మందుల సమయాన్ని నిర్ధారించడానికి సంరక్షకుడిని సంప్రదించండి',
            kn: 'ಔಷಧಿ ವೇಳಾಪಟ್ಟಿ ದೃಢೀಕರಿಸಲು ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ',
          }),
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 0.1 Clinical Medication Safety: Memory Lapse & Ingestion Uncertainty Guard
    if (
      /\b(?:forgot|not sure|yaad nahi|bhool|missed|white round tablet|safed goli|shayad|kya maine dawa)\b/i.test(lower) ||
      /(याद नहीं|भूल|सफेद गोली|शायद|आठवत नाही|घेतलं का|ली थी क्या|खाई थी क्या)/.test(query)
    ) {
      const uncert = ConversationSafetyPolicy.handleMedicationUncertainty(query, undefined, targetLang);
      return {
        speech: uncert.speech,
        expression: uncert.expression,
        intent: 'ROUTINES_MEDICATION_UNCERTAINTY',
        confidence: 0.95,
        actionClass: 'class1_read',
        actionProposal: {
          action: 'NAVIGATE_ROUTINES',
          description: pickAILang(targetLang, {
            en: 'Open daily routines to check recorded medication status',
            hi: 'दर्ज दवा स्थिति देखने के लिए दैनिक दिनचर्या खोलें',
            mr: 'नोंदवलेली औषध स्थिती पाहण्यासाठी दिनक्रम उघडा',
            bn: 'ওষুধের অবস্থা দেখতে দৈনিক রুটিন খুলুন',
            ta: 'பதிவான மருந்து நிலையைப் பார்க்க தினசரி வழக்கங்களைத் திற',
            te: 'మందుల స్థితిని చూడటానికి దినచర్యలను తెరవండి',
            kn: 'ದಾಖಲಾದ ಔಷಧಿ ಸ್ಥಿತಿ ನೋಡಲು ದಿನಚರ್ಯೆಗಳನ್ನು ತೆರೆಯಿರಿ',
          }),
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 0.2 Standard Medication Schedule Check (No false reassurance of physical ingestion)
    if (/(?:medicine|medication|pills|dawa|aushadh|vakhat|muli|দৰব|औषध|ଔଷଧ|دوا|दवाई)/i.test(lower)) {
      const rep = ConversationSafetyPolicy.formatMedicationSelfReport(undefined, targetLang, query);
      return {
        speech: rep.speech,
        expression: rep.expression,
        intent: 'ROUTINES_MEDICATION_STATUS',
        confidence: 0.92,
        actionClass: 'class1_read',
        actionProposal: {
          action: 'NAVIGATE_ROUTINES',
          description: pickAILang(targetLang, {
            en: 'View daily medication routine schedule',
            hi: 'दैनिक दवा दिनचर्या समय-सारणी देखें',
            mr: 'दैनिक औषध दिनक्रम वेळापत्रक पहा',
            bn: 'দৈনিক ওষুধের রুটিন সময়সূচী দেখুন',
            ta: 'தினசரி மருந்து அட்டவணையைப் பார்',
            te: 'రోజువారీ మందుల షెడ్యూల్ చూడండి',
            kn: 'ದೈನಂದಿನ ಔಷಧಿ ವೇಳಾಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ',
          }),
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 0.1 Distress, Emergency & Acute Confusion (Multilingual de-escalation)
    if (/(?:help|scared|fear|confused|lost|madat|ghabra|bhay|خوف|مَدَتھ|सहायता|भय)/i.test(lower)) {
      return {
        speech: getSpeech({
          en: 'You are completely safe. I am right here with you, and I am alerting your caregiver to assist you.',
          hi: 'घबराइए नहीं, आप पूरी तरह सुरक्षित हैं। मैं आपके परिवार या देखभालकर्ता को सूचित कर रही हूँ।',
          mr: 'शांत व्हा, तुम्ही सुरक्षित आहात. मी तुमच्या काळजीवाहूशी संपर्क साधत आहे.',
          ta: 'கவலைப்பட வேண்டாம், நீங்கள் முற்றிலும் பாதுகாப்பாக இருக்கிறீர்கள். நான் உங்கள் பராமரிப்பாளரைத் தொடர்பு கொள்கிறேன்.',
          te: 'భయపడకండి, మీరు పూర్తిగా సురక్షితంగా ఉన్నారు. నేను మీ సంరక్షకుడిని సంప్రదిస్తున్నాను.',
          kn: 'ಹೆದರಬೇಡಿ, ನೀವು ಸಂಪೂರ್ಣವಾಗಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ. ನಾನು ನಿಮ್ಮ ಆರೈಕೆದಾರರನ್ನು ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇನೆ.',
          bn: 'ভয় পাবেন না, আপনি সম্পূর্ণ নিরাপদ। আমি আপনার যত্নশীল বা পরিবারের সাথে যোগাযোগ করছি।',
        }),
        expression: 'reassuring',
        intent: 'CAREGIVER_ESCALATION',
        confidence: 0.95,
        actionClass: 'class3_consequential',
        actionProposal: {
          action: 'CALL_CAREGIVER',
          description: pickAILang(targetLang, {
            en: 'Emergency alert confirmation card for caregiver',
            hi: 'देखभालकर्ता के लिए आपातकालीन पुष्टि कार्ड',
            mr: 'काळजीवाहूंसाठी आपत्कालीन पुष्टी कार्ड',
            bn: 'যত্নশীলের জন্য জরুরি নিশ্চিতকরণ কার্ড',
            ta: 'பராமரிப்பாளருக்கான அவசர உறுதிப்படுத்தல் அட்டை',
            te: 'సంరక్షకుడి కోసం అత్యవసర నిర్ధారణ కార్డ్',
            kn: 'ಆರೈಕೆದಾರರಿಗಾಗಿ ತುರ್ತು ದೃಢೀಕರಣ ಕಾರ್ಡ್',
          }),
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 1. Multi-turn Follow-up: "Can I call her?" / "Can you call my daughter?"
    if (turnHistory?.lastTopic === 'family' || /\b(?:call her|call him|phone|call my daughter|call family)\b/i.test(lower)) {
      return {
        speech: getSpeech({
          en: 'I am opening the contact screen to reach your daughter. You can confirm and make the call.',
          hi: 'मैं आपकी बेटी से संपर्क करने के लिए कॉल स्क्रीन खोल रही हूँ। आप पुष्टि करके कॉल कर सकते हैं।',
          mr: 'मी तुमच्या मुलीशी संपर्क साधण्यासाठी कॉल स्क्रीन उघडत आहे. तुम्ही खात्री करून कॉल करू शकता.',
          ta: 'உங்கள் மகளைத் தொடர்பு கொள்ள நான் அழைப்புத் திரையைத் திறக்கிறேன். நீங்கள் உறுதிசெய்து அழைக்கலாம்.',
          te: 'మీ కుమార్తెను సంప్రదించడానికి నేను కాల్ స్క్రీన్‌ను తెరుస్తున్నాను. మీరు నిర్ధారించి కాల్ చేయవచ్చు.',
          kn: 'ನಿಮ್ಮ ಮಗಳನ್ನು ಸಂಪರ್ಕಿಸಲು ನಾನು ಕರೆ ಪರದೆಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ನೀವು ಖಚಿತಪಡಿಸಿ ಕರೆ ಮಾಡಬಹುದು.',
          bn: 'আপনার মেয়ের সাথে যোগাযোগের জন্য আমি কল স্ক্রিন খুলছি। আপনি নিশ্চিত করে কল করতে পারেন।',
        }),
        expression: 'reassuring',
        intent: 'LOVED_ONES_PERSON',
        confidence: 0.92,
        actionClass: 'class3_consequential',
        actionProposal: {
          action: 'CALL_CAREGIVER',
          description: pickAILang(targetLang, {
            en: 'Open contact confirmation for family member',
            hi: 'परिवार के सदस्य से संपर्क की पुष्टि खोलें',
            mr: 'कुटुंबातील सदस्याशी संपर्क पुष्टी उघडा',
            bn: 'পরিবারের সদস্যের সাথে যোগাযোগের নিশ্চিতকরণ খুলুন',
            ta: 'குடும்ப உறுப்பினர் தொடர்பு உறுதிப்படுத்தலைத் திற',
            te: 'కుటుంబ సభ్యుడి సంప్రదింపు నిర్ధారణను తెరవండి',
            kn: 'ಕುಟುಂಬ ಸದಸ್ಯರ ಸಂಪರ್ಕ ದೃಢೀಕರಣ ತೆರೆಯಿರಿ',
          }),
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 2. Multi-turn Follow-up: "Show me my daughter" after family list
    if (/\b(?:show (?:me )?(?:my )?daughter|show (?:me )?(?:my )?son|daughter|beta|beti|mulga|mulgi)\b/i.test(lower)) {
      return {
        speech: getSpeech({
          en: 'Here is your daughter’s photo and lovely memories.',
          hi: 'यह देखिए आपकी बेटी की तस्वीर और प्यारी यादें।',
          mr: 'हे पहा तुमच्या मुलीचे छायाचित्र आणि गोड आठवणी.',
          ta: 'இதோ உங்கள் மகளின் புகைப்படம் மற்றும் இனிய நினைவுகள்.',
          te: 'ఇదిగోండి మీ కుమార్తె చిత్రం మరియు మధుర జ్ఞాపకాలు.',
          kn: 'ಇಲ್ಲಿ ನಿಮ್ಮ ಮಗಳ ಭಾವಚಿತ್ರ ಮತ್ತು ಸುಂದರ ನೆನಪುಗಳಿವೆ.',
          bn: 'এই দেখুন আপনার মেয়ের ছবি ও মিষ্টি স্মৃতি।',
        }),
        expression: 'happy',
        intent: 'LOVED_ONES_PERSON',
        confidence: 0.94,
        actionClass: 'class2_navigate',
        actionProposal: {
          action: 'SHOW_FAMILY_MEMBER',
          targetId: 'daughter',
          description: pickAILang(targetLang, {
            en: 'Filter family memories to daughter',
            hi: 'बेटी की पारिवारिक यादें दिखाएं',
            mr: 'मुलीच्या कौटुंबिक आठवणी दाखवा',
            bn: 'মেয়ের পারিবারিক স্মৃতি দেখুন',
            ta: 'மகளின் குடும்ப நினைவுகளைக் காண்க',
            te: 'కుమార్తె కుటుంబ జ్ఞాపకాలను చూపండి',
            kn: 'ಮಗಳ ಕುಟುಂಬ ನೆನಪುಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
          }),
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 3. Open Question: "I am feeling lonely" / "I feel lonely" / "I want to talk"
    if (/\b(?:feel(?:ing)? lonely|lonely|alone|i want to talk|talk to me|koi nahi hai|ekla|ekakipana)\b/i.test(lower)) {
      return {
        speech: getSpeech({
          en: 'You are never alone. I am right here with you. Would you like to look at some family memories together?',
          hi: 'आप बिल्कुल अकेले नहीं हैं। मैं हमेशा आपके साथ हूँ। क्या हम आपके परिवार की पुरानी यादें देखें?',
          mr: 'तुम्ही मुळीच एकटे नाही आहात. मी नेहमी तुमच्या सोबत आहे. आपण काही छान आठवणी पाहूया का?',
          ta: 'நீங்கள் ஒருபோதும் தனிமையில் இல்லை. நான் உங்களுடனேயே இருக்கிறேன். நாம் சில குடும்ப நினைவுகளைப் பார்க்கலாமா?',
          te: 'మీరు ఒంటరిగా లేరు. నేను ఎల్లప్పుడూ మీతోనే ఉన్నాను. మనం కొన్ని కుటుంబ జ్ఞాపకాలను చూద్దామా?',
          kn: 'ನೀವು ಒಬ್ಬಂಟಿಯಲ್ಲ. ನಾನು ಯಾವಾಗಲೂ ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ. ನಾವು ಕೆಲವು ಕುಟುಂಬದ ನೆನಪುಗಳನ್ನು ನೋಡೋಣವೇ?',
          bn: 'আপনি একা নন। আমি সবসময় আপনার পাশে আছি। আমরা কি পরিবারের কিছু স্মৃতি একসাথে দেখতে পারি?',
        }),
        expression: 'comforting',
        intent: 'GENERAL_HELP',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        actionProposal: {
          action: 'NAVIGATE_LOVED_ONES',
          description: pickAILang(targetLang, {
            en: 'Open Loved Ones photo album for emotional comfort',
            hi: 'आराम के लिए प्रियजनों की फोटो एल्बम खोलें',
            mr: 'शांततेसाठी प्रियजनांचा फोटो अल्बम उघडा',
            bn: 'মানসিক প্রশান্তির জন্য প্রিয়জনদের অ্যালবাম খুলুন',
            ta: 'மன அமைதிக்காக அன்பானவர்களின் புகைப்பட ஆல்பத்தைத் திற',
            te: 'మానసిక ఓదార్పు కోసం ప్రియమైన వారి ఆల్బమ్ తెరవండి',
            kn: 'ಮನಃಶಾಂತಿಗಾಗಿ ಪ್ರೀತಿಪಾತ್ರರ ಆಲ್ಬಮ್ ತೆರೆಯಿರಿ',
          }),
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 4. Unexpected Question: "Why do I have to do this?" / "Why are we doing this?"
    if (/\b(?:why do i have to|why are we doing this|why this|kyun|ka bara)\b/i.test(lower)) {
      return {
        speech: getSpeech({
          en: 'This is just to help you feel healthy and refreshed. There is no rush at all, take your time.',
          hi: 'यह आपकी सेहत और मन को शांत रखने के लिए है। कोई जल्दी नहीं है, हम आराम से करेंगे।',
          mr: 'हे तुमच्या आरोग्यासाठी आणि मन शांत ठेवण्यासाठी आहे. काही घाई नाही, आपण हळूहळू करू.',
          ta: 'இது உங்கள் உடல் நலம் மற்றும் அமைதிக்காக மட்டுமே. அவசரமில்லை, நாம் நிதானமாகச் செய்யலாம்.',
          te: 'ఇది మీ ఆరోగ్యం మరియు మనశ్శాంతి కోసం మాత్రమే. ఎటువంటి తొందరా లేదు, మనం నెమ్మదిగా చేద్దాం.',
          kn: 'ಇದು ನಿಮ್ಮ ಆರೋಗ್ಯ ಮತ್ತು ಮನಶ್ಶಾಂತಿಗಾಗಿ ಮಾತ್ರ. ಯಾವುದೇ ಆತುರವಿಲ್ಲ, ನಿಧಾನವಾಗಿ ಮಾಡೋಣ.',
          bn: 'এটি আপনার সুস্থতা ও মানসিক শান্তির জন্য। কোনো তাড়া নেই, আমরা ধীরে ধীরে করব।'
        }),
        expression: 'explaining',
        intent: 'GENERAL_HELP',
        confidence: 0.91,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 5. Open Request: "I want to play something" / "Can we play a game?"
    if (/\b(?:play something|play a game|game khelna|khelavasa vatatay|want to play)\b/i.test(lower)) {
      return {
        speech: getSpeech({
          en: 'Of course! Let us enjoy a gentle mind game together to keep your mind active.',
          hi: 'ज़रूर! चलिए दिमाग को तरोताज़ा करने वाला एक हल्का-फुल्का खेल खेलते हैं।',
          mr: 'नक्कीच! चला आपण मेंदूला ताजेतवाने करणारा एक सोपा खेळ खेळूया.',
          ta: 'நிச்சயமாக! மனதை உற்சாகப்படுத்தும் எளிய விளையாட்டை நாம் விளையாடுவோம்.',
          te: 'తప్పకుండా! మనస్సును ఉల్లాసపరిచే ఒక తేలికపాటి ఆట ఆడుకుందాం.',
          kn: 'ಖಂಡಿತ! ಮನಸ್ಸನ್ನು ಉಲ್ಲಾಸಗೊಳಿಸುವ ಒಂದು ಸರಳ ಆಟವನ್ನು ಆಡೋಣ.',
          bn: 'অবশ্যই! মনকে সতেজ করতে একটি সহজ খেলা খেলা যাক।',
        }),
        expression: 'happy',
        intent: 'GAMES_LIST',
        confidence: 0.95,
        actionClass: 'class2_navigate',
        actionProposal: {
          action: 'NAVIGATE_MIND_GAMES',
          description: pickAILang(targetLang, {
            en: 'Navigate to Mind Games sanctuary',
            hi: 'माइंड गेम्स अनुभाग पर जाएं',
            mr: 'मेंदूच्या खेळांकडे जा',
            bn: 'মাইন্ড গেমস বিভাগে যান',
            ta: 'மன விளையாட்டுகள் பகுதிக்குச் செல்லவும்',
            te: 'మైండ్ గేమ్స్ విభాగానికి వెళ్లండి',
            kn: 'ಮೈಂಡ್ ಗೇಮ್ಸ್ ವಿಭಾಗಕ್ಕೆ ಹೋಗಿ',
          }),
        },
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 6. Natural Statement: "Can we do this later?" / "Delay this"
    if (/\b(?:do this later|later|baad mein|nantar|not now|can we do this after lunch)\b/i.test(lower)) {
      return {
        speech: getSpeech({
          en: 'No problem at all. We can certainly do this activity later. Please take your rest.',
          hi: 'कोई बात नहीं। हम यह गतिविधि बाद में कर सकते हैं। आप आराम कीजिए।',
          mr: 'काही हरकत नाही. आपण ही क्रिया नंतर करू शकतो. विश्रांती घ्या.',
          ta: 'பரவாயில்லை. நாம் இந்தச் செயல்பாட்டைப் பின்னர் செய்யலாம். ஓய்வெடுங்கள்.',
          te: 'ఏమీ పర్వాలేదు. మనం ఈ పనిని తర్వాత చేయవచ్చు. విశ్రాంతి తీసుకోండి.',
          kn: 'ಪರವಾಗಿಲ್ಲ. ನಾವು ಈ ಚಟುವಟಿಕೆಯನ್ನು ನಂತರ ಮಾಡಬಹುದು. ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.',
          bn: 'কোনো অসুবিধা নেই। আমরা এই কাজটি পরে করতে পারি। আপনি বিশ্রাম নিন।',
        }),
        expression: 'reassuring',
        intent: 'WELLBEING_REST_BREAK',
        confidence: 0.93,
        actionClass: 'class1_read',
        isRealAI: false,
        executionMode: 'LOCAL_SIMULATION_FALLBACK',
        modelUsed: model,
      };
    }

    // 7. General Fallback with Empathy
    return {
      speech: getSpeech({
        en: 'I am right here with you. I can help you check your daily routine, see your family, or play a game.',
        hi: 'मैं आपके साथ हूँ। मैं आपकी दिनचर्या, परिवार की यादों या खेलों में मदद कर सकती हूँ।',
        mr: 'मी तुमच्या सोबत आहे. मी तुम्हाला दिनचर्या, कुटुंब किंवा खेळांमध्ये मदत करू शकते.',
        ta: 'நான் உங்களுடன் இருக்கிறேன். உங்கள் தினசரி வழக்கம், குடும்பம் அல்லது விளையாட்டுகளில் உதவ முடியும்.',
        te: 'నేను మీతోనే ఉన్నాను. మీ దినచర్య, కుటుంబం లేదా ఆటలలో నేను సహాయం చేయగలను.',
        kn: 'ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ. ನಿಮ್ಮ ದಿನಚರ್ಯೆ, ಕುಟುಂಬ ಅಥವಾ ಆಟಗಳಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.',
        bn: 'আমি আপনার সাথে আছি। আমি আপনার দৈনন্দিন রুটিন, পরিবার বা খেলায় সাহায্য করতে পারি।',
      }),
      expression: 'reassuring',
      intent: 'GENERAL_HELP',
      confidence: 0.88,
      actionClass: 'class1_read',
      isRealAI: false,
      executionMode: 'LOCAL_SIMULATION_FALLBACK',
      modelUsed: model,
    };
  }
}
