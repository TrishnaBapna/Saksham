/**
 * SAKSHAM NEURO-CARE — PHASE 3.10
 * Adaptive Cognitive Accessibility, Multilingual Experience & Patient-Centred Interaction
 *
 * Dedicated Vitest Verification Suite (35 Comprehensive Scenarios):
 * 1-7:   Central Accessibility Preferences, User Scoping, Guest Isolation, Non-Destructive Restore Defaults
 * 8-14:  Document Root Synchronization (font-scale, high-contrast, reduce-motion, comfortable-spacing, touch-targets, clutter)
 * 15-19: GuidedTaskRunner Cognitive Pacing (step text sizing, 1-step mode, consequential confirmation modal, session preservation)
 * 20-24: RoutineChecklist Non-Punitive Status Distinctions (completed, assisted, resting/skipped, snoozed, pending)
 * 25-31: Multilingual Completeness across 7 Priority Languages (en, hi, mr, ta, te, kn, bn)
 * 32:    Language Switching Continuity without Session Reset
 * 33-34: SpeechService Voice Error Demystification & Recognition Cleanup
 * 35:    PatientProfile Adaptive UI Controls
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, local Qwen inference, zero paid APIs).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AshaPersonalizationService } from '../features/ai-companion/services/ashaPersonalizationService';
import { AccessibilityProvider, useAccessibility } from '../context/AccessibilityContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ClinicalDiagnosisService } from '../features/clinical/services/clinicalDiagnosisService';
import { RoutineSessionService } from '../features/routines/services/routineSessionService';
import { TaskLifecycleService } from '../features/routines/services/taskLifecycleService';
import { SpeechService } from '../services/speechService';
import { GuidedTaskRunner } from '../features/routines/components/GuidedTaskRunner';
import { RoutineChecklist } from '../features/routines/components/RoutineChecklist';
import { PatientProfile } from '../pages/patient/PatientProfile';
import { MemoryRouter } from 'react-router-dom';
import { RoutineItem } from '../types';
import { enTranslations } from '../i18n/locales/en';
import { hiTranslations } from '../i18n/locales/hi';
import { mrTranslations } from '../i18n/locales/mr';
import { taTranslations } from '../i18n/locales/ta';
import { teTranslations } from '../i18n/locales/te';
import { knTranslations } from '../i18n/locales/kn';
import { bnTranslations } from '../i18n/locales/bn';

let mockCurrentUserUid: string | null = 'patient_anjali_310';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUserUid ? { uid: mockCurrentUserUid, email: `${mockCurrentUserUid}@test.local` } : null,
    userProfile: null,
    userRole: mockCurrentUserUid ? 'patient' : null,
    role: mockCurrentUserUid ? 'patient' : null,
    loading: false,
    error: null,
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    clearError: vi.fn(),
  }),
  useAuthSafe: () => ({
    currentUser: mockCurrentUserUid ? { uid: mockCurrentUserUid, email: `${mockCurrentUserUid}@test.local` } : null,
    userProfile: null,
    userRole: mockCurrentUserUid ? 'patient' : null,
    role: mockCurrentUserUid ? 'patient' : null,
    loading: false,
    error: null,
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    clearError: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

describe('Phase 3.10: Adaptive Cognitive Accessibility & Multilingual Experience', () => {
  const patientA = 'patient_anjali_310';
  const patientB = 'patient_rajesh_310';

  const mockRoutine: RoutineItem = {
    id: 'routine_chai_310',
    patientId: patientA,
    title: 'Morning Masala Chai',
    description: 'Brewing a comforting cup of morning chai',
    category: 'food',
    scheduledTime: '08:00 AM',
    period: 'morning',
    streakCount: 3,
    isCompleted: false,
    enableAssistedRecall: false,
    steps: [
      '1. Boil water in kettle: Measure 1 cup of clean water into the kettle.',
      '2. Add spices and tea leaves: Add freshly crushed ginger, cardamom, and tea leaves.',
      '3. Simmer and strain: Pour hot chai through strainer into your favourite cup.',
    ],
  };

  beforeEach(() => {
    mockCurrentUserUid = patientA;
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
  // TEST GROUP 1: Central Accessibility Preferences, Scoping & Safe Reset
  // --------------------------------------------------------------------------

  it('1. Persists accessibility preferences for authenticated patient', () => {
    const updated = AshaPersonalizationService.updatePreferences(patientA, {
      textSize: 'large',
      lineSpacing: 'comfortable',
      highContrast: true,
      maxInstructionsPerTurn: 1,
    });

    expect(updated.textSize).toBe('large');
    expect(updated.lineSpacing).toBe('comfortable');
    expect(updated.highContrast).toBe(true);
    expect(updated.maxInstructionsPerTurn).toBe(1);

    const reloaded = AshaPersonalizationService.getPreferences(patientA);
    expect(reloaded.textSize).toBe('large');
    expect(reloaded.highContrast).toBe(true);
    expect(reloaded.maxInstructionsPerTurn).toBe(1);
  });

  it('2. Isolates guest patient preferences safely under guest_patient_local', () => {
    const guestUpdated = AshaPersonalizationService.updatePreferences('guest_patient_local', {
      textSize: 'extra-large',
      reducedMotion: true,
    });
    expect(guestUpdated.textSize).toBe('extra-large');
    expect(guestUpdated.reducedMotion).toBe(true);

    // Patient A remains default/unaffected
    const patientAPrefs = AshaPersonalizationService.getPreferences(patientA);
    expect(patientAPrefs.textSize).toBe('standard');
    expect(patientAPrefs.reducedMotion).toBe(false);
  });

  it('3. Guarantees account isolation: Patient A settings do not leak into Patient B', () => {
    AshaPersonalizationService.updatePreferences(patientA, {
      textSize: 'extra-large',
      highContrast: true,
      simplifiedNavigation: true,
    });

    AshaPersonalizationService.updatePreferences(patientB, {
      textSize: 'standard',
      highContrast: false,
      simplifiedNavigation: false,
    });

    const prefsA = AshaPersonalizationService.getPreferences(patientA);
    const prefsB = AshaPersonalizationService.getPreferences(patientB);

    expect(prefsA.textSize).toBe('extra-large');
    expect(prefsA.highContrast).toBe(true);
    expect(prefsA.simplifiedNavigation).toBe(true);

    expect(prefsB.textSize).toBe('standard');
    expect(prefsB.highContrast).toBe(false);
    expect(prefsB.simplifiedNavigation).toBe(false);
  });

  it('4. Restore defaults resets visual settings safely to defaults', () => {
    AshaPersonalizationService.updatePreferences(patientA, {
      textSize: 'extra-large',
      highContrast: true,
      lineSpacing: 'comfortable',
      reducedMotion: true,
      reducedVisualClutter: true,
    });

    const restored = AshaPersonalizationService.restoreDefaults(patientA);
    expect(restored.textSize).toBe('standard');
    expect(restored.highContrast).toBe(false);
    expect(restored.lineSpacing).toBe('standard');
    expect(restored.reducedMotion).toBe(false);
    expect(restored.reducedVisualClutter).toBe(false);
  });

  it('5. Restore defaults resets interaction settings safely to defaults', () => {
    AshaPersonalizationService.updatePreferences(patientA, {
      largeTouchTargets: true,
      requireActionConfirmations: false,
      simplifiedNavigation: true,
      maxInstructionsPerTurn: 2,
    });

    const restored = AshaPersonalizationService.restoreDefaults(patientA);
    expect(restored.largeTouchTargets).toBe(false);
    expect(restored.requireActionConfirmations).toBe(true);
    expect(restored.simplifiedNavigation).toBe(false);
    expect(restored.maxInstructionsPerTurn).toBe(1);
  });

  it('6. Restore defaults NEVER alters or deletes clinical diagnosis records', async () => {
    await ClinicalDiagnosisService.assignDiagnosis({
      patientId: patientA,
      confirmedByDoctorId: 'doc_meera_310',
      confirmedByDoctorName: 'Dr. Meera Joshi',
      doctorRegistrationNumber: 'MCI-2026-9921',
      pathway: 'alzheimers_confirmed',
      etiology: 'ALZHEIMERS_AMYLOID_CONFIRMED',
      clinicalStage: 'mild_cognitive_impairment',
      diagnosticCriteria: 'NIA-AA 2018',
      clinicalRationale: 'Mild cognitive impairment, preserved daily autonomy.',
    });

    const diagBefore = await ClinicalDiagnosisService.getConfirmedDiagnosis(patientA);
    expect(diagBefore).not.toBeNull();
    expect(diagBefore?.pathway).toBe('alzheimers_confirmed');

    // Trigger restore defaults
    AshaPersonalizationService.restoreDefaults(patientA);

    // Verify diagnosis remains 100% intact
    const diagAfter = await ClinicalDiagnosisService.getConfirmedDiagnosis(patientA);
    expect(diagAfter).not.toBeNull();
    expect(diagAfter?.pathway).toBe('alzheimers_confirmed');
    expect(diagAfter?.clinicalStage).toBe('mild_cognitive_impairment');
    expect(diagAfter?.confirmedByDoctorName).toBe('Dr. Meera Joshi');
  });

  it('7. Restore defaults NEVER clears routine instances or task history', () => {
    TaskLifecycleService.saveRecurringTasks(patientA, [
      {
        id: 'task_water_plant',
        patientId: patientA,
        title: 'Water Balcony Plants',
        description: 'Watering plants',
        category: 'wellness',
        period: 'morning',
        scheduledTime: '07:30 AM',
        durationMinutes: 15,
        recurrence: 'daily',
        supportLevel: 'independent',
        createdBy: 'patient',
        lifecycleStatus: 'active',
        reminderConfig: { enabled: true, leadTimeMinutes: 5, followUpMinutes: 10, maxFollowUps: 2 },
        steps: ['1. Fill water', '2. Water plants'],
        modificationHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const tasksBefore = TaskLifecycleService.getRecurringTasks(patientA);
    expect(tasksBefore.length).toBe(1);

    // Trigger restore defaults
    AshaPersonalizationService.restoreDefaults(patientA);

    // Verify routine tasks remain intact
    const tasksAfter = TaskLifecycleService.getRecurringTasks(patientA);
    expect(tasksAfter.length).toBe(1);
    expect(tasksAfter[0].title).toBe('Water Balcony Plants');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Root HTML & DOM Class / Attribute Synchronization
  // --------------------------------------------------------------------------

  const TestConsumer: React.FC = () => {
    const acc = useAccessibility();
    return (
      <div>
        <span data-testid="current-text-size">{acc.textSize}</span>
        <button data-testid="btn-set-large" onClick={() => acc.setTextSize('large')}>
          Set Large
        </button>
        <button data-testid="btn-set-xl" onClick={() => acc.setTextSize('extra-large')}>
          Set XL
        </button>
        <button data-testid="btn-toggle-contrast" onClick={() => acc.setHighContrast(!acc.highContrast)}>
          Toggle Contrast
        </button>
        <button data-testid="btn-toggle-motion" onClick={() => acc.setReducedMotion(!acc.reducedMotion)}>
          Toggle Motion
        </button>
        <button data-testid="btn-toggle-spacing" onClick={() => acc.setLineSpacing(acc.lineSpacing === 'comfortable' ? 'standard' : 'comfortable')}>
          Toggle Spacing
        </button>
        <button data-testid="btn-toggle-touch" onClick={() => acc.setLargeTouchTargets(!acc.largeTouchTargets)}>
          Toggle Touch
        </button>
        <button data-testid="btn-toggle-clutter" onClick={() => acc.setReducedVisualClutter(!acc.reducedVisualClutter)}>
          Toggle Clutter
        </button>
      </div>
    );
  };

  it('8. Applies font-scale-large and font-scale-xl classes to documentElement', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    expect(document.documentElement.classList.contains('font-scale-normal')).toBe(true);

    fireEvent.click(screen.getByTestId('btn-set-large'));
    expect(document.documentElement.classList.contains('font-scale-large')).toBe(true);
    expect(document.documentElement.classList.contains('font-scale-normal')).toBe(false);

    fireEvent.click(screen.getByTestId('btn-set-xl'));
    expect(document.documentElement.classList.contains('font-scale-xl')).toBe(true);
    expect(document.documentElement.classList.contains('font-scale-large')).toBe(false);
  });

  it('9. Synchronizes data-text-size attribute on documentElement', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    expect(document.documentElement.getAttribute('data-text-size')).toBe('standard');
    fireEvent.click(screen.getByTestId('btn-set-large'));
    expect(document.documentElement.getAttribute('data-text-size')).toBe('large');
    fireEvent.click(screen.getByTestId('btn-set-xl'));
    expect(document.documentElement.getAttribute('data-text-size')).toBe('extra-large');
  });

  it('10. Toggles high-contrast class and data-high-contrast attribute', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('false');

    fireEvent.click(screen.getByTestId('btn-toggle-contrast'));
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('true');
  });

  it('11. Toggles reduce-motion class and data-reduced-motion attribute', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('false');

    fireEvent.click(screen.getByTestId('btn-toggle-motion'));
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');
  });

  it('12. Toggles comfortable-spacing class and data-line-spacing attribute', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    expect(document.documentElement.classList.contains('comfortable-spacing')).toBe(false);
    expect(document.documentElement.getAttribute('data-line-spacing')).toBe('standard');

    fireEvent.click(screen.getByTestId('btn-toggle-spacing'));
    expect(document.documentElement.classList.contains('comfortable-spacing')).toBe(true);
    expect(document.documentElement.getAttribute('data-line-spacing')).toBe('comfortable');
  });

  it('13. Toggles large-touch-targets class and data-touch-targets attribute', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    expect(document.documentElement.classList.contains('large-touch-targets')).toBe(false);
    expect(document.documentElement.getAttribute('data-touch-targets')).toBe('standard');

    fireEvent.click(screen.getByTestId('btn-toggle-touch'));
    expect(document.documentElement.classList.contains('large-touch-targets')).toBe(true);
    expect(document.documentElement.getAttribute('data-touch-targets')).toBe('large');
  });

  it('14. Toggles reduced-clutter class and data-reduced-clutter attribute', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    expect(document.documentElement.classList.contains('reduced-clutter')).toBe(false);
    expect(document.documentElement.getAttribute('data-reduced-clutter')).toBe('false');

    fireEvent.click(screen.getByTestId('btn-toggle-clutter'));
    expect(document.documentElement.classList.contains('reduced-clutter')).toBe(true);
    expect(document.documentElement.getAttribute('data-reduced-clutter')).toBe('true');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: GuidedTaskRunner Cognitive Pacing & Safety
  // --------------------------------------------------------------------------

  it('15. Scales GuidedTaskRunner step text dynamically when textSize is extra-large', () => {
    AshaPersonalizationService.updatePreferences(patientA, { textSize: 'extra-large' });

    render(
      <AccessibilityProvider>
        <GuidedTaskRunner
          isOpen={true}
          routine={mockRoutine}
          patientId={patientA}
          onClose={vi.fn()}
          onFinish={vi.fn()}
        />
      </AccessibilityProvider>
    );

    const stepTextEl = screen.getByTestId('guided-current-step-text');
    expect(stepTextEl.className).toContain('text-xl sm:text-2xl font-black');
  });

  it('16. Defaults GuidedTaskRunner to single-step view when maxInstructionsPerTurn is 1', () => {
    AshaPersonalizationService.updatePreferences(patientA, { maxInstructionsPerTurn: 1 });

    render(
      <AccessibilityProvider>
        <GuidedTaskRunner
          isOpen={true}
          routine={mockRoutine}
          patientId={patientA}
          onClose={vi.fn()}
          onFinish={vi.fn()}
        />
      </AccessibilityProvider>
    );

    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByTestId('guided-current-step-text')).toBeInTheDocument();
  });

  it('17. Displays consequential confirmation modal on exit when requireActionConfirmations is true', () => {
    AshaPersonalizationService.updatePreferences(patientA, { requireActionConfirmations: true });

    render(
      <AccessibilityProvider>
        <GuidedTaskRunner
          isOpen={true}
          routine={mockRoutine}
          patientId={patientA}
          onClose={vi.fn()}
          onFinish={vi.fn()}
        />
      </AccessibilityProvider>
    );

    const closeBtn = screen.getByLabelText('Close Task Runner');
    fireEvent.click(closeBtn);

    expect(screen.getByTestId('exit-confirm-modal')).toBeInTheDocument();
    expect(screen.getByText(/Take a pause or leave routine\?/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-pause-and-save')).toBeInTheDocument();
    expect(screen.getByTestId('btn-continue-task')).toBeInTheDocument();
    expect(screen.getByTestId('btn-discard-exit')).toBeInTheDocument();
  });

  it('18. Pausing and saving from exit modal writes active session to RoutineSessionService', () => {
    AshaPersonalizationService.updatePreferences(patientA, { requireActionConfirmations: true });
    const onCloseMock = vi.fn();

    render(
      <AccessibilityProvider>
        <GuidedTaskRunner
          isOpen={true}
          routine={mockRoutine}
          patientId={patientA}
          onClose={onCloseMock}
          onFinish={vi.fn()}
        />
      </AccessibilityProvider>
    );

    fireEvent.click(screen.getByLabelText('Close Task Runner'));
    fireEvent.click(screen.getByTestId('btn-pause-and-save'));

    expect(onCloseMock).toHaveBeenCalled();
    const saved = RoutineSessionService.getActiveSession(patientA, mockRoutine.id);
    expect(saved).not.toBeNull();
    expect(saved?.routineId).toBe(mockRoutine.id);
  });

  it('19. Discarding and exiting from exit modal clears active session cleanly', () => {
    AshaPersonalizationService.updatePreferences(patientA, { requireActionConfirmations: true });
    const onCloseMock = vi.fn();

    render(
      <AccessibilityProvider>
        <GuidedTaskRunner
          isOpen={true}
          routine={mockRoutine}
          patientId={patientA}
          onClose={onCloseMock}
          onFinish={vi.fn()}
        />
      </AccessibilityProvider>
    );

    fireEvent.click(screen.getByLabelText('Close Task Runner'));
    fireEvent.click(screen.getByTestId('btn-discard-exit'));

    expect(onCloseMock).toHaveBeenCalled();
    const saved = RoutineSessionService.getActiveSession(patientA, mockRoutine.id);
    expect(saved).toBeNull();
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 4: RoutineChecklist Status Distinctions (Non-Punitive)
  // --------------------------------------------------------------------------

  it('20. Renders completed status badge (routine-status-completed)', () => {
    const routine: RoutineItem = { ...mockRoutine, isCompleted: true };
    render(
      <LanguageProvider>
        <RoutineChecklist
          routines={[routine]}
          onToggleComplete={vi.fn()}
          onSnooze={vi.fn()}
          onLaunchTaskRunner={vi.fn()}
          onLaunchAssistedRecall={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(screen.getByTestId('routine-status-completed')).toBeInTheDocument();
    expect(screen.getByTestId('routine-status-completed').textContent).toContain('Completed');
  });

  it('21. Renders assisted status badge (routine-status-assisted)', () => {
    const routine: RoutineItem = { ...mockRoutine, isCompleted: true, notes: 'completed with assisted guidance' };
    render(
      <LanguageProvider>
        <RoutineChecklist
          routines={[routine]}
          onToggleComplete={vi.fn()}
          onSnooze={vi.fn()}
          onLaunchTaskRunner={vi.fn()}
          onLaunchAssistedRecall={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(screen.getByTestId('routine-status-assisted')).toBeInTheDocument();
    expect(screen.getByTestId('routine-status-assisted').textContent).toContain('With Assistance');
  });

  it('22. Renders resting/skipped status badge (routine-status-skipped) with non-punitive wording', () => {
    const routine: RoutineItem = { ...mockRoutine, isCompleted: false, status: 'not_done' };
    render(
      <LanguageProvider>
        <RoutineChecklist
          routines={[routine]}
          onToggleComplete={vi.fn()}
          onSnooze={vi.fn()}
          onLaunchTaskRunner={vi.fn()}
          onLaunchAssistedRecall={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(screen.getByTestId('routine-status-skipped')).toBeInTheDocument();
    expect(screen.getByTestId('routine-status-skipped').textContent).toContain('Resting / Preserving Energy');
  });

  it('23. Renders snoozed status badge (routine-status-snoozed)', () => {
    const routine: RoutineItem = { ...mockRoutine, isCompleted: false, snoozedUntil: '09:15 AM' };
    render(
      <LanguageProvider>
        <RoutineChecklist
          routines={[routine]}
          onToggleComplete={vi.fn()}
          onSnooze={vi.fn()}
          onLaunchTaskRunner={vi.fn()}
          onLaunchAssistedRecall={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(screen.getByTestId('routine-status-snoozed')).toBeInTheDocument();
    expect(screen.getByTestId('routine-status-snoozed').textContent).toContain('Snoozed');
  });

  it('24. Renders pending status badge (routine-status-pending)', () => {
    const routine: RoutineItem = { ...mockRoutine, isCompleted: false };
    render(
      <LanguageProvider>
        <RoutineChecklist
          routines={[routine]}
          onToggleComplete={vi.fn()}
          onSnooze={vi.fn()}
          onLaunchTaskRunner={vi.fn()}
          onLaunchAssistedRecall={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(screen.getByTestId('routine-status-pending')).toBeInTheDocument();
    expect(screen.getByTestId('routine-status-pending').textContent).toContain('Pending');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Multilingual Completeness across 7 Priority Languages
  // --------------------------------------------------------------------------

  const requiredKeys = [
    'accessibility.title',
    'accessibility.text_size',
    'accessibility.high_contrast',
    'accessibility.reduced_motion',
    'accessibility.comfortable_spacing',
    'accessibility.touch_targets',
    'accessibility.instructions_per_turn',
    'accessibility.restore_defaults',
    'runner.confirm_exit_title',
    'runner.pause_and_save',
    'runner.continue_task',
    'runner.discard_exit',
    'routines.status_completed',
    'routines.status_assisted',
    'routines.status_skipped',
    'routines.status_snoozed',
    'routines.status_pending',
    'voice.mic_permission_needed',
    'voice.listening',
    'voice.calm_error',
  ];

  it('25. Validates English (en) dictionary covers all accessibility and runner keys', () => {
    for (const key of requiredKeys) {
      expect((enTranslations as any)[key], `Missing English key ${key}`).toBeDefined();
      expect(typeof (enTranslations as any)[key]).toBe('string');
      expect((enTranslations as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('26. Validates Hindi (hi) dictionary covers all accessibility and runner keys', () => {
    for (const key of requiredKeys) {
      expect((hiTranslations as any)[key], `Missing Hindi key ${key}`).toBeDefined();
      expect(typeof (hiTranslations as any)[key]).toBe('string');
      expect((hiTranslations as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('27. Validates Marathi (mr) dictionary covers all accessibility and runner keys', () => {
    for (const key of requiredKeys) {
      expect((mrTranslations as any)[key], `Missing Marathi key ${key}`).toBeDefined();
      expect(typeof (mrTranslations as any)[key]).toBe('string');
      expect((mrTranslations as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('28. Validates Tamil (ta) dictionary covers all accessibility and runner keys', () => {
    for (const key of requiredKeys) {
      expect((taTranslations as any)[key], `Missing Tamil key ${key}`).toBeDefined();
      expect(typeof (taTranslations as any)[key]).toBe('string');
      expect((taTranslations as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('29. Validates Telugu (te) dictionary covers all accessibility and runner keys', () => {
    for (const key of requiredKeys) {
      expect((teTranslations as any)[key], `Missing Telugu key ${key}`).toBeDefined();
      expect(typeof (teTranslations as any)[key]).toBe('string');
      expect((teTranslations as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('30. Validates Kannada (kn) dictionary covers all accessibility and runner keys', () => {
    for (const key of requiredKeys) {
      expect((knTranslations as any)[key], `Missing Kannada key ${key}`).toBeDefined();
      expect(typeof (knTranslations as any)[key]).toBe('string');
      expect((knTranslations as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('31. Validates Bengali (bn) dictionary covers all accessibility and runner keys', () => {
    for (const key of requiredKeys) {
      expect((bnTranslations as any)[key], `Missing Bengali key ${key}`).toBeDefined();
      expect(typeof (bnTranslations as any)[key]).toBe('string');
      expect((bnTranslations as any)[key].length).toBeGreaterThan(0);
    }
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Language Switching Continuity & Speech Service Hardening
  // --------------------------------------------------------------------------

  it('32. Switching languages during active routine preserves session step, timer and progress', () => {
    RoutineSessionService.saveActiveSession({
      sessionId: 'sess_lang_switch_01',
      patientId: patientA,
      routineId: mockRoutine.id,
      routineTitle: mockRoutine.title,
      currentStepIndex: 1,
      completedStepIndices: [0],
      stepHintTiers: { 0: 0, 1: 1 },
      stepAssistance: {},
      secondsRemaining: 720,
      isResting: false,
      restSecondsRemaining: 120,
      viewMode: 'single',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });

    // Simulate switching app language to Hindi
    localStorage.setItem('saksham_language', 'hi');

    const sessionAfterLangChange = RoutineSessionService.getActiveSession(patientA, mockRoutine.id);
    expect(sessionAfterLangChange).not.toBeNull();
    expect(sessionAfterLangChange?.currentStepIndex).toBe(1);
    expect(sessionAfterLangChange?.completedStepIndices).toEqual([0]);
    expect(sessionAfterLangChange?.secondsRemaining).toBe(720);
  });

  it('33. SpeechService translates Web Speech errors into calm, non-technical guidance', () => {
    const notAllowedMsgEn = SpeechService.getCalmVoiceErrorMessage('not-allowed', 'en');
    expect(notAllowedMsgEn).toContain('Microphone access is paused');

    const notAllowedMsgHi = SpeechService.getCalmVoiceErrorMessage('not-allowed', 'hi');
    expect(notAllowedMsgHi).toContain('माइक्रोफ़ोन की अनुमति रुकी हुई है');

    const noSpeechMsgMr = SpeechService.getCalmVoiceErrorMessage('no-speech', 'mr');
    expect(noSpeechMsgMr).toContain('शांतपणे वेळ घ्या');

    const audioCaptureMsgTa = SpeechService.getCalmVoiceErrorMessage('audio-capture', 'ta');
    expect(audioCaptureMsgTa.length).toBeGreaterThan(10);
  });

  it('34. SpeechService abortListening cleans up recognition instance cleanly without throw', () => {
    expect(() => SpeechService.abortListening()).not.toThrow();
    expect(() => SpeechService.stopListening()).not.toThrow();
  });

  it('35. PatientProfile renders comprehensive comfort & accessibility preference controls', () => {
    render(
      <MemoryRouter>
        <AccessibilityProvider>
          <PatientProfile />
        </AccessibilityProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Accessibility, Comfort & Pacing/i)).toBeInTheDocument();
    expect(screen.getByText(/High Contrast/i)).toBeInTheDocument();
    expect(screen.getByText(/Comfortable Line Spacing/i)).toBeInTheDocument();
    expect(screen.getByText(/Reduced Motion/i)).toBeInTheDocument();
    expect(screen.getByText(/Large Touch Targets/i)).toBeInTheDocument();
    expect(screen.getByText(/One Step at a Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Restore Defaults/i)).toBeInTheDocument();
  });
});
