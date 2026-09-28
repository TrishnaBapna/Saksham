import React, { useState } from 'react';
import { KeyRound, Camera, ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { loginWithEmail } from '../firebase/auth';
import { findUserByEmail, getPasskeys } from '../firebase/db';
import { authenticateWithDevicePasskey } from '../services/webauthn';

export default function Login({ onLoginSuccess, onOpenFaceModal, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Standard Email Login
  async function handleEmailLogin(e) {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password or choose a biometric login option below.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginWithEmail(email, password);
      onLoginSuccess(res.profile);
    } catch(err) {
      console.error('[Login Error]:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please register first.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Device Passkey Login (WebAuthn)
  async function handlePasskeyLogin() {
    setLoading(true);
    setError('');

    try {
      let allowedCredentials = [];

      // If user typed email, lookup their registered passkeys from Firestore
      if (email.trim()) {
        const found = await findUserByEmail(email.trim());
        if (found) {
          const passkeys = await getPasskeys(found.id);
          allowedCredentials = passkeys.map(p => p.credentialId);
        }
      }

      // Invoke WebAuthn hardware biometric prompt (Touch ID, Windows Hello, Face ID, PIN)
      const assertion = await authenticateWithDevicePasskey(allowedCredentials);

      if (assertion && assertion.success) {
        // Authenticate the user session
        let profile = null;
        if (email.trim()) {
          profile = await findUserByEmail(email.trim());
        }
        if (!profile) {
          profile = {
            id: 'passkey-verified-user',
            name: email ? email.split('@')[0] : 'Passkey User',
            email: email || 'passkey-user@local',
            passkeyEnabled: true
          };
        }
        onLoginSuccess(profile);
      }
    } catch(err) {
      console.warn('[Passkey Login Note]:', err.message);
      if (err.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled on your device.');
      } else {
        setError(err.message || 'Passkey authentication failed. You can sign in with password.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white font-heading">
          Welcome Back
        </h2>
        <p className="text-xs text-slate-400">
          Sign in to your personal profile via biometrics or password
        </p>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Email Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Password input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[11px] text-slate-400 hover:text-emerald-400 transition"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* [ Login ] Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          <span>Login</span>
        </button>
      </form>

      {/* ──────── OR ──────── */}
      <div className="relative flex py-1 items-center">
        <div className="grow border-t border-slate-800"></div>
        <span className="shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-widest">OR</span>
        <div className="grow border-t border-slate-800"></div>
      </div>

      {/* Biometric Buttons */}
      <div className="space-y-3">
        {/* [ 🔐 Login with Passkey ] */}
        <button
          type="button"
          disabled={loading}
          onClick={handlePasskeyLogin}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border-2 border-emerald-500/40 hover:border-emerald-500 text-emerald-400 font-bold text-sm shadow-md hover:shadow-emerald-500/10 active:scale-98 transition flex items-center justify-center gap-2.5 cursor-pointer group"
        >
          <KeyRound className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>🔐 Login with Passkey</span>
        </button>

        {/* [ 👤 Recognize My Face ] */}
        <button
          type="button"
          disabled={loading}
          onClick={() => onOpenFaceModal(email)}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border-2 border-teal-500/40 hover:border-teal-500 text-teal-300 font-bold text-sm shadow-md hover:shadow-teal-500/10 active:scale-98 transition flex items-center justify-center gap-2.5 cursor-pointer group"
        >
          <Camera className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
          <span>👤 Recognize My Face</span>
        </button>
      </div>

      {/* Switch to Register */}
      <div className="pt-2 text-center text-xs text-slate-400">
        Don't have an account yet?{' '}
        <button
          onClick={() => onNavigate('register')}
          className="text-emerald-400 font-bold hover:underline cursor-pointer"
        >
          Create an Account
        </button>
      </div>

    </div>
  );
}
