# Saksham 2.0 — Neurological Care Support Platform

## 1. Executive Summary

Saksham 2.0 is a modern, voice-enabled, neurological care-support platform engineered for individuals living with Parkinson's disease, Alzheimer's disease, dementia, and other motor or cognitive impairments.

This release represents a complete modernization and stabilization of the platform:
- **Zero blocking popups:** All browser `alert()` and `confirm()` calls eliminated in favor of accessible, non-modal toasts and auditory speech feedback.
- **Strict Role Isolation:** Removed confusing and insecure role-switching tabs. Each role (Patient, Caregiver, Doctor) has its own dedicated portal, authentication gate, and distinct permission boundaries.
- **Tremor-Compensated Biometrics:** Facial scanning reticle equipped with multi-frame stabilization dampening designed for Parkinson's hand tremors, with accessible one-tap passkey fallback.
- **Lag-Free Patient Portal:** Streamlined the patient experience around daily routines, immediate emergency SOS (WhatsApp and direct phone), hydration logging, and read-only care team notes. Diagnostic and heavy telemetry charts have been relocated exclusively to the Caregiver and Doctor portals.
- **Hands-Free Multimodal Assistance:** Web Speech API integration (TTS & STT) providing natural voice commands (*"Drink water"*, *"Complete task"*, *"Read routine"*, *"Emergency"*) and gentle Web Audio API harmonic chimes.
- **Production Monorepo Architecture:** Clean separation into `apps/frontend/` (React 18 + Vite + TypeScript + Tailwind CSS), `apps/backend/` (Node.js + Express + TypeScript + Firebase Admin), and `shared/` (type definitions).

---

## 2. Repository Structure

```text
├── apps/
│   ├── frontend/                    # Modern React 18 + Vite + TypeScript SPA
│   │   ├── src/
│   │   │   ├── components/ui/       # Accessible UI elements (Button, Card, Toast)
│   │   │   ├── components/voice/    # Voice assistant bar & read-aloud buttons
│   │   │   ├── config/              # Firebase modular v10 init & typed env
│   │   │   ├── features/auth/       # Role logins, AuthContext, ProtectedRoute
│   │   │   ├── features/caregiver/  # Caregiver monitoring & alert acknowledgment
│   │   │   ├── features/doctor/     # Clinical directives & telemetry analytics
│   │   │   ├── features/onboarding/ # 5-step new patient onboarding
│   │   │   ├── features/patient/    # Routine tasks, SOS, hydration, face ID
│   │   │   ├── services/            # Audio synthesizer (Web Audio) & Voice (TTS/STT)
│   │   │   ├── test/                # Vitest unit test suites
│   │   │   └── types/               # Type definitions re-exported from shared
│   │   ├── tailwind.config.js       # Brand colors, 44px touch targets, animations
│   │   └── vite.config.ts           # Bundler config, code splitting, test environment
│   │
│   └── backend/                     # Node.js + Express + TypeScript API Service
│       ├── src/
│       │   ├── config/              # Firebase Admin SDK initialization
│       │   ├── middleware/          # requireAuth & requireRole authorization gates
│       │   ├── routes/              # Admin, caregiver, doctor, and audit routes
│       │   ├── test/                # Backend unit tests
│       │   └── index.ts             # Express server entry point
│       └── tsconfig.json
│
├── shared/
│   └── types/
│       └── index.ts                 # Canonical TypeScript document schemas
│
├── docs/
│   ├── SAKSHAM_2_ARCHITECTURE.md    # This technical specification
│   └── ...
│
├── firestore.rules                  # Hardened Cloud Firestore security rules
├── vercel.json                      # Deployment and rewrite routing configuration
└── package.json                     # Monorepo root scripts
```

---

## 3. User Roles & Security Model

Saksham 2.0 enforces tenant-level role isolation:

| Role | Access Path | Primary Capabilities | Security Boundary |
|---|---|---|---|
| **Patient** | `/patient/dashboard` | View daily routine, complete/snooze tasks, one-tap WhatsApp SOS, log water, read care team notes, tremor face ID | Cannot access caregiver alerts or clinical directives authoring |
| **Caregiver** | `/caregiver/dashboard` | Monitor linked patient's routine status, acknowledge SOS alerts, post care notes, review task performance & time taken | Restricted to explicitly authorized patients via `caregiver_authorizations` |
| **Doctor** | `/doctor/dashboard` | Review longitudinal biomarkers (tremor cm, speech dB), prescribe clinical directives, review multidisciplinary history | Restricted to assigned patients; requires verified clinician claims |
| **Hospital Admin** | `/api/admin/*` | Approve pending clinician registrations, issue custom claims, inspect audit logs | Backend API protected with `requireRole(['hospital_admin'])` |

---

## 4. Neurological Accessibility Features

1. **WCAG 2.1 AA Touch Targets:** Minimum button and interactive control dimensions are set to 44px (`min-h-touch min-w-touch` in Tailwind) to accommodate motor tremors and intention hesitation.
2. **Tremor-Damped Face ID:** Standard biometric scanners fail on single shaky frames. The Saksham face ID verification uses a 3.5s multi-frame window with contour stabilization dampening and a zero-delay one-tap passkey alternative.
3. **Harmonic Auditory Feedback:** Replaced abrupt browser alerts with synthesized Web Audio API sine/triangle waves:
   - Task completion: Two-tone ascending chime (523.25 Hz -> 783.99 Hz).
   - Water logged: Harmonic water droplet frequency ramp (600 Hz -> 1200 Hz).
   - Alert/Reminder: Gentle dual-tone chord (440 Hz & 554.37 Hz).
4. **Paced Speech Synthesis:** Text-to-speech rate is set to 0.92x with natural voice selection for clear comprehension.
5. **Reduced Motion Compliance:** Respects `prefers-reduced-motion: reduce` across all CSS transitions and animations.

---

## 5. Development & Testing Commands

Execute from the repository root:

```bash
# Run typecheck across frontend and backend
npm run typecheck

# Run all 18 Vitest test suites
npm test

# Build production bundles for frontend and backend
npm run build

# Start frontend Vite development server (port 5173)
npm run dev

# Start backend TypeScript development server (port 3001)
npm run dev:backend
```
