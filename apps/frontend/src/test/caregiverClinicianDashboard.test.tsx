import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PersonalisationTrialOverview } from '@/features/caregiver/components/PersonalisationTrialOverview';
import { ClinicalTrialSummaryViewer } from '@/features/doctor/components/ClinicalTrialSummaryViewer';
import {
  resetTrialState,
  recordActivityDifficulty,
  loadDemoTrialData,
  startPersonalisationTrial,
  getPersonalisationTrialState,
} from '@/services/personalizationService';

describe('Priority 3: Caregiver & Clinician Dashboard Integration', () => {
  const patientUid = 'cg_clinician_integration_pt';
  const patientName = 'Kalyani Sharma';

  beforeEach(() => {
    localStorage.clear();
    resetTrialState(patientUid);
  });

  // 1. Caregiver access permissions (authorized vs pending authorization)
  it('1. Caregiver access permissions: locks view when unauthorized and grants full access when authorized', () => {
    // Render unauthorized
    const { unmount } = render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={false}
      />
    );

    expect(screen.getByTestId('caregiver-unauthorized-banner')).toBeDefined();
    expect(screen.getByText(/Care Circle Authorization Required/i)).toBeDefined();
    expect(screen.queryByText(/Record Caregiver Support Observation/i)).toBeNull();

    unmount();

    // Render authorized
    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    expect(screen.queryByTestId('caregiver-unauthorized-banner')).toBeNull();
    expect(screen.getByText(/Module 2: 7-Day Personalisation Trial/i)).toBeDefined();
    expect(screen.getByText(/Record Caregiver Support Observation/i)).toBeDefined();
  });

  // 2. Patient versus caregiver attribution
  it('2. Patient versus caregiver attribution: clearly distinguishes patient self-reports from caregiver observations', () => {
    // Record one patient self-report
    recordActivityDifficulty(patientUid, {
      taskId: 101,
      taskTitle: 'Morning Medication Checklist',
      difficultyCategory: 'instructions_complicated',
      notes: 'Font was hard to read',
      enteredBy: 'user',
      assistanceOption: 'step_by_step',
    });

    // Record one caregiver observation
    recordActivityDifficulty(patientUid, {
      taskId: 102,
      taskTitle: 'Preparing Lunch Tray',
      difficultyCategory: 'motor_tremor_difficulty',
      notes: 'Hand tremor while holding water jug',
      enteredBy: 'caregiver',
    });

    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    // Verify Patient Self-Report section
    expect(screen.getByText(/Patient Self-Reported Difficulties \(1\)/i)).toBeDefined();
    expect(screen.getByText('Morning Medication Checklist')).toBeDefined();
    expect(screen.getByText('👤 Patient Self-Report')).toBeDefined();

    // Verify Caregiver Observation section
    expect(screen.getByText(/Caregiver Support Observations \(1\)/i)).toBeDefined();
    expect(screen.getByText('Preparing Lunch Tray')).toBeDefined();
    expect(screen.getByText('🤝 Caregiver Observation')).toBeDefined();
  });

  // 3. Trial progress accuracy and read-only stepper
  it('3. Trial progress accuracy: accurately displays current day and completed days without allowing caregiver mutation', () => {
    startPersonalisationTrial(patientUid, {
      displayName: 'Kalyani Sharma',
      guidanceStyle: 'step_by_step',
      textSizePreference: 'large',
      contrastPreference: 'standard',
    });

    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    expect(screen.getByText(/Current Trial Phase: Day 1 of 7/i)).toBeDefined();

    // Verify stepper elements are read-only (not buttons mutating patient state)
    const stepperContainer = screen.getByLabelText(/Trial Day Progress \(Read-Only\)/i);
    expect(stepperContainer).toBeDefined();
    const dayPills = within(stepperContainer).getAllByText(/D[1-7]/);
    expect(dayPills.length).toBe(7);

    // Verify read-only notice
    expect(screen.getByText(/Protected from silent modification/i)).toBeDefined();
  });

  // 4. Missing data vs empty states
  it('4. Missing data and empty states: distinguishes trial not initiated from completed days with 0 difficulties', () => {
    // A. Trial not initiated
    const { unmount } = render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    expect(screen.getByText(/Trial Not Initiated: The patient has not yet started/i)).toBeDefined();
    unmount();

    // B. Completed days with 0 difficulties
    startPersonalisationTrial(patientUid, { displayName: 'Kalyani' });

    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    expect(screen.getByText(/No Difficulties Reported: No difficulties have been reported/i)).toBeDefined();
  });

  // 5. Pending versus synced data status display
  it('5. Pending versus synced data status display: accurately reflects local pending records', () => {
    // Record a local unsynced difficulty
    recordActivityDifficulty(patientUid, {
      taskId: 103,
      taskTitle: 'Evening Stepping Exercise',
      difficultyCategory: 'motor_tremor_difficulty',
      notes: 'Freezing episode at doorway',
      enteredBy: 'user',
    });

    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    // Check overall sync status
    const syncStatus = screen.getByTestId('caregiver-sync-status');
    expect(syncStatus.textContent).toContain('Pending Sync');
    expect(screen.getAllByText('⏳ Pending').length).toBeGreaterThan(0);
  });

  // 6. Caregiver observation entry
  it('6. Caregiver observation entry: allows recording observations attributed to caregiver without altering patient baseline', () => {
    startPersonalisationTrial(patientUid, {
      displayName: 'Kalyani',
      guidanceStyle: 'step_by_step',
      textSizePreference: 'normal',
    });

    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    // Fill observation form
    const catSelect = screen.getByLabelText(/Observation Domain/i);
    const taskInput = screen.getByLabelText(/Routine Task \/ Context/i);
    const notesInput = screen.getByLabelText(/Observation Description/i);
    const submitBtn = screen.getByRole('button', { name: /Record Observation/i });

    fireEvent.change(catSelect, { target: { value: 'motor' } });
    fireEvent.change(taskInput, { target: { value: 'Afternoon Walking Drill' } });
    fireEvent.change(notesInput, { target: { value: 'Patient hesitated before doorway turn.' } });
    fireEvent.click(submitBtn);

    // Check confirmation
    expect(screen.getByText(/Caregiver observation recorded and attributed to Caregiver/i)).toBeDefined();

    // Verify stored trial state
    const state = getPersonalisationTrialState(patientUid);
    expect(state.difficultiesRecorded.length).toBe(1);
    const obs = state.difficultiesRecorded[0];
    expect(obs.enteredBy).toBe('caregiver');
    expect(obs.taskTitle).toBe('Afternoon Walking Drill');
    expect(obs.notes).toBe('Patient hesitated before doorway turn.');

    // Verify patient baseline preferences were NOT overwritten
    expect(state.baselinePreferences.guidanceStyle).toBe('step_by_step');
    expect(state.baselinePreferences.textSizePreference).toBe('normal');
  });

  // 7. Clinician access permissions
  it('7. Clinician access permissions: locks view when unauthorized and displays structured summary when authorized', () => {
    // Unauthorized
    const { unmount } = render(
      <ClinicalTrialSummaryViewer
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={false}
      />
    );

    expect(screen.getByTestId('clinician-unauthorized-banner')).toBeDefined();
    expect(screen.getByText(/Clinical Consent & Authorization Pending/i)).toBeDefined();

    unmount();

    // Authorized
    render(
      <ClinicalTrialSummaryViewer
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    expect(screen.queryByTestId('clinician-unauthorized-banner')).toBeNull();
    expect(screen.getByText(/Clinical Consultation Summary — Kalyani Sharma/i)).toBeDefined();
  });

  // 8. Clinician dashboard structured summary with frequency, dates, and non-diagnostic framing
  it('8. Clinician dashboard: provides structured difficulty breakdown with dates and strict non-diagnostic framing', () => {
    loadDemoTrialData(patientUid);

    render(
      <ClinicalTrialSummaryViewer
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    // Non-diagnostic disclaimer
    expect(screen.getAllByText(/Non-Diagnostic Framing/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not generate clinical diagnoses, predict disease progression, or recommend medication/i)).toBeDefined();

    // Freshness indicator
    expect(screen.getByTestId('clinical-freshness-pill')).toBeDefined();

    // Domain breakdown with incident count and dates
    expect(screen.getByText(/Reported Difficulties by Domain & Dates/i)).toBeDefined();
    expect(screen.getAllByText(/Dates:/i).length).toBeGreaterThan(0);

    // Attribution
    expect(screen.getByText(/👤 Patient Self-Reports \(3\)/i)).toBeDefined();
    expect(screen.getByText(/🤝 Caregiver Support Observations \(1\)/i)).toBeDefined();
  });

  // 9. Consultation report export accuracy
  it('9. Consultation report export: modal contains categories, dates, patient vs caregiver attribution, and clinical disclaimer', () => {
    loadDemoTrialData(patientUid);

    render(
      <ClinicalTrialSummaryViewer
        patientUid={patientUid}
        patientName={patientName}
        isAuthorized={true}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /Export Consultation Report/i });
    fireEvent.click(exportBtn);

    const modal = screen.getByTestId('clinical-export-modal');
    expect(modal).toBeDefined();

    const reportContent = modal.textContent || '';
    expect(reportContent).toContain('SAKSHAM HEALTHCARE CONSULTATION REPORT');
    expect(reportContent).toContain('PATIENT SELF-REPORTS VS CAREGIVER OBSERVATIONS');
    expect(reportContent).toContain('Patient Self-Reports (3 entries)');
    expect(reportContent).toContain('Caregiver Observations (1 entries)');
    expect(reportContent).toContain('NON-DIAGNOSTIC CLINICAL DISCLAIMER');
    expect(reportContent).toContain('does not provide clinical');
    expect(reportContent).toContain('disease progression predictions');
  });
});
