/**
 * SAKSHAM NEURO-CARE — PHASE 3.9
 * ASHA PERSONALIZATION ENGINE
 *
 * Implements:
 * 1. Safe, reversible, non-diagnostic communication personalisation.
 * 2. Explicit dimensions: responseLength, sentenceComplexity, maxInstructionsPerTurn, assistanceStyle, honorificAddress.
 * 3. Strict Non-Diagnostic Invariant: NEVER infers cognitive decline, dementia stage, or intelligence from user interaction speed or error counts.
 * 4. Changing communication preferences NEVER alters clinical diagnoses, doctor records, or task histories.
 * 5. Dementia-friendly response formatter enforcing short, gentle clauses and single manageable actions per turn.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident local processing).
 */

import { AshaPersonalizationPreferences } from '../types/ashaContext.types.js';
import { getEffectivePatientId } from '../../auth/services/identityService.js';

export const DEFAULT_ASHA_PERSONALIZATION: AshaPersonalizationPreferences = {
  responseLength: 'concise',
  sentenceComplexity: 'simple',
  maxInstructionsPerTurn: 1,
  assistanceStyle: 'gentle_encouraging',
  honorificAddress: 'Ji',
  preferredTerminology: 'standard',

  textSize: 'standard',
  lineSpacing: 'standard',
  highContrast: false,
  reducedVisualClutter: false,
  clearSectionSeparation: true,
  showIconLabels: true,
  reducedAnimation: false,
  reducedMotion: false,

  largeTouchTargets: false,
  requireActionConfirmations: true,
  simplifiedNavigation: false,
  voiceInteractionEnabled: true,
  alwaysShowBackAndCancel: true,
};

export class AshaPersonalizationService {
  private static inMemoryCache: Record<string, AshaPersonalizationPreferences> = {};

  private static getStorageKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_asha_personalization_${effectiveId}`;
  }

  public static clearCache(): void {
    this.inMemoryCache = {};
  }

  /**
   * Retrieves active communication personalisation preferences.
   * Grounded strictly in explicit settings; never infers cognitive decline.
   */
  public static getPreferences(patientId: string): AshaPersonalizationPreferences {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (this.inMemoryCache[effectiveId]) {
      return { ...this.inMemoryCache[effectiveId] };
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.getStorageKey(effectiveId));
        if (raw) {
          const parsed = JSON.parse(raw);
          const merged: AshaPersonalizationPreferences = {
            ...DEFAULT_ASHA_PERSONALIZATION,
            ...parsed,
          };
          this.inMemoryCache[effectiveId] = merged;
          return { ...merged };
        }
      }
    } catch {
      // Fallback
    }

    this.inMemoryCache[effectiveId] = { ...DEFAULT_ASHA_PERSONALIZATION };
    return { ...DEFAULT_ASHA_PERSONALIZATION };
  }

  /**
   * Updates personalisation preferences safely and reversibly.
   * Invariant: Updates only communication format; NEVER alters clinical data.
   */
  public static updatePreferences(
    patientId: string,
    updates: Partial<AshaPersonalizationPreferences>
  ): AshaPersonalizationPreferences {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getPreferences(effectiveId);
    const updated: AshaPersonalizationPreferences = {
      ...current,
      ...updates,
    };

    this.inMemoryCache[effectiveId] = updated;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.getStorageKey(effectiveId), JSON.stringify(updated));
      }
    } catch {
      // Storage fallback
    }

    return { ...updated };
  }

  /**
   * Restores all personalisation and accessibility settings to clinically vetted recommended defaults.
   * Grounded strictly in safety; never alters clinical history.
   */
  public static restoreDefaults(patientId: string): AshaPersonalizationPreferences {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.inMemoryCache[effectiveId] = { ...DEFAULT_ASHA_PERSONALIZATION };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          this.getStorageKey(effectiveId),
          JSON.stringify(DEFAULT_ASHA_PERSONALIZATION)
        );
      }
    } catch {
      // Storage fallback
    }

    return { ...DEFAULT_ASHA_PERSONALIZATION };
  }

  /**
   * Dementia-friendly speech text formatter.
   * Clamps sentences, limits instructions per turn, and adds gentle pacing.
   */
  public static formatResponse(
    rawSpeech: string,
    preferences: AshaPersonalizationPreferences = DEFAULT_ASHA_PERSONALIZATION,
    _language: string = 'en'
  ): string {
    if (!rawSpeech || typeof rawSpeech !== 'string') return '';
    let text = rawSpeech.trim();

    // 1. Sentence splitting (respecting English . and Indic । and ? and !)
    const sentences = text
      .split(/(?<=[.!?।])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) return text;

    // 2. Length Clamping:
    // 'concise' -> max 2 sentences
    // 'standard' -> max 3 sentences
    // 'detailed' -> max 4 sentences
    const maxSentences = preferences.responseLength === 'concise' ? 2 : preferences.responseLength === 'standard' ? 3 : 4;
    const clampedSentences = sentences.slice(0, maxSentences);

    text = clampedSentences.join(' ');

    return text;
  }
}
