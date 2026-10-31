/**
 * Patient Onboarding — shown ONCE to new patients after registration.
 * Steps: Profile → Care Profile → Safety → Caregiver → Complete
 *
 * On completion, sets onboardingComplete: true in Firestore and
 * redirects to the patient dashboard.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { ToastContainer } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import {
  saveCondition,
  markOnboardingComplete,
} from '@/features/auth/authService';
import {
  doc,
  setDoc,
} from 'firebase/firestore';
import { getFirestoreDb } from '@/config/firebase';
import type { CareCondition } from '@/types/firestore';

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;
const STEP_LABELS = ['Profile', 'Care Profile', 'Safety', 'Caregiver', 'Complete'];

// ─── Condition cards ──────────────────────────────────────────────────────────

interface ConditionOption {
  value: CareCondition;
  icon: string;
  label: string;
  description: string;
}

const CONDITIONS: ConditionOption[] = [
  {
    value: 'parkinsons',
    icon: '🏃',
    label: "Parkinson's Disease",
    description:
      'Targeted motor pacing, gait metronome, vocal amplitude drills, medication timing, and tremor-friendly guidance.',
  },
  {
    value: 'alzheimers',
    icon: '🧠',
    label: "Alzheimer's Disease & Dementias",
    description:
      'Gentle memory cues, loved ones photo vault, face recall, cognitive engagement, and orientation support.',
  },
  {
    value: 'both',
    icon: '🌟',
    label: "Both Conditions (Parkinson's & Dementia)",
    description:
      'Comprehensive dual-care suite covering movement pacing, memory reinforcement, vocal exercises, loved ones, and daily structure.',
  },
  {
    value: 'other',
    icon: '♿',
    label: 'General Accessibility Support',
    description:
      'Daily routine management, high-contrast simplified interface, and wellness assistance without specifying a diagnosis.',
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toasts, toast, dismiss } = useToast();

  const [step, setStep]               = useState<Step>(1);
  const [saving, setSaving]           = useState(false);

  // Step 1 — Profile
  const [fullName, setFullName]         = useState('');
  const [dateOfBirth, setDateOfBirth]   = useState('');
  const [phone, setPhone]               = useState('');

  // Step 2 — Care profile
  const [condition, setCondition]       = useState<CareCondition | null>(null);

  // Step 3 — Safety / emergency contact
  const [emergencyName, setEmergencyName]   = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Step 4 — Caregiver contact
  const [caregiverEmail, setCaregiverEmail] = useState('');

  // ── Navigation ──────────────────────────────────────────────────────────────

  function next() { setStep((s) => Math.min(s + 1, TOTAL_STEPS) as Step); }
  function back() { setStep((s) => Math.max(s - 1, 1) as Step); }

  // ── Step 1 submit ────────────────────────────────────────────────────────────

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { toast('Please enter your full name.', 'warning'); return; }
    if (!dateOfBirth)     { toast('Please enter your date of birth.', 'warning'); return; }
    if (!user) return;
    setSaving(true);
    try {
      const db = getFirestoreDb();
      await setDoc(
        doc(db, 'users', user.uid),
        {
          name: fullName.trim(),
          dateOfBirth,
          phone: phone.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      next();
    } catch {
      toast('Could not save your profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Step 2 submit ────────────────────────────────────────────────────────────

  async function submitCondition(e: React.FormEvent) {
    e.preventDefault();
    if (!condition) { toast('Please select a care profile.', 'warning'); return; }
    if (!user) return;
    setSaving(true);
    try {
      await saveCondition(user.uid, condition);
      next();
    } catch {
      toast('Could not save your care profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Step 3 submit ────────────────────────────────────────────────────────────

  async function submitSafety(e: React.FormEvent) {
    e.preventDefault();
    if (emergencyName.trim() && emergencyPhone.trim() && user) {
      setSaving(true);
      try {
        const db = getFirestoreDb();
        await setDoc(
          doc(db, 'users', user.uid, 'emergency', 'primary'),
          {
            name: emergencyName.trim(),
            phone: emergencyPhone.trim(),
            updatedAt: new Date().toISOString(),
          }
        );
      } catch {
        // Non-blocking — user can update later
        console.warn('[Onboarding] Failed to save emergency contact.');
      } finally {
        setSaving(false);
      }
    }
    next();
  }

  // ── Step 4 submit ────────────────────────────────────────────────────────────

  function submitCaregiver(e: React.FormEvent) {
    e.preventDefault();
    // Caregiver authorization is a separate flow — just note the email and continue
    next();
  }

  // ── Step 5 — Complete ────────────────────────────────────────────────────────

  async function handleComplete() {
    if (!user) return;
    setSaving(true);
    try {
      await markOnboardingComplete(user.uid);
      await refreshProfile();
      navigate('/patient/dashboard', { replace: true });
    } catch {
      toast('Could not complete setup. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-gradient-to-br from-blue-50 via-white to-teal-50
                 flex flex-col items-center py-8 px-4 gap-6"
      aria-label="Patient onboarding"
    >
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-1" aria-hidden="true">💙</div>
        <h1 className="text-2xl font-bold text-teal-700 font-heading">Welcome to Saksham</h1>
        <p className="text-sm text-gray-500 mt-1">Let's personalise your care experience.</p>
      </div>

      {/* Progress indicator */}
      <nav aria-label="Onboarding steps" className="w-full max-w-md">
        <ol className="flex items-center justify-between">
          {STEP_LABELS.map((label, idx) => {
            const n = (idx + 1) as Step;
            const done    = step > n;
            const current = step === n;
            return (
              <li key={label} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center
                               text-xs font-bold transition-colors
                               ${done    ? 'bg-teal-500 text-white' : ''}
                               ${current ? 'bg-teal-600 text-white ring-2 ring-teal-300' : ''}
                               ${!done && !current ? 'bg-gray-200 text-gray-500' : ''}`}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? '✓' : n}
                </div>
                <span
                  className={`text-[10px] text-center leading-tight hidden sm:block
                               ${current ? 'text-teal-700 font-semibold' : 'text-gray-400'}`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        {/* Connector line */}
        <div className="relative -mt-7 mx-4 h-0.5 bg-gray-200 -z-10">
          <div
            className="h-full bg-teal-500 transition-all duration-500"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      </nav>

      {/* Step content */}
      <Card className="w-full max-w-md">

        {/* ── Step 1: Profile ──────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={submitProfile} noValidate className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Profile</h2>

            <div>
              <label htmlFor="ob-name" className="label">Full name</label>
              <input
                id="ob-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="ob-dob" className="label">Date of birth</label>
              <input
                id="ob-dob"
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label htmlFor="ob-phone" className="label">
                Mobile number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="ob-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="+91 98765 43210"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" loading={saving}>
              Continue →
            </Button>
          </form>
        )}

        {/* ── Step 2: Care Profile ─────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={submitCondition} noValidate className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Care Profile</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Select the condition that has been identified by your healthcare professional,
                or choose <strong>Other / Not Diagnosed</strong>.
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2 mt-2">
                This selection is for personalising your experience — it is not a diagnosis.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(c.value)}
                  className={`text-left rounded-2xl border-2 p-4 transition-all duration-200
                               flex items-start gap-3
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-teal-500 focus-visible:ring-offset-2
                               ${condition === c.value
                                 ? 'border-teal-500 bg-teal-50'
                                 : 'border-gray-200 bg-white hover:border-teal-200'}`}
                  aria-pressed={condition === c.value}
                >
                  <span className="text-2xl mt-0.5" aria-hidden="true">{c.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{c.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {c.description}
                    </div>
                  </div>
                  {condition === c.value && (
                    <span className="ml-auto text-teal-500 font-bold" aria-hidden="true">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back} className="flex-1">
                ← Back
              </Button>
              <Button type="submit" variant="primary" className="flex-1" loading={saving}>
                Continue →
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 3: Safety ───────────────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={submitSafety} noValidate className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Emergency Contact</h2>
              <p className="text-sm text-gray-500 mt-1">
                Who should we alert in an emergency? You can update this anytime.
              </p>
            </div>

            <div>
              <label htmlFor="ob-em-name" className="label">
                Contact name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="ob-em-name"
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="input"
                placeholder="Family member or friend"
              />
            </div>

            <div>
              <label htmlFor="ob-em-phone" className="label">
                Contact phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="ob-em-phone"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="input"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back} className="flex-1">
                ← Back
              </Button>
              <Button type="submit" variant="primary" className="flex-1" loading={saving}>
                Continue →
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 4: Caregiver ────────────────────────────────────────────── */}
        {step === 4 && (
          <form onSubmit={submitCaregiver} noValidate className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Your Caregiver</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Does someone help care for you? Share their email and they will receive
                an invitation to create a caregiver account.
              </p>
            </div>

            <div>
              <label htmlFor="ob-cg-email" className="label">
                Caregiver email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="ob-cg-email"
                type="email"
                value={caregiverEmail}
                onChange={(e) => setCaregiverEmail(e.target.value)}
                className="input"
                placeholder="caregiver@example.com"
              />
            </div>

            <p className="text-xs text-gray-400">
              You can skip this and add a caregiver later from your settings.
            </p>

            <div className="flex gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back} className="flex-1">
                ← Back
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                Continue →
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 5: Complete ─────────────────────────────────────────────── */}
        {step === 5 && (
          <div className="flex flex-col items-center gap-5 text-center py-4">
            <div className="text-6xl" aria-hidden="true">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Your Saksham profile is ready. Your care experience has been personalised
              {condition ? ` for ${CONDITIONS.find(c => c.value === condition)?.label}` : ''}.
            </p>

            <div className="w-full bg-teal-50 rounded-2xl p-4 text-left">
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                What's next
              </p>
              <ul className="text-sm text-gray-600 flex flex-col gap-1.5">
                <li>✓ &nbsp;Check your daily task list</li>
                <li>✓ &nbsp;Use the SOS button for emergencies</li>
                <li>✓ &nbsp;Read messages from your caregiver and doctor</li>
              </ul>
            </div>

            <Button
              variant="primary"
              className="w-full"
              loading={saving}
              onClick={handleComplete}
            >
              Go to My Dashboard
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
};
