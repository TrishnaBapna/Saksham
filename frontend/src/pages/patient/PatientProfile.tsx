import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { usePatientExperienceSafe } from '../../context/PatientExperienceContext.js';
import {
  Phone,
  Shield,
  Eye,
  Type,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Sparkles,
  Globe,
  Compass,
  ShieldCheck,
} from 'lucide-react';

export const PatientProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { fontSize, setFontSize, highContrast, setHighContrast, simpleMode, setSimpleMode } = useAccessibility();
  const { t, languageMeta, setIsLanguageModalOpen } = useLanguage();
  const { mode, setMode } = usePatientExperienceSafe();

  return (
    <div className="pb-24 pt-4 px-4 max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/patient')}
          className="p-2 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs"
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">Patient Profile & Care Settings</h1>
          <p className="text-xs text-gray-500 font-medium">Personalize your care sanctuary and companion</p>
        </div>
      </div>

      {/* Patient Identity Card */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple flex items-center space-x-4">
        <img
          src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'}
          alt={currentUser?.displayName || 'Patient Profile'}
          className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-300 shadow-sm"
        />
        <div>
          <h2 className="text-lg font-bold text-saksham-darkText">{currentUser?.displayName}</h2>
          <p className="text-xs text-purple-700 font-medium">{currentUser?.email}</p>
          <span className="inline-block mt-1 text-[11px] font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
            Patient Account • Verified
          </span>
        </div>
      </div>

      {/* Language Preference Card */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
            <Globe className="w-4 h-4 text-purple-600" />
            <span>{t('profile.language_settings')}</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {languageMeta.script} • {languageMeta.direction.toUpperCase()}
          </span>
        </div>

        <div className="p-3.5 bg-lavender-50/70 rounded-2xl border border-purple-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-base font-extrabold text-saksham-darkText" dir={languageMeta.direction}>
                {languageMeta.nativeName}
              </span>
              <span className="text-xs text-gray-500 font-medium">({languageMeta.name})</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5" dir={languageMeta.direction}>
              {languageMeta.welcomeGreeting}
            </p>
          </div>

          <button
            onClick={() => setIsLanguageModalOpen(true)}
            className="shrink-0 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer"
          >
            {t('profile.change_language')}
          </button>
        </div>
      </div>

      {/* Dedicated AI Companion: Asha */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Your AI Memory Companion</span>
        </div>
        <p className="text-xs text-gray-500">Your dedicated companion who accompanies you through daily care routines:</p>

        <div className="p-4 rounded-2xl border-2 bg-purple-50 border-purple-600 ring-2 ring-purple-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-extrabold text-sm text-purple-950">Asha (आशा)</span>
            <span className="text-xs text-purple-700 font-bold bg-white px-2.5 py-0.5 rounded-full border border-purple-200">
              ✓ Active Companion
            </span>
          </div>
          <p className="text-xs text-purple-900 leading-relaxed font-medium">
            Compassionate neuro-care guide featuring authentic 30-expression emotional resonance, adaptive memory cues, and gentle conversational support.
          </p>
        </div>
      </div>

      {/* Patient Experience Mode Selection (Milestone 7.4.1) */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
            <Compass className="w-4 h-4 text-purple-600" />
            <span>{t('profile.patient_experience') || 'Patient Experience'}</span>
          </div>
          <span
            data-testid="active-mode-badge"
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200"
          >
            {mode === 'asha-only' ? 'Asha-Only Mode' : 'Hybrid Mode'}
          </span>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          {t('profile.patient_experience_desc') || 'Choose how you prefer to explore Saksham and interact with Asha:'}
        </p>

        {/* Selection Cards */}
        <div className="space-y-3">
          {/* Mode B: Asha + Navigation (Hybrid - Recommended Default) */}
          <div
            onClick={() => setMode('hybrid')}
            role="button"
            tabIndex={0}
            data-testid="mode-card-hybrid"
            aria-pressed={mode === 'hybrid'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMode('hybrid');
              }
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              mode === 'hybrid'
                ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-200 shadow-xs'
                : 'bg-white border-gray-200 hover:border-purple-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    mode === 'hybrid' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                  }`}
                >
                  {mode === 'hybrid' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-saksham-darkText">
                    {t('profile.mode_hybrid') || 'Asha + Navigation (Hybrid)'}
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                {t('profile.mode_hybrid_badge') || 'Recommended Default'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2 pl-7 leading-relaxed">
              {t('profile.mode_hybrid_desc') ||
                'Asha companion on Home, plus standard bottom navigation tabs for direct one-tap access to Family, Games, and Profile.'}
            </p>
          </div>

          {/* Mode A: Asha-Only (Conversation-First) */}
          <div
            onClick={() => setMode('asha-only')}
            role="button"
            tabIndex={0}
            data-testid="mode-card-asha-only"
            aria-pressed={mode === 'asha-only'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMode('asha-only');
              }
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              mode === 'asha-only'
                ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-200 shadow-xs'
                : 'bg-white border-gray-200 hover:border-purple-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    mode === 'asha-only' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                  }`}
                >
                  {mode === 'asha-only' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-saksham-darkText">
                    {t('profile.mode_asha_only') || 'Asha-Only (Conversation-First)'}
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                {t('profile.mode_asha_only_badge') || 'Distraction-Free'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2 pl-7 leading-relaxed">
              {t('profile.mode_asha_only_desc') ||
                'Simple, calm, distraction-free screen without bottom tabs. Talk or type to Asha, or tap quick action buttons.'}
            </p>
          </div>
        </div>

        {/* Data safety guarantee note */}
        <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center space-x-2.5 text-xs text-purple-900">
          <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
          <span>{t('profile.mode_data_safe') || 'Switching modes keeps all your notes, routines, and games intact.'}</span>
        </div>
      </div>

      {/* Accessibility & Visual Comfort */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
          <Eye className="w-4 h-4 text-purple-600" />
          <span>Accessibility & Comfort</span>
        </div>

        {/* Font Scaling */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-saksham-darkText flex items-center space-x-1.5">
              <Type className="w-4 h-4 text-purple-600" />
              <span>Text Size</span>
            </h3>
            <p className="text-xs text-gray-500">Adjust readability across all screens</p>
          </div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            {(['normal', 'large', 'extra-large'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  fontSize === s ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                {s === 'extra-large' ? 'XL' : s === 'large' ? 'L' : 'M'}
              </button>
            ))}
          </div>
        </div>

        {/* Simple Mode Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-saksham-darkText">Simple Mode</h3>
            <p className="text-xs text-gray-500">Larger buttons, less clutter, extra calm</p>
          </div>
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className="text-purple-600"
            aria-label="Toggle Simple Mode"
          >
            {simpleMode ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
          </button>
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h3 className="text-sm font-bold text-saksham-darkText">High Contrast</h3>
            <p className="text-xs text-gray-500">Sharper borders and deep text tones</p>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="text-purple-600"
            aria-label="Toggle High Contrast"
          >
            {highContrast ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Emergency & Connected Caregiver */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
          <Phone className="w-4 h-4 text-rose-500" />
          <span>Emergency Contact & Caregiver</span>
        </div>

        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-rose-900">Ananya Sharma (Daughter)</h4>
            <p className="text-xs text-rose-700 font-medium">+91 98765 43210</p>
          </div>
          <a
            href="tel:+919876543210"
            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-rose-700 transition"
          >
            Call
          </a>
        </div>
      </div>

      {/* Privacy and Consent Controls */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-2">
        <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Consent & Privacy Controls</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          You are always in control. Location sharing with Ananya is currently active with your consent. You can pause or revoke this at any time.
        </p>
        <button
          onClick={() => alert('Location consent settings: You can toggle live coordinates sharing at any time.')}
          className="text-xs font-bold text-purple-700 hover:text-purple-900 underline"
        >
          Manage Location Sharing & Data Privacy
        </button>
      </div>
    </div>
  );
};
