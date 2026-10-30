/**
 * Administrator Login page.
 * Privileged portal — strictly pre-provisioned, no open self-registration.
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import {
  signInAdmin,
  resetPassword,
  humaniseAuthError,
} from './authService';

type Mode = 'login' | 'forgot';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname
    ?? '/admin/dashboard';

  const [mode, setMode]           = useState<Mode>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const { toasts, toast, dismiss } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signInAdmin(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      toast(humaniseAuthError(code), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      toast('Administrative reset link dispatched to authorized email.', 'success');
      setMode('login');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      toast(humaniseAuthError(code), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-gradient-to-br from-slate-900 via-gray-900 to-teal-950
                 flex flex-col items-center justify-center p-4 gap-6 text-white"
      aria-label="Administrator sign in"
    >
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="text-center">
        <div className="text-5xl mb-2" aria-hidden="true">🛡️</div>
        <h1 className="text-2xl font-bold text-teal-400 font-heading">
          Administrative Oversight Portal
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Saksham Role Provisioning & Security Audit Management
        </p>
      </div>

      <Card className="w-full max-w-sm bg-gray-800/90 border border-gray-700 text-white backdrop-blur">
        {mode === 'login' && (
          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
            <div className="p-3 bg-teal-950/60 border border-teal-800 rounded-xl text-xs text-teal-300">
              <strong>Privileged Access:</strong> Administrative actions and system audits are cryptographically signed and logged.
            </div>

            <div>
              <label htmlFor="admin-email" className="label text-gray-200">
                Administrator Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input bg-gray-900/80 border-gray-600 text-white placeholder-gray-500"
                placeholder="admin@saksham.health"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="label text-gray-200">
                Security Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input bg-gray-900/80 border-gray-600 text-white placeholder-gray-500"
                placeholder="••••••••••••"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full bg-teal-600 hover:bg-teal-500" loading={loading}>
              Sign In as Administrator
            </Button>

            <div className="flex justify-center text-xs">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-teal-400 hover:underline"
              >
                Forgot administrator password?
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} noValidate className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-white">Reset Administrative Password</h2>
            <div>
              <label htmlFor="admin-forgot-email" className="label text-gray-200">
                Administrator Email
              </label>
              <input
                id="admin-forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input bg-gray-900/80 border-gray-600 text-white placeholder-gray-500"
                placeholder="admin@saksham.health"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full bg-teal-600 hover:bg-teal-500" loading={loading}>
              Send Recovery Link
            </Button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-xs text-teal-400 hover:underline text-center"
            >
              ← Back to administrator login
            </button>
          </form>
        )}
      </Card>

      <p className="text-xs text-gray-500 text-center">
        <a href="/patient/login" className="text-teal-400 hover:underline">Patient</a>
        {' · '}
        <a href="/caregiver/login" className="text-teal-400 hover:underline">Caregiver</a>
        {' · '}
        <a href="/doctor/login" className="text-teal-400 hover:underline">Doctor</a>
      </p>
    </main>
  );
};
