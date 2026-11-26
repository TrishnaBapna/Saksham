import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleSelector } from '../features/auth/components/RoleSelector.js';

describe('RoleSelector Component (Four-Role Medical & Care Entry Screen)', () => {
  it('renders branding, tagline and all four visible role cards: Patient, Caregiver, Doctor, and Admin', () => {
    const handleSelect = vi.fn();
    render(<RoleSelector onSelectRole={handleSelect} />);

    expect(screen.getByText(/Care • Connection • Confidence/i)).toBeInTheDocument();
    expect(screen.getByText('Patient Sanctuary')).toBeInTheDocument();
    expect(screen.getByText('Caregiver Portal')).toBeInTheDocument();
    expect(screen.getByText('Clinician Console')).toBeInTheDocument();
    expect(screen.getByText('Administrator Hub')).toBeInTheDocument();

    // Verify Disease selection never appears as a login choice
    expect(screen.queryByText(/Alzheimer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Parkinson/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dementia/i)).not.toBeInTheDocument();
  });

  it('triggers onSelectRole with selected role when any of the 4 cards is clicked', () => {
    const handleSelect = vi.fn();
    render(<RoleSelector onSelectRole={handleSelect} />);

    fireEvent.click(screen.getByLabelText(/Select Patient Sanctuary/i));
    expect(handleSelect).toHaveBeenCalledWith('patient');

    fireEvent.click(screen.getByLabelText(/Select Caregiver Portal/i));
    expect(handleSelect).toHaveBeenCalledWith('caregiver');

    fireEvent.click(screen.getByLabelText(/Select Clinician Console/i));
    expect(handleSelect).toHaveBeenCalledWith('doctor');

    fireEvent.click(screen.getByLabelText(/Select Administrator Hub/i));
    expect(handleSelect).toHaveBeenCalledWith('admin');
  });
});
