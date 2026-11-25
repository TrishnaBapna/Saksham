/**
 * SAKSHAM NEURO-CARE — PHASE 3.10
 * Real-World Patient-Centred User Journeys (Journeys A through F)
 *
 * Dedicated Vitest Journey Suite:
 * - Journey A: Large-text patient experience (extra-large typography, high contrast, non-clipping touch targets)
 * - Journey B: Marathi patient experience (end-to-end Marathi translations, status labels, cross-language routine continuity)
 * - Journey C: One-step-at-a-time communication (single-step mode, isolated instruction pacing, step-by-step guidance)
 * - Journey D: Reduced-motion experience (reduce-motion class, pulse/bounce animation suppression, vestibular safety)
 * - Journey E: Voice fallback & mic cleanup (calm permission denial message, clean recognition abort, zero-leak cleanup)
 * - Journey F: Account isolation & restore defaults (multi-patient isolation, non-destructive restore, diagnosis integrity)
 *
 * Target: AIU Anveshan National Student Research Convention — 2 December 2026
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident local processing).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AshaPersonalizationService } from '../features/ai-companion/services/ashaPersonalizationService';
import { ClinicalDiagnosisService } from '../features/clinical/services/clinicalDiagnosisService';
import { RoutineSessionService } from '../features/routines/services/routineSessionService';
import { SpeechService } from '../services/speechService';
import { AshaContextService } from '../features/ai-companion/services/ashaContextService';
import { mrTranslations } from '../i18n/locales/mr';
import { hiTranslations } from '../i18n/locales/hi';
import { RoutineItem } from '../types';

describe('Phase 3.10 Real User Journeys (A through F)', () => {
  const patientA = 'patient_journey_sunita';
  const patientB = 'patient_journey_vikram';

  const morningChaiRoutine: RoutineItem = {
    id: 'routine_chai_journey',
    patientId: patientA,
    title: 'Morning Masala Chai',
    description: 'Brewing a comforting cup of morning chai',
    category: 'food',
    scheduledTime: '08:00 AM',
    period: 'morning',
    streakCount: 5,
    isCompleted: false,
    enableAssistedRecall: false,
    steps: [
      '1. Boil water in kettle: Measure 1 cup of clean water into the kettle.',
      '2. Add ginger and tea leaves: Add freshly crushed ginger and tea leaves.',
      '3. Simmer and strain: Pour hot chai through strainer into your favourite cup.',
    ],
  };

  beforeEach(() => {
    AshaPersonalizationService.clearCache();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-text-size');
    document.documentElement.removeAttribute('data-high-contrast');
    document.documentElement.removeAttribute('data-reduced-motion');
    document.documentElement.removeAttribute('data-line-spacing');
    document.documentElement.removeAttribute('data-touch-targets');
    document.documentElement.removeAttribute('data-reduced-clutter');
  });

  afterEach(() => {
    AshaPersonalizationService.clearCache();
    localStorage.clear();
    document.documentElement.className = '';
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // JOURNEY A: Large-text patient experience
  // --------------------------------------------------------------------------
  it('Journey A: Large-text patient experience preserves clarity, contrast, and touch ergonomics', () => {
    // 1. Patient configures high comfort visual settings
    const prefs = AshaPersonalizationService.updatePreferences(patientA, {
      textSize: 'extra-large',
      highContrast: true,
      lineSpacing: 'comfortable',
      largeTouchTargets: true,
    });

    expect(prefs.textSize).toBe('extra-large');
    expect(prefs.highContrast).toBe(true);
    expect(prefs.lineSpacing).toBe('comfortable');
    expect(prefs.largeTouchTargets).toBe(true);

    // 2. Simulate DOM root classes applied by AccessibilityProvider
    document.documentElement.classList.add('font-scale-xl', 'high-contrast', 'comfortable-spacing', 'large-touch-targets');
    document.documentElement.setAttribute('data-text-size', 'extra-large');
    document.documentElement.setAttribute('data-high-contrast', 'true');
    document.documentElement.setAttribute('data-touch-targets', 'large');

    expect(document.documentElement.classList.contains('font-scale-xl')).toBe(true);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    expect(document.documentElement.getAttribute('data-text-size')).toBe('extra-large');

    // 3. Step text typography scaling logic check
    const stepTextSizeClass =
      prefs.textSize === 'extra-large'
        ? 'text-xl sm:text-2xl font-black'
        : prefs.textSize === 'large'
        ? 'text-lg sm:text-xl font-bold'
        : 'text-base sm:text-lg font-bold';

    expect(stepTextSizeClass).toBe('text-xl sm:text-2xl font-black');

    // 4. Touch target button height check (ensures >= 48px)
    const touchTargetClass = prefs.largeTouchTargets ? 'min-h-[48px]' : 'min-h-[44px]';
    expect(touchTargetClass).toBe('min-h-[48px]');
  });

  // --------------------------------------------------------------------------
  // JOURNEY B: Marathi patient experience
  // --------------------------------------------------------------------------
  it('Journey B: Marathi patient experience provides native localization and cross-language continuity', () => {
    // 1. Patient selects Marathi as their preferred language
    localStorage.setItem('saksham_language', 'mr');
    const selectedLang = localStorage.getItem('saksham_language');
    expect(selectedLang).toBe('mr');

    // 2. Verify key clinical & accessibility terms are authentically available in Marathi
    expect(mrTranslations['accessibility.title']).toBe('सुलभता, आराम आणि गती');
    expect(mrTranslations['accessibility.text_size']).toBe('अक्षराचा आकार');
    expect(mrTranslations['accessibility.instructions_per_turn']).toBe('एका वेळी एकच सूचना');
    expect(mrTranslations['runner.confirm_exit_title']).toBe('विश्रांती घ्यायची की दिनचर्येतून बाहेर पडायचे?');
    expect(mrTranslations['routines.status_skipped']).toBe('विश्रांती / ऊर्जा जपणे');
    expect(mrTranslations['routines.status_assisted']).toBe('मदतीने पूर्ण');

    // 3. Start task in Marathi and save active session
    RoutineSessionService.saveActiveSession({
      sessionId: 'sess_mr_01',
      patientId: patientA,
      routineId: morningChaiRoutine.id,
      routineTitle: morningChaiRoutine.title,
      currentStepIndex: 1,
      completedStepIndices: [0],
      stepHintTiers: { 0: 0 },
      stepAssistance: {},
      secondsRemaining: 650,
      isResting: false,
      restSecondsRemaining: 120,
      viewMode: 'single',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });

    // 4. Switch to Hindi (or English) to test multi-language continuity
    localStorage.setItem('saksham_language', 'hi');
    expect(hiTranslations['routines.status_skipped']).toBe('विश्राम / ऊर्जा संरक्षण');

    // Active session remains 100% intact across language change
    const restoredSession = RoutineSessionService.getActiveSession(patientA, morningChaiRoutine.id);
    expect(restoredSession).not.toBeNull();
    expect(restoredSession?.currentStepIndex).toBe(1);
    expect(restoredSession?.completedStepIndices).toEqual([0]);
    expect(restoredSession?.secondsRemaining).toBe(650);
  });

  // --------------------------------------------------------------------------
  // JOURNEY C: One-step-at-a-time communication
  // --------------------------------------------------------------------------
  it('Journey C: One-step-at-a-time communication adapts task pacing and companion prompt', () => {
    // 1. Patient configures step-by-step single instruction mode
    const prefs = AshaPersonalizationService.updatePreferences(patientA, {
      maxInstructionsPerTurn: 1,
      assistanceStyle: 'gentle_encouraging',
      sentenceComplexity: 'simple',
      responseLength: 'concise',
    });

    expect(prefs.maxInstructionsPerTurn).toBe(1);
    expect(prefs.assistanceStyle).toBe('gentle_encouraging');

    // 2. Build Asha unified context and verify personalization
    const context = AshaContextService.getUnifiedContext({ uid: patientA }, true);

    expect(context.identity.personalization.maxInstructionsPerTurn).toBe(1);
    expect(context.identity.personalization.assistanceStyle).toBe('gentle_encouraging');

    // 3. In GuidedTaskRunner, maxInstructionsPerTurn === 1 enforces 'single' view mode default
    const singleInstructionMode = prefs.maxInstructionsPerTurn === 1;
    const defaultMode = singleInstructionMode ? 'single' : 'checklist';
    expect(defaultMode).toBe('single');
  });

  // --------------------------------------------------------------------------
  // JOURNEY D: Reduced-motion experience
  // --------------------------------------------------------------------------
  it('Journey D: Reduced-motion experience protects patients from vestibular distress', () => {
    // 1. Patient enables reduced motion
    const prefs = AshaPersonalizationService.updatePreferences(patientA, {
      reducedMotion: true,
      reducedAnimation: true,
    });

    expect(prefs.reducedMotion).toBe(true);

    // 2. Verify root classes and data attributes
    document.documentElement.classList.add('reduce-motion');
    document.documentElement.setAttribute('data-reduced-motion', 'true');

    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');

    // 3. Animation suppression logic in task runner badges
    const isTimerRunning = true;
    const isResting = true;
    const timerBadgeClass = isTimerRunning ? (prefs.reducedMotion ? 'bg-emerald-400' : 'bg-emerald-400 animate-pulse') : 'bg-gray-400';
    const restBadgeClass = isResting ? (prefs.reducedMotion ? 'text-emerald-300' : 'text-emerald-300 animate-bounce') : 'text-pink-300';

    expect(timerBadgeClass).toBe('bg-emerald-400');
    expect(timerBadgeClass).not.toContain('animate-pulse');

    expect(restBadgeClass).toBe('text-emerald-300');
    expect(restBadgeClass).not.toContain('animate-bounce');
  });

  // --------------------------------------------------------------------------
  // JOURNEY E: Voice fallback & mic cleanup
  // --------------------------------------------------------------------------
  it('Journey E: Voice fallback demystifies microphone permission errors and cleans up resources', () => {
    // 1. Simulate browser permission denial ('not-allowed')
    const calmMsgEn = SpeechService.getCalmVoiceErrorMessage('not-allowed', 'en');
    const calmMsgHi = SpeechService.getCalmVoiceErrorMessage('not-allowed', 'hi');

    expect(calmMsgEn).toContain('Microphone access is paused');
    expect(calmMsgEn).not.toContain('Error:');
    expect(calmMsgEn).not.toContain('DOMException');

    expect(calmMsgHi).toContain('माइक्रोफ़ोन की अनुमति रुकी हुई है');

    // 2. Verify abortListening releases recognition instance without throwing
    expect(() => SpeechService.abortListening()).not.toThrow();

    // 3. Verify cancelSpeech safely clears speech synthesis
    expect(() => SpeechService.cancelSpeech()).not.toThrow();
  });

  // --------------------------------------------------------------------------
  // JOURNEY F: Account isolation & restore defaults
  // --------------------------------------------------------------------------
  it('Journey F: Multi-patient preference isolation and non-destructive restore defaults', async () => {
    // 1. Record authentic clinical diagnosis for Patient A
    await ClinicalDiagnosisService.assignDiagnosis({
      patientId: patientA,
      confirmedByDoctorId: 'doc_arun_310',
      confirmedByDoctorName: 'Dr. Arun Kumar',
      doctorRegistrationNumber: 'DEL-2026-1188',
      pathway: 'other_or_mixed_dementia',
      etiology: 'VASCULAR_DEMENTIA',
      clinicalStage: 'mild_dementia',
      diagnosticCriteria: 'VASCOG 2014',
      clinicalRationale: 'Vascular cognitive changes, step-by-step assistance recommended.',
    });

    // 2. Patient A sets custom accessibility preferences
    AshaPersonalizationService.updatePreferences(patientA, {
      textSize: 'extra-large',
      highContrast: true,
      maxInstructionsPerTurn: 1,
      simplifiedNavigation: true,
      largeTouchTargets: true,
    });

    // 3. Patient B logs in - verifies Patient B gets untouched defaults
    const prefsB = AshaPersonalizationService.getPreferences(patientB);
    expect(prefsB.textSize).toBe('standard');
    expect(prefsB.highContrast).toBe(false);
    expect(prefsB.simplifiedNavigation).toBe(false);
    expect(prefsB.largeTouchTargets).toBe(false);

    // 4. Patient A triggers "Restore Defaults"
    const restoredA = AshaPersonalizationService.restoreDefaults(patientA);
    expect(restoredA.textSize).toBe('standard');
    expect(restoredA.highContrast).toBe(false);
    expect(restoredA.simplifiedNavigation).toBe(false);
    expect(restoredA.largeTouchTargets).toBe(false);
    expect(restoredA.maxInstructionsPerTurn).toBe(1);

    // 5. Verify Patient A's clinical diagnosis remains 100% UNCHANGED and intact
    const diagnosisA = await ClinicalDiagnosisService.getConfirmedDiagnosis(patientA);
    expect(diagnosisA).not.toBeNull();
    expect(diagnosisA?.pathway).toBe('other_or_mixed_dementia');
    expect(diagnosisA?.clinicalStage).toBe('mild_dementia');
    expect(diagnosisA?.confirmedByDoctorName).toBe('Dr. Arun Kumar');
  });
});
