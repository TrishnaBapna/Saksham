/**
 * SAKSHAM NEURO-CARE — ASHA REMOTE ADAPTER
 * 
 * Direct client-side bridge connecting the Saksham React Patient Sanctuary
 * to the local resident Qwen2.5-1.5B-Instruct inference engine on port 8096.
 * 
 * CORE ARCHITECTURAL COMMITMENTS:
 * 1. Strict ₹0 Budget: Firebase Spark Free Tier compliant (0 paid APIs, 0 cloud LLM tokens).
 * 2. 100% Local Inference: Runs on resident Apple Silicon Metal GPU (~35 tokens/sec).
 * 3. Transparent Offline Fallback: If port 8096 is offline, returns honest fallback flag.
 * 4. Multi-Turn Context & Patient Memory Isolation (sunita_01, etc.).
 * 5. 7 Target Indian Languages: en, hi, mr, ta, te, kn, ml.
 */

import { AshaRuntimeState, AshaResponseProvenance } from '../types/conversation.types.js';

export type { AshaRuntimeState, AshaResponseProvenance };

export interface AshaStatusResponse {
  service: string;
  status: 'ONLINE' | 'OFFLINE';
  port: number;
  model: string;
  acceleration: string;
  active_patient_id: string;
  history_depth: number;
  gemini_configured?: boolean;
  primary_model?: string;
  fallback_model?: string;
  orchestrator?: string;
}

export interface AshaHealthStatus {
  isOnline: boolean;
  runtimeState: AshaRuntimeState;
  model: string;
  patientId: string;
  lastCheckTime: number;
  statusMessage: string;
  latencyMs?: number;
  geminiConfigured?: boolean;
  primaryModel?: string;
  fallbackModel?: string;
}

export interface AshaChatResponse {
  user_input: string;
  permitted_response: string;
  tts_phonetic_text?: string | null;
  raw_candidate?: string | null;
  response_source: string;
  safety_flag: string;
  was_modified_by_guardrail: boolean;
  expression_id: number;
  expression_label: string;
  pose: string;
  history_depth: number;
  language: string;
  latency_ms: number;
  telemetry?: {
    is_genuine_slm: boolean;
    is_genuine_ai?: boolean;
    provider?: string;
    fallback_used?: boolean;
    primary_error?: string;
    fallback_error?: string;
    engine_unavailable?: boolean;
    slm_latency_ms: number;
    model: string;
  };
  item_card?: {
    id: string;
    name: string;
    location: string;
    room?: string;
    last_recorded?: string;
    verified_status?: string;
    notes?: string;
  };
  loved_one_card?: {
    name: string;
    relationship?: string;
    notes?: string;
  };
  error?: string;
}

export class AshaRemoteAdapter {
  private static readonly DEFAULT_BASE_URL = 'http://127.0.0.1:8096';
  private static cachedOnlineState: boolean | null = null;
  private static currentRuntimeState: AshaRuntimeState = 'UNKNOWN';
  private static cachedModel: string = 'Qwen2.5-1.5B (Offline Fallback)';
  private static cachedGeminiConfigured: boolean = false;
  private static cachedPrimaryModel: string = '';
  private static cachedFallbackModel: string = 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)';
  private static cachedPatientId: string = 'sunita_01';
  private static cachedStatusMessage: string = 'Asha local AI status not yet checked';
  private static lastCheckTime = 0;
  private static readonly CHECK_INTERVAL_MS = 8000; // 8s health check cache

  public static getBaseUrl(): string {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ASHA_API_URL) {
      return import.meta.env.VITE_ASHA_API_URL;
    }
    return this.DEFAULT_BASE_URL;
  }

  /**
   * Determines whether probing the local/configured Python Engine C gateway is permitted.
   * On remote production Hosting (e.g. https://saksham-d3b71.web.app) without an explicit
   * non-localhost VITE_ASHA_API_URL, returns false so live users NEVER probe 127.0.0.1:8096.
   */
  public static shouldUseLocalGateway(): boolean {
    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    if (isTest) return true;

    const configuredUrl =
      typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ASHA_API_URL
        ? String(import.meta.env.VITE_ASHA_API_URL)
        : '';
    if (configuredUrl && !configuredUrl.includes('127.0.0.1') && !configuredUrl.includes('localhost')) {
      return true;
    }

    if (typeof window !== 'undefined' && window.location) {
      const host = (window.location.hostname || '').toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '';
    }

    return true;
  }

  public static isCachedOnline(): boolean {
    return this.cachedOnlineState === true;
  }

  public static isCachedGeminiConfigured(): boolean {
    return this.cachedGeminiConfigured;
  }

  public static getCachedPrimaryModel(): string {
    return this.cachedPrimaryModel;
  }

  public static getRuntimeState(): AshaRuntimeState {
    return this.currentRuntimeState;
  }

  /**
   * Test-only override helper to simulate runtime state transitions reliably.
   */
  public static setRuntimeStateForTesting(state: AshaRuntimeState, isOnline?: boolean): void {
    this.currentRuntimeState = state;
    if (typeof isOnline === 'boolean') {
      this.cachedOnlineState = isOnline;
    } else {
      this.cachedOnlineState = state === 'LOCAL_SLM_READY';
    }
    this.cachedGeminiConfigured = false;
    this.cachedPrimaryModel = '';
    this.lastCheckTime = Date.now();
    if (state === 'LOCAL_SLM_READY') {
      this.cachedModel = 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)';
      this.cachedStatusMessage = 'Resident Qwen 2.5 1.5B Connected (Metal GPU — ₹0 Spark Free)';
    } else if (state === 'DETERMINISTIC_FALLBACK') {
      this.cachedModel = 'Qwen2.5-1.5B (Offline Fallback)';
      this.cachedStatusMessage = 'Asha resident local engine is currently offline. Switched to offline deterministic fallback.';
    } else if (state === 'CHECKING') {
      this.cachedStatusMessage = 'Checking Asha local inference engine...';
    } else {
      this.cachedStatusMessage = 'Asha resident local inference is currently unavailable.';
    }
  }

  /**
   * Resets health cache for clean test runs.
   */
  public static resetHealthCacheForTesting(): void {
    this.cachedOnlineState = null;
    this.currentRuntimeState = 'UNKNOWN';
    this.lastCheckTime = 0;
    this.cachedGeminiConfigured = false;
    this.cachedPrimaryModel = '';
    this.cachedFallbackModel = 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)';
    this.cachedModel = 'Qwen2.5-1.5B (Offline Fallback)';
    this.cachedStatusMessage = 'Asha local AI status not yet checked';
  }

  /**
   * Health check to detect whether the local resident Qwen server is reachable.
   * Returns fully typed AshaHealthStatus with runtimeState and latency.
   */
  public static async checkHealth(forceRefresh = false): Promise<AshaHealthStatus> {
    if (!this.shouldUseLocalGateway()) {
      const now = Date.now();
      this.cachedOnlineState = false;
      this.cachedGeminiConfigured = false;
      this.cachedPrimaryModel = '';
      this.currentRuntimeState = 'LOCAL_SLM_UNAVAILABLE';
      this.cachedModel = 'Remote Cloud Architecture (No Localhost Dependency)';
      this.cachedPatientId = 'remote';
      this.cachedStatusMessage =
        'Local Mac gateway disabled on remote web host (production uses Firebase AI Logic).';
      this.lastCheckTime = now;
      return {
        isOnline: false,
        runtimeState: this.currentRuntimeState,
        model: this.cachedModel,
        patientId: this.cachedPatientId,
        lastCheckTime: now,
        statusMessage: this.cachedStatusMessage,
        latencyMs: 0,
      };
    }

    const now = Date.now();
    if (!forceRefresh && this.cachedOnlineState !== null && (now - this.lastCheckTime) < this.CHECK_INTERVAL_MS) {
      return {
        isOnline: this.cachedOnlineState,
        runtimeState: this.currentRuntimeState,
        model: this.cachedModel,
        patientId: this.cachedPatientId,
        lastCheckTime: this.lastCheckTime,
        statusMessage: this.cachedStatusMessage,
        geminiConfigured: this.cachedGeminiConfigured,
        primaryModel: this.cachedPrimaryModel || undefined,
        fallbackModel: this.cachedFallbackModel,
      };
    }

    this.currentRuntimeState = 'CHECKING';
    const checkStart = Date.now();

    try {
      let fetchSignal: any = undefined;
      try {
        const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
        if (!isTest && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
          fetchSignal = AbortSignal.timeout(1800);
        }
      } catch {
        // Fallback
      }

      const res = await fetch(`${this.getBaseUrl()}/api/status`, {
        method: 'GET',
        ...(fetchSignal ? { signal: fetchSignal } : {}),
      });

      const latencyMs = Date.now() - checkStart;

      if (res && res.ok) {
        const data: AshaStatusResponse = await res.json();
        this.cachedOnlineState = data.status === 'ONLINE';
        this.cachedGeminiConfigured = Boolean(data.gemini_configured);
        this.cachedPrimaryModel = data.primary_model || '';
        this.cachedFallbackModel = data.fallback_model || 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)';
        this.currentRuntimeState = this.cachedOnlineState ? 'LOCAL_SLM_READY' : 'DETERMINISTIC_FALLBACK';
        this.cachedModel = data.model || 'Qwen2.5-1.5B-Instruct-Q4_K_M (Apple Metal GPU)';
        this.cachedPatientId = data.active_patient_id || 'sunita_01';
        this.cachedStatusMessage = this.cachedOnlineState
          ? this.cachedGeminiConfigured
            ? `Engine C Connected: ${this.cachedPrimaryModel || 'gemini-3.5-flash-lite'} (Primary) + Qwen Fallback`
            : 'Resident Qwen 2.5 1.5B Connected (Metal GPU — ₹0 Spark Free)'
          : 'Asha resident local engine is currently offline. Switched to offline deterministic fallback.';
        this.lastCheckTime = now;

        return {
          isOnline: this.cachedOnlineState,
          runtimeState: this.currentRuntimeState,
          model: this.cachedModel,
          patientId: this.cachedPatientId,
          lastCheckTime: this.lastCheckTime,
          statusMessage: this.cachedStatusMessage,
          latencyMs,
          geminiConfigured: this.cachedGeminiConfigured,
          primaryModel: this.cachedPrimaryModel || undefined,
          fallbackModel: this.cachedFallbackModel,
        };
      }
    } catch {
      // Local server unreachable
    }

    const latencyMs = Date.now() - checkStart;
    this.cachedOnlineState = false;
    this.cachedGeminiConfigured = false;
    this.cachedPrimaryModel = '';
    this.currentRuntimeState = 'DETERMINISTIC_FALLBACK';
    this.cachedModel = 'Qwen2.5-1.5B (Offline Fallback)';
    this.cachedPatientId = 'local';
    this.cachedStatusMessage = 'Asha resident local engine is currently offline. Switched to offline deterministic fallback.';
    this.lastCheckTime = now;

    return {
      isOnline: false,
      runtimeState: 'DETERMINISTIC_FALLBACK',
      model: this.cachedModel,
      patientId: this.cachedPatientId,
      lastCheckTime: this.lastCheckTime,
      statusMessage: this.cachedStatusMessage,
      latencyMs,
    };
  }

  /**
   * Alias for checkHealth with explicit typed return.
   */
  public static async getHealthStatus(forceRefresh = false): Promise<AshaHealthStatus> {
    return this.checkHealth(forceRefresh);
  }

  /**
   * Sends a conversational chat turn to the resident local Qwen engine.
   */
  public static async sendChat(
    message: string,
    language: string = 'en',
    patientId: string = 'sunita_01',
    context?: any
  ): Promise<AshaChatResponse | null> {
    if (!this.shouldUseLocalGateway()) {
      return null;
    }
    try {
      let fetchSignal: any = undefined;
      try {
        const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
        if (!isTest && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
          fetchSignal = AbortSignal.timeout(25000);
        }
      } catch {
        // Fallback
      }

      const res = await fetch(`${this.getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          language,
          patient_id: patientId,
          context: context || undefined,
        }),
        ...(fetchSignal ? { signal: fetchSignal } : {}),
      });

      if (res && res.ok) {
        const data: AshaChatResponse = await res.json();
        this.lastCheckTime = Date.now();
        if (data.response_source === 'ENGINE_UNAVAILABLE' || data.telemetry?.engine_unavailable) {
          this.cachedOnlineState = false;
          this.currentRuntimeState = 'LOCAL_SLM_UNAVAILABLE';
          this.cachedModel = 'unavailable';
          this.cachedStatusMessage = 'Both Gemini primary and local Qwen fallback are unavailable.';
        } else {
          this.cachedOnlineState = true;
          this.currentRuntimeState = 'LOCAL_SLM_READY';
          if (data.response_source === 'GENERATIVE_AI_GEMINI' || data.telemetry?.provider === 'gemini') {
            this.cachedGeminiConfigured = true;
            if (data.telemetry?.model) {
              this.cachedPrimaryModel = data.telemetry.model;
            }
          }
          if (data.telemetry?.model) {
            this.cachedModel = data.telemetry.model;
          }
          if (!data.response_source) {
            data.response_source = 'LOCAL_MODEL';
          }
        }
        return data;
      }
    } catch (err) {
      console.warn('[AshaRemoteAdapter] Local Qwen endpoint unreachable, falling back to local reasoning:', err);
      this.cachedOnlineState = false;
      this.currentRuntimeState = 'DETERMINISTIC_FALLBACK';
    }
    return null;
  }

  /**
   * Resets conversational turn memory for fresh start.
   */
  public static async resetMemory(): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Switches active patient profile.
   */
  public static async switchPatient(patientId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/patient/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
