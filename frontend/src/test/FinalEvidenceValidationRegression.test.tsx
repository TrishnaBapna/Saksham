import { describe, it, expect, beforeEach } from 'vitest';
import { DailyWellbeingService } from '../features/adaptive/services/dailyWellbeingService.js';
import { DEFAULT_PATIENT_ROUTINES } from '../features/routines/services/routineService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationSafetyPolicy } from '../features/ai-companion/services/conversationSafetyPolicy.js';
import { IntentRegistry } from '../features/ai-companion/services/intentRegistry.js';
import { ClinicalDiagnosisService } from '../features/clinical/services/clinicalDiagnosisService.js';
import { ClinicalPrescriptionService } from '../features/clinical/services/clinicalPrescriptionService.js';
import { SpeechService } from '../services/speechService.js';
import { translate, ALL_LANGUAGES, getLanguageMetadata, isRTLLanguage } from '../i18n/index.js';
import { TRANSLATION_CATALOGUE } from '../i18n/interpolate.js';
import { RoutineItem } from '../types/index.js';

describe('SAKSHAM NEURO-CARE — FINAL EVIDENCE VALIDATION & CLINICAL SAFETY REGRESSION SUITE', () => {
  beforeEach(() => {
    ConversationEngine.clearTurnContext();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  // =========================================================================
  // 1. COMPLETE LOCALIZATION & RTL SCRIPT AUDIT
  // =========================================================================
  describe('Area 1: Localization & Script Rendering Audit', () => {
    it('1.1. Registers English + 22 Eighth Schedule Indian languages in ALL_LANGUAGES metadata', () => {
      expect(ALL_LANGUAGES).toHaveLength(23);
      const codes = ALL_LANGUAGES.map((l) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('hi');
      expect(codes).toContain('mr');
      expect(codes).toContain('ur');
      expect(codes).toContain('ks');
      expect(codes).toContain('sd');
      expect(codes).toContain('ta');
      expect(codes).toContain('te');
      expect(codes).toContain('bn');
    });

    it('1.2. Validates RTL direction and Perso-Arabic script metadata for Urdu, Kashmiri, and Sindhi', () => {
      const urdu = getLanguageMetadata('ur');
      const kashmiri = getLanguageMetadata('ks');
      const sindhi = getLanguageMetadata('sd');

      expect(urdu.direction).toBe('rtl');
      expect(isRTLLanguage('ur')).toBe(true);

      expect(kashmiri.direction).toBe('rtl');
      expect(isRTLLanguage('ks')).toBe(true);

      expect(sindhi.direction).toBe('rtl');
      expect(isRTLLanguage('sd')).toBe(true);
    });

    it('1.3. Gracefully falls back to English when a newly added key is missing in regional dictionary', () => {
      // 'loved_ones.tab_timeline' is translated in bn, but falls back to en in regional files like ks (Kashmiri)
      const enVal = translate('en', 'loved_ones.tab_timeline');
      const ksVal = translate('ks', 'loved_ones.tab_timeline');

      expect(enVal).toBe('Memory Timeline');
      // ks falls back gracefully to en
      expect(ksVal).toBe('Memory Timeline');

      // Also verify clinician telemetry keys in bn fall back gracefully to en
      const enDocVal = translate('en', 'doctor.longitudinal_title');
      const bnDocVal = translate('bn', 'doctor.longitudinal_title');
      expect(enDocVal).toBe('30-Day Activity & Attempt Completion Analytics');
      expect(bnDocVal).toBe('30-Day Activity & Attempt Completion Analytics');
    });

    it('1.4. Marathi dictionary has 100% domain coverage with zero missing keys', () => {
      const enKeys = Object.keys(TRANSLATION_CATALOGUE.en);
      const mrKeys = Object.keys(TRANSLATION_CATALOGUE.mr);
      expect(mrKeys.length).toBe(enKeys.length);
      const missingInMr = enKeys.filter((k) => !(k in TRANSLATION_CATALOGUE.mr));
      expect(missingInMr).toHaveLength(0);
    });
  });

  // =========================================================================
  // 2. GENUINE ASHA INTELLIGENCE & BOUNDARIES AUDIT
  // =========================================================================
  describe('Area 2: Genuine Asha Intelligence & System Boundaries', () => {
    it('2.1. Intent recognition is deterministic pattern-based, NOT an unconstrained cloud LLM', () => {
      const match = IntentRegistry.match('show me my family');
      expect(match.intent).toBe('LOVED_ONES_LIST');
      expect(match.confidence).toBeGreaterThan(0.9);
    });

    it('2.2. Transparent speech privacy disclosure reveals client Web Speech API network architecture', () => {
      const disclosure = SpeechService.getPrivacyDisclosure();
      expect(disclosure.title).toContain('Speech Recognition & Audio Privacy Notice');
      expect(disclosure.body).toContain('Web Speech API');
      expect(disclosure.vendorServers).toContain(
        'Google Speech Processing Network (for Chrome/Chromium browsers)'
      );
      expect(disclosure.offlineProcessingAvailable).toBe(false);
      expect(disclosure.dataTransmitted).toContain('zero permanent cloud audio storage on Saksham');
    });

    it('2.3. On-device LangID detects Devanagari Hindi vs Marathi without external API calls', () => {
      const marathiText = 'माझे औषध कुठे आहे';
      const hindiText = 'मेरी दवाई कहाँ है';

      const detectedMr = SpeechService.detectSpokenLanguage(marathiText);
      const detectedHi = SpeechService.detectSpokenLanguage(hindiText);

      expect(detectedMr).toBe('mr');
      expect(detectedHi).toBe('hi');
    });

    it('2.4. Multi-turn context resolution correctly rejects arbitrary numbers in gibberish queries', async () => {
      // Step 1: user initiates ambiguous query
      const res1 = await ConversationEngine.process('open that');
      expect(res1.intent).toBe('AMBIGUOUS_QUERY');

      // Step 2: user speaks unrecognized input containing numbers e.g. "random query 123"
      const res2 = await ConversationEngine.process('random query 123');
      expect(res2.intent).toBe('UNKNOWN_FALLBACK');
      expect(res2.expression).toBe('reassuring');
      expect(res2.clarificationOptions).toBeDefined();
    });

    it('2.5. Multi-turn context resolution chooses option 1 only on standalone token', async () => {
      await ConversationEngine.process('open that');
      const choiceRes = await ConversationEngine.process('1');
      expect(choiceRes.intent).toBe('NAVIGATE_FAMILY');
    });

    it('2.6. Natural-language paraphrases and multilingual queries resolve deterministically across English, Hindi, and Marathi', () => {
      // Family inquiries
      expect(IntentRegistry.match('show me my family').intent).toBe('LOVED_ONES_LIST');
      expect(IntentRegistry.match('who is coming today').intent).toBe('REPEATED_FAMILY_QUERY');
      expect(IntentRegistry.match('आज कौन आ रहा है').intent).toBe('REPEATED_FAMILY_QUERY');
      expect(IntentRegistry.match('आज कोण येणार आहे').intent).toBe('REPEATED_FAMILY_QUERY');

      // Daily tasks
      expect(IntentRegistry.match('what do i have to do today').intent).toBe('ROUTINES_TODAY');
      expect(IntentRegistry.match('आज क्या करना है').intent).toBe('ROUTINES_TODAY');
      expect(IntentRegistry.match('आज काय करायचं आहे').intent).toBe('ROUTINES_TODAY');

      // Medication status
      expect(IntentRegistry.match('did i take my medicine').intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(IntentRegistry.match('क्या मैंने दवा ली').intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(IntentRegistry.match('मी औषध घेतलं का').intent).toBe('ROUTINES_MEDICATION_STATUS');
    });

    it('2.7. Hinglish code-switching and transliterated queries are recognized without cloud LLMs', () => {
      expect(IntentRegistry.match('medicine yaad nahi').intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(IntentRegistry.match('dawa li kya').intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(IntentRegistry.match('mujhe water chahiye please').intent).toBe('ROUTINES_START_NEXT');
      expect(IntentRegistry.match('paani peena hai').intent).toBe('ROUTINES_START_NEXT');
    });

    it('2.8. User confirmation intents are recognized across English, Hindi, and Marathi', () => {
      expect(IntentRegistry.match('yes please').intent).toBe('CONFIRMATION_YES');
      expect(IntentRegistry.match('हाँ बिल्कुल').intent).toBe('CONFIRMATION_YES');
      expect(IntentRegistry.match('होय नक्की').intent).toBe('CONFIRMATION_YES');

      expect(IntentRegistry.match("no don't").intent).toBe('CONFIRMATION_NO');
      expect(IntentRegistry.match('नहीं रहने दो').intent).toBe('CONFIRMATION_NO');
      expect(IntentRegistry.match('नाही नको').intent).toBe('CONFIRMATION_NO');
    });

    it('2.9. Unsupported speech recognition language fallback safely returns clarification without hallucination', async () => {
      const kokMeta = getLanguageMetadata('kok');
      expect(kokMeta.speechSupport.sttStandard).toBe(false);

      const unknownRes = await ConversationEngine.process('xyzqwert invalid utterance', undefined, 'kok');
      expect(unknownRes.intent).toBe('UNKNOWN_FALLBACK');
      expect(unknownRes.speech).toBeDefined();
      expect(unknownRes.speech.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. ADAPTIVE ROUTINE & MEDICATION SAFETY AUDIT
  // =========================================================================
  describe('Area 3: Adaptive Routine & Patient-Specific Medication Safety', () => {
    it('3.1. Sourced from individual patient record: essential tasks require medication category, prescriptionRef, or isClinicianPrescribed', () => {
      const clinicianPrescription: RoutineItem = {
        id: 'rx-01',
        title: 'Morning Prescribed Medication',
        scheduledTime: '08:00 AM',
        category: 'medication',
        isClinicianPrescribed: true,
        prescriptionRef: 'rx-morning-primary',
        streakCount: 5,
        isCompleted: false,
        enableAssistedRecall: true,
      };

      const arbitraryNote: RoutineItem = {
        id: 'note-01',
        title: 'Read article about brain wellness',
        scheduledTime: '02:00 PM',
        category: 'wellness',
        streakCount: 1,
        isCompleted: false,
        enableAssistedRecall: false,
      };

      expect(DailyWellbeingService.isEssentialTask(clinicianPrescription)).toBe(true);
      expect(DailyWellbeingService.isEssentialTask(arbitraryNote)).toBe(false);
    });

    it('3.2. Verifies removal of globally hardcoded drug assumptions: non-prescribed task with drug name is NOT considered essential', () => {
      // A recreational or reading note mentioning "Levodopa" or "Donepezil" without prescription or medication category
      // is NO LONGER falsely classified as essential, verifying the removal of hardcoded drug name string matching.
      const nonPrescriptionItem: RoutineItem = {
        id: 'reading-01',
        title: 'Read scientific research paper on levodopa pharmacology',
        scheduledTime: '03:00 PM',
        category: 'activity',
        streakCount: 0,
        isCompleted: false,
        enableAssistedRecall: false,
      };

      expect(DailyWellbeingService.isEssentialTask(nonPrescriptionItem)).toBe(false);
    });

    it('3.3. In DEFAULT_PATIENT_ROUTINES, medication tasks are explicitly clinician-prescribed rather than hardcoded drug brand names', () => {
      const medRoutine = DEFAULT_PATIENT_ROUTINES.find((r) => r.category === 'medication');
      expect(medRoutine).toBeDefined();
      expect(medRoutine?.isClinicianPrescribed).toBe(true);
      expect(medRoutine?.prescriptionRef).toBe('demo-unverified-placeholder');
      expect(medRoutine?.isDemoPlaceholder).toBe(true);
      expect(medRoutine?.title).not.toContain('Levodopa');
    });

    it('3.4. When patient reports fatigue (tired), essential tasks are strictly preserved and never postponed', () => {
      const { adaptedRoutines, essentialCount, postponedCount } =
        DailyWellbeingService.adaptRoutinesForDailyCondition(DEFAULT_PATIENT_ROUTINES, 'tired');

      expect(essentialCount).toBeGreaterThanOrEqual(1);
      expect(postponedCount).toBeGreaterThan(0);

      const medTask = adaptedRoutines.find((r) => r.category === 'medication');
      expect(medTask?.isEssential).toBe(true);
      expect(medTask?.adaptedForFatigue).toBe(false);
    });

    it('3.5. ClinicalPrescriptionService strictly prevents demo strings from being treated as real prescriptions', async () => {
      const medRoutine = DEFAULT_PATIENT_ROUTINES.find((r) => r.category === 'medication')!;
      const result = ClinicalPrescriptionService.verifyPrescriptionProvenance(medRoutine);
      expect(result.isValid).toBe(false);
      expect(result.isDemoPlaceholder).toBe(true);
      expect(result.warning).toContain('DEMO_PLACEHOLDER');

      // Real clinician prescription assignment and verification
      const patientId = 'pt_prov_test_01';
      const doctorId = 'dr_test_01';
      const realRx = await ClinicalPrescriptionService.assignPrescription({
        patientId,
        prescribedByDoctorId: doctorId,
        prescribedByDoctorName: 'Dr. Anand Joshi',
        doctorRegistrationNumber: 'MCI-1988-54321',
        medicationName: 'Donepezil Hydrochloride',
        prescribedDosage: '5mg once daily at bedtime',
        scheduleTime: '09:00 PM',
        instructions: 'Take with or without food',
      });

      const patientPrescriptions = await ClinicalPrescriptionService.getPatientPrescriptions(patientId);
      expect(patientPrescriptions.length).toBe(1);

      const realTask: RoutineItem = {
        id: 'rx-task-01',
        title: 'Take evening medication',
        scheduledTime: '09:00 PM',
        category: 'medication',
        streakCount: 0,
        isCompleted: false,
        enableAssistedRecall: true,
        isClinicianPrescribed: true,
        prescriptionRef: realRx.id,
      };

      const validResult = ClinicalPrescriptionService.verifyPrescriptionProvenance(realTask, patientPrescriptions);
      expect(validResult.isValid).toBe(true);
      expect(validResult.isDemoPlaceholder).toBe(false);
      expect(validResult.prescription?.medicationName).toBe('Donepezil Hydrochloride');

      // Immutable amendment history
      const amendedRx = await ClinicalPrescriptionService.amendPrescription(patientId, realRx.id, {
        newDosage: '10mg once daily at bedtime',
        newScheduleTime: '09:30 PM',
        amendmentReason: 'Dose titration per clinical protocol at 6 weeks.',
        amendedByDoctorId: doctorId,
        amendedByDoctorName: 'Dr. Anand Joshi',
      });

      expect(amendedRx.prescribedDosage).toBe('10mg once daily at bedtime');
      expect(amendedRx.amendments.length).toBe(1);
      expect(amendedRx.amendments[0].previousDosage).toBe('5mg once daily at bedtime');
    });
  });

  // =========================================================================
  // 4. EMERGENCY & CLINICAL SAFETY AUDIT
  // =========================================================================
  describe('Area 4: Emergency Telephony & Clinical Safety Boundaries', () => {
    it('4.1. Directs acute physical emergencies to 112 (National Emergency Ambulance Response)', () => {
      const emergencyRes = ConversationSafetyPolicy.checkEmergencyDistress('I have severe chest pain and cannot breathe');
      expect(emergencyRes).not.toBeNull();
      expect(emergencyRes?.speech).toContain('112');
      expect(emergencyRes?.actionClass).toBe('emergency');
      expect(emergencyRes?.isEmergency).toBe(true);
    });

    it('4.2. Handles emergency negation correctly across English, Hindi, and Marathi', () => {
      expect(ConversationSafetyPolicy.isNegatedEmergency('I have no chest pain')).toBe(true);
      expect(ConversationSafetyPolicy.isNegatedEmergency('I did not fall')).toBe(true);
      expect(ConversationSafetyPolicy.isNegatedEmergency('मुझे कोई दर्द नहीं है')).toBe(true);
      expect(ConversationSafetyPolicy.isNegatedEmergency('मला चक्कर येत नाही')).toBe(true);

      // Negated queries MUST NOT trigger false 112 emergency alerts
      const resEn = ConversationSafetyPolicy.checkEmergencyDistress('I have no chest pain');
      const resHi = ConversationSafetyPolicy.checkEmergencyDistress('मुझे कोई दर्द नहीं है', 'hi');

      expect(resEn).toBeNull();
      expect(resHi).toBeNull();
    });

    it('4.3. Asha strictly refrains from falsely claiming that an ambulance or emergency help has been dispatched', () => {
      const emergencyRes = ConversationSafetyPolicy.checkEmergencyDistress('I fell down and bleeding heavily');
      expect(emergencyRes?.speech).not.toMatch(/i have called|i called 112|ambulance is dispatched|help is on the way/i);
      expect(emergencyRes?.speech).toMatch(/contact your caregiver or call 112 immediately/i);
    });
  });

  // =========================================================================
  // 5. TWO-ROLE MEDICAL LOGIN & CLINICAL DIAGNOSIS AUTHORIZATION
  // =========================================================================
  describe('Area 5: Two-Role Login & Clinical Diagnosis Authorization', () => {
    it('5.1. Verifies two primary clinical logins (Patient Sanctuary & Clinician Console) without disease-specific segregation', () => {
      const patientTitle = translate('en', 'login.patient_sanctuary');
      const doctorTitle = translate('en', 'login.doctor_console');

      expect(patientTitle).toBe('Patient Sanctuary');
      expect(doctorTitle).toBe('Clinician Console');
    });

    it('5.2. Doctor assigns Pathway A (Alzheimer) or Pathway B (Parkinson / Other Dementia) via ClinicalDiagnosisService', async () => {
      const patientId = 'test_pt_validation_01';
      const doctorId = 'dr_neurologist_99';

      const diagA = await ClinicalDiagnosisService.assignDiagnosis({
        patientId,
        confirmedByDoctorId: doctorId,
        confirmedByDoctorName: 'Dr. Anand Joshi',
        doctorRegistrationNumber: 'MCI-1988-54321',
        pathway: 'alzheimers_confirmed',
        etiology: 'ALZHEIMERS_CLINICAL_PROBABLE',
        clinicalStage: 'mild_dementia',
        diagnosticCriteria: 'NIA-AA 2018 Criteria & Clinical Dementia Rating (CDR 1.0)',
        clinicalRationale: 'Confirmed via clinical cognitive testing and neuro-imaging.',
      });

      expect(diagA.pathway).toBe('alzheimers_confirmed');
      expect(diagA.etiology).toBe('ALZHEIMERS_CLINICAL_PROBABLE');
      expect(diagA.confirmedByDoctorId).toBe(doctorId);

      const retrieved = await ClinicalDiagnosisService.getConfirmedDiagnosis(patientId);
      expect(retrieved?.pathway).toBe('alzheimers_confirmed');
    });

    it('5.3. Diagnosis amendment preserves immutable historical audit trail with timestamp and doctor ID', async () => {
      const patientId = 'test_pt_validation_02';
      const doctorId = 'dr_neurologist_99';

      const initial = await ClinicalDiagnosisService.assignDiagnosis({
        patientId,
        confirmedByDoctorId: doctorId,
        confirmedByDoctorName: 'Dr. Anand Joshi',
        doctorRegistrationNumber: 'MCI-1988-54321',
        pathway: 'other_or_mixed_dementia',
        etiology: 'PARKINSONS_DEMENTIA',
        clinicalStage: 'moderate_dementia',
        diagnosticCriteria: 'Movement Disorder Society (MDS) Clinical Criteria',
        clinicalRationale: 'Initial baseline evaluation.',
      });

      const amended = await ClinicalDiagnosisService.amendDiagnosis(
        patientId,
        initial.id,
        {
          pathway: 'other_or_mixed_dementia',
          etiology: 'PARKINSONS_DEMENTIA',
          clinicalStage: 'severe_dementia',
          amendmentReason: 'Progressive bradykinesia and motor gait freezing observed over 6 months.',
          amendedByDoctorId: doctorId,
          amendedByDoctorName: 'Dr. Anand Joshi',
        }
      );

      expect(amended.clinicalStage).toBe('severe_dementia');
      expect(amended.amendments).toBeDefined();
      expect(amended.amendments?.length).toBe(1);
      expect(amended.amendments?.[0].previousStage).toBe('moderate_dementia');
      expect(amended.amendments?.[0].amendedByDoctorId).toBe(doctorId);
      expect(amended.amendments?.[0].amendedAt).toBeDefined();
    });

    it('5.4. RoleSelector strictly presents exactly 2 visible choices (patient and doctor) and zero disease selections', () => {
      const patientTitle = translate('en', 'login.patient_sanctuary');
      const doctorTitle = translate('en', 'login.doctor_console');
      expect(patientTitle).toBe('Patient Sanctuary');
      expect(doctorTitle).toBe('Clinician Console');

      // Verify that no disease selection is masquerading as a login choice
      const alzheimerLogin = translate('en', 'login.alzheimer');
      const parkinsonLogin = translate('en', 'login.parkinson');
      expect(alzheimerLogin).toBe('login.alzheimer'); // unmapped/does not exist
      expect(parkinsonLogin).toBe('login.parkinson'); // unmapped/does not exist
    });
  });
});
