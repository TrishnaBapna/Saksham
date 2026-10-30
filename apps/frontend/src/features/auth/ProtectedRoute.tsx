/**
 * ProtectedRoute — guards a route by role.
 *
 * Behaviour:
 *  - While loading auth state: shows a full-screen spinner
 *  - Not signed in: redirects to the role-specific login page
 *  - Signed in but wrong role: redirects to own dashboard login
 *  - Signed in, correct role, email unverified (patients): shows verification prompt
 *  - Signed in, correct role, onboarding incomplete (patients): redirects to onboarding
 *  - All checks pass: renders children
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from '@/types/firestore';

interface ProtectedRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
  /** If true, does NOT require email verification (useful for onboarding itself) */
  skipEmailCheck?: boolean;
}

const ROLE_LOGIN_PATHS: Record<UserRole, string> = {
  patient:        '/patient/login',
  caregiver:      '/caregiver/login',
  doctor:         '/doctor/login',
  senior_clinician: '/doctor/login',
  hospital_admin: '/doctor/login',
  system_admin:   '/doctor/login',
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRole,
  children,
  skipEmailCheck = false,
}) => {
  const { user, profile, role, loading } = useAuth();
  const location = useLocation();

  // 1. Auth state still loading
  if (loading) {
    return <FullScreenSpinner />;
  }

  // 2. Not signed in → go to the appropriate login
  if (!user) {
    return (
      <Navigate
        to={ROLE_LOGIN_PATHS[allowedRole]}
        replace
        state={{ from: location }}
      />
    );
  }

  // 3. Signed in but wrong role → redirect to their own login
  if (role && role !== allowedRole) {
    return <Navigate to={ROLE_LOGIN_PATHS[role] ?? '/patient/login'} replace />;
  }

  // 4. Email not verified (patient-facing check)
  if (!skipEmailCheck && !user.emailVerified && allowedRole === 'patient') {
    return <EmailVerificationPrompt email={user.email ?? ''} />;
  }

  // 5. Patient onboarding incomplete → redirect to onboarding
  if (
    allowedRole === 'patient' &&
    profile !== null &&
    profile.onboardingComplete === false &&
    location.pathname !== '/patient-onboarding'
  ) {
    return <Navigate to="/patient-onboarding" replace />;
  }

  // All checks passed
  return <>{children}</>;
};

// ─── Loading spinner ───────────────────────────────────────────────────────────

function FullScreenSpinner() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-white"
      role="status"
      aria-label="Loading"
    >
      <div
        className="w-12 h-12 border-4 border-teal-500 border-t-transparent
                   rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading your account…</span>
    </div>
  );
}

// ─── Email verification prompt ────────────────────────────────────────────────

function EmailVerificationPrompt({ email }: { email: string }) {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-gray-50">
      <div className="card max-w-md w-full text-center flex flex-col items-center gap-4">
        <div className="text-5xl" aria-hidden="true">📧</div>
        <h1 className="text-xl font-bold text-gray-900">Verify your email</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          We sent a verification link to <strong>{email}</strong>.
          Please check your inbox and click the link, then come back here.
        </p>
        <p className="text-xs text-gray-400">
          Didn't receive it? Check your spam folder or{' '}
          <button
            className="text-teal-600 underline focus-visible:ring-2
                       focus-visible:ring-teal-500 rounded"
            onClick={() => window.location.reload()}
          >
            try refreshing
          </button>{' '}
          after verifying.
        </p>
      </div>
    </main>
  );
}
