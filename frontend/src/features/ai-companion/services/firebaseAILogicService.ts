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

export interface MultilingualAudioTranscriptionResult {
  ok: boolean;
  transcript?: string;
  detectedLanguages?: string[];
  primaryDetectedLanguage?: string;
  isCodeSwitched?: boolean;
  modelUsed: string;
  latencyMs: number;
  blockedReason?: CloudGeminiBlockedReason | 'EMPTY_AUDIO' | 'AUDIO_TOO_LARGE' | 'AUDIO_UNSUPPORTED';
  errorMessage?: string;
}

export interface LiveStreamingEvaluationResult {
  supportedBySDK: boolean;
  enabledInProduction: boolean;
  selectedStrategy: 'continuous_capture_stop_and_send' | 'live_bidirectional_websocket';
  reason: string;
}

const MAX_INLINE_AUDIO_BYTES = 18 * 1024 * 1024; // Keep well below Gemini 20MB inlineData payload limit

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
      `MANDATORY OUTPUT LANGUAGE: Respond completely in ${langLabel} (language code: ${targetLanguage}), including any routine titles, suggestions, or gentle reminders. Even if internal context hints look English, express every word warmly and naturally in ${langLabel}.`,
      `UNIVERSAL MULTILINGUAL & CODE-SWITCHING UNDERSTANDING: Indian elders freely speak English, Hindi, Marathi, Bengali, Tamil, Telugu, Kannada, OR mix 2-3 languages in the same sentence (e.g., hi+en, mr+en, kn+en, hi+mr+en, in native Indic scripts or Romanized words). Always understand spoken queries across ALL seven languages seamlessly without requiring the patient to match the interface language. Keep replying warmly in ${langLabel} (${targetLanguage}) UNLESS the patient explicitly asks you to switch response languages (for example "reply in Hindi" or "मराठीत बोला").`,
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

  /**
   * Returns best supported browser MediaRecorder audio MIME type compatible with Gemini inlineData.
   */
  public static getSupportedAudioRecorderMimeType(): string {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    for (const mime of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      } catch {
        // Ignore browser-specific codec probe errors
      }
    }
    return '';
  }

  /**
   * Encodes an audio Blob cleanly to raw Base64 (without data URL header) for Firebase AI Logic inlineData.
   */
  public static async audioBlobToBase64(blob: Blob): Promise<string> {
    if (!blob || blob.size === 0) return '';
    if (typeof blob.arrayBuffer === 'function') {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || '');
        const commaIdx = res.indexOf(',');
        resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to encode audio clip'));
      reader.readAsDataURL(blob);
    });
  }

  public static evaluateLiveStreamingCapability(): LiveStreamingEvaluationResult {
    return {
      supportedBySDK: true, // @firebase/ai exports beta getLiveGenerativeModel (LiveSession WebSocket)
      enabledInProduction: false,
      selectedStrategy: 'continuous_capture_stop_and_send',
      reason:
        'Selected Spark-Free compatible generateContent inlineData audio transcription on Stop & Send using configured gemini-3.5-flash-lite. @firebase/ai LiveGenerativeModel (@beta bidirectional WebSocket) uses real-time PCM streaming and turn-taking that would interrupt cognitive pauses and requires Live-API-specific models/quotas.',
    };
  }

  /**
   * Transcribes universal single-language or genuinely mixed-language (code-switched) spoken audio
   * using Gemini multimodal inlineData via Firebase AI Logic (Spark Free quota-protected).
   * Supported languages: English, Hindi, Marathi, Bengali, Tamil, Telugu, Kannada,
   * and any 2-way or 3-way code-switching (hi+en, mr+en, kn+en, hi+mr+en, etc.).
   */
  public static async transcribeMultilingualAudio(params: {
    base64AudioData: string;
    mimeType: string;
    preferredLanguages?: string[];
    activeLanguage?: string;
  }): Promise<MultilingualAudioTranscriptionResult> {
    const startTime = Date.now();
    const status = this.getStatus();

    const cleanBase64 = String(params.base64AudioData || '').replace(/\s+/g, '').trim();
    const cleanMime = String(params.mimeType || '').split(';')[0].trim().toLowerCase();

    if (!cleanBase64) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: 'EMPTY_AUDIO',
        errorMessage: 'No audio was captured. Please tap and speak gently.',
      };
    }

    if (
      !cleanMime.startsWith('audio/') ||
      cleanMime.length <= 'audio/'.length ||
      cleanBase64.length % 4 === 1 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)
    ) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: 'AUDIO_UNSUPPORTED',
        errorMessage: `Malformed or unsupported audio payload (${cleanMime || 'unknown'}).`,
      };
    }

    const estimatedBytes = Math.floor((cleanBase64.length * 3) / 4);
    if (estimatedBytes > MAX_INLINE_AUDIO_BYTES) {
      return {
        ok: false,
        modelUsed: status.modelName,
        latencyMs: Date.now() - startTime,
        blockedReason: 'AUDIO_TOO_LARGE',
        errorMessage: 'This audio recording is too long for single-step AI transcription. Please send shorter turns.',
      };
    }

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
        errorMessage: 'Client request rate guard (12 RPM) paused this audio transcription to protect free-tier quota.',
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

    const systemInstruction = [
      'You are a universal multilingual speech transcription engine for Saksham NeuroCare in India.',
      'Your ONLY task is verbatim speech-to-text transcription and automatic spoken-language detection from the patient audio.',
      'Supported spoken languages and code-switching combinations:',
      '- English (en), Hindi (hi), Marathi (mr), Bengali (bn), Tamil (ta), Telugu (te), Kannada (kn)',
      '- Any 2-way or 3-way mixed-language / code-switched speech inside the same utterance (hi+en, mr+en, bn+en, ta+en, te+en, kn+en, hi+mr+en, etc.).',
      'STRICT RULES:',
      '1. Detect the spoken language(s) strictly from the audio itself. The user interface display language NEVER restricts what language the patient is speaking.',
      '2. Transcribe verbatim in the actual spoken languages using original native scripts (Devanagari for Hindi/Marathi, Bengali for Bengali, Tamil for Tamil, Telugu for Telugu, Kannada for Kannada, and Latin script for English words).',
      '3. NEVER translate spoken Hindi/Marathi/Kannada/Bengali/Tamil/Telugu into English (or vice versa). Preserve code-switched sentences verbatim.',
      '4. NEVER invent, guess, or hallucinate words if the audio is silent, faint background noise, or unintelligible: return {"transcript": "", "detectedLanguages": [], "isCodeSwitched": false}.',
      '5. Output ONLY valid JSON matching: {"transcript": string, "detectedLanguages": string[], "primaryDetectedLanguage": string, "isCodeSwitched": boolean} using ISO codes from ["en","hi","mr","bn","ta","te","kn"].',
    ].join('\n');

    try {
      const model = getGenerativeModel(ai, {
        model: status.modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      });

      const parts: Part[] = [
        {
          text: 'Transcribe the attached audio verbatim across any of English (en), Hindi (hi), Marathi (mr), Bengali (bn), Tamil (ta), Telugu (te), Kannada (kn), or mixed code-switched speech. Do not restrict to the UI language and do not translate. Return JSON only.',
        },
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
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
          errorMessage: 'Firebase AI Logic returned an empty transcription response.',
        };
      }

      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      let transcript = '';
      let detectedLanguages: string[] = [];
      let primaryDetectedLanguage: string | undefined;
      let isCodeSwitched = false;

      try {
        const parsed = JSON.parse(cleaned);
        transcript = String(parsed?.transcript || '').trim();
        detectedLanguages = Array.isArray(parsed?.detectedLanguages)
          ? Array.from(
              new Set(
                parsed.detectedLanguages
                  .map((x: unknown) => String(x).trim().toLowerCase().split(/[-_]/)[0])
                  .filter(Boolean)
              )
            )
          : [];
        const rawPrimary = String(parsed?.primaryDetectedLanguage || detectedLanguages[0] || '')
          .trim()
          .toLowerCase()
          .split(/[-_]/)[0];
        primaryDetectedLanguage = rawPrimary || undefined;
        isCodeSwitched = Boolean(parsed?.isCodeSwitched) || detectedLanguages.length > 1;
      } catch {
        // Malformed non-JSON output must fail closed rather than risking guessed text
        return {
          ok: false,
          modelUsed: status.modelName,
          latencyMs: Date.now() - startTime,
          blockedReason: 'NETWORK_ERROR',
          errorMessage: 'Audio transcription returned an unreadable response format. Please retry or use Browser Fallback.',
        };
      }

      this.runtimeBlockedReason = null;
      this.lastRuntimeErrorMessage = null;

      return {
        ok: true,
        transcript,
        detectedLanguages,
        primaryDetectedLanguage,
        isCodeSwitched,
        modelUsed: `${status.modelName} (Firebase AI Logic Audio)`,
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
}
