import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClinicalTrialSummaryViewer } from '@/features/doctor/components/ClinicalTrialSummaryViewer';
import { resetTrialState } from '@/services/personalizationService';

describe('Module 8: Doctor Dashboard & Clinical Summary Component', () => {
  const patientUid = 'doc_patient_test_88';
  const patientName = 'Kalyani Sharma';

  beforeEach(() => {
    resetTrialState(patientUid);
  });

  it('renders data freshness indicator and non-diagnostic framing disclaimer', () => {
    render(
      <ClinicalTrialSummaryViewer
        patientUid={patientUid}
        patientName={patientName}
      />
    );

    expect(screen.getByText(/Module 8: Healthcare Telemetry & Trial Review/i)).toBeDefined();
    expect(screen.getByText(/Freshness: Synced/i)).toBeDefined();
    expect(screen.getAllByText(/Non-Diagnostic Framing/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not generate clinical diagnoses/i)).toBeDefined();
  });

  it('loads demo trial data and opens consultation export modal', () => {
    render(
      <ClinicalTrialSummaryViewer
        patientUid={patientUid}
        patientName={patientName}
      />
    );

    // Click Load 7-Day Demo
    const loadDemoBtn = screen.getByRole('button', { name: /Load 7-Day Demo/i });
    fireEvent.click(loadDemoBtn);

    expect(screen.getByText(/Reported Difficulties by Domain/i)).toBeDefined();

    // Click Export Consultation Report
    const exportBtn = screen.getByRole('button', { name: /Export Consultation Report/i });
    fireEvent.click(exportBtn);

    expect(screen.getByText(/SAKSHAM HEALTHCARE CONSULTATION REPORT/i)).toBeDefined();
    expect(screen.getByText(/CLINICAL DISCLAIMER/i)).toBeDefined();
  });
});
