# Saksham — Frontend Client Application

## Overview

The Saksham client is a high-accessibility web application built with **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS**. It is tailored specifically for neuro-care patients, family caregivers, and medical specialists.

---

## Key Modules & Visual Design

- **Lavender & Purple Harmony**: Calming, therapeutic color tokens designed to minimize visual anxiety and cognitive fatigue.
- **Animated AI Companion (Asha / Kabir)**: Supports 8 distinct emotional & interactive expressions (Idle, Greeting, Listening, Speaking, Thinking, Happy, Reminder, Encouraging).
- **Voice & Tactile Controls**: Full dual-modality interaction via Web Speech API (STT & TTS) alongside tactile, generous touch buttons.
- **3-Chance Assisted Recall**: Progressive hint trays that preserve question progress, timers, and attempt counts without failure shaming.
- **Loved Ones Family Hub**: Photo cues and relationship audio notes.
- **Mind Games**: Cognitive stimulation exercises, sequence recall, and the Room Memory Game.
- **Role Dashboards**: Dedicated experiences for Patient, Caregiver, Doctor, and Admin.

---

## Directory Layout

```text
frontend/
├── public/                     # Static assets and icons
├── src/
│   ├── assets/
│   │   └── characters/         # Asha & Kabir character SVG states & config
│   ├── components/             # Reusable UI widgets (Buttons, Cards, Dialogs)
│   ├── context/                # Auth, Character, Accessibility, Language contexts
│   ├── features/
│   │   ├── ai-companion/       # AI companion interface, speech & action parser
│   │   ├── routines/           # Assisted recall & routine checklist
│   │   ├── loved-ones/         # Family cue gallery & profile viewer
│   │   └── mind-games/         # Cognitive games & Room Memory Game
│   ├── pages/
│   │   ├── patient/            # Patient home and submodule views
│   │   ├── caregiver/          # Caregiver overview and geofence alerts
│   │   ├── doctor/             # Clinical analytics and task assigner
│   │   └── admin/              # User account verification & audit logs
│   ├── services/               # Firebase client, AI intent router, Web Speech API
│   ├── types/                  # Strict TypeScript data types
│   ├── App.tsx                 # Role-based router and theme provider wrapper
│   └── main.tsx                # Client entrypoint
├── index.html                  # HTML entrypoint with viewport & font tags
├── tailwind.config.js          # Lavender & purple design tokens
├── vite.config.ts              # Vite & Vitest configuration
└── package.json
```

---

## Running Locally

```bash
cd frontend
npm install
npm run dev
```

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
```

---

## Environment Variables

Create a `.env` file in `frontend/` (a template is provided in `.env.example`):

```ini
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_BACKEND_API_URL=http://localhost:5001/your-project/us-central1/api
```
*(If environment variables are omitted during local prototyping, the app gracefully operates in prototype simulation mode).*
