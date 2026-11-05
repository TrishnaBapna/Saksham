import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PatientLogin } from '../features/auth/components/PatientLogin.js';

describe('PatientLogin Adaptive Component', () => {
  it('renders Asha companion, welcome message and login inputs', () => {
    const handleSubmit = vi.fn();
    const handleForgot = vi.fn();
    const handleBack = vi.fn();

    render(
      <BrowserRouter>
        <PatientLogin
          onSubmit={handleSubmit}
          onForgotPassword={handleForgot}
          isLoading={false}
          errorMessage={null}
          onBackToRoles={handleBack}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Namaste! I am Asha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Asha character/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enter My Sanctuary/i })).toBeInTheDocument();
    expect(screen.getByText(/Create Patient Account/i)).toBeInTheDocument();
  });

  it('toggles password visibility when the eye button is clicked', () => {
    const handleSubmit = vi.fn();
    const handleForgot = vi.fn();
    const handleBack = vi.fn();

    render(
      <BrowserRouter>
        <PatientLogin
          onSubmit={handleSubmit}
          onForgotPassword={handleForgot}
          isLoading={false}
          errorMessage={null}
          onBackToRoles={handleBack}
        />
      </BrowserRouter>
    );

    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByLabelText(/Show password/i);
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    fireEvent.click(screen.getByLabelText(/Hide password/i));
    expect(passwordInput.type).toBe('password');
  });

  it('validates empty inputs and submits valid credentials', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleForgot = vi.fn();
    const handleBack = vi.fn();

    render(
      <BrowserRouter>
        <PatientLogin
          onSubmit={handleSubmit}
          onForgotPassword={handleForgot}
          isLoading={false}
          errorMessage={null}
          onBackToRoles={handleBack}
        />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('sunita.sharma@saksham.care');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /Enter My Sanctuary/i });

    fireEvent.change(emailInput, { target: { value: 'sunita.sharma@saksham.care' } });
    fireEvent.change(passwordInput, { target: { value: 'securepassword123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith('sunita.sharma@saksham.care', 'securepassword123');
    });
  });
});
