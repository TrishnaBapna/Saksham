import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  KeyRound,
  Camera,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Lock,
  Calendar,
  Layers
} from 'lucide-react';
import { getPasskeys, getFaceProfile, deleteFaceProfile } from '../firebase/db';
import AiAssistant from './AiAssistant';

export default function ProfileDashboard({
  currentUser,
  profile,
  onOpenPasskeyEnrollment,
  onOpenFaceEnrollment,
  onRefreshProfile
}) {
  const [passkeys, setPasskeys] = useState([]);
  const [faceData, setFaceData] = useState(null);
  const [loadingBiometrics, setLoadingBiometrics] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  useEffect(() => {
    loadBiometricsInfo();
  }, [currentUser]);

  async function loadBiometricsInfo() {
    if (!currentUser?.uid) return;
    setLoadingBiometrics(true);
    try {
      const [pKeys, fData] = await Promise.all([
        getPasskeys(currentUser.uid),
        getFaceProfile(currentUser.uid)
      ]);
      setPasskeys(pKeys);
      setFaceData(fData);
    } catch(err) {
      console.error('[Load Biometrics Error]:', err);
    } finally {
      setLoadingBiometrics(false);
    }
  }

  // Handle "Delete My Face Data"
  async function handleDeleteFaceData() {
    try {
      await deleteFaceProfile(currentUser.uid);
      setFaceData(null);
      setDeleteConfirm(false);
      setActionNotice('Face data permanently deleted from Firestore.');
      onRefreshProfile();
      setTimeout(() => setActionNotice(''), 4000);
    } catch(err) {
      console.error('[Delete Face Data Error]:', err);
      setActionNotice('Failed to delete face data: ' + err.message);
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      
      {/* Action Notice */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-emerald-600/20">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-white font-heading tracking-tight">
                  {profile?.name || currentUser?.displayName || 'Personal Profile'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{currentUser?.email}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>UID: {currentUser?.uid?.substring(0, 10)}…</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onOpenPasskeyEnrollment}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 hover:border-emerald-500 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <KeyRound className="w-4 h-4" />
              <span>Register Passkey</span>
            </button>
            <button
              onClick={onOpenFaceEnrollment}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Camera className="w-4 h-4" />
              <span>{faceData ? 'Update Face Profile' : 'Register My Face'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Separate Biometrics Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. SECURE DEVICE BIOMETRICS (WebAuthn / Passkeys) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white font-heading">
                    WebAuthn / Passkeys
                  </h3>
                  <p className="text-[11px] text-slate-400">Device Hardware Biometrics</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                passkeys.length > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                {passkeys.length > 0 ? `${passkeys.length} Registered` : 'Not Enrolled'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Provides phishing-resistant authentication via Touch ID, Windows Hello, Face ID, or your device lock PIN. Raw biometric signals never leave your local hardware enclave.
            </p>

            {/* Passkeys List */}
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Registered Passkey Credentials (users/{'{userId}'}/passkeys/):
              </p>
              {passkeys.length > 0 ? (
                passkeys.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-mono text-emerald-400 font-bold text-[11px]">{p.credentialId.substring(0, 24)}…</p>
                      <p className="text-[10px] text-slate-500">Sign Count: {p.signCount || 0}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 font-mono">
                      FIDO2
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-500 text-center">
                  No passkeys registered yet on this device.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={onOpenPasskeyEnrollment}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Register New Device Passkey</span>
            </button>
          </div>
        </div>

        {/* 2. CAMERA-BASED FACE RECOGNITION (Local Client-Side AI) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white font-heading">
                    Face Recognition AI
                  </h3>
                  <p className="text-[11px] text-slate-400">Browser Camera &amp; Liveness Engine</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                faceData
                  ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                {faceData ? 'Active Profile' : 'Not Enrolled'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Processes video locally in your browser to extract geometric landmark contour vectors. Only a salted, one-way protected embedding is stored. Video is never uploaded.
            </p>

            {/* Face Profile Details */}
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Face Profile Document (users/{'{userId}'}/faceProfile/primary):
              </p>
              {faceData ? (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-teal-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Protected Representation Enrolled</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Local Vector</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    Embedding Hash: {faceData.protectedEmbedding ? faceData.protectedEmbedding.substring(0, 36) + '…' : 'Encrypted'}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-500 text-center">
                  No face recognition profile enrolled yet.
                </div>
              )}
            </div>
          </div>

          {/* Action Row & Delete My Face Data */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={onOpenFaceEnrollment}
                className="flex-1 py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{faceData ? 'Re-Enroll Face' : 'Register My Face'}</span>
              </button>

              {faceData && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Delete My Face Data"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete Face Data</span>
                </button>
              )}
            </div>

            {/* Delete Confirmation Modal/Prompt */}
            {deleteConfirm && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2 text-xs">
                <p className="text-rose-300 font-bold">
                  Delete all biometric face data from Firestore permanently?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteFaceData}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Gemini AI Assistant Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-extrabold text-lg text-white font-heading">
            Personal Profile AI Assistant (Gemini)
          </h3>
        </div>
        <AiAssistant userProfile={profile} />
      </div>

      {/* Security Architecture Transparency Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security &amp; Biometric Privacy Standards</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <p className="font-bold text-slate-200">1. WebAuthn Passkeys</p>
            <p className="text-[11px]">Hardware-backed cryptographic credentials. Biometric Touch ID/Face ID never leaves the device.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <p className="font-bold text-slate-200">2. Client-Side Face AI</p>
            <p className="text-[11px]">MediaPipe geometry processed locally. Video is never streamed. Salted protected representation in Firestore.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <p className="font-bold text-slate-200">3. Isolated Gemini AI</p>
            <p className="text-[11px]">Strict sanitization prevents biometric or credential forwarding. Server-side proxy protects secrets.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
