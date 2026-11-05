# Saksham — Backend Services & Cloud Functions

## Overview

The Saksham backend is built on **Firebase Cloud Functions (Node.js & TypeScript)**, **Cloud Firestore**, and **Firebase Storage**. It provides a secure, role-governed gateway for:

1. **Authentication & Custom Claims Management**: Assigns and verifies roles (`patient`, `caregiver`, `doctor`, `admin`) to prevent client-side privilege escalation.
2. **AI Intent Gateway (`/api/ai/converse`)**: Proxies AI natural-language requests, shielding backend API keys (such as Gemini credentials) from the frontend, and outputs structured, whitelisted navigation actions.
3. **Relationship Authorization**: Validates patient-caregiver linkages and consent before returning patient metrics or coordinates.
4. **Security & Audit Logging**: Immutable write-only logging of sensitive actions (e.g. location access, role elevations).

---

## Directory Structure

```text
backend/
├── src/
│   ├── index.ts                # Main Cloud Functions entrypoint & Express API
│   ├── middleware/
│   │   ├── auth.ts             # Firebase ID token & role claims validation
│   │   └── errorHandler.ts     # Standardized JSON error response handler
│   ├── routes/
│   │   ├── ai.ts               # Secure AI proxy & action parser
│   │   ├── routines.ts         # Routine scheduling & assisted recall validation
│   │   ├── location.ts         # Consent-gated geofencing & location updates
│   │   └── roles.ts            # Admin-only role assignment
│   ├── services/
│   │   ├── aiService.ts        # LLM integration & intent sanitization
│   │   └── auditService.ts     # Immutable audit log writer
│   └── types/
│       └── index.ts            # Shared backend interfaces
├── firestore.rules             # Production Cloud Firestore Security Rules
├── storage.rules               # Production Firebase Storage Security Rules
├── tsconfig.json               # TypeScript configuration (ES2022 / NodeNext)
├── package.json                # Dependencies & scripts
└── README.md                   # This file
```

---

## Prerequisites & Local Setup

1. **Node.js**: v20 or higher.
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Build TypeScript:
   ```bash
   npm run build
   ```
4. Run tests:
   ```bash
   npm test
   ```

---

## Firebase Project Configuration

To connect this backend to a live Firebase project:

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable:
   - **Authentication** (Email/Password, Google)
   - **Cloud Firestore**
   - **Firebase Storage**
   - **Cloud Functions** (Requires Blaze Pay-as-you-go plan)
3. Set your backend environment variables in Cloud Functions:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```
4. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
5. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```
