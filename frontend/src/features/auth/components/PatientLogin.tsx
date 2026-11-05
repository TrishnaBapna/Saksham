import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CommonLoginForm } from './CommonLoginForm.js';
import { CharacterVisualizer } from '../../ai-companion/CharacterVisualizer.js';
import { Heart, Shield } from 'lucide-react';
import '../styles/auth.css';

interface PatientLoginProps {
  onSubmit: (email: string, pass: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onBackToRoles: () => void;
}

export const PatientLogin: React.FC<PatientLoginProps> = ({
  onSubmit,
  onForgotPassword,
  isLoading,
  errorMessage,
  onBackToRoles,
}) => {
  const [characterState, setCharacterState] = useState<'greeting' | 'listening' | 'encouraging'>('greeting');

  return (
    <div className="theme-patient min-h-[560px] max-w-md mx-auto bg-white/95 rounded-3xl p-6 md:p-8 border-2 border-purple-200 shadow-soft-purple relative overflow-hidden animate-in fade-in">
      {/* Decorative ambient aura */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-200/40 rounded-full blur-2xl pointer-events-none" />

      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-purple-100">
        <button
          onClick={onBackToRoles}
          className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center space-x-1"
        >
          <span>← Change Portal</span>
        </button>
        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center space-x-1">
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          <span>Patient Sanctuary</span>
        </span>
      </div>

      {/* Animated Young Girl AI Companion (Asha) */}
      <div className="flex flex-col items-center text-center mb-6">
        <div
          className="cursor-pointer mb-3"
          onClick={() => setCharacterState(characterState === 'greeting' ? 'encouraging' : 'greeting')}
          title="Tap Asha to say hello!"
        >
          <CharacterVisualizer characterId="asha" state={characterState} size={115} />
        </div>

        {/* Speech Balloon */}
        <div className="bg-lavender-100/70 border border-purple-200 rounded-2xl p-3 max-w-xs shadow-xs relative">
          <p className="text-xs md:text-sm text-purple-900 font-semibold leading-relaxed">
            "Namaste! I am Asha. Enter your email and password to step into your peaceful care space."
          </p>
        </div>
      </div>

      {/* Login Form */}
      <div onFocus={() => setCharacterState('listening')}>
        <CommonLoginForm
          onSubmit={onSubmit}
          onForgotPassword={onForgotPassword}
          isLoading={isLoading}
          errorMessage={errorMessage}
          buttonText="Enter My Sanctuary"
          buttonClass="bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-soft-purple"
          placeholderEmail="sunita.sharma@saksham.care"
          emailLabel="Patient Email or ID"
        />
      </div>

      {/* Register & Privacy Links */}
      <div className="mt-6 pt-4 border-t border-purple-100 text-center space-y-2">
        <p className="text-xs text-gray-600">
          First time here?{' '}
          <Link
            to="/register/patient"
            className="font-bold text-purple-700 hover:text-purple-900 underline"
          >
            Create Patient Account
          </Link>
        </p>

        <div className="flex items-center justify-center space-x-2 text-[11px] text-gray-400 pt-1">
          <Shield className="w-3 h-3 text-emerald-600" />
          <span>Safe • Private • Voice-Enabled</span>
        </div>
      </div>
    </div>
  );
};
