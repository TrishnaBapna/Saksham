import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssignCognitiveTaskModal } from '../features/doctor/components/AssignCognitiveTaskModal.js';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard.js';
import { AuthProvider } from '../context/AuthContext.js';
import { MemoryRouter } from 'react-router-dom';

describe('Doctor Cognitive Task Assignment (BUG-H1)', () => {
  const mockDoctorId = 'demo-doctor-001';
  const mockDoctorName = 'Dr. Raman Verma';
  const mockPatientId = 'demo-patient-001';
  const mockPatientName = 'Sunita Sharma';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      'saksham_auth_user',
      JSON.stringify({
        uid: 'demo-doctor-001',
        email: 'doctor@saksham.care',
        displayName: 'Dr. Raman Verma',
        role: 'doctor',
        status: 'verified',
      })
    );
    vi.clearAllMocks();
  });

  it('renders modal with accessible attributes and loads supported games', () => {
    render(
      <AssignCognitiveTaskModal
        isOpen={true}
        onClose={vi.fn()}
        doctorId={mockDoctorId}
        doctorName={mockDoctorName}
        patientId={mockPatientId}
        patientName={mockPatientName}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'assign-task-modal-title');
    expect(screen.getByText('Assign Cognitive Activity')).toBeInTheDocument();
    expect(screen.getByText(/Sunita Sharma/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Supported Cognitive Activity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clinical Instructions & Patient Guidance/i)).toBeInTheDocument();
  });

  it('validates required clinical instructions before submitting', async () => {
    render(
      <AssignCognitiveTaskModal
        isOpen={true}
        onClose={vi.fn()}
        doctorId={mockDoctorId}
        doctorName={mockDoctorName}
        patientId={mockPatientId}
        patientName={mockPatientName}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Confirm Assignment/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Clinical instructions for the patient and caregiver are required/i)
    ).toBeInTheDocument();
  });

  it('successfully creates assignment and calls onAssigned callback', async () => {
    const onAssigned = vi.fn();
    const onClose = vi.fn();

    render(
      <AssignCognitiveTaskModal
        isOpen={true}
        onClose={onClose}
        doctorId={mockDoctorId}
        doctorName={mockDoctorName}
        patientId={mockPatientId}
        patientName={mockPatientName}
        onAssigned={onAssigned}
      />
    );

    const instructionsInput = screen.getByLabelText(/Clinical Instructions & Patient Guidance/i);
    fireEvent.change(instructionsInput, {
      target: { value: 'Practice daily after morning tea for 5 minutes peacefully.' },
    });

    const goalInput = screen.getByLabelText(/Clinical Goal/i);
    fireEvent.change(goalInput, {
      target: { value: 'Short-term visual recall reinforcement' },
    });

    const altDaysBtn = screen.getByRole('button', { name: /Alt\. Days/i });
    fireEvent.click(altDaysBtn);

    const submitBtn = screen.getByRole('button', { name: /Confirm Assignment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onAssigned).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: mockPatientId,
          doctorId: mockDoctorId,
          frequency: 'alternate_days',
          clinicalGoal: 'Short-term visual recall reinforcement',
          instructions: 'Practice daily after morning tea for 5 minutes peacefully.',
          status: 'active',
        })
      );
    });
  });

  it('rejects unauthorized doctors from assigning activities', async () => {
    render(
      <AssignCognitiveTaskModal
        isOpen={true}
        onClose={vi.fn()}
        doctorId="unauthorized-doctor-999"
        doctorName="Dr. Impostor"
        patientId={mockPatientId}
        patientName={mockPatientName}
      />
    );

    const instructionsInput = screen.getByLabelText(/Clinical Instructions & Patient Guidance/i);
    fireEvent.change(instructionsInput, {
      target: { value: 'Unauthorized attempt instructions.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm Assignment/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Doctor is not authorized to assign activities/i)
    ).toBeInTheDocument();
  });

  it('closes modal when cancel button is clicked or Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <AssignCognitiveTaskModal
        isOpen={true}
        onClose={onClose}
        doctorId={mockDoctorId}
        doctorName={mockDoctorName}
        patientId={mockPatientId}
        patientName={mockPatientName}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('opens modal from DoctorDashboard and shows assigned activities list', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DoctorDashboard />
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial load displays assigned cognitive activities heading
    expect(
      await screen.findByText(/Assigned Cognitive Activities/i)
    ).toBeInTheDocument();

    const openModalBtn = screen.getByRole('button', { name: /\+ Assign Cognitive Activity/i });
    expect(openModalBtn).toBeInTheDocument();
    fireEvent.click(openModalBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Assign Cognitive Activity')).toBeInTheDocument();
  });
});
