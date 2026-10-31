import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonalisationTrialOverview } from '@/features/caregiver/components/PersonalisationTrialOverview';
import { resetTrialState } from '@/services/personalizationService';

describe('Module 7: Caregiver Dashboard & Trial Overview Component', () => {
  const patientUid = 'cg_patient_test_42';
  const patientName = 'Kalyani Sharma';

  beforeEach(() => {
    resetTrialState(patientUid);
  });

  it('renders trial status, day stepper, and baseline preferences', () => {
    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
      />
    );

    expect(screen.getByText(/Module 2: 7-Day Personalisation Trial/i)).toBeDefined();
    expect(screen.getByText(/Care Support & Trial Overview for Kalyani Sharma/i)).toBeDefined();
    expect(screen.getByText(/Current Trial Phase: Day 1 of 7/i)).toBeDefined();
  });

  it('loads demo trial data and displays reported difficulties and helpful options', () => {
    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
      />
    );

    const loadDemoBtn = screen.getByRole('button', { name: /Load 7-Day Demo/i });
    fireEvent.click(loadDemoBtn);

    expect(screen.getByText(/Reported Difficulties & Caregiver Observations \(4\)/i)).toBeDefined();
    expect(screen.getByText(/Patient Self-Reported Difficulties \(3\)/i)).toBeDefined();
    expect(screen.getByText(/Caregiver Support Observations \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Morning Herbal Tea/i)).toBeDefined();
    expect(screen.getByText(/Buttoning Shirt & Morning Dressing/i)).toBeDefined();
    expect(screen.getAllByText(/step[- ]by[- ]step/i).length).toBeGreaterThan(0);
  });

  it('records support observation note via audit form', () => {
    let capturedNote = '';
    render(
      <PersonalisationTrialOverview
        patientUid={patientUid}
        patientName={patientName}
        onAuditNoteAdded={(note) => {
          capturedNote = note;
        }}
      />
    );

    const input = screen.getByPlaceholderText(/Patient felt steadier/i);
    const saveBtn = screen.getByRole('button', { name: /Record Observation/i });

    fireEvent.change(input, { target: { value: 'Patient responded well to visual timing cues.' } });
    fireEvent.click(saveBtn);

    expect(capturedNote).toContain('Patient responded well to visual timing cues.');
    expect(screen.getByText(/Caregiver observation recorded and attributed to Caregiver/i)).toBeDefined();
  });
});
