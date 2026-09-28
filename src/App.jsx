import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import ProfileDashboard from './components/ProfileDashboard';
import FaceEnrollment from './components/FaceEnrollment';
import PasskeyEnrollment from './components/PasskeyEnrollment';
import FaceLoginModal from './components/FaceLoginModal';
import { subscribeToAuth } from './firebase/auth';
import { getUserProfile } from './firebase/db';
import { authenticateWithDevicePasskey } from './services/webauthn';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // 'login' | 'register' | 'dashboard' | 'face-enrollment' | 'passkey-enrollment'
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceModalEmail, setFaceModalEmail] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToAuth(({ firebaseUser, profile: userProfile }) => {
      setCurrentUser(firebaseUser);
      setProfile(userProfile);
      if (firebaseUser) {
        setView('dashboard');
      } else {
        setView('login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function refreshProfile() {
    if (currentUser?.uid) {
      const p = await getUserProfile(currentUser.uid);
      setProfile(p);
    }
  }

  function handleLoginSuccess(userProfile) {
    setProfile(userProfile);
    setShowFaceModal(false);
    setView('dashboard');
  }

  function handleOpenFaceModal(email) {
    setFaceModalEmail(email || '');
    setShowFaceModal(true);
  }

  async function handlePasskeyFallbackFromFaceModal() {
    setShowFaceModal(false);
    try {
      const assertion = await authenticateWithDevicePasskey();
      if (assertion && assertion.success) {
        handleLoginSuccess({
          name: 'Passkey Verified User',
          email: faceModalEmail || 'verified@passkey',
          passkeyEnabled: true
        });
      }
    } catch(err) {
      console.warn('[Passkey Fallback Note]:', err.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Loading Secure Biometrics &amp; Profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        profile={profile}
        onNavigate={(target) => setView(target)}
      />

      {/* Main Content View */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8 sm:py-12">
        {view === 'login' && !currentUser && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onOpenFaceModal={handleOpenFaceModal}
            onNavigate={(target) => setView(target)}
          />
        )}

        {view === 'register' && !currentUser && (
          <Register
            onRegisterSuccess={(userProfile) => {
              setProfile(userProfile);
              setView('dashboard');
            }}
            onNavigate={(target) => setView(target)}
          />
        )}

        {view === 'dashboard' && (
          <ProfileDashboard
            currentUser={currentUser}
            profile={profile}
            onOpenPasskeyEnrollment={() => setView('passkey-enrollment')}
            onOpenFaceEnrollment={() => setView('face-enrollment')}
            onRefreshProfile={refreshProfile}
          />
        )}

        {view === 'face-enrollment' && (
          <FaceEnrollment
            currentUser={currentUser}
            onComplete={() => {
              refreshProfile();
              setView('dashboard');
            }}
            onCancel={() => setView('dashboard')}
          />
        )}

        {view === 'passkey-enrollment' && (
          <PasskeyEnrollment
            currentUser={currentUser}
            onComplete={() => {
              refreshProfile();
              setView('dashboard');
            }}
            onCancel={() => setView('dashboard')}
          />
        )}
      </main>

      {/* Face Login Modal */}
      {showFaceModal && (
        <FaceLoginModal
          initialEmail={faceModalEmail}
          onLoginSuccess={handleLoginSuccess}
          onUsePasskey={handlePasskeyFallbackFromFaceModal}
          onClose={() => setShowFaceModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} Personal Profile Website &bull; WebAuthn Passkeys &amp; Face Recognition AI</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>🔒 FIDO2 / WebAuthn</span>
            <span>🛡️ MediaPipe Local AI</span>
            <span>✨ Google Gemini Assistant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
