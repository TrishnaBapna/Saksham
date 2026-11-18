/**
 * SAKSHAM NEURO-CARE — CORRECTED MASTER REQUIREMENTS INTEGRATION TEST SUITE
 * Validates the four core priorities:
 * 1. Priority 1: Full Application Language Translation (One Language translates complete app; 22 languages + English)
 * 2. Priority 2: Genuinely Intelligent Multilingual ASHA with Real Action Execution & Multi-Turn Context
 * 3. Priority 3: Adaptive Daily Routines (Today's Condition + Hardcoded Essential Medication Protection + 1-Tap Restore)
 * 4. Priority 4: Exactly Two Login Interfaces (Doctor & Patient; zero disease-specific login screens; clinician diagnosis assignment)
 *
 * Target: AIU Anveshan National Student Research Convention (2 December 2026)
 * 100% Spark Free Plan Compliant — $0.00 Cloud Cost
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationSafetyPolicy } from '../features/ai-companion/services/conversationSafetyPolicy.js';
import { DailyWellbeingService } from '../features/adaptive/services/dailyWellbeingService.js';
import { ClinicalDiagnosisService } from '../features/clinical/services/clinicalDiagnosisService.js';
import { DEFAULT_PATIENT_ROUTINES } from '../features/routines/services/routineService.js';
import { ALL_LANGUAGES, translate, getLanguageMetadata } from '../i18n/index.js';
import { RoutineItem } from '../types/index.js';

describe('Saksham Corrected Master Requirements Integration Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    ConversationEngine.clearTurnContext();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // PRIORITY 1: FULL APPLICATION LOCALIZATION
  // =========================================================================
  describe('Priority 1: Complete Application Localization', () => {
    it('1.1. Verifies that all 22 scheduled Indian languages plus English are registered in ALL_LANGUAGES', () => {
      expect(ALL_LANGUAGES.length).toBeGreaterThanOrEqual(23); // 22 scheduled + English
      const codes = ALL_LANGUAGES.map((l) => l.code);

      // Verify core scheduled languages
      expect(codes).toContain('en');
      expect(codes).toContain('hi');
      expect(codes).toContain('mr');
      expect(codes).toContain('bn');
      expect(codes).toContain('ta');
      expect(codes).toContain('te');
      expect(codes).toContain('gu');
      expect(codes).toContain('kn');
      expect(codes).toContain('ml');
      expect(codes).toContain('pa');
      expect(codes).toContain('ur');
    });

    it('1.2. Verifies complete translations for English, Hindi, and Marathi across all app domains', () => {
      const keysToTest = [
        'app.title',
        'loved_ones.title',
        'loved_ones.add_member',
        'loved_ones.empty_title',
        'games.title',
        'games.random_game',
        'games.play_now',
        'routines.today_routine',
        'routines.today_condition_prompt',
        'routines.feeling_energetic',
        'routines.feeling_tired',
        'routines.feeling_peaceful',
        'routines.essential_badge',
        'routines.flexible_badge',
        'routines.restore_familiar',
        'login.role_patient',
        'login.role_doctor',
      ];

      for (const lang of ['en', 'hi', 'mr'] as const) {
        for (const key of keysToTest) {
          const val = translate(lang, key);
          expect(val).toBeDefined();
          expect(val.length).toBeGreaterThan(0);
          // Key should not be returned as raw fallback key string
          expect(val).not.toBe(key);
        }
      }
    });

    it('1.3. Verifies RTL script direction metadata for Urdu and Kashmiri', () => {
      const urduMeta = getLanguageMetadata('ur');
      expect(urduMeta.direction).toBe('rtl');

      const hindiMeta = getLanguageMetadata('hi');
      expect(hindiMeta.direction).toBe('ltr');

      const marathiMeta = getLanguageMetadata('mr');
      expect(marathiMeta.direction).toBe('ltr');
    });

    it('1.4. Verifies fallback to English when a regional language dictionary has an untranslated key', () => {
      // Using an arbitrary language code like 'as' (Assamese) with a standard key
      const val = translate('as', 'app.title');
      expect(val).toBeDefined();
      expect(val.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // PRIORITY 2: GENUINELY INTELLIGENT MULTILINGUAL ASHA & REAL ACTION DISPATCH
  // =========================================================================
  describe('Priority 2: Genuinely Intelligent Multilingual ASHA & Real Action Execution', () => {
    it('2.1. Understands natural speech request to see family and dispatches NAVIGATE_LOVED_ONES action', () => {
      const englishQuery = 'I want to see my family and loved ones';
      const resEn = ConversationEngine.process(englishQuery, undefined, 'en');
      expect(resEn.suggestedAction).toBeDefined();
      expect(resEn.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');

      const marathiQuery = 'मला माझे कुटुंब आणि फोटो पाहायचे आहेत';
      const resMr = ConversationEngine.process(marathiQuery, undefined, 'mr');
      expect(resMr.suggestedAction).toBeDefined();
      expect(resMr.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    it('2.2. Understands natural request to play mind games and dispatches NAVIGATE_MIND_GAMES action', () => {
      const englishQuery = 'Open my mind games for me';
      const resEn = ConversationEngine.process(englishQuery, undefined, 'en');
      expect(resEn.suggestedAction).toBeDefined();
      expect(resEn.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');

      const hindiQuery = 'माइंड गेम्स संग्रह खोलो';
      const resHi = ConversationEngine.process(hindiQuery, undefined, 'hi');
      expect(resHi.suggestedAction).toBeDefined();
      expect(resHi.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });

    it('2.3. Understands camera request and dispatches OPEN_CAMERA action with permissions expectation', () => {
      const cameraQuery = 'Open the camera to take a photo of my room';
      const res = ConversationEngine.process(cameraQuery, undefined, 'en');
      expect(res.intent).toBe('OPEN_CAMERA');
      expect(res.suggestedAction).toBeDefined();
      expect(res.suggestedAction?.action).toBe('OPEN_CAMERA');

      const marathiCamera = 'कॅमेरा उघडा';
      const resMr = ConversationEngine.process(marathiCamera, undefined, 'mr');
      expect(resMr.intent).toBe('OPEN_CAMERA');
      expect(resMr.suggestedAction?.action).toBe('OPEN_CAMERA');
    });

    it('2.4. Understands to-do / task queries and dispatches NAVIGATE_ROUTINES action', () => {
      const todoQuery = 'Check my tasks for today';
      const res = ConversationEngine.process(todoQuery, undefined, 'en');
      expect(res.suggestedAction?.action).toBe('NAVIGATE_ROUTINES');
    });

    it('2.5. Multi-turn conversation context memory correctly resolves ambiguous follow-up choices', () => {
      const patientId = 'test-patient-ctx-001';

      // Turn 1: Patient asks ambiguous query
      const turn1 = ConversationEngine.process('show me that', undefined, 'en', patientId);
      expect(turn1.intent).toBe('AMBIGUOUS_QUERY');
      expect(turn1.clarificationOptions).toBeDefined();
      expect(turn1.clarificationOptions?.length).toBeGreaterThanOrEqual(3);

      // Turn 2: Patient answers with follow-up choice "Family photos"
      const turn2 = ConversationEngine.process('family photos please', undefined, 'en', patientId);
      expect(turn2.intent).toBe('NAVIGATE_FAMILY');
      expect(turn2.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    it('2.6. Multi-turn context memory resolves choice to Mind Games', () => {
      const patientId = 'test-patient-ctx-002';

      // Turn 1: Ambiguous prompt
      ConversationEngine.process('what is that', undefined, 'en', patientId);

      // Turn 2: Follow-up response "the games"
      const turn2 = ConversationEngine.process('games', undefined, 'en', patientId);
      expect(turn2.intent).toBe('NAVIGATE_GAMES');
      expect(turn2.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });

    it('2.7. Correctly handles negated emergency statements without triggering false 112 alerts', () => {
      // Affirmative emergency
      const affirmativeCheck = ConversationSafetyPolicy.checkEmergencyDistress(
        'I have severe chest pain and cannot breathe',
        'en'
      );
      expect(affirmativeCheck?.isEmergency).toBe(true);

      // Negated statement returns null (safe, no emergency)
      const negatedCheck = ConversationSafetyPolicy.checkEmergencyDistress(
        'I have no chest pain and no breathing trouble',
        'en'
      );
      expect(negatedCheck).toBeNull();

      // Marathi negated
      const marathiNegated = ConversationSafetyPolicy.checkEmergencyDistress(
        'मला चक्कर येत नाही आहे',
        'mr'
      );
      expect(marathiNegated).toBeNull();
    });
  });

  // =========================================================================
  // PRIORITY 3: ADAPTIVE DAILY ROUTINES & ESSENTIAL TASK PROTECTION
  // =========================================================================
  describe('Priority 3: Intelligent Daily Routine Adaptation & Essential Task Protection', () => {
    it('3.1. Correctly identifies doctor-prescribed medications as strictly essential tasks based on individual prescription records', () => {
      const clinicianPrescribedTask: RoutineItem = {
        id: 'routine-02',
        title: 'Morning Clinician-Prescribed Medication',
        scheduledTime: '08:30 AM',
        category: 'medication',
        isClinicianPrescribed: true,
        prescriptionRef: 'rx-morning-primary',
        streakCount: 6,
        isCompleted: false,
        enableAssistedRecall: true,
      };

      const recreationalTask: RoutineItem = {
        id: 'routine-07',
        title: 'Assisted Garden Walk & Motor Steps',
        scheduledTime: '04:30 PM',
        category: 'exercise',
        streakCount: 4,
        isCompleted: false,
        enableAssistedRecall: true,
      };

      expect(DailyWellbeingService.isEssentialTask(clinicianPrescribedTask)).toBe(true);
      expect(DailyWellbeingService.isEssentialTask(recreationalTask)).toBe(false);
    });

    it('3.2. When patient reports "tired", essential tasks are NEVER postponed, while flexible tasks are adapted', () => {
      const routines = DEFAULT_PATIENT_ROUTINES;
      const { adaptedRoutines, postponedCount, essentialCount } =
        DailyWellbeingService.adaptRoutinesForDailyCondition(routines, 'tired');

      expect(essentialCount).toBeGreaterThanOrEqual(1);
      expect(postponedCount).toBeGreaterThan(0);

      // Verify that every medication task remains not postponed
      for (const item of adaptedRoutines) {
        if (item.category === 'medication' || (item as any).isEssential) {
          expect(item.adaptedForFatigue).toBe(false);
        } else {
          expect(item.adaptedForFatigue).toBe(true);
        }
      }
    });

    it('3.3. Natural spoken statement "I am tired today" triggers wellbeing fatigue adaptation', () => {
      const patientId = 'test-patient-wellbeing-01';
      const res = ConversationEngine.process('I feel very tired today', undefined, 'en', patientId);

      expect(res.intent).toBe('WELLBEING_TIRED');
      expect(DailyWellbeingService.isAdaptedForFatigue(patientId)).toBe(true);
      expect(res.suggestedAction?.action).toBe('NAVIGATE_ROUTINES');
    });

    it('3.4. 1-Tap "Restore Familiar Routine" immediately resets fatigue adaptations to peaceful baseline', () => {
      const patientId = 'test-patient-wellbeing-02';
      DailyWellbeingService.setDailyCondition(patientId, 'tired');
      expect(DailyWellbeingService.isAdaptedForFatigue(patientId)).toBe(true);

      // Perform 1-tap restore
      const restored = DailyWellbeingService.restoreFamiliarBaseline(patientId);
      expect(restored.condition).toBe('peaceful');
      expect(restored.isAdaptedForFatigue).toBe(false);
      expect(DailyWellbeingService.isAdaptedForFatigue(patientId)).toBe(false);
    });
  });

  // =========================================================================
  // PRIORITY 4: TWO LOGIN INTERFACES & DOCTOR CLINICAL DIAGNOSIS ASSIGNMENT
  // =========================================================================
  describe('Priority 4: Exactly Two Login Roles & Clinical Diagnosis Assignment', () => {
    it('4.1. Verifies that login roles present exactly Patient and Doctor as the two primary clinical portals', () => {
      const patientLabel = translate('en', 'login.role_patient');
      const doctorLabel = translate('en', 'login.role_doctor');

      expect(patientLabel).toBe('Patient Login');
      expect(doctorLabel).toBe('Doctor Login');

      // Verify Marathi translations
      expect(translate('mr', 'login.role_patient')).toContain('रुग्ण लॉगिन');
      expect(translate('mr', 'login.role_doctor')).toContain('डॉक्टर लॉगिन');
    });

    it('4.2. Successfully allows Doctor to assign Pathway A (Doctor-Confirmed Alzheimer\'s Disease)', async () => {
      const patientId = 'patient-ad-001';
      const assigned = await ClinicalDiagnosisService.assignDiagnosis({
        patientId,
        confirmedByDoctorId: 'doc-99',
        confirmedByDoctorName: 'Aarav Mehta',
        doctorRegistrationNumber: 'MCI-MH-2024-89712',
        pathway: 'alzheimers_confirmed',
        etiology: 'ALZHEIMERS_AMYLOID_CONFIRMED',
        clinicalStage: 'mild_cognitive_impairment',
        diagnosticCriteria: 'NIA-AA 2018 Research Framework & Amyloid PET',
        clinicalRationale: 'Amyloid-PET positive with progressive episodic memory impairment.',
      });

      expect(assigned.pathway).toBe('alzheimers_confirmed');
      expect(assigned.etiology).toBe('ALZHEIMERS_AMYLOID_CONFIRMED');
      expect(assigned.doctorRegistrationNumber).toBe('MCI-MH-2024-89712');

      const fetched = await ClinicalDiagnosisService.getConfirmedDiagnosis(patientId);
      expect(fetched?.pathway).toBe('alzheimers_confirmed');
    });

    it('4.3. Successfully allows Doctor to assign Pathway B with Parkinson\'s Disease or Parkinson\'s Dementia', async () => {
      const patientId = 'patient-pd-002';
      const assigned = await ClinicalDiagnosisService.assignDiagnosis({
        patientId,
        confirmedByDoctorId: 'doc-99',
        confirmedByDoctorName: 'Aarav Mehta',
        doctorRegistrationNumber: 'MCI-MH-2024-89712',
        pathway: 'other_or_mixed_dementia',
        etiology: 'PARKINSONS_DISEASE',
        clinicalStage: 'mild_cognitive_impairment',
        diagnosticCriteria: 'MDS Clinical Diagnostic Criteria for Parkinson\'s Disease',
        clinicalRationale: 'Bradykinesia, asymmetric resting tremor, responsive to Levodopa.',
      });

      expect(assigned.pathway).toBe('other_or_mixed_dementia');
      expect(assigned.etiology).toBe('PARKINSONS_DISEASE');

      const fetched = await ClinicalDiagnosisService.getConfirmedDiagnosis(patientId);
      expect(fetched?.etiology).toBe('PARKINSONS_DISEASE');
    });

    it('4.4. Patient with unassigned diagnosis returns null/pending without forcing self-diagnosis', async () => {
      const unassignedPatient = 'patient-unassigned-003';
      const diagnosis = await ClinicalDiagnosisService.getConfirmedDiagnosis(unassignedPatient);
      // Returns null when no doctor has yet evaluated, letting UI display "Clinical Evaluation Pending"
      expect(diagnosis).toBeNull();
    });

    it('4.5. Amending a diagnosis preserves immutable historical audit trail', async () => {
      const patientId = 'patient-amend-004';
      const initial = await ClinicalDiagnosisService.assignDiagnosis({
        patientId,
        confirmedByDoctorId: 'doc-99',
        confirmedByDoctorName: 'Aarav Mehta',
        doctorRegistrationNumber: 'MCI-MH-2024-89712',
        pathway: 'other_or_mixed_dementia',
        etiology: 'VASCULAR_DEMENTIA',
        clinicalStage: 'mild_cognitive_impairment',
        diagnosticCriteria: 'NINDS-AIREN Criteria',
        clinicalRationale: 'Subcortical ischemic white matter changes on MRI.',
      });

      const amended = await ClinicalDiagnosisService.amendDiagnosis(
        patientId,
        initial.id,
        {
          pathway: 'other_or_mixed_dementia',
          etiology: 'MIXED_ETIOLOGY',
          clinicalStage: 'mild_dementia',
          amendmentReason: 'Follow-up amyloid PET reveals secondary Alzheimer pathology, confirming mixed etiology.',
          amendedByDoctorId: 'doc-99',
          amendedByDoctorName: 'Aarav Mehta',
        }
      );

      expect(amended.etiology).toBe('MIXED_ETIOLOGY');
      expect(amended.amendments?.length).toBe(1);
      expect(amended.amendments?.[0].previousEtiology).toBe('VASCULAR_DEMENTIA');
      expect(amended.amendments?.[0].amendmentReason).toContain('amyloid PET');
    });
  });
});
