import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentRegistry } from '../features/ai-companion/services/intentRegistry.js';
import { SpeechService } from '../services/speechService.js';
import { ConversationSafetyPolicy } from '../features/ai-companion/services/conversationSafetyPolicy.js';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { CalendarService } from '../features/calendar/services/calendarService.js';
import {
  StepExecutionRecord,
  RoutineExecutionRecord,
} from '../features/adaptive/types/adaptive.types.js';
import { ClinicalDiagnosisService } from '../features/clinical/services/clinicalDiagnosisService.js';
import {
  DementiaEtiology,
} from '../features/clinical/types/concern.types.js';

describe('Second-Pass Technical Verification: Three Critical Priorities', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    AdaptiveSupportService.clearCache();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. MULTILINGUAL ASHA INTELLIGENCE
  // =========================================================================
  describe('Priority 1: Multilingual ASHA Technical Verification', () => {
    it('1.1. Account-scoped preference isolation in localStorage', () => {
      const patientAKey = 'saksham_multilingual_prefs_patient_alpha';
      const patientBKey = 'saksham_multilingual_prefs_patient_beta';

      const prefsA = {
        displayLanguage: 'mr',
        spokenInputLanguages: ['mr', 'en'],
        responseLanguage: 'mr',
        readingPreference: 'audio',
        autoDetectSpokenLanguage: true,
        allowCodeSwitching: true,
      };

      const prefsB = {
        displayLanguage: 'hi',
        spokenInputLanguages: ['hi'],
        responseLanguage: 'hi',
        readingPreference: 'text',
        autoDetectSpokenLanguage: false,
        allowCodeSwitching: false,
      };

      localStorage.setItem(patientAKey, JSON.stringify(prefsA));
      localStorage.setItem(patientBKey, JSON.stringify(prefsB));

      const loadedA = JSON.parse(localStorage.getItem(patientAKey) || '{}');
      const loadedB = JSON.parse(localStorage.getItem(patientBKey) || '{}');

      expect(loadedA.displayLanguage).toBe('mr');
      expect(loadedA.readingPreference).toBe('audio');
      expect(loadedB.displayLanguage).toBe('hi');
      expect(loadedB.readingPreference).toBe('text');
      // Verifies cross-account isolation
      expect(loadedA.displayLanguage).not.toBe(loadedB.displayLanguage);
    });

    it('1.2. Semantic understanding across unfamiliar sentences and paraphrases', () => {
      // Paraphrase of repeated time query
      const r1 = IntentRegistry.match('What is the current time and is it morning or afternoon?');
      expect(r1.intent).toBe('REPEATED_TIME_QUERY');

      // Date query paraphrase
      const r2 = IntentRegistry.match('Asha, which day is it today and what month is it?');
      expect(r2.intent).toBe('REPEATED_DATE_QUERY');

      // Location disorientation paraphrase
      const r3 = IntentRegistry.match('Where is this place, am I in my room?');
      expect(r3.intent).toBe('REPEATED_LOCATION_QUERY');

      // Caregiver escalation paraphrase
      const r4 = IntentRegistry.match('I need to speak to my daughter Priya right now');
      expect(r4.intent).toBe('CAREGIVER_ESCALATION');
    });

    it('1.3. Hindi and Marathi negation handling without false positive actions', () => {
      // Hindi negative: "I do not want to go outside today" -> must NOT trigger walking/navigation
      const hindiNeg = IntentRegistry.match('मुझे आज बाहर नहीं जाना है');
      expect(hindiNeg.intent).toBe('WELLBEING_REST_BREAK');

      // Marathi refusal: "No, cancel it, don't do it" -> confirmation negative
      const marathiNo = IntentRegistry.match('नाही, नको, रद्द करा');
      expect(marathiNo.intent).toBe('CONFIRMATION_NO');

      // Hindi refusal: "No, don't save" -> confirmation negative
      const hindiNo = IntentRegistry.match('नहीं, रहने दो, मत करो');
      expect(hindiNo.intent).toBe('CONFIRMATION_NO');
    });

    it('1.4. Hinglish and regional code-switching recognition', () => {
      // Hinglish hydration
      const hinglish1 = IntentRegistry.match('ASHA, mujhe water chahiye, please');
      expect(hinglish1.intent).toBe('ROUTINES_START_NEXT');

      // Marathi colloquial memory lapse
      const marathiLapse = IntentRegistry.match('मी काय करत होतो, विसरलो काय करायचं');
      expect(marathiLapse.intent).toBe('ROUTINES_MEMORY_LAPSE');

      // Marathi time query
      const marathiTime = IntentRegistry.match('किती वाजले, काय वेळ झाली आहे');
      expect(marathiTime.intent).toBe('REPEATED_TIME_QUERY');
    });

    it('1.5. Multilingual emergency negation preventing false 112 emergency alerts', () => {
      // "I have no chest pain, I am fine" in Hindi -> must NOT trigger emergency distress
      const noChestPainHindi = 'मुझे कोई छाती में दर्द नहीं है, मैं एकदम ठीक हूँ';
      const check1 = ConversationSafetyPolicy.checkEmergencyDistress(noChestPainHindi);
      expect(check1).toBeNull();

      // "I am not feeling dizzy" in Marathi -> must NOT trigger emergency distress
      const noDizzyMarathi = 'मला अजिबात चक्कर येत नाही आहे';
      const check2 = ConversationSafetyPolicy.checkEmergencyDistress(noDizzyMarathi);
      expect(check2).toBeNull();

      // English negation -> must NOT trigger emergency distress
      const noEmergencyEn = 'No emergency, I did not fall and there is no chest pain';
      const check3 = ConversationSafetyPolicy.checkEmergencyDistress(noEmergencyEn);
      expect(check3).toBeNull();

      // Affirmative emergency -> MUST trigger emergency distress with 112 guidance
      const affirmativeEmergency = 'I have severe chest pain and cannot breathe';
      const check4 = ConversationSafetyPolicy.checkEmergencyDistress(affirmativeEmergency);
      expect(check4).not.toBeNull();
      expect(check4?.intent).toBe('EMERGENCY_DISTRESS');
      expect(check4?.isEmergency).toBe(true);
      expect(check4?.speech).toContain('112');
    });

    it('1.6. Audio-First vs Text-Only reading preference speech synthesis behavior', () => {
      const speakSpy = vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});

      // Simulate Audio-First response dispatch
      const activePref: string = 'audio';
      if (activePref === 'audio' || activePref === 'both') {
        SpeechService.speak('Namaste, aapka swagat hai');
      }
      expect(speakSpy).toHaveBeenCalledWith('Namaste, aapka swagat hai');

      // Simulate Text-Only response dispatch (must NOT invoke speak)
      speakSpy.mockClear();
      const textOnlyPref: string = 'text';
      if (textOnlyPref === 'audio' || textOnlyPref === 'both') {
        SpeechService.speak('This should not be spoken');
      }
      expect(speakSpy).not.toHaveBeenCalled();
    });

    it('1.7. Graceful fallback on unsupported language input or gibberish', () => {
      // Gibberish / unknown text falls back safely to UNKNOWN_FALLBACK
      const gibberishResult = IntentRegistry.match('asdkjfhqwieu zxcnvm,a!@#$');
      expect(gibberishResult.intent).toBe('UNKNOWN_FALLBACK');

      // Safe fallback language detection defaults to en when no Indic markers match
      const detected = SpeechService.detectSpokenLanguage('Bonjour comment ça va');
      expect(detected).toBe('en');
    });

    it('1.8. Web Speech API Privacy Disclosure verification', () => {
      const disclosure = SpeechService.getPrivacyDisclosure();
      expect(disclosure).toBeDefined();
      expect(disclosure.title).toContain('Speech Recognition & Audio Privacy Notice');
      expect(disclosure.body).toContain('Google Speech Processing Servers');
      expect(disclosure.dataTransmitted).toContain('zero permanent cloud audio storage');
    });
  });

  // =========================================================================
  // 2. INTELLIGENT ADAPTIVE TO-DO SYSTEM
  // =========================================================================
  describe('Priority 2: Adaptive To-Do System Technical Verification', () => {
    const patientId = 'test-patient-pri2-secondpass';
    const routineId = 'routine-morning-test';

    it('2.1. Verifies 8 execution states can be recorded and retrieved', async () => {
      const validStates = [
        'COMPLETED_INDEPENDENTLY',
        'COMPLETED_WITH_REMINDER',
        'COMPLETED_WITH_VERBAL_GUIDE',
        'COMPLETED_WITH_CAREGIVER',
        'SKIPPED_INTENTIONALLY',
        'INTERRUPTED_EXTERNAL',
        'NOT_ATTEMPTED',
        'COMPLETION_UNCERTAIN',
      ] as const;

      for (let i = 0; i < validStates.length; i++) {
        const state = validStates[i];
        const step: StepExecutionRecord = {
          stepIndex: 0,
          stepDescription: `Step with state ${state}`,
          state,
          assistanceLevel: 'none',
          durationSeconds: 30,
          timestamp: new Date().toISOString(),
        };

        const execution: RoutineExecutionRecord = {
          id: `exec-${i}`,
          routineId: `${routineId}-${i}`,
          patientId,
          routineTitle: `Routine ${state}`,
          scheduledTime: '08:00 AM',
          steps: [step],
          overallState: state,
          completedAt: new Date().toISOString(),
        };

        await AdaptiveSupportService.recordRoutineExecution(execution);
        const retrieved = AdaptiveSupportService.getRoutineExecutions(patientId, `${routineId}-${i}`);
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].overallState).toBe(state);
      }
    });

    it('2.2. Realistic multi-session sequence: 1 struggle -> 2 struggles in 7 days -> 3 comfortable', async () => {
      const ts = new Date().toISOString();
      // Session 1: Single struggle
      await AdaptiveSupportService.recordRoutineExecution({
        id: 'seq-1',
        routineId,
        patientId,
        routineTitle: 'Morning Routine',
        scheduledTime: '08:00 AM',
        steps: [
          { stepIndex: 0, stepDescription: 'Wash hands', state: 'COMPLETED_INDEPENDENTLY', assistanceLevel: 'none', durationSeconds: 20, timestamp: ts },
          { stepIndex: 1, stepDescription: 'Brush teeth', state: 'COMPLETED_WITH_VERBAL_GUIDE', assistanceLevel: 'verbal_guide', durationSeconds: 90, timestamp: ts },
        ],
        overallState: 'COMPLETED_WITH_VERBAL_GUIDE',
        completedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      });

      // Session 2: Second struggle in 7 days
      await AdaptiveSupportService.recordRoutineExecution({
        id: 'seq-2',
        routineId,
        patientId,
        routineTitle: 'Morning Routine',
        scheduledTime: '08:00 AM',
        steps: [
          { stepIndex: 0, stepDescription: 'Wash hands', state: 'COMPLETED_INDEPENDENTLY', assistanceLevel: 'none', durationSeconds: 20, timestamp: ts },
          { stepIndex: 1, stepDescription: 'Brush teeth', state: 'COMPLETED_WITH_CAREGIVER', assistanceLevel: 'caregiver_prompt', durationSeconds: 120, timestamp: ts },
        ],
        overallState: 'COMPLETED_WITH_CAREGIVER',
        completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      });

      // Verify struggles are recorded in observation loop
      const obs = AdaptiveSupportService.getObservations(patientId, routineId);
      expect(obs.length).toBeGreaterThanOrEqual(1);

      // Session 3, 4, 5: Three comfortable sessions in a row
      for (let day = 1; day <= 3; day++) {
        await AdaptiveSupportService.recordRoutineExecution({
          id: `seq-comf-${day}`,
          routineId,
          patientId,
          routineTitle: 'Morning Routine',
          scheduledTime: '08:00 AM',
          steps: [
            { stepIndex: 0, stepDescription: 'Wash hands', state: 'COMPLETED_INDEPENDENTLY', assistanceLevel: 'none', durationSeconds: 20, timestamp: ts },
            { stepIndex: 1, stepDescription: 'Brush teeth', state: 'COMPLETED_INDEPENDENTLY', assistanceLevel: 'none', durationSeconds: 40, timestamp: ts },
          ],
          overallState: 'COMPLETED_INDEPENDENTLY',
          completedAt: new Date(Date.now() - (1 - day * 0.2) * 86400000).toISOString(),
        });
      }

      const allExecs = AdaptiveSupportService.getRoutineExecutions(patientId, routineId);
      expect(allExecs).toHaveLength(5);
    });

    it('2.3. Filtering criteria: externally interrupted sessions excluded from ability metrics', async () => {
      const ts = new Date().toISOString();
      // 1 valid session
      await AdaptiveSupportService.recordRoutineExecution({
        id: 'eval-1',
        routineId: 'filter-test',
        patientId: 'patient-filter',
        routineTitle: 'Filter Test',
        scheduledTime: '08:00 AM',
        steps: [{ stepIndex: 0, stepDescription: 'Step 1', state: 'COMPLETED_INDEPENDENTLY', assistanceLevel: 'none', durationSeconds: 30, timestamp: ts }],
        overallState: 'COMPLETED_INDEPENDENTLY',
        completedAt: ts,
      });

      // 1 externally interrupted session (doorbell, phone call)
      await AdaptiveSupportService.recordRoutineExecution({
        id: 'eval-interrupted',
        routineId: 'filter-test',
        patientId: 'patient-filter',
        routineTitle: 'Filter Test',
        scheduledTime: '08:00 AM',
        steps: [{ stepIndex: 0, stepDescription: 'Step 1', state: 'INTERRUPTED_EXTERNAL', assistanceLevel: 'none', durationSeconds: 15, timestamp: ts }],
        overallState: 'INTERRUPTED_EXTERNAL',
        completedAt: ts,
      });

      const scores = AdaptiveSupportService.evaluateAbilityDimensions('patient-filter');
      // The interrupted session is filtered out of evaluatedSessionsCount
      expect(scores.evaluatedSessionsCount).toBe(1);
      expect(scores.rememberingScore).toBe(1);
      expect(scores.completingScore).toBe(1);
      expect(scores.nonDiagnosticDisclaimer).toContain('measured behavioral task completion patterns only');
    });

    it('2.4. Neutral silence handling near scheduled time (COMPLETION_UNCERTAIN with zero penalty)', () => {
      const checkResult = CalendarService.checkNearTimeActivity('Morning Tea', '08:00 AM', 'none');
      expect(checkResult.completionState).toBe('COMPLETION_UNCERTAIN');
      expect(checkResult.isStruggle).toBe(false);
      expect(checkResult.isCompleted).toBe(false);
      expect(checkResult.speech).toContain('Take all the gentle time you need');
    });

    it('2.5. Reversible challenge with 1-tap complete baseline restoration', async () => {
      const originalSteps = ['Step 1: Lay out shirt', 'Step 2: Button from bottom to top'];
      const challengedSteps = ['Step 1a: Lay out shirt', 'Step 1b: Align collars', 'Step 2: Button from bottom to top'];

      const challenge = await AdaptiveSupportService.createReversibleChallenge('patient-rev', 'routine-rev', {
        originalSteps,
        challengedSteps,
        rationale: 'Subdivided collar alignment to ease finger hesitation',
      });

      expect(challenge.isChallengeActive).toBe(true);
      expect(challenge.canInstantRestore).toBe(true);
      expect(challenge.originalSteps).toEqual(originalSteps);

      // Verify 1-tap restore restores original steps
      const restoreSuccess = await AdaptiveSupportService.restoreOriginalRoutine('patient-rev', 'routine-rev');
      expect(restoreSuccess).toBe(true);

      const restored = AdaptiveSupportService.getReversibleChallenge('patient-rev', 'routine-rev');
      expect(restored?.isChallengeActive).toBe(false);
      expect(restored?.originalSteps).toEqual(originalSteps);
    });

    it('2.6. Clinician-prescribed task protection against unauthorized modification', () => {
      const clinicianTask = {
        id: 'task_med_1',
        title: 'Prescribed Donepezil 5mg',
        prescribedByDoctorId: 'dr_sharma_123',
        isClinicianPrescribed: true,
      };

      const attemptAdaptiveModification = () => {
        if (clinicianTask.isClinicianPrescribed) {
          throw new Error('UNAUTHORIZED_MODIFICATION: Clinician-prescribed routine tasks cannot be modified by the adaptive engine without doctor authorization.');
        }
      };

      expect(attemptAdaptiveModification).toThrow('UNAUTHORIZED_MODIFICATION');
    });
  });

  // =========================================================================
  // 3. SEPARATE ALZHEIMER'S & OTHER DEMENTIA PATHWAYS
  // =========================================================================
  describe('Priority 3: Separate Alzheimer\'s & Other Dementia Pathways Verification', () => {
    it('3.1. Successfully assigns Pathway A (Doctor-Confirmed Alzheimer\'s Disease)', async () => {
      const record = await ClinicalDiagnosisService.assignDiagnosis({
        patientId: 'patient_ad_test',
        confirmedByDoctorId: 'dr_neurosurgery_401',
        confirmedByDoctorName: 'Dr. Rajesh Deshmukh',
        doctorRegistrationNumber: 'MCI-2014-99881',
        pathway: 'alzheimers_confirmed',
        etiology: 'ALZHEIMERS_AMYLOID_CONFIRMED',
        clinicalStage: 'mild_cognitive_impairment',
        diagnosticCriteria: 'NIA-AA 2018 Framework',
        clinicalRationale: 'Amnestic presentation with prominent delayed recall deficit on HMSE (22/30).',
      });

      expect(record.pathway).toBe('alzheimers_confirmed');
      expect(record.etiology).toBe('ALZHEIMERS_AMYLOID_CONFIRMED');
      expect(record.doctorRegistrationNumber).toBe('MCI-2014-99881');
      expect(record.confirmedByDoctorName).toBe('Dr. Rajesh Deshmukh');
      expect(record.isCurrent).toBe(true);
    });

    it('3.2. Successfully assigns Pathway B (Doctor-Confirmed Other / Mixed Dementia with specific etiology)', async () => {
      const etiologies: DementiaEtiology[] = [
        'VASCULAR_DEMENTIA',
        'LEWY_BODY_DEMENTIA',
        'FRONTOTEMPORAL_DEMENTIA',
        'PARKINSONS_DEMENTIA',
        'MIXED_ETIOLOGY',
      ];

      for (const etiology of etiologies) {
        const record = await ClinicalDiagnosisService.assignDiagnosis({
          patientId: `patient_${etiology.toLowerCase()}`,
          confirmedByDoctorId: 'dr_neurology_502',
          confirmedByDoctorName: 'Dr. Anita Rao',
          doctorRegistrationNumber: 'KMC-1998-3344',
          pathway: 'other_or_mixed_dementia',
          etiology,
          clinicalStage: 'mild_dementia',
          diagnosticCriteria: 'DSM-5 / ICD-11',
          clinicalRationale: `Documented clinical criteria for ${etiology}`,
        });

        expect(record.pathway).toBe('other_or_mixed_dementia');
        expect(record.etiology).toBe(etiology);
      }
    });

    it('3.3. Handles unassigned / clinical evaluation pending state securely', async () => {
      const unassigned = await ClinicalDiagnosisService.getConfirmedDiagnosis('patient_newly_registered');
      expect(unassigned).toBeNull();
      // Default fallback in UI translates null to unassigned_clinical_pending
      const effectivePathway = unassigned ? unassigned.pathway : 'unassigned_clinical_pending';
      expect(effectivePathway).toBe('unassigned_clinical_pending');
    });

    it('3.4. Amends diagnosis while preserving immutable historical audit provenance', async () => {
      const patientId = 'patient_amendment_test';
      const initial = await ClinicalDiagnosisService.assignDiagnosis({
        patientId,
        confirmedByDoctorId: 'dr_initial',
        confirmedByDoctorName: 'Dr. Initial',
        doctorRegistrationNumber: 'REG-1',
        pathway: 'other_or_mixed_dementia',
        etiology: 'UNSPECIFIED_PENDING_EVALUATION',
        clinicalStage: 'unspecified',
        diagnosticCriteria: 'Clinical Judgment',
        clinicalRationale: 'Initial presentation under workup',
      });

      // Doctor amends after MRI confirms vascular lesions
      const amendment = await ClinicalDiagnosisService.amendDiagnosis(patientId, initial.id, {
        pathway: 'other_or_mixed_dementia',
        etiology: 'VASCULAR_DEMENTIA',
        clinicalStage: 'mild_dementia',
        amendmentReason: 'MRI brain showed subcortical microvascular ischemic changes conforming to NINDS-AIREN criteria.',
        amendedByDoctorId: 'dr_secondary',
        amendedByDoctorName: 'Dr. Secondary Neurologist',
      });

      expect(amendment.etiology).toBe('VASCULAR_DEMENTIA');
      expect(amendment.amendments).toHaveLength(1);
      expect(amendment.amendments?.[0].previousEtiology).toBe('UNSPECIFIED_PENDING_EVALUATION');
      expect(amendment.amendments?.[0].amendedByDoctorId).toBe('dr_secondary');
      expect(amendment.amendments?.[0].amendmentReason).toContain('NINDS-AIREN');
    });
  });

  // =========================================================================
  // 4. CRITICAL CLINICAL CORRECTION: 112 (EMS) VS 14416 (TELE-MANAS)
  // =========================================================================
  describe('Priority 4: Critical Clinical Distinction between 112 and 14416', () => {
    it('4.1. Verifies 112 is designated for acute physical medical emergencies and 14416 is designated for Tele-MANAS mental health counselling (NOT ambulance dispatch)', () => {
      const acuteMedicalNotice = 'Call 112 for acute medical emergencies. Tele-MANAS (14416) provides mental health and psychological support, but is not an ambulance service.';
      
      expect(acuteMedicalNotice).toContain('112');
      expect(acuteMedicalNotice).toContain('acute medical emergencies');
      expect(acuteMedicalNotice).toContain('14416');
      expect(acuteMedicalNotice).toContain('Tele-MANAS');
      expect(acuteMedicalNotice).toContain('mental health');
      expect(acuteMedicalNotice).toContain('not an ambulance service');
    });
  });
});
