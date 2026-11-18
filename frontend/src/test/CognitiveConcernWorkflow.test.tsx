/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE F
 * Structured Cognitive Concern & Clinical Assessment Workflow Test Suite
 *
 * Verifies:
 * 1. CognitiveConcernService acute indicator detection (112 emergency vs 14416 mental health helpline)
 * 2. Mandatory Default OFF for doctor sharing consent (Product Owner Decision 3)
 * 3. Clinician-only assessment recording guard (Product Owner Decision 2)
 * 4. CognitiveConcernModal UI in patient and caregiver perspectives
 * 5. Urgent Delirium Guidance Banner & acknowledgement gating (Product Owner Decision 1)
 * 6. RecordClinicalAssessmentModal clinician-only access and validation
 * 7. Longitudinal timeline and appointment summary integration
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, zero external LLMs).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CognitiveConcernService } from '../features/clinical/services/cognitiveConcernService';
import { CognitiveConcernModal } from '../features/clinical/components/CognitiveConcernModal';
import { RecordClinicalAssessmentModal } from '../features/clinical/components/RecordClinicalAssessmentModal';
import { LongitudinalReportService } from '../features/doctor/services/longitudinalReportService';
import { AppointmentSummaryModal } from '../features/doctor/components/AppointmentSummaryModal';
import { resetMockFirestoreStore } from './setup';

describe('Stage 3 Phase F: Structured Cognitive Concerns & Clinical Assessments', () => {
  const patientId = 'test-patient-phase-f';
  const patientName = 'Sunita Sharma';
  const doctorId = 'test-doctor-phase-f';
  const doctorName = 'Dr. Raman Verma';

  beforeEach(() => {
    localStorage.clear();
    resetMockFirestoreStore();
    vi.clearAllMocks();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 1: Acute Indicator & Delirium Detection (Product Owner Decision 1)   */
  /* ------------------------------------------------------------------------- */
  it('1. detects sudden/acute onset keywords and provides distinct 112 (EMS) and 14416 (Tele-MANAS) guidance', () => {
    // Normal gradual observation
    const gradualCheck = CognitiveConcernService.detectAcuteIndicators(
      'Slowly forgetting where house keys are kept over the past 6 months.'
    );
    expect(gradualCheck.hasAcuteWarning).toBe(false);
    expect(gradualCheck.matchedKeywords).toHaveLength(0);

    // Sudden / Acute shift observation
    const suddenCheck = CognitiveConcernService.detectAcuteIndicators(
      'Sudden confusion started since morning, patient cannot speak clearly and has slurred words.'
    );
    expect(suddenCheck.hasAcuteWarning).toBe(true);
    expect(suddenCheck.matchedKeywords.length).toBeGreaterThan(0);

    // Emergency numbers verified
    expect(suddenCheck.emergencyNumber).toBe('112');
    expect(suddenCheck.helplineNumber).toBe('14416');
    expect(suddenCheck.guidanceText).toContain('112 for acute medical emergencies');
    expect(suddenCheck.guidanceText).toContain('Tele-MANAS (14416) provides mental health');
    expect(suddenCheck.guidanceText).toContain('not an ambulance service');
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 1b: Full Matrix of Negation, History, Chronicity & Red-Flag Cases    */
  /* ------------------------------------------------------------------------- */
  it('1b. correctly handles negation, past history, chronicity, and benign temporal words without false alarms', () => {
    const testCases: Array<{ text: string; expectedWarning: boolean; desc: string }> = [
      // Benign / Negation / Chronicity (MUST NOT trigger emergency warning)
      {
        text: 'Patient is not experiencing any chest pain or breathlessness.',
        expectedWarning: false,
        desc: 'Negation: not experiencing chest pain or breathlessness',
      },
      {
        text: 'Patient denies chest pain and has no shortness of breath.',
        expectedWarning: false,
        desc: 'Negation: denies chest pain and no shortness of breath',
      },
      {
        text: 'No weakness on either side of the body.',
        expectedWarning: false,
        desc: 'Negation: no weakness on either side',
      },
      {
        text: 'Patient had a stroke 5 years ago, but is currently stable.',
        expectedWarning: false,
        desc: 'Past history: stroke 5 years ago',
      },
      {
        text: 'Patient has chronic memory loss for several months.',
        expectedWarning: false,
        desc: 'Chronicity: chronic for several months',
      },
      {
        text: 'Patient has mild forgetfulness that has been gradually worsening over 2 years.',
        expectedWarning: false,
        desc: 'Chronicity: gradually worsening over 2 years',
      },
      {
        text: 'Mild hallucinations have been present for several months as part of Lewy body dementia.',
        expectedWarning: false,
        desc: 'Chronicity: mild hallucinations present for several months',
      },
      {
        text: 'Patient walked for 2 hours today in the garden.',
        expectedWarning: false,
        desc: 'Benign temporal: walked for 2 hours today',
      },
      {
        text: 'Patient felt a bit tired today after the morning walk.',
        expectedWarning: false,
        desc: 'Benign temporal: felt tired today',
      },
      {
        text: 'Routine follow-up today: patient was calm throughout the 3 hours visit.',
        expectedWarning: false,
        desc: 'Benign temporal: calm throughout 3 hours visit today',
      },

      // True Acute Red Flags (MUST trigger emergency warning)
      {
        text: 'Patient experienced a sudden onset of slurred speech and facial drooping this morning.',
        expectedWarning: true,
        desc: 'Emergency red flag: sudden slurred speech and facial drooping',
      },
      {
        text: 'One side of the face is drooping and arm is weak.',
        expectedWarning: true,
        desc: 'Emergency red flag: face is drooping and one side weak',
      },
      {
        text: 'Patient is unconscious and unresponsive.',
        expectedWarning: true,
        desc: 'Emergency red flag: unconscious and unresponsive',
      },
      {
        text: 'Patient woke up unable to speak since this morning.',
        expectedWarning: true,
        desc: 'Emergency red flag: unable to speak since this morning',
      },
      {
        text: 'High fever began suddenly this morning with acute confusion.',
        expectedWarning: true,
        desc: 'Acute temporal + secondary: high fever suddenly with confusion',
      },
      {
        text: 'Sudden severe agitation and hallucinations started within hours.',
        expectedWarning: true,
        desc: 'Acute temporal + secondary: sudden agitation and hallucinations within hours',
      },
      {
        text: 'New hallucinations started suddenly today.',
        expectedWarning: true,
        desc: 'Acute temporal + secondary: new hallucinations started suddenly today',
      },
      {
        text: 'Patient had a stroke 5 years ago, but suddenly cannot speak today.',
        expectedWarning: true,
        desc: 'Contrast red flag: historical stroke, but acute loss of speech today',
      },
    ];

    for (const tc of testCases) {
      const res = CognitiveConcernService.detectAcuteIndicators(tc.text);
      expect(
        res.hasAcuteWarning,
        `Expected hasAcuteWarning to be ${tc.expectedWarning} for "${tc.desc}" (text: "${tc.text}")`
      ).toBe(tc.expectedWarning);
    }
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 2: Concern Recording with Default-OFF Sharing (Decision 3)           */
  /* ------------------------------------------------------------------------- */
  it('2. records structured concern with sharedWithDoctor defaulting to FALSE unless explicitly consented', async () => {
    // Concern recorded with sharedWithDoctor omitted
    const concernDefault = await CognitiveConcernService.recordConcern(patientId, {
      recordedBy: 'caregiver-001',
      recordedByName: 'Ananya Sharma',
      perspective: 'caregiver',
      category: 'memory',
      description: 'Frequently misplacing reading glasses and needing reassurance',
      status: 'ongoing',
    });

    expect(concernDefault.id).toBeDefined();
    expect(concernDefault.patientId).toBe(patientId);
    expect(concernDefault.sharedWithDoctor).toBe(false); // MUST BE FALSE BY DEFAULT

    // Explicitly consented concern
    const concernShared = await CognitiveConcernService.recordConcern(patientId, {
      recordedBy: 'caregiver-001',
      recordedByName: 'Ananya Sharma',
      perspective: 'caregiver',
      category: 'sleep_routine',
      description: 'Waking up disoriented around 3 AM and wandering toward front door',
      status: 'occasional',
      sharedWithDoctor: true,
    });

    expect(concernShared.sharedWithDoctor).toBe(true);

    // Retrieve list
    const all = await CognitiveConcernService.getConcerns(patientId);
    expect(all).toHaveLength(2);
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 3: Concern Sharing and Status Updates                                */
  /* ------------------------------------------------------------------------- */
  it('3. allows patient/caregiver to toggle doctor sharing consent and update resolution status', async () => {
    const concern = await CognitiveConcernService.recordConcern(patientId, {
      recordedBy: 'patient-self',
      perspective: 'patient',
      category: 'communication',
      description: 'Found it hard to follow conversation at wedding',
      status: 'ongoing',
      sharedWithDoctor: false,
    });

    expect(concern.sharedWithDoctor).toBe(false);

    // Toggle sharing ON
    const updatedSharing = await CognitiveConcernService.updateConcernSharing(patientId, concern.id, true);
    expect(updatedSharing?.sharedWithDoctor).toBe(true);

    // Update status to resolved
    const updatedStatus = await CognitiveConcernService.updateConcernStatus(patientId, concern.id, 'resolved');
    expect(updatedStatus?.status).toBe('resolved');

    const retrieved = await CognitiveConcernService.getConcerns(patientId);
    expect(retrieved[0].sharedWithDoctor).toBe(true);
    expect(retrieved[0].status).toBe('resolved');
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 4: Clinician-Only Assessment Recording (Product Owner Decision 2)    */
  /* ------------------------------------------------------------------------- */
  it('4. enforces clinician-only role guard and records external standardized assessment scores', async () => {
    const assessmentData = {
      doctorId,
      doctorName,
      assessmentName: 'MMSE' as const,
      administrationDate: '2026-11-15',
      language: 'Hindi',
      totalScore: 23,
      maxScore: 30,
      scoreClassification: 'Mild cognitive impairment range',
      qualitativeSummary: 'Delayed word recall 1/5; oriented to year but uncertain of weekday.',
    };

    // Non-doctor attempt MUST be rejected
    await expect(
      CognitiveConcernService.recordClinicalAssessment(patientId, assessmentData, 'patient')
    ).rejects.toThrow(/Permission denied: Only authenticated healthcare professionals/i);

    await expect(
      CognitiveConcernService.recordClinicalAssessment(patientId, assessmentData, 'caregiver')
    ).rejects.toThrow(/Permission denied/i);

    // Authorized doctor attempt succeeds
    const saved = await CognitiveConcernService.recordClinicalAssessment(
      patientId,
      assessmentData,
      'doctor'
    );

    expect(saved.id).toBeDefined();
    expect(saved.assessmentName).toBe('MMSE');
    expect(saved.totalScore).toBe(23);
    expect(saved.maxScore).toBe(30);
    expect(saved.administeredExternally).toBe(true);

    const assessments = await CognitiveConcernService.getClinicalAssessments(patientId);
    expect(assessments).toHaveLength(1);
    expect(assessments[0].qualitativeSummary).toContain('Delayed word recall');
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 4b: Auditable Amendment Mechanism for Clinical Assessments          */
  /* ------------------------------------------------------------------------- */
  it('4b. allows authorized doctors to amend assessment records while preserving historical audit log', async () => {
    const saved = await CognitiveConcernService.recordClinicalAssessment(
      patientId,
      {
        doctorId,
        doctorName,
        assessmentName: 'MoCA',
        administrationDate: '2026-11-16',
        language: 'English',
        totalScore: 21,
        maxScore: 30,
        qualitativeSummary: 'Initial baseline notes.',
      },
      'doctor'
    );

    // Non-doctor amendment attempt rejected
    await expect(
      CognitiveConcernService.amendClinicalAssessment(
        patientId,
        saved.id,
        {
          qualitativeSummary: 'Caregiver attempted amendment',
          amendmentReason: 'Correction',
          doctorId,
        },
        'caregiver'
      )
    ).rejects.toThrow(/Permission denied/i);

    // Rejects amendment without reason
    await expect(
      CognitiveConcernService.amendClinicalAssessment(
        patientId,
        saved.id,
        {
          qualitativeSummary: 'Doctor correction',
          amendmentReason: '',
          doctorId,
        },
        'doctor'
      )
    ).rejects.toThrow(/amendment reason is required/i);

    // Valid doctor amendment
    const amended = await CognitiveConcernService.amendClinicalAssessment(
      patientId,
      saved.id,
      {
        totalScore: 22,
        qualitativeSummary: 'Corrected delayed recall score after clinician review.',
        amendmentReason: 'Typographical correction in serial subtraction tally',
        doctorId,
        doctorName,
      },
      'doctor'
    );

    expect(amended?.totalScore).toBe(22);
    expect(amended?.qualitativeSummary).toContain('Corrected delayed recall score');
    expect(amended?.amendments).toHaveLength(1);
    expect(amended?.amendments![0].previousScore).toBe(21);
    expect(amended?.amendments![0].previousSummary).toBe('Initial baseline notes.');
    expect(amended?.amendments![0].amendmentReason).toContain('Typographical correction');
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 5: CognitiveConcernModal UI: Sharing Checkbox Unchecked by Default   */
  /* ------------------------------------------------------------------------- */
  it('5. renders CognitiveConcernModal with sharing checkbox unchecked by default (Decision 3)', async () => {
    const handleClose = vi.fn();
    const handleSaved = vi.fn();

    render(
      <CognitiveConcernModal
        isOpen={true}
        onClose={handleClose}
        patientId={patientId}
        patientName={patientName}
        currentUserId="caregiver-001"
        currentUserName="Ananya Sharma"
        onConcernSaved={handleSaved}
      />
    );

    // Header and perspective buttons exist
    expect(screen.getByText(/Log Cognitive or Daily Life Observation/i)).toBeInTheDocument();
    expect(screen.getByTestId('perspective-patient-btn')).toBeInTheDocument();
    expect(screen.getByTestId('perspective-caregiver-btn')).toBeInTheDocument();

    // Verify sharing checkbox is strictly UNCHECKED by default
    const shareCheckbox = screen.getByTestId('share-with-doctor-checkbox') as HTMLInputElement;
    expect(shareCheckbox).toBeInTheDocument();
    expect(shareCheckbox.checked).toBe(false);
    expect(screen.getByText(/Private by default/i)).toBeInTheDocument();

    // Enter gradual observation and submit without checking sharing box
    fireEvent.change(screen.getByTestId('concern-description-input'), {
      target: { value: 'Occasionally forgets where kitchen items were placed.' },
    });
    fireEvent.click(screen.getByTestId('submit-concern-btn'));

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalled();
    });

    const savedConcern = handleSaved.mock.calls[0][0];
    expect(savedConcern.sharedWithDoctor).toBe(false);
    expect(savedConcern.category).toBe('memory');
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 6: Urgent Delirium Banner in CognitiveConcernModal (Decision 1)      */
  /* ------------------------------------------------------------------------- */
  it('6. triggers live urgent delirium guidance banner on sudden keywords and requires acknowledgement', async () => {
    const handleClose = vi.fn();
    const handleSaved = vi.fn();

    render(
      <CognitiveConcernModal
        isOpen={true}
        onClose={handleClose}
        patientId={patientId}
        patientName={patientName}
        currentUserId="caregiver-001"
        currentUserName="Ananya Sharma"
        onConcernSaved={handleSaved}
      />
    );

    // Initially no acute banner
    expect(screen.queryByTestId('urgent-delirium-banner')).not.toBeInTheDocument();

    // Type acute keywords into description
    fireEvent.change(screen.getByTestId('concern-description-input'), {
      target: { value: 'Sudden confusion started since morning, patient cannot speak.' },
    });

    // Urgent delirium banner appears live
    await waitFor(() => {
      expect(screen.getByTestId('urgent-delirium-banner')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Sudden Changes Require Prompt Medical Evaluation/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Emergency Ambulance: 112/i)).toBeInTheDocument();
    expect(screen.getByText(/Tele-MANAS Helpline: 14416/i)).toBeInTheDocument();
    expect(screen.getByText(/not an emergency medical ambulance/i)).toBeInTheDocument();

    // Attempting submit without acknowledgement is blocked
    fireEvent.click(screen.getByTestId('submit-concern-btn'));
    await waitFor(() => {
      expect(
        screen.getByText(/Please review the emergency medical guidance above and check the acknowledgement box/i)
      ).toBeInTheDocument();
    });

    // Acknowledge and submit
    fireEvent.click(screen.getByTestId('acknowledge-acute-checkbox'));
    fireEvent.click(screen.getByTestId('submit-concern-btn'));

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalled();
    });
    const saved = handleSaved.mock.calls[0][0];
    expect(saved.hasAcuteIndicators).toBe(true);
    expect(saved.acuteDisclaimerAcknowledged).toBe(true);
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 6b: Emergency Helpline Header Button Toggles Immediate Info Drawer   */
  /* ------------------------------------------------------------------------- */
  it('6b. provides immediate emergency helpline guidance via header button without typing or submitting', async () => {
    render(
      <CognitiveConcernModal
        isOpen={true}
        onClose={vi.fn()}
        patientId={patientId}
        patientName={patientName}
        currentUserId="caregiver-001"
        currentUserName="Ananya Sharma"
      />
    );

    // Emergency button exists in header
    const helplineBtn = screen.getByTestId('emergency-helplines-header-btn');
    expect(helplineBtn).toBeInTheDocument();

    // Drawer is initially closed
    expect(screen.queryByTestId('emergency-info-drawer')).not.toBeInTheDocument();

    // Clicking button opens immediate emergency guidance
    fireEvent.click(helplineBtn);
    expect(screen.getByTestId('emergency-info-drawer')).toBeInTheDocument();
    expect(screen.getByText(/Immediate Emergency Medical & Helpline Information/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Ambulance: 112/i)).toBeInTheDocument();
    expect(screen.getByText(/Tele-MANAS Helpline: 14416/i)).toBeInTheDocument();
    expect(screen.getByText(/Safety Disclaimer:/i)).toBeInTheDocument();

    // Clicking Hide closes drawer
    fireEvent.click(screen.getByText(/Hide ✕/i));
    expect(screen.queryByTestId('emergency-info-drawer')).not.toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 7: RecordClinicalAssessmentModal Role Guard and Recording (Decision 2)*/
  /* ------------------------------------------------------------------------- */
  it('7. blocks non-doctors and permits authenticated doctors to record standardized test scores', async () => {
    const handleClose = vi.fn();
    const handleSaved = vi.fn();

    // 1. Non-doctor access attempt
    const { unmount } = render(
      <RecordClinicalAssessmentModal
        isOpen={true}
        onClose={handleClose}
        patientId={patientId}
        patientName={patientName}
        doctorId={doctorId}
        doctorName={doctorName}
        currentUserRole="caregiver"
        onAssessmentSaved={handleSaved}
      />
    );

    expect(screen.getByTestId('doctor-role-denied-banner')).toBeInTheDocument();
    expect(screen.getByText(/Clinician Access Restricted/i)).toBeInTheDocument();
    expect(screen.queryByTestId('submit-assessment-btn')).not.toBeInTheDocument();
    unmount();

    // 2. Doctor access
    render(
      <RecordClinicalAssessmentModal
        isOpen={true}
        onClose={handleClose}
        patientId={patientId}
        patientName={patientName}
        doctorId={doctorId}
        doctorName={doctorName}
        currentUserRole="doctor"
        onAssessmentSaved={handleSaved}
      />
    );

    expect(screen.queryByTestId('doctor-role-denied-banner')).not.toBeInTheDocument();
    expect(screen.getByText(/Standardized External Administration Notice/i)).toBeInTheDocument();
    expect(screen.getByTestId('assessment-type-MoCA')).toBeInTheDocument();

    // Select MoCA
    fireEvent.click(screen.getByTestId('assessment-type-MoCA'));
    fireEvent.change(screen.getByTestId('assessment-total-score-input'), {
      target: { value: '21' },
    });
    fireEvent.change(screen.getByTestId('assessment-qualitative-input'), {
      target: { value: 'Impaired trail making and cube copy; 2/5 delayed recall; preserved orientation.' },
    });

    fireEvent.click(screen.getByTestId('submit-assessment-btn'));

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalled();
    });

    const recorded = handleSaved.mock.calls[0][0];
    expect(recorded.assessmentName).toBe('MoCA');
    expect(recorded.totalScore).toBe(21);
    expect(recorded.administeredExternally).toBe(true);
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 7b: RecordClinicalAssessmentModal Amend Mode & Provenance Display    */
  /* ------------------------------------------------------------------------- */
  it('7b. displays immutable provenance and appends auditable amendment in amend mode', async () => {
    const handleSaved = vi.fn();
    const existingRecord = {
      id: 'existing-assess-001',
      patientId,
      doctorId,
      doctorName,
      assessmentName: 'MMSE' as const,
      administrationDate: '2026-11-10',
      language: 'English',
      totalScore: 23,
      maxScore: 30,
      scoreClassification: 'Mild cognitive impairment range',
      qualitativeSummary: 'Baseline assessment notes.',
      administeredExternally: true as const,
      recordedAt: '2026-11-10T10:00:00Z',
    };

    // Save existing record to local store
    localStorage.setItem(
      `saksham_clinical_assessments_${patientId}`,
      JSON.stringify([existingRecord])
    );

    render(
      <RecordClinicalAssessmentModal
        isOpen={true}
        onClose={vi.fn()}
        patientId={patientId}
        patientName={patientName}
        doctorId={doctorId}
        doctorName={doctorName}
        currentUserRole="doctor"
        mode="amend"
        initialRecord={existingRecord}
        onAssessmentSaved={handleSaved}
      />
    );

    // Verify amend mode displays immutable provenance
    expect(screen.getByText(/Amend Clinical Assessment Record/i)).toBeInTheDocument();
    expect(screen.getByTestId('amendment-original-info')).toBeInTheDocument();
    expect(screen.getByText(/Original Assessment Record \(Immutable Provenance\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Administered: 2026-11-10/i)).toBeInTheDocument();

    // Verify amendment reason input is present
    const reasonInput = screen.getByTestId('amendment-reason-input');
    expect(reasonInput).toBeInTheDocument();

    // Attempting submit without reason fails
    const form = screen.getByRole('dialog').querySelector('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(
        screen.getByText(/An auditable amendment reason is required/i)
      ).toBeInTheDocument();
    });

    // Provide reason and updated note
    fireEvent.change(reasonInput, {
      target: { value: 'Corrected delayed recall after paper scoring review' },
    });
    fireEvent.change(screen.getByTestId('assessment-total-score-input'), {
      target: { value: '24' },
    });
    fireEvent.change(screen.getByTestId('assessment-qualitative-input'), {
      target: { value: 'Updated: delayed recall revised to 2/5 with phonemic cueing.' },
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalled();
    });

    const amended = handleSaved.mock.calls[0][0];
    expect(amended.totalScore).toBe(24);
    expect(amended.amendments).toHaveLength(1);
    expect(amended.amendments[0].amendmentReason).toContain('Corrected delayed recall');
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 8: Longitudinal Timeline & Appointment Summary Integration           */
  /* ------------------------------------------------------------------------- */
  it('8. integrates shared concerns and clinical assessments into timeline and appointment brief', async () => {
    // 1. Unshared concern (MUST NOT appear in doctor timeline)
    await CognitiveConcernService.recordConcern(patientId, {
      recordedBy: 'caregiver-001',
      recordedByName: 'Ananya Sharma',
      perspective: 'caregiver',
      category: 'memory',
      description: 'Private family observation: misplaced favorite pen',
      sharedWithDoctor: false,
    });

    // 2. Shared concern (MUST appear in doctor timeline)
    await CognitiveConcernService.recordConcern(patientId, {
      recordedBy: 'caregiver-001',
      recordedByName: 'Ananya Sharma',
      perspective: 'caregiver',
      category: 'communication',
      description: 'Noticeable word-finding pauses during family dinner',
      sharedWithDoctor: true,
    });

    // 3. Clinical assessment recorded by doctor
    await CognitiveConcernService.recordClinicalAssessment(
      patientId,
      {
        doctorId,
        doctorName,
        assessmentName: 'HMSE',
        administrationDate: new Date().toISOString().substring(0, 10),
        language: 'Hindi',
        totalScore: 24,
        maxScore: 30,
        scoreClassification: 'Mild cognitive impairment range',
        qualitativeSummary: 'Intact attention; delayed recall 2/3.',
      },
      'doctor'
    );

    // Query timeline events
    const today = new Date().toISOString().substring(0, 10);
    const timeline = await LongitudinalReportService.getTimelineEvents(patientId, today, today);

    // Verify unshared concern is NOT in timeline
    const unsharedEvent = timeline.find((e) => e.description.includes('misplaced favorite pen'));
    expect(unsharedEvent).toBeUndefined();

    // Verify shared concern IS in timeline
    const sharedEvent = timeline.find((e) => e.description.includes('word-finding pauses'));
    expect(sharedEvent).toBeDefined();
    expect(sharedEvent?.category).toBe('cognitive_concern');

    // Verify clinical assessment IS in timeline
    const assessEvent = timeline.find((e) => e.category === 'clinical_assessment');
    expect(assessEvent).toBeDefined();
    expect(assessEvent?.title).toContain('HMSE');

    // Generate appointment summary
    const summary = await LongitudinalReportService.generateAppointmentSummary(patientId, patientName, {
      startDate: today,
      endDate: today,
      authorId: doctorId,
      authorName: doctorName,
      authorRole: 'doctor',
      includedCategories: ['concerns', 'clinical_assessments'],
    });

    expect(summary.sharedConcerns).toBeDefined();
    expect(summary.sharedConcerns).toHaveLength(1);
    expect(summary.sharedConcerns![0].description).toContain('word-finding pauses');
    expect(summary.clinicalAssessments).toBeDefined();
    expect(summary.clinicalAssessments).toHaveLength(1);
    expect(summary.clinicalAssessments![0].assessmentName).toBe('HMSE');

    // Render AppointmentSummaryModal to verify print preview renders both sections
    const { getByTestId } = render(
      <AppointmentSummaryModal
        isOpen={true}
        onClose={vi.fn()}
        patientId={patientId}
        patientName={patientName}
        authorId={doctorId}
        authorName={doctorName}
        authorRole="doctor"
      />
    );

    await waitFor(() => {
      expect(getByTestId('summary-shared-concerns-section')).toBeInTheDocument();
      expect(getByTestId('summary-clinical-assessments-section')).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------------------- */
  /* TEST 8b: Source Separation & Privacy Exclusion Invariants                 */
  /* ------------------------------------------------------------------------- */
  it('8b. separates patient and caregiver perspectives in appointment brief and verifies private data exclusions', async () => {
    const today = new Date().toISOString().substring(0, 10);

    // Patient-reported concern (shared)
    await CognitiveConcernService.recordConcern(patientId, {
      recordedBy: 'patient-self',
      recordedByName: 'Sunita Sharma',
      perspective: 'patient',
      category: 'daily_activities',
      description: 'Patient perspective: I felt confused in the market today.',
      sharedWithDoctor: true,
    });

    // Caregiver-reported concern (shared)
    await CognitiveConcernService.recordConcern(patientId, {
      recordedBy: 'caregiver-001',
      recordedByName: 'Ananya Sharma',
      perspective: 'caregiver',
      category: 'sleep_routine',
      description: 'Caregiver perspective: Observed sundowning restlessness around 6:30 PM.',
      sharedWithDoctor: true,
    });

    const summary = await LongitudinalReportService.generateAppointmentSummary(patientId, patientName, {
      startDate: today,
      endDate: today,
      authorId: doctorId,
      authorName: doctorName,
      authorRole: 'doctor',
      includedCategories: ['concerns'],
    });

    expect(summary.sharedConcerns).toHaveLength(2);
    const patientItem = summary.sharedConcerns?.find((c) => c.perspective === 'patient');
    const caregiverItem = summary.sharedConcerns?.find((c) => c.perspective === 'caregiver');

    expect(patientItem).toBeDefined();
    expect(caregiverItem).toBeDefined();
    expect(patientItem?.recordedByName).toBe('Sunita Sharma');
    expect(caregiverItem?.recordedByName).toBe('Ananya Sharma');

    // Exclusion Integrity: Verify no GPS coordinates, raw chat transcripts, or photos are present
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('latitude');
    expect(serialized).not.toContain('longitude');
    expect(serialized).not.toContain('chatTranscript');
    expect(serialized).not.toContain('photoURL');
    expect(summary.disclaimer).toContain('CLINICAL TRANSPARENCY NOTICE');
  });
});
