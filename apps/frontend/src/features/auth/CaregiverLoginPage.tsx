/**
 * Caregiver Login & Registration page.
 * Caregiver accounts must be authorized by the patient after registration.
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { ToastContainer } from '@/components/ui/Toast';
import {
  signInCaregiver,
  registerCaregiver,
  resetPassword,
  humaniseAuthError,
} from './authService';

type Mode = 'login' | 'register' | 'forgot';

export const CaregiverLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname
    ?? '/caregiver/dashboard';

  const [mode, setMode]           = useState<Mode>('login');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const { toasts, toast, dismiss } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signInCaregiver(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      toast(humaniseAuthError(code), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast('Please enter your full name.', 'warning'); return; }
    setLoading(true);
    try {
      await registerCaregiver({ email, password, name: name.trim() });
      toast(
        'Account created! Please verify your email, then ask your patient to authorize you.',
        'success',
        8000
      );
      setMode('login');
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
      toast('Password reset email sent! Check your inbox.', 'success');
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
      className="min-h-dvh bg-gradient-to-br from-green-50 via-white to-teal-50
                 flex flex-col items-center justify-center p-4 gap-6"
      aria-label="Caregiver sign in"
    >
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="text-center">
        <div className="text-5xl mb-2" aria-hidden="true">🤝</div>
        <h1 className="text-2xl font-bold text-teal-700 font-heading">Caregiver Sign In</h1>
        <p className="text-sm text-gray-500 mt-1">Saksham Care Platform</p>
      </div>

      <Card className="w-full max-w-sm">
        {mode === 'login' && (
          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Welcome back</h2>

            <div>
              <label htmlFor="cg-email" className="label">Email address</label>
              <input
                id="cg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="cg-password" className="label">Password</label>
              <input
                id="cg-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Sign In
            </Button>

            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-teal-600 hover:underline focus-visible:ring-2
                           focus-visible:ring-teal-500 rounded"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-teal-600 hover:underline focus-visible:ring-2
                           focus-visible:ring-teal-500 rounded"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Register as Caregiver</h2>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 leading-relaxed">
              After registration, your patient will need to authorize you from their account
              before you can view their data.
            </p>

            <div>
              <label htmlFor="cg-name" className="label">Full name</label>
              <input
                id="cg-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="cg-reg-email" className="label">Email address</label>
              <input
                id="cg-reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="cg-reg-password" className="label">
                Password <span className="text-gray-400 font-normal">(min 6 characters)</span>
              </label>
              <input
                id="cg-reg-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Choose a password"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Create Account
            </Button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-sm text-teal-600 hover:underline text-center
                         focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
            >
              Already have an account? Sign in
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} noValidate className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Reset your password</h2>
            <div>
              <label htmlFor="cg-forgot-email" className="label">Email address</label>
              <input
                id="cg-forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Send Reset Link
            </Button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-sm text-teal-600 hover:underline text-center
                         focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
            >
              ← Back to sign in
            </button>
          </form>
        )}
      </Card>

      <p className="text-xs text-gray-400 text-center">
        <a href="/patient/login" className="text-teal-600 hover:underline">Patient</a>
        {' · '}
        <a href="/doctor/login" className="text-teal-600 hover:underline">Doctor</a>
      </p>
    </main>
  );
};
