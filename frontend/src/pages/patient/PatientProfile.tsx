import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useCharacter } from '../../context/CharacterContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import {
  Phone,
  Shield,
  Eye,
  Type,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const PatientProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { activeCharacter, setActiveCharacter } = useCharacter();
  const { fontSize, setFontSize, highContrast, setHighContrast, simpleMode, setSimpleMode } = useAccessibility();

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
          alt={currentUser?.displayName}
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

      {/* Character Selection */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Select Your AI Companion</span>
        </div>
        <p className="text-xs text-gray-500">Choose who accompanies you on your daily routine:</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveCharacter('asha')}
            className={`p-3.5 rounded-2xl border-2 text-left transition ${
              activeCharacter === 'asha'
                ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-300'
                : 'bg-gray-50 border-gray-200 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-saksham-darkText">Asha (आशा)</span>
              {activeCharacter === 'asha' && <span className="text-xs text-purple-700 font-bold">✓ Active</span>}
            </div>
            <p className="text-[11px] text-gray-500">Gentle guide with warm, encouraging demeanor</p>
          </button>

          <button
            onClick={() => setActiveCharacter('kabir')}
            className={`p-3.5 rounded-2xl border-2 text-left transition ${
              activeCharacter === 'kabir'
                ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-300'
                : 'bg-gray-50 border-gray-200 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-saksham-darkText">Kabir (कबीर)</span>
              {activeCharacter === 'kabir' && <span className="text-xs text-purple-700 font-bold">✓ Active</span>}
            </div>
            <p className="text-[11px] text-gray-500">Thoughtful buddy with patient, steady cadence</p>
          </button>
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
