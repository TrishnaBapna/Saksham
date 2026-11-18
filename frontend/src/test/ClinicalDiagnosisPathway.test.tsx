import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ClinicalDiagnosisService } from '../features/clinical/services/clinicalDiagnosisService.js';
import { AssignClinicalDiagnosisModal } from '../features/clinical/components/AssignClinicalDiagnosisModal.js';
import { PatientProfile } from '../pages/patient/PatientProfile.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { PatientExperienceProvider } from '../context/PatientExperienceContext.js';

let mockUser: any = {
  uid: 'patient-demo-001',
  email: 'patient@example.com',
  displayName: 'Sunita Sharma',
  role: 'patient',
  status: 'verified',
};

vi.mock('../context/AuthContext.js', () => ({
  useAuth: () => ({
    currentUser: mockUser,
    role: mockUser?.role || 'patient',
    logout: vi.fn(),
  }),
}));

describe('Priority 3: Separate Alzheimer\'s & Other Dementia Diagnosis Pathways', () => {
  const patientId = 'test-patient-pri3';
  const doctorId = 'test-doctor-pri3';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    mockUser = {
      uid: 'patient-demo-001',
      email: 'patient@example.com',
      displayName: 'Sunita Sharma',
      role: 'patient',
      status: 'verified',
    };
  });

  it('1. assigns Pathway A (Doctor-Confirmed Alzheimer\'s Disease) with biomarker / clinical details', async () => {
    const record = await ClinicalDiagnosisService.assignDiagnosis({
      patientId,
      confirmedByDoctorId: doctorId,
      confirmedByDoctorName: 'Dr. Raman Verma',
      doctorRegistrationNumber: 'MCI-MH-2024-89712',
      pathway: 'alzheimers_confirmed',
      etiology: 'ALZHEIMERS_AMYLOID_CONFIRMED',
      clinicalStage: 'mild_cognitive_impairment',
      diagnosticCriteria: 'NIA-AA 2018 Research Framework & Amyloid PET',
      clinicalRationale: 'Amyloid-positive PET scan with focal episodic recall deficit on HMSE',
    });

    expect(record.id).toBeDefined();
    expect(record.pathway).toBe('alzheimers_confirmed');
    expect(record.etiology).toBe('ALZHEIMERS_AMYLOID_CONFIRMED');
    expect(record.clinicalStage).toBe('mild_cognitive_impairment');
    expect(record.isCurrent).toBe(true);

    const fetched = await ClinicalDiagnosisService.getConfirmedDiagnosis(patientId);
    expect(fetched).not.toBeNull();
    expect(fetched?.pathway).toBe('alzheimers_confirmed');
    expect(fetched?.confirmedByDoctorName).toBe('Dr. Raman Verma');
  });

  it('2. assigns Pathway B (Doctor-Confirmed Other/Mixed Dementia) with specific etiology', async () => {
    const record = await ClinicalDiagnosisService.assignDiagnosis({
      patientId: 'patient-vad-01',
      confirmedByDoctorId: doctorId,
      confirmedByDoctorName: 'Dr. Raman Verma',
      doctorRegistrationNumber: 'MCI-MH-2024-89712',
      pathway: 'other_or_mixed_dementia',
      etiology: 'VASCULAR_DEMENTIA',
      clinicalStage: 'mild_dementia',
      diagnosticCriteria: 'NINDS-AIREN Criteria & Brain MRI',
      clinicalRationale: 'Subcortical ischemic vascular disease with executive dysfunction and gait disturbance',
    });

    expect(record.pathway).toBe('other_or_mixed_dementia');
    expect(record.etiology).toBe('VASCULAR_DEMENTIA');
    expect(record.clinicalStage).toBe('mild_dementia');
  });

  it('3. amends existing diagnosis with clinical reason, creating immutable audit amendment record', async () => {
    const initial = await ClinicalDiagnosisService.assignDiagnosis({
      patientId,
      confirmedByDoctorId: doctorId,
      confirmedByDoctorName: 'Dr. Raman Verma',
      doctorRegistrationNumber: 'MCI-MH-2024-89712',
      pathway: 'alzheimers_confirmed',
      etiology: 'ALZHEIMERS_CLINICAL_PROBABLE',
      clinicalStage: 'mild_cognitive_impairment',
      diagnosticCriteria: 'NIA-AA 2018 Criteria',
      clinicalRationale: 'Initial MCI diagnosis',
    });

    const amended = await ClinicalDiagnosisService.amendDiagnosis(patientId, initial.id, {
      pathway: 'alzheimers_confirmed',
      etiology: 'ALZHEIMERS_AMYLOID_CONFIRMED',
      clinicalStage: 'mild_dementia',
      amendmentReason: 'Positive CSF amyloid ratio confirmed; gradual progression in functional IADLs',
      amendedByDoctorId: doctorId,
      amendedByDoctorName: 'Dr. Raman Verma',
    });

    expect(amended.clinicalStage).toBe('mild_dementia');
    expect(amended.etiology).toBe('ALZHEIMERS_AMYLOID_CONFIRMED');
    expect(amended.amendments).toHaveLength(1);
    expect(amended.amendments?.[0].amendmentReason).toContain('Positive CSF amyloid ratio');
    expect(amended.amendments?.[0].previousStage).toBe('mild_cognitive_impairment');
  });

  it('4. displays doctor-confirmed diagnosis in PatientProfile as read-only badge with doctor details', async () => {
    await ClinicalDiagnosisService.assignDiagnosis({
      patientId: 'patient-demo-001',
      confirmedByDoctorId: doctorId,
      confirmedByDoctorName: 'Dr. Raman Verma',
      doctorRegistrationNumber: 'MCI-MH-2024-89712',
      pathway: 'alzheimers_confirmed',
      etiology: 'ALZHEIMERS_AMYLOID_CONFIRMED',
      clinicalStage: 'mild_cognitive_impairment',
      diagnosticCriteria: 'NIA-AA 2018',
      clinicalRationale: 'Doctor-confirmed early Alzheimer pathology',
    });

    render(
      <BrowserRouter>
        <AccessibilityProvider>
          <LanguageProvider>
            <PatientExperienceProvider>
              <PatientProfile />
            </PatientExperienceProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('patient-clinical-pathway-card')).toBeInTheDocument();
    const badge = screen.getByTestId('patient-pathway-badge');
    expect(badge).toHaveTextContent(/Pathway A: Doctor-Confirmed Alzheimer's Disease/i);
    expect(screen.getByText(/Dr\. Raman Verma/i)).toBeInTheDocument();
    expect(screen.getByText(/MCI-MH-2024-89712/i)).toBeInTheDocument();
  });

  it('5. displays Clinical Evaluation Pending state in PatientProfile when unassigned', async () => {
    mockUser = {
      uid: 'unassigned-patient-001',
      email: 'unassigned@example.com',
      displayName: 'Ramesh Gupta',
      role: 'patient',
      status: 'verified',
    };

    render(
      <BrowserRouter>
        <AccessibilityProvider>
          <LanguageProvider>
            <PatientExperienceProvider>
              <PatientProfile />
            </PatientExperienceProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </BrowserRouter>
    );

    const badge = screen.getByTestId('patient-pathway-badge');
    expect(badge).toHaveTextContent(/Clinical Evaluation Pending/i);
    expect(
      screen.getByText(/Your care pathway is assigned by your doctor during your clinical evaluation/i)
    ).toBeInTheDocument();
  });

  it('6. renders AssignClinicalDiagnosisModal and allows doctor to assign diagnosis pathway', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AssignClinicalDiagnosisModal
        isOpen={true}
        onClose={onClose}
        patientId="pat-modal-test"
        patientName="Sunita Sharma"
        doctorId={doctorId}
        doctorName="Dr. Raman Verma"
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText(/Assign Clinical Diagnosis Pathway/i)).toBeInTheDocument();
    expect(screen.getByTestId('pathway-a-btn')).toBeInTheDocument();
    expect(screen.getByTestId('pathway-b-btn')).toBeInTheDocument();

    // Switch to Pathway B
    fireEvent.click(screen.getByTestId('pathway-b-btn'));

    // Fill rationale
    const rationaleInput = screen.getByPlaceholderText(/Document the clinical basis/i);
    fireEvent.change(rationaleInput, {
      target: { value: 'CT scan shows multi-infarct subcortical white matter hyperintensities' },
    });

    // Submit
    const submitBtn = screen.getByTestId('confirm-diagnosis-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    const recorded = onSuccess.mock.calls[0][0];
    expect(recorded.pathway).toBe('other_or_mixed_dementia');
    expect(recorded.clinicalRationale).toContain('CT scan shows multi-infarct');
  });
});
