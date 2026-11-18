import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleSelector } from '../features/auth/components/RoleSelector.js';

describe('RoleSelector Component (Two-Role Medical Entry Screen)', () => {
  it('renders branding, tagline and exactly two visible primary role cards: Patient and Doctor', () => {
    const handleSelect = vi.fn();
    render(<RoleSelector onSelectRole={handleSelect} />);

    expect(screen.getByText(/Care • Connection • Confidence/i)).toBeInTheDocument();
    expect(screen.getByText('Patient Sanctuary')).toBeInTheDocument();
    expect(screen.getByText('Clinician Console')).toBeInTheDocument();

    // Verify Caregiver and Admin are NOT present in visible primary login selector
    expect(screen.queryByText('Caregiver Portal')).not.toBeInTheDocument();
    expect(screen.queryByText('Administrator Hub')).not.toBeInTheDocument();

    // Verify Disease selection never appears as a login choice
    expect(screen.queryByText(/Alzheimer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Parkinson/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dementia/i)).not.toBeInTheDocument();
  });

  it('triggers onSelectRole with selected role when card is clicked', () => {
    const handleSelect = vi.fn();
    render(<RoleSelector onSelectRole={handleSelect} />);

    const patientCard = screen.getByLabelText(/Select Patient Sanctuary/i);
    fireEvent.click(patientCard);
    expect(handleSelect).toHaveBeenCalledWith('patient');

    const doctorCard = screen.getByLabelText(/Select Clinician Console/i);
    fireEvent.click(doctorCard);
    expect(handleSelect).toHaveBeenCalledWith('doctor');
  });
});
