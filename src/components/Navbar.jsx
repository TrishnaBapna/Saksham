import React from 'react';
import { ShieldCheck, UserCheck, LogOut, Sparkles, KeyRound } from 'lucide-react';
import { logoutUser } from '../firebase/auth';

export default function Navbar({ currentUser, profile, onNavigate }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand / Title */}
        <div 
          onClick={() => onNavigate('dashboard')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
              Personal Profile
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Biometrics + AI
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">WebAuthn Passkeys &bull; Face AI &bull; Gemini Assistant</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-200">{profile?.name || currentUser.displayName || 'Authenticated User'}</span>
                <span className="text-[10px] text-slate-400 font-mono">{currentUser.email}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 p-1.5 rounded-xl">
                {profile?.passkeyEnabled && (
                  <span title="Passkey Protected" className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                )}
                {profile?.faceEnabled && (
                  <span title="Face Recognition Enabled" className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs">
                    <UserCheck className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <button
                onClick={logoutUser}
                title="Sign Out"
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                Log In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl shadow-md transition"
              >
                Create Account
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
