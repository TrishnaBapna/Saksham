import React, { useState } from 'react';
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Fingerprint, Loader2 } from 'lucide-react';
import { registerDevicePasskey } from '../services/webauthn';

export default function PasskeyEnrollment({ currentUser, onComplete, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleEnrollPasskey() {
    setLoading(true);
    setError('');

    try {
      await registerDevicePasskey({
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.name || 'User',
        userEmail: currentUser.email
      });
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch(err) {
      console.error('[Passkey Enrollment Error]:', err);
      if (err.name === 'NotAllowedError') {
        setError('Passkey registration was cancelled on your device.');
      } else {
        setError(err.message || 'Failed to register passkey.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-white font-heading">
          Register Device Passkey
        </h2>
        <p className="text-xs text-slate-400">
          Hardware-backed biometric authentication (Touch ID, Windows Hello, Face ID, PIN)
        </p>
      </div>

      {/* Info card */}
      <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>FIDO2 / WebAuthn Standard</span>
        </div>
        <p>
          Passkeys replace passwords with cryptographic keypairs. Your private key and biometric data (fingerprint or face) never leave your device's Secure Enclave.
        </p>
        <p className="text-[11px] text-slate-400 font-mono">
          Registration target: users/{currentUser.uid.substring(0, 8)}…/passkeys/
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
          <p className="text-sm font-bold">Passkey Registered Successfully!</p>
          <p className="text-xs text-slate-400">You can now sign in with one touch.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleEnrollPasskey}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            <span>Trigger Device Biometrics</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
          >
            Cancel
          </button>
        </div>
      )}

    </div>
  );
}
