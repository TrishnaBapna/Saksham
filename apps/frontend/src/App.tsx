import React, { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';

// ─── Lazy-loaded pages ─────────────────────────────────────────────────────
const PatientLoginPage = lazy(() =>
  import('@/features/auth/PatientLoginPage').then((m) => ({ default: m.PatientLoginPage }))
);
const CaregiverLoginPage = lazy(() =>
  import('@/features/auth/CaregiverLoginPage').then((m) => ({ default: m.CaregiverLoginPage }))
);
const DoctorLoginPage = lazy(() =>
  import('@/features/auth/DoctorLoginPage').then((m) => ({ default: m.DoctorLoginPage }))
);
const OnboardingPage = lazy(() =>
  import('@/features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
);
const PatientDashboard = lazy(() =>
  import('@/features/patient/PatientDashboard').then((m) => ({ default: m.PatientDashboard }))
);
const CaregiverDashboard = lazy(() =>
  import('@/features/caregiver/CaregiverDashboard').then((m) => ({ default: m.CaregiverDashboard }))
);
const DoctorDashboard = lazy(() =>
  import('@/features/doctor/DoctorDashboard').then((m) => ({ default: m.DoctorDashboard }))
);
const AdminLoginPage = lazy(() =>
  import('@/features/auth/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminDashboard = lazy(() =>
  import('@/features/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

// ─── Shared loading fallback ───────────────────────────────────────────────

function PageLoading() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-white"
      role="status"
      aria-label="Loading"
    >
      <div
        className="w-10 h-10 border-4 border-teal-500 border-t-transparent
                   rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

// ─── 404 ──────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4">
      <div className="text-6xl" aria-hidden="true">🔍</div>
      <h1 className="text-2xl font-bold text-gray-800">Page not found</h1>
      <a
        href="/patient/login"
        className="text-teal-600 underline hover:text-teal-700 focus-visible:ring-2
                   focus-visible:ring-teal-500 rounded"
      >
        Return to login
      </a>
    </main>
  );
}

// ─── Route definitions ─────────────────────────────────────────────────────

const router = createBrowserRouter([
  // Root → patient login by default
  { path: '/',       element: <Navigate to="/patient/login" replace /> },
  { path: '/login',  element: <Navigate to="/patient/login" replace /> },

  // ── Patient ──────────────────────────────────────────────────────────────
  {
    path: '/patient/login',
    element: (
      <Suspense fallback={<PageLoading />}>
        <PatientLoginPage />
      </Suspense>
    ),
  },
  {
    path: '/patient-onboarding',
    element: (
      <ProtectedRoute allowedRole="patient" skipEmailCheck>
        <Suspense fallback={<PageLoading />}>
          <OnboardingPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/dashboard',
    element: (
      <ProtectedRoute allowedRole="patient">
        <Suspense fallback={<PageLoading />}>
          <PatientDashboard />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // ── Caregiver ─────────────────────────────────────────────────────────────
  {
    path: '/caregiver/login',
    element: (
      <Suspense fallback={<PageLoading />}>
        <CaregiverLoginPage />
      </Suspense>
    ),
  },
  {
    path: '/caregiver/dashboard',
    element: (
      <ProtectedRoute allowedRole="caregiver">
        <Suspense fallback={<PageLoading />}>
          <CaregiverDashboard />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // ── Doctor ────────────────────────────────────────────────────────────────
  {
    path: '/doctor/login',
    element: (
      <Suspense fallback={<PageLoading />}>
        <DoctorLoginPage />
      </Suspense>
    ),
  },
  {
    path: '/doctor/dashboard',
    element: (
      <ProtectedRoute allowedRole="doctor">
        <Suspense fallback={<PageLoading />}>
          <DoctorDashboard />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // ── Administrator ─────────────────────────────────────────────────────────
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={<PageLoading />}>
        <AdminLoginPage />
      </Suspense>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRole="administrator">
        <Suspense fallback={<PageLoading />}>
          <AdminDashboard />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // ── 404 ───────────────────────────────────────────────────────────────────
  { path: '*', element: <NotFound /> },
]);

// ─── Root App ──────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  return (
    <AuthProvider>
      {/* Skip-to-content for keyboard / screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
                   focus:z-[99999] bg-teal-600 text-white px-4 py-2 rounded-xl
                   font-semibold shadow-lg"
      >
        Skip to main content
      </a>

      {/* Toast portal anchor — each page mounts its own ToastContainer */}
      <div id="toast-root" aria-live="polite" aria-atomic="false" />

      <RouterProvider router={router} />
    </AuthProvider>
  );
};
