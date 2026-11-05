# Saksham (सक्षम) — AI-Powered Personalised Neuro-Care Companion Ecosystem

> **Saksham** is an accessible, AI-powered neuro-care companion platform designed to support individuals experiencing memory difficulties, cognitive decline, or neurological recovery. By harmonising empathetic AI companionship with structured daily routines, family memory cues, and cognitive engagement, Saksham empowers patients while providing reassurance and verified insights to caregivers and medical professionals.

---

## ⚠️ Clinical Disclaimer

**Saksham is not a diagnostic tool, medical device, or prescription engine.**
It does not independently make clinical determinations or suggest drug regimens. All medical insights, schedules, and clinical notes must originate from, or be approved by, verified healthcare practitioners and legal caregivers.

---

## 🏛️ Ecosystem Overview

Saksham is structured into four role-governed personas, each with dedicated dashboards and cryptographic data boundary enforcement:

1. **Patient Interface**: A calming, voice-and-touch accessible sanctuary featuring an animated conversational AI companion (Asha / Kabir), 3-chance assisted recall routines, family photo-memory cues ("Loved Ones"), and engaging cognitive exercises ("Mind Games", including the Room Memory Game).
2. **Caregiver Portal**: Real-time status monitoring, authorised consent-gated location checks with configurable geofencing boundaries, routine adherence tracking, and memory cue management.
3. **Doctor / Clinician Console**: Longitudinal adherence metrics, cognitive trend charts distinguishing measured behavioral data from AI suggestions, activity assignment, and clinical notes.
4. **Administrator Hub**: Account verification, role claims governance, audit log monitoring, and system operational integrity.

---

## 📂 Repository Structure

```text
Saksham/
├── docs/                      # Architectural specs, schema, safety & UX guidelines
│   ├── ARCHITECTURE.md        # System architecture, data flow & security model
│   ├── DATABASE_SCHEMA.md     # Cloud Firestore collection designs & indices
│   ├── ROLE_PERMISSIONS.md    # RBAC matrix, custom claims & access policies
│   ├── UI_GUIDELINES.md       # Lavender/purple design tokens, typography, a11y
│   ├── DEVELOPMENT_ROADMAP.md # Phase-by-phase implementation blueprint
│   └── CHANGELOG.md           # Progressive record of changes
├── frontend/                  # React + TypeScript + Vite web client (PWA-ready)
│   ├── src/
│   │   ├── assets/characters/ # AI character asset specifications and SVGs
│   │   ├── components/        # Reusable accessible UI components
│   │   ├── features/          # Domain-driven features (AI, Routines, LovedOnes, Games)
│   │   ├── pages/             # Role dashboards and sub-views
│   │   ├── context/           # Auth, Theme, Character, and Language state
│   │   ├── services/          # Firebase, AI service abstraction, Speech
│   │   └── types/             # Strict TypeScript definitions
│   └── README.md              # Frontend setup & development manual
├── backend/                   # Firebase Cloud Functions & Serverless API
│   ├── src/                   # Node/TypeScript cloud functions & API handlers
│   ├── firestore.rules        # Production-grade Firestore Security Rules
│   ├── storage.rules          # Firebase Storage access controls
│   └── README.md              # Backend setup, deployment & security manual
└── README.md                  # This file
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js**: v20+ LTS (Tested on v26+)
- **NPM**: v10+
- **Firebase CLI** (optional for emulators): `npm install -g firebase-tools`

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173/`.

### 2. Backend Setup

```bash
cd backend
npm install
npm run build
```

---

## 🔒 Security & Privacy Principles

- **Zero Client-Side Privilege**: User roles are verified exclusively through Firebase Auth Custom Claims or server-enforced validation rules.
- **Explicit Consent for Location**: Patient location is never continuously tracked in secret. Geofencing and location reporting require explicit, revocable patient permission.
- **Privacy-First Memory Cues**: Family faces and room memory objects are matched exclusively against verified, user-uploaded records; no unconsented biometric profiling.
- **Sandboxed AI Actions**: AI natural-language commands invoke strictly whitelisted client navigation actions, preventing prompt injection or arbitrary code execution.

---

## 🎨 Visual Identity & Accessibility

- **Palette**: Soft lavender (`#8B5CF6`, `#7C3AED`), gentle lilac (`#EDE9FE`), warm rose/pink accents, and high-contrast accessible neutrals (`#1E1B4B`).
- **Typography**: Clean, rounded, highly legible sans-serif with dynamic font-scaling (`Normal`, `Large`, `Extra Large`).
- **Modes**: Standard and **Simple Mode** (amplified touch targets, reduced visual density for early/mid-stage cognitive assistance).

---

## 📋 Phase Roadmap

- [x] **Phase 1**: Architecture, Documentation, Role Framework, Interactive Patient Dashboard, AI Companion Component, Character Assets, Navigable Subsections, and Test Suite.
- [ ] **Phase 2**: Live Firebase Authentication with Custom Claims, Firestore persistence, Caregiver Invitation Flow.
- [ ] **Phase 3**: 3-Chance Assisted Recall engine, Task Timers, Offline Routine Synchronization.
- [ ] **Phase 4**: Loved Ones media vault, Room Memory Game with client-side image cue tagging.
- [ ] **Phase 5**: Caregiver Geofencing & Consent-gated Location, Doctor Clinical Analytics, Multilingual i18n.
