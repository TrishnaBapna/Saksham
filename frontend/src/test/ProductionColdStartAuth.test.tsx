import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext.js';
import { AuthService } from '../features/auth/services/authService.js';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute.js';
import { DEMO_USERS } from '../features/auth/services/roleService.js';
import { AuthUser } from '../features/auth/types/auth.types.js';

// Helper component to read auth context state
const AuthConsumer = () => {
  const { currentUser, isAuthenticated, isLoading, role } = useAuth();
  return (
    <div>
      <span data-testid="is-loading">{String(isLoading)}</span>
      <span data-testid="is-authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-email">{currentUser?.email || 'none'}</span>
      <span data-testid="user-role">{role}</span>
    </div>
  );
};

describe('Production Authentication Cold-Start Remediation (Stage L.1)', () => {
  const originalDev = import.meta.env.DEV;
  const originalProd = import.meta.env.PROD;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    // Restore environment flags
    // @ts-ignore
    import.meta.env.DEV = originalDev;
    // @ts-ignore
    import.meta.env.PROD = originalProd;
    localStorage.clear();
  });

  // 1. Fresh production visitor with empty localStorage
  it('1. Fresh production visitor with empty localStorage initializes with currentUser = null and redirects to login', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    // Simulate Firebase onAuthStateChanged reporting no session
    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((callback) => {
      // Async trigger representing Firebase IndexedDB check returning null
      setTimeout(() => callback(null), 10);
      return () => {};
    });

    render(
      <MemoryRouter initialEntries={['/patient']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/patient"
              element={
                <ProtectedRoute allowedRole="patient">
                  <div>Protected Patient Sanctuary</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Public Login Screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // While loading, security spinner is shown and protected content is hidden
    expect(screen.getByText(/Verifying security credentials/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Patient Sanctuary')).not.toBeInTheDocument();

    // After auth check completes, unauthenticated visitor is redirected to /login
    await waitFor(() => {
      expect(screen.getByText('Public Login Screen')).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected Patient Sanctuary')).not.toBeInTheDocument();
  });

  // 2. Fresh production visitor with demo-user localStorage values
  it('2. Fresh production visitor with demo-user localStorage values purges demo token and remains unauthenticated', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    // Seed malicious or stale demo user into localStorage
    localStorage.setItem('saksham_auth_user', JSON.stringify(DEMO_USERS['patient@saksham.care']));

    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((callback) => {
      setTimeout(() => callback(null), 10);
      return () => {};
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial state in production MUST NOT read the demo user from localStorage
    expect(screen.getByTestId('user-email').textContent).toBe('none');

    // Storage token must be cleared
    expect(localStorage.getItem('saksham_auth_user')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
  });

  // 3. Valid Firebase authenticated session restoration
  it('3. Valid Firebase authenticated session restoration securely establishes production user', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    const mockLiveUser: AuthUser = {
      uid: 'live-doctor-uid-888',
      email: 'dr.verma@hospital.in',
      displayName: 'Dr. Raman Verma',
      role: 'doctor',
      status: 'verified',
      specialty: 'Cognitive Neurology',
    };

    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((callback) => {
      setTimeout(() => callback(mockLiveUser), 10);
      return () => {};
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/doctor"
              element={
                <ProtectedRoute allowedRole="doctor">
                  <div>Verified Doctor Clinical Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Verified Doctor Clinical Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument();
  });

  // 4. Invalid or expired session
  it('4. Invalid or expired session resolves to unauthenticated state and redirects', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((callback) => {
      // Simulating token expiry or revocation by Firebase
      setTimeout(() => callback(null), 10);
      return () => {};
    });

    render(
      <MemoryRouter initialEntries={['/caregiver']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/caregiver"
              element={
                <ProtectedRoute allowedRole="caregiver">
                  <div>Caregiver Portal</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Screen with Expired Notice</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Screen with Expired Notice')).toBeInTheDocument();
    });
    expect(screen.queryByText('Caregiver Portal')).not.toBeInTheDocument();
  });

  // 5. Logout followed by a fresh application load
  it('5. Logout followed by a fresh application load ensures user remains unauthenticated', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    const signOutSpy = vi.spyOn(AuthService, 'signOut').mockResolvedValue(undefined);

    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((cb) => {
      cb(null);
      return () => {};
    });

    const LogoutTrigger = () => {
      const { logout, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="auth-state">{String(isAuthenticated)}</span>
          <button onClick={logout}>Sign Out Now</button>
        </div>
      );
    };

    const { unmount } = render(
      <AuthProvider>
        <LogoutTrigger />
      </AuthProvider>
    );

    const btn = screen.getByRole('button', { name: /Sign Out Now/i });
    await act(async () => {
      btn.click();
    });

    expect(signOutSpy).toHaveBeenCalled();
    expect(localStorage.getItem('saksham_auth_user')).toBeNull();

    unmount();

    // Fresh application load simulation
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-email').textContent).toBe('none');
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
  });

  // 6. Development demo mode
  it('6. Development demo mode preserves demo role switching and local prototyping', async () => {
    // @ts-ignore
    import.meta.env.DEV = true;
    // @ts-ignore
    import.meta.env.PROD = false;

    const DemoSwitcher = () => {
      const { currentUser, role, switchDemoRole } = useAuth();
      return (
        <div>
          <span data-testid="current-role">{role}</span>
          <span data-testid="current-email">{currentUser?.email}</span>
          <button onClick={() => switchDemoRole('doctor')}>Switch to Doctor</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <DemoSwitcher />
      </AuthProvider>
    );

    // Initial development mode defaults to demo patient
    expect(screen.getByTestId('current-role').textContent).toBe('patient');
    expect(screen.getByTestId('current-email').textContent).toBe('patient@saksham.care');

    // Switch to doctor demo role
    const switchBtn = screen.getByRole('button', { name: /Switch to Doctor/i });
    act(() => {
      switchBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-role').textContent).toBe('doctor');
      expect(screen.getByTestId('current-email').textContent).toBe('doctor@saksham.care');
    });
  });

  // 7. Patient, caregiver, doctor and admin route isolation
  it('7. Enforces strict role isolation between patient, caregiver, doctor, and admin portals', async () => {
    // 7A: Patient trying to access /doctor
    const patientUser: AuthUser = {
      uid: 'patient-uid-100',
      email: 'patient@saksham.care',
      displayName: 'Patient User',
      role: 'patient',
      status: 'verified',
    };

    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((callback) => {
      callback(patientUser);
      return () => {};
    });

    const { unmount: unmountPatient } = render(
      <MemoryRouter initialEntries={['/doctor']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/doctor"
              element={
                <ProtectedRoute allowedRole="doctor">
                  <div>Doctor Only Dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Mismatch guard must display unauthorized banner and block children
    expect(screen.getByText('Unauthorized Dashboard Access')).toBeInTheDocument();
    expect(screen.queryByText('Doctor Only Dashboard')).not.toBeInTheDocument();
    unmountPatient();

    // 7B: Pending doctor trying to access /doctor
    const pendingDoctor: AuthUser = {
      uid: 'doctor-pending-200',
      email: 'dr.pending@saksham.care',
      displayName: 'Dr. Pending',
      role: 'doctor',
      status: 'pending',
    };

    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((callback) => {
      callback(pendingDoctor);
      return () => {};
    });

    const { unmount: unmountPending } = render(
      <MemoryRouter initialEntries={['/doctor']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/doctor"
              element={
                <ProtectedRoute allowedRole="doctor">
                  <div>Doctor Only Dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Account Pending Verification')).toBeInTheDocument();
    expect(screen.queryByText('Doctor Only Dashboard')).not.toBeInTheDocument();
    unmountPending();

    // 7C: Caregiver trying to access /admin
    const caregiverUser: AuthUser = {
      uid: 'caregiver-uid-300',
      email: 'caregiver@saksham.care',
      displayName: 'Caregiver User',
      role: 'caregiver',
      status: 'verified',
    };

    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((callback) => {
      callback(caregiverUser);
      return () => {};
    });

    const { unmount: unmountCaregiver } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <div>Admin Management Console</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized Dashboard Access')).toBeInTheDocument();
    expect(screen.queryByText('Admin Management Console')).not.toBeInTheDocument();
    unmountCaregiver();

    // 7D: Admin accessing /admin successfully
    const adminUser: AuthUser = {
      uid: 'admin-uid-400',
      email: 'admin@saksham.care',
      displayName: 'Admin User',
      role: 'admin',
      status: 'verified',
    };

    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation((callback) => {
      callback(adminUser);
      return () => {};
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <div>Admin Management Console</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Management Console')).toBeInTheDocument();
  });

  // 8. Protected route behavior while Firebase authentication is still loading
  it('8. Protected route displays loading spinner while Firebase authentication is resolving', () => {
    // When isLoading is true, children must never be shown and user must not be redirected prematurely
    vi.spyOn(AuthService, 'onAuthStateChanged').mockImplementation(() => {
      // Never trigger callback to simulate in-flight resolution
      return () => {};
    });

    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    render(
      <MemoryRouter initialEntries={['/patient']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/patient"
              element={
                <ProtectedRoute allowedRole="patient">
                  <div>Secret Patient Medical Notes</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Verifying security credentials banner should be present
    expect(screen.getByText(/Verifying security credentials/i)).toBeInTheDocument();
    // Secret patient notes must NOT be rendered
    expect(screen.queryByText('Secret Patient Medical Notes')).not.toBeInTheDocument();
    // Premature redirect to login must NOT have happened
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
