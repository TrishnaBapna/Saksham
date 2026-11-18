import React, { useState } from 'react';
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
  Brain,
  Volume2,
  Ear,
  Info,
} from 'lucide-react';
import { PatientLocationConsentModal } from '../../features/safety/components/PatientLocationConsentModal.js';
import { CognitiveConcernModal } from '../../features/clinical/components/CognitiveConcernModal.js';
import { ClinicalDiagnosisService } from '../../features/clinical/services/clinicalDiagnosisService.js';
import { ClinicalDiagnosisRecord } from '../../features/clinical/types/concern.types.js';
import { SpeechService } from '../../services/speechService.js';

export const PatientProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const patientId = currentUser?.uid || 'default-patient';
  const { fontSize, setFontSize, highContrast, setHighContrast, simpleMode, setSimpleMode } = useAccessibility();
  const {
    t,
    languageMeta,
    setIsLanguageModalOpen,
    readingPreference,
    setReadingPreference,
    responseLanguage,
    setResponseLanguage,
    spokenInputLanguages,
    allLanguages,
  } = useLanguage();
  const { mode, setMode } = usePatientExperienceSafe();
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isConcernModalOpen, setIsConcernModalOpen] = useState(false);
  const [isSpeechPrivacyOpen, setIsSpeechPrivacyOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState<ClinicalDiagnosisRecord | null>(null);

  React.useEffect(() => {
    const unsub = ClinicalDiagnosisService.subscribeToDiagnosis(patientId, (rec) => {
      setDiagnosis(rec);
    });
    return () => unsub();
  }, [patientId]);

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
          <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">{t('profile.title')}</h1>
          <p className="text-xs text-gray-500 font-medium">{t('profile.subtitle')}</p>
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

      {/* Priority 3: Doctor-Confirmed Clinical Diagnosis Pathway (Read-Only) */}
      <div
        data-testid="patient-clinical-pathway-card"
        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
            <Brain className="w-4 h-4 text-purple-600" />
            <span>Clinical Care Pathway</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Doctor Verified
          </span>
        </div>

        {diagnosis ? (
          <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-2">
            <div className="flex items-center justify-between">
              <span
                data-testid="patient-pathway-badge"
                className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                  diagnosis.pathway === 'alzheimers_confirmed'
                    ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                    : 'bg-purple-100 text-purple-900 border-purple-200'
                }`}
              >
                {diagnosis.pathway === 'alzheimers_confirmed'
                  ? 'Pathway A: Doctor-Confirmed Alzheimer\'s Disease'
                  : 'Pathway B: Doctor-Confirmed Other / Mixed Dementia'}
              </span>
              <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                Stage: {diagnosis.clinicalStage.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              <span className="font-bold text-gray-900">Etiology:</span> {diagnosis.etiology.replace(/_/g, ' ')}
            </p>

            <p className="text-xs text-gray-600 leading-relaxed italic">
              "{diagnosis.clinicalRationale}"
            </p>

            <div className="pt-1.5 border-t border-purple-200/60 flex items-center justify-between text-[11px] text-gray-500">
              <span>Dr. {diagnosis.confirmedByDoctorName} (Reg #{diagnosis.doctorRegistrationNumber})</span>
              <span>{new Date(diagnosis.confirmedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center space-y-1">
            <span
              data-testid="patient-pathway-badge"
              className="inline-block text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200"
            >
              Clinical Evaluation Pending
            </span>
            <p className="text-xs text-gray-500 pt-1">
              Your care pathway is assigned by your doctor during your clinical evaluation.
            </p>
          </div>
        )}

        {/* Non-Diagnostic Disclaimer */}
        <p className="text-[11px] text-gray-400 leading-normal">
          Saksham is a supportive care companion, not a diagnostic tool. Pathway assignment is managed exclusively by authorized medical practitioners.
        </p>
      </div>

      {/* Priority 1: Decoupled Multilingual & Voice Intelligence Settings */}
      <div
        data-testid="multilingual-settings-card"
        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
            <Globe className="w-4 h-4 text-purple-600" />
            <span>Language Preferences & Multilingual Voice Settings</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {languageMeta.script} • {languageMeta.direction.toUpperCase()}
          </span>
        </div>

        {/* 1. App Reading Language */}
        <div className="p-3.5 bg-lavender-50/70 rounded-2xl border border-purple-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
              Screen Reading Language
            </div>
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
            data-testid="change-reading-lang-btn"
            className="shrink-0 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer"
          >
            {t('profile.change_language')}
          </button>
        </div>

        {/* 2. Reading Mode: Text vs Audio (Audio-First Accessibility) */}
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
              <Ear className="w-3.5 h-3.5 text-purple-600" />
              <span>Reading & Accessibility Mode</span>
            </label>
            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              {readingPreference === 'audio' ? 'Audio-First (Non-Reader)' : readingPreference === 'text' ? 'Text Only' : 'Text & Spoken Audio'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['both', 'text', 'audio'] as const).map((pref) => (
              <button
                key={pref}
                type="button"
                data-testid={`reading-pref-${pref}`}
                onClick={() => setReadingPreference(pref)}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition text-center ${
                  readingPreference === pref
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-gray-50 hover:bg-purple-50 text-gray-700 border-gray-200'
                }`}
              >
                {pref === 'both' ? 'Both Audio & Text' : pref === 'text' ? 'Text Only' : 'Audio Only'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            Audio mode speaks Asha's guidance aloud at a calming 0.85x cadence for non-readers and visual comfort.
          </p>
        </div>

        {/* 3. Asha's Spoken Response Language */}
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-600" />
              <span>ASHA's Spoken Response Language</span>
            </label>
            <span className="text-2xs text-gray-500 font-medium">Independent from screen language</span>
          </div>
          <select
            data-testid="response-language-select"
            value={responseLanguage}
            onChange={(e) => setResponseLanguage(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 bg-white"
          >
            {allLanguages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.name})
              </option>
            ))}
          </select>
        </div>

        {/* 4. Spoken Input & Code-Switching Capability */}
        <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-purple-900">
            <span>Spoken Input & Code-Switching</span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Asha automatically recognizes spoken speech and naturally understands code-switching across Hindi, Marathi, English, and regional Indic phrases (e.g., Hinglish "ASHA, mujhe water chahiye").
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {spokenInputLanguages.map((code) => {
              const meta = allLanguages.find((l) => l.code === code);
              return (
                <span
                  key={code}
                  className="text-[10px] font-bold px-2 py-0.5 bg-white text-purple-800 rounded-md border border-purple-200"
                >
                  {meta?.nativeName || code.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>

        {/* 5. Web Speech API Privacy Disclosure Trigger */}
        <div className="pt-1 flex items-center justify-between text-xs text-gray-500">
          <button
            type="button"
            data-testid="open-speech-privacy-btn"
            onClick={() => setIsSpeechPrivacyOpen(true)}
            className="text-purple-700 hover:text-purple-900 font-bold underline flex items-center space-x-1 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Browser Speech Recognition Privacy Disclosure</span>
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
          You are always in control. Safe Zone location sharing is transparent and protected by your consent. You can pause or revoke this at any time.
        </p>
        <button
          type="button"
          onClick={() => setIsConsentModalOpen(true)}
          className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
        >
          Manage Location Sharing & Data Privacy
        </button>
      </div>

      {/* Patient Voice & Daily Observations */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-saksham-darkText">
          <Brain className="w-4 h-4 text-purple-600" />
          <span>Note a Difficulty or Daily Observation</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Record anything that felt difficult today (such as remembering names or finding items). You can keep it private or choose to share it with your doctor.
        </p>
        <button
          type="button"
          data-testid="patient-open-concern-modal-btn"
          onClick={() => setIsConcernModalOpen(true)}
          className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-2xl text-xs font-bold border border-purple-200 transition flex items-center justify-center space-x-2 min-h-[48px]"
        >
          <span>📝 Share What Felt Hard Today</span>
        </button>
      </div>

      {/* Patient Location Consent Modal */}
      <PatientLocationConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        patientId={currentUser?.uid || 'default-patient'}
      />

      {/* Structured Cognitive Concern Modal */}
      <CognitiveConcernModal
        isOpen={isConcernModalOpen}
        onClose={() => setIsConcernModalOpen(false)}
        patientId={currentUser?.uid || 'default-patient'}
        patientName={currentUser?.displayName || 'Sunita'}
        perspective="patient"
        currentUserId={currentUser?.uid || 'default-patient'}
        currentUserName={currentUser?.displayName || 'Sunita'}
      />

      {/* Web Speech API Privacy Disclosure Modal */}
      {isSpeechPrivacyOpen && (
        <div
          data-testid="speech-privacy-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-purple-100 rounded-2xl text-purple-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {SpeechService.getPrivacyDisclosure().title}
                  </h3>
                  <p className="text-xs text-purple-700 font-medium">Browser Web Speech API Transparency</p>
                </div>
              </div>
              <button
                data-testid="close-speech-privacy-modal-btn"
                onClick={() => setIsSpeechPrivacyOpen(false)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              {SpeechService.getPrivacyDisclosure().body}
            </p>

            <div className="p-3 bg-lavender-50 rounded-2xl border border-purple-100 text-xs text-purple-900 space-y-1">
              <div className="font-bold">Active Data Pathway:</div>
              <div>• {SpeechService.getPrivacyDisclosure().dataTransmitted}</div>
              <div>• Vendor Network: {SpeechService.getPrivacyDisclosure().vendorServers.join(', ')}</div>
            </div>

            <p className="text-[11px] text-gray-500">
              You can always switch to "Text Only" reading mode above or use on-screen button prompts if you prefer not to use speech recognition.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsSpeechPrivacyOpen(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
