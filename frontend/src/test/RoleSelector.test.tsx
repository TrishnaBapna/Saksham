import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleSelector } from '../features/auth/components/RoleSelector.js';

describe('RoleSelector Component (Adaptive Entry Screen)', () => {
  it('renders branding, tagline and all four role cards', () => {
    const handleSelect = vi.fn();
    render(<RoleSelector onSelectRole={handleSelect} />);

    expect(screen.getByText(/Care • Connection • Confidence/i)).toBeInTheDocument();
    expect(screen.getByText('Patient Sanctuary')).toBeInTheDocument();
    expect(screen.getByText('Caregiver Portal')).toBeInTheDocument();
    expect(screen.getByText('Clinician Console')).toBeInTheDocument();
    expect(screen.getByText('Administrator Hub')).toBeInTheDocument();
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
