/**
 * SAKSHAM NEURO-CARE — FIREBASE AI LOGIC SERVICE (ENGINE C PRODUCTION CLOUD PATH)
 *
 * Connects remotely to Gemini via Firebase AI Logic (GoogleAIBackend + Gemini Developer API)
 * protected by Firebase App Check and on-device privacy de-identification.
 *
 * ARCHITECTURAL & SECURITY INVARIANTS:
 * 1. Zero secret API keys in frontend bundles or VITE_ env vars.
 * 2. Requires Firebase App Check on non-local production hosts (never disabled or bypassed).
 * 3. Only receives de-identified text and minimal purpose-scoped context (no raw PHI, no GPS
 *    coordinates/history, no family photos or bulk family records).
 * 4. Fails closed to honest UNAVAILABLE state when Firebase AI Logic or App Check is unprovisioned
 *    or blocked — never falls back silently to localhost in production.
 * 5. Deterministic safety guards, Class 3 confirmations, and game rules remain authoritative.
 */

import { getAI, getGenerativeModel, GoogleAIBackend, AI, Part } from 'firebase/ai';
import app, {
  isFirebaseConfigured,
  isAppCheckConfigured,
  getAppCheckInstance,
} from '../../../services/firebase.js';
import {
  LiveTemporalContext,
  getLiveTemporalContext,
  formatTemporalPromptBlock,
} from '../../../utils/temporalContext.js';

export type CloudGeminiBlockedReason =
  | 'FIREBASE_NOT_CONFIGURED'
  | 'APP_CHECK_NOT_CONFIGURED'
  | 'SERVICE_DISABLED'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | null;

export interface FirebaseAILogicStatus {
  sdkReady: boolean;
  isProductionHost: boolean;
  appCheckReady: boolean;
  canDispatchCloudGemini: boolean;
  modelName: string;
  blockedReason: CloudGeminiBlockedReason;
  statusMessage: string;
}

export interface ScopedAshaCloudContext {
  displayNameToken: string;
  preferredLanguage: string;
  routinesCount?: number;
  pendingRoutinesCount?: number;
  nextRoutineSummary?: string;
  gameComfortLevel?: string;
  recentGameFeedback?: string;
  familyContextSummary?: string;
  locationSharingStatus?: 'enabled' | 'paused' | 'not_requested';
  temporal?: LiveTemporalContext;
}

export interface CloudGeminiResult {
  ok: boolean;
  speech?: string;
  modelUsed: string;
  latencyMs: number;
  blockedReason?: CloudGeminiBlockedReason;
  errorMessage?: string;
}

export interface MultimodalScreenshotAnalysis {
  observedIssue: string;
  affectedComponent: string;
  expectedBehavior: string;
  reproductionSteps: string[];
  likelyCauseHypothesis: string;
  suggestedRemediation: string[];
  suggestedVerificationTests: string[];
}

export interface MultimodalDiagnosticResult {
  ok: boolean;
  analysis?: MultimodalScreenshotAnalysis;
  rawText?: string;
  modelUsed: string;
  latencyMs: number;
  blockedReason?: CloudGeminiBlockedReason;
  errorMessage?: string;
}

const DEFAULT_FIREBASE_AI_MODEL =
  ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AI_MODEL) || 'gemini-3.5-flash-lite').trim() ||
  'gemini-3.5-flash-lite';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  mr: 'Marathi (मराठी)',
  bn: 'Bengali (বাংলা)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
};

export class FirebaseAILogicService {
  private static aiInstance: AI | null = null;
  private static runtimeBlockedReason: CloudGeminiBlockedReason = null;
  private static lastRuntimeErrorMessage: string | null = null;
  private static requestTimestamps: number[] = [];
  private static readonly MAX_CLOUD_RPM = 12;

  public static isProductionHost(): boolean {
    if (typeof window === 'undefined' || !window.location) return false;
    const host = (window.location.hostname || '').toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
    return !isLocal;
  }

  public static resetRuntimeStateForTesting(): void {
    this.aiInstance = null;
    this.runtimeBlockedReason = null;
    this.lastRuntimeErrorMessage = null;
    this.requestTimestamps = [];
  }

  public static setRuntimeBlockedForTesting(
    reason: CloudGeminiBlockedReason,
    message?: string
  ): void {
    this.runtimeBlockedReason = reason;
    this.lastRuntimeErrorMessage = message || null;
  }

  private static getAIInstance(): AI | null {
    if (!isFirebaseConfigured || !app) return null;
    if (this.aiInstance) return this.aiInstance;

    try {
      this.aiInstance = getAI(app, {
        backend: new GoogleAIBackend(),
        // Use cached App Check tokens (24h TTL) to conserve Spark free-tier 10k/month reCAPTCHA quota.
        useLimitedUseAppCheckTokens: false,
      });
      return this.aiInstance;
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      this.runtimeBlockedReason = 'FIREBASE_NOT_CONFIGURED';
      this.lastRuntimeErrorMessage = msg;
      return null;
    }
  }

  public static isAppCheckReady(): boolean {
    return isAppCheckConfigured && Boolean(getAppCheckInstance());
  }

  public static getStatus(): FirebaseAILogicStatus {
    const prodHost = this.isProductionHost();
    const appCheckReady = this.isAppCheckReady();

    if (!isFirebaseConfigured) {
      return {
        sdkReady: false,
        isProductionHost: prodHost,
        appCheckReady,
        canDispatchCloudGemini: false,
        modelName: DEFAULT_FIREBASE_AI_MODEL,
        blockedReason: 'FIREBASE_NOT_CONFIGURED',
        statusMessage: 'Firebase client configuration is not active.',
      };
    }

    if (prodHost && !appCheckReady) {
      return {
        sdkReady: false,
        isProductionHost: prodHost,
        appCheckReady: false,
        canDispatchCloudGemini: false,
        modelName: DEFAULT_FIREBASE_AI_MODEL,
        blockedReason: 'APP_CHECK_NOT_CONFIGURED',
        statusMessage:
          'Cloud Gemini via Firebase AI Logic requires Firebase App Check (VITE_FIREBASE_APPCHECK_SITE_KEY) on production hosts.',
      };
    }

    if (
      this.runtimeBlockedReason === 'SERVICE_DISABLED' ||
      this.runtimeBlockedReason === 'PERMISSION_DENIED'
    ) {
      return {
        sdkReady: false,
        isProductionHost: prodHost,
        appCheckReady,
        canDispatchCloudGemini: false,
        modelName: DEFAULT_FIREBASE_AI_MODEL,
        blockedReason: this.runtimeBlockedReason,
        statusMessage:
          this.lastRuntimeErrorMessage ||
          'Firebase AI Logic / Gemini Developer API is not enabled on this Firebase project yet.',
      };
    }

    const ai = this.getAIInstance();
    const ready = Boolean(ai) && (!prodHost || appCheckReady);

    return {
      sdkReady: Boolean(ai),
      isProductionHost: prodHost,
      appCheckReady,
      canDispatchCloudGemini: ready,
      modelName: DEFAULT_FIREBASE_AI_MODEL,
      blockedReason: this.runtimeBlockedReason,
      statusMessage: ready
        ? `Firebase AI Logic Ready (${DEFAULT_FIREBASE_AI_MODEL}${appCheckReady ? ' + App Check' : ''})`
        : 'Firebase AI Logic unavailable.',
    };
  }

  private static canMakeCloudRequest(): boolean {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < 60_000);
    return this.requestTimestamps.length < this.MAX_CLOUD_RPM;
  }

  private static classifyError(err: any): {
    reason: CloudGeminiBlockedReason;
    message: string;
  } {
    const rawMsg = String(err?.message || err || 'Unknown Firebase AI Logic error');
    const lower = rawMsg.toLowerCase();

    if (
      lower.includes('service_disabled') ||
      lower.includes('has not been used in project') ||
      lower.includes('firebasevertexai') ||
      lower.includes('api has not been used')
    ) {
      return {
        reason: 'SERVICE_DISABLED',
        message: 'Firebase AI Logic API is disabled on project saksham-d3b71.',
      };
    }

    if (lower.includes('app check') || lower.includes('appcheck') || lower.includes('401') || lower.includes('403')) {
      return {
        reason: 'PERMISSION_DENIED',
        message: 'Firebase AI Logic rejected the request (check App Check or API key allowlist).',
      };
    }

    if (lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted')) {
      return {
        reason: 'QUOTA_EXHAUSTED',
        message: 'Gemini free-tier rate limit reached temporarily.',
      };
    }

    return {
      reason: 'NETWORK_ERROR',
      message: rawMsg,
    };
  }

  private static buildSystemInstruction(
    targetLanguage: string,
    scopedContext?: ScopedAshaCloudContext
  ): string {
    const langLabel = LANGUAGE_NAMES[targetLanguage] || 'English';
    const temporal = scopedContext?.temporal || getLiveTemporalContext(targetLanguage);
    const ctxLines: string[] = [];
    if (scopedContext) {
      if (typeof scopedContext.routinesCount === 'number') {
        ctxLines.push(
          `- Daily routines summary: ${scopedContext.pendingRoutinesCount ?? 0} remaining of ${scopedContext.routinesCount}.`
        );
      }
      if (scopedContext.nextRoutineSummary) {
        ctxLines.push(`- Next scheduled activity: ${scopedContext.nextRoutineSummary}`);
      }
      if (scopedContext.gameComfortLevel) {
        ctxLines.push(`- Cognitive game pacing preference: ${scopedContext.gameComfortLevel}`);
      }
      if (scopedContext.recentGameFeedback) {
        ctxLines.push(`- Recent activity feedback: ${scopedContext.recentGameFeedback}`);
      }
      if (scopedContext.familyContextSummary) {
        ctxLines.push(`- Family context (purpose-scoped): ${scopedContext.familyContextSummary}`);
      }
      if (scopedContext.locationSharingStatus) {
        ctxLines.push(`- Safe-zone location sharing consent status: ${scopedContext.locationSharingStatus} (never invent or state exact GPS coordinates).`);
      }
    }

    return [
      'You are Asha, a calm, respectful, warm elder-care companion for neuro-care and cognitive support in the Saksham app.',
      `MANDATORY OUTPUT LANGUAGE: Respond completely in ${langLabel} (language code: ${targetLanguage}), including any routine titles, suggestions, or gentle reminders. Even if internal context hints look English, express every word warmly and naturally in ${langLabel}. Only use another language if the patient explicitly writes a full clear request in that language or asks you to switch languages.`,
      formatTemporalPromptBlock(temporal),
      'Guidelines:',
      '- Keep answers concise (1 to 3 gentle sentences), reassuring, clear, and dignified (never infantilizing or overly technical).',
      '- Strictly use ONLY the sanitized context below. Never invent family members, appointments, medications, diagnoses, GPS locations, or claim an action was saved unless confirmed by the app.',
      '- Never prescribe medication, recommend dosage changes, or give clinical diagnoses.',
      ...(ctxLines.length > 0 ? ['Sanitized patient context:', ...ctxLines] : []),
    ].join('\n');
  }

  /**
   * Sends a de-identified query to Gemini via Firebase AI Logic.
   */
  public static async generateChatResponse(
    anonymizedQuery: string,
    targetLanguage: string = 'en',
    scopedContext?: ScopedAshaCloudContext,
    turnHistory?: { lastIntent?: string; lastTopic?: string; lastTargetId?: string }
  ): Promise<CloudGeminiResult> {
    const startTime = Date.now();
    const status = this.getStatus();

    if (!status.canDispatchCloudGemini) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: status.blockedReason || 'PERMISSION_DENIED',
        errorMessage: status.statusMessage,
      };
    }

    if (!this.canMakeCloudRequest()) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: 'RATE_LIMITED',
        errorMessage: 'Client request rate guard (12 RPM) paused this call to protect free-tier quota.',
      };
    }

    const ai = this.getAIInstance();
    if (!ai) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: 'FIREBASE_NOT_CONFIGURED',
        errorMessage: 'Firebase AI Logic instance could not be initialized.',
      };
    }

    this.requestTimestamps.push(Date.now());

    try {
      const model = getGenerativeModel(ai, {
        model: status.modelName,
        systemInstruction: this.buildSystemInstruction(targetLanguage, scopedContext),
      });

      const historyPrefix =
        turnHistory?.lastTopic || turnHistory?.lastIntent
          ? `[Prior topic: ${turnHistory.lastTopic || turnHistory.lastIntent}]\n`
          : '';

      const result = await model.generateContent(`${historyPrefix}${anonymizedQuery}`);
      const responseText = result?.response?.text?.()?.trim() || '';

      if (!responseText) {
        return {
          ok: false,
          modelUsed: status.modelName,
          latencyMs: Date.now() - startTime,
          blockedReason: 'NETWORK_ERROR',
          errorMessage: 'Firebase AI Logic returned an empty response.',
        };
      }

      // Clear transient block state on success
      this.runtimeBlockedReason = null;
      this.lastRuntimeErrorMessage = null;

      return {
        ok: true,
        speech: responseText,
        modelUsed: `${status.modelName} (Firebase AI Logic)`,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      const classified = this.classifyError(err);
      if (
        classified.reason === 'SERVICE_DISABLED' ||
        classified.reason === 'PERMISSION_DENIED'
      ) {
        this.runtimeBlockedReason = classified.reason;
        this.lastRuntimeErrorMessage = classified.message;
      }

      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: classified.reason,
        errorMessage: classified.message,
      };
    }
  }

  /**
   * Optional bounded Gemini helper: rephrases game instructions into simpler words in the
   * selected language when cloud Gemini is ready. Returns null cleanly when unavailable.
   */
  public static async generateSimplifiedGameInstruction(
    gameTitle: string,
    baseInstruction: string,
    difficulty: string,
    targetLanguage: string
  ): Promise<string | null> {
    const status = this.getStatus();
    if (!status.canDispatchCloudGemini || !this.canMakeCloudRequest()) {
      return null;
    }

    const ai = this.getAIInstance();
    if (!ai) return null;

    this.requestTimestamps.push(Date.now());
    try {
      const langLabel = LANGUAGE_NAMES[targetLanguage] || 'English';
      const model = getGenerativeModel(ai, {
        model: status.modelName,
        systemInstruction: `Explain a gentle cognitive activity in 1-2 very simple, reassuring sentences in ${langLabel}. Never mention dementia, diagnosis, scores, or tests.`,
      });
      const prompt = `Activity: ${gameTitle} (${difficulty} pace). Original instruction: ${baseInstruction}. Please give a calmer, simpler explanation.`;
      const res = await model.generateContent(prompt);
      const text = res?.response?.text?.()?.trim();
      return text || null;
    } catch {
      return null;
    }
  }

  /**
   * Scoped multimodal screenshot diagnostic for authorized developer tooling.
   * Zero repository, terminal, filesystem, deployment, or Firebase admin execution privileges.
   */
  public static async analyzeScreenshotMultimodal(
    base64ImageData: string,
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
    issueDescription: string,
    routeHint?: string
  ): Promise<MultimodalDiagnosticResult> {
    const startTime = Date.now();
    const status = this.getStatus();

    if (!status.canDispatchCloudGemini) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: status.blockedReason || 'PERMISSION_DENIED',
        errorMessage: status.statusMessage,
      };
    }

    if (!this.canMakeCloudRequest()) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: 'RATE_LIMITED',
        errorMessage: 'Client request rate guard (12 RPM) paused this diagnostic request.',
      };
    }

    const ai = this.getAIInstance();
    if (!ai) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: 'FIREBASE_NOT_CONFIGURED',
        errorMessage: 'Firebase AI Logic instance could not be initialized.',
      };
    }

    this.requestTimestamps.push(Date.now());

    try {
      const systemInstruction = [
        'You are a scoped read-only UI/localization visual defect analyst for the Saksham Neuro-Care web app.',
        'STRICT CAPABILITY BOUNDARY: You have ZERO access to the source repository, local filesystem, terminal, deployment systems, or Firebase administrative controls.',
        'Inspect ONLY the supplied UI screenshot and developer issue description for visible UI defects, untranslated/mixed-language text, layout clipping/overlap, contrast/accessibility glitches, or visible runtime errors.',
        'Always label root-cause explanations clearly as a hypothesis ("Hypothesis: ...").',
        'Return ONLY strict JSON matching these exact keys:',
        '{"observedIssue": string, "affectedComponent": string, "expectedBehavior": string, "reproductionSteps": string[], "likelyCauseHypothesis": string, "suggestedRemediation": string[], "suggestedVerificationTests": string[]}',
      ].join('\n');

      const model = getGenerativeModel(ai, {
        model: status.modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      });

      const parts: Part[] = [
        {
          text: [
            `Developer Issue Description: ${issueDescription.trim()}`,
            routeHint?.trim() ? `Reported Screen / Route Hint: ${routeHint.trim()}` : 'Screen Hint: Not specified (infer from screenshot if visible, otherwise mark "Not clearly identifiable from screenshot").',
            'Analyze the screenshot strictly and return the structured JSON diagnostic report.',
          ].join('\n'),
        },
        {
          inlineData: {
            mimeType,
            data: base64ImageData,
          },
        },
      ];

      const result = await model.generateContent(parts);
      const rawText = result?.response?.text?.()?.trim() || '';
      if (!rawText) {
        return {
          ok: false,
          modelUsed: status.modelName,
          latencyMs: Date.now() - startTime,
          blockedReason: 'NETWORK_ERROR',
          errorMessage: 'Firebase AI Logic returned an empty diagnostic response.',
        };
      }

      const cleanedJson = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const parsed = JSON.parse(cleanedJson);

      const normalizeArray = (v: unknown, fallback: string[]): string[] =>
        Array.isArray(v) && v.length > 0 ? v.map((x) => String(x)).filter(Boolean) : fallback;

      const rawHypothesis = String(parsed.likelyCauseHypothesis || '').trim();
      const hypothesisWithPrefix = /^hypothesis\b/i.test(rawHypothesis)
        ? rawHypothesis
        : `Hypothesis: ${rawHypothesis || 'Insufficient source visibility from screenshot alone; verify component state and locale bindings.'}`;

      return {
        ok: true,
        modelUsed: `${status.modelName} (Firebase AI Logic Multimodal)`,
        latencyMs: Date.now() - startTime,
        rawText,
        analysis: {
          observedIssue: String(parsed.observedIssue || issueDescription).trim(),
          affectedComponent: String(parsed.affectedComponent || routeHint || 'Not clearly identifiable from screenshot').trim(),
          expectedBehavior: String(parsed.expectedBehavior || 'Consistent localized UI layout with zero overlapping, clipped, or untranslated text.').trim(),
          reproductionSteps: normalizeArray(parsed.reproductionSteps, [
            'Open the affected route shown in the uploaded screenshot.',
            'Perform the action or language transition described in the issue notes.',
            'Observe the rendered component state.',
          ]),
          likelyCauseHypothesis: hypothesisWithPrefix,
          suggestedRemediation: normalizeArray(parsed.suggestedRemediation, [
            'Inspect the affected component’s useLanguage() bindings, locale keys across all 7 languages, and responsive container styles.',
          ]),
          suggestedVerificationTests: normalizeArray(parsed.suggestedVerificationTests, [
            'Run targeted Vitest UI regression and localization checks across en, hi, mr, bn, ta, te, kn.',
            'Verify visually in the browser across desktop and mobile viewports.',
          ]),
        },
      };
    } catch (err: any) {
      const classified = this.classifyError(err);
      if (
        classified.reason === 'SERVICE_DISABLED' ||
        classified.reason === 'PERMISSION_DENIED'
      ) {
        this.runtimeBlockedReason = classified.reason;
        this.lastRuntimeErrorMessage = classified.message;
      }
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: classified.reason,
        errorMessage: classified.message,
      };
    }
  }
}
