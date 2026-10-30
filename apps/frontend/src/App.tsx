import React, { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { useToast } from '@/components/ui/Toast';
import { ToastContainer } from '@/components/ui/Toast';

// Lazy-load pages — keeps initial bundle small
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);

// ─── Route definitions ─────────────────────────────────────────────────────

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoading />}>
        <LoginPage />
      </Suspense>
    ),
  },
  // Stage 2 will add:
  //   /patient-onboarding
  //   /patient/*
  //   /caregiver/*
  //   /doctor/*
  {
    path: '*',
    element: <NotFound />,
  },
]);

// ─── Loading fallback ──────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-white"
      aria-label="Loading"
      role="status"
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
        href="/login"
        className="text-teal-600 underline hover:text-teal-700 focus-visible:ring-2
                   focus-visible:ring-teal-500 rounded"
      >
        Return to login
      </a>
    </main>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  const { toasts, dismiss } = useToast();

  return (
    <>
      {/* Skip-to-content link for keyboard / screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
                   focus:z-[99999] bg-teal-600 text-white px-4 py-2 rounded-xl
                   font-semibold shadow-lg"
      >
        Skip to main content
      </a>

      {/* Toast portal anchor */}
      <div id="toast-root" aria-live="polite" aria-atomic="false" />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <RouterProvider router={router} />
    </>
  );
};
