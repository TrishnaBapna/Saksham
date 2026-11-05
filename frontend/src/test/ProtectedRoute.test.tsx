import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute.js';
import * as AuthContextModule from '../context/AuthContext.js';

describe('ProtectedRoute Route Guard & Boundary Enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects unauthenticated user to login screen with allowedRole parameter', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: null,
      role: 'patient',
      isAuthenticated: false,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      logout: vi.fn(),
      sendPasswordReset: vi.fn(),
      switchDemoRole: vi.fn(),
      setRole: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRole="doctor">
                <div>Protected Doctor Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Portal Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Portal Screen')).toBeInTheDocument();
  });

  it('renders Access Denied banner when user role does not match allowedRole', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        uid: 'user-001',
        email: 'patient@saksham.care',
        displayName: 'Sunita Sharma',
        role: 'patient',
        status: 'verified',
      },
      role: 'patient',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      logout: vi.fn(),
      sendPasswordReset: vi.fn(),
      switchDemoRole: vi.fn(),
      setRole: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRole="doctor">
                <div>Protected Doctor Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized Dashboard Access')).toBeInTheDocument();
    expect(screen.getByText(/You are authenticated as/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to My Permitted \(patient\) Dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Doctor Dashboard')).not.toBeInTheDocument();
  });

  it('renders Account Pending screen when status is pending', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        uid: 'doc-002',
        email: 'doctor.pending@saksham.care',
        displayName: 'Dr. Neha Sen',
        role: 'doctor',
        status: 'pending',
      },
      role: 'doctor',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      logout: vi.fn(),
      sendPasswordReset: vi.fn(),
      switchDemoRole: vi.fn(),
      setRole: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRole="doctor">
                <div>Protected Doctor Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Account Pending Verification')).toBeInTheDocument();
    expect(screen.queryByText('Protected Doctor Dashboard')).not.toBeInTheDocument();
  });

  it('allows access and renders children when authenticated with matching role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        uid: 'doc-001',
        email: 'doctor@saksham.care',
        displayName: 'Dr. Raman Verma',
        role: 'doctor',
        status: 'verified',
      },
      role: 'doctor',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      logout: vi.fn(),
      sendPasswordReset: vi.fn(),
      switchDemoRole: vi.fn(),
      setRole: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRole="doctor">
                <div>Protected Doctor Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Doctor Dashboard')).toBeInTheDocument();
  });
});
