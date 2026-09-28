# Personal Profile Website — Biometrics & Gemini AI

A production-grade personal profile website built with **React**, **Vite**, **Firebase**, and **Google Gemini AI**, implementing **two separate biometric authentication tiers**:
1. **Hardware-Backed Device Biometrics** via **WebAuthn / Passkeys** (Touch ID, Windows Hello, Face ID, PIN).
2. **Client-Side Camera Face Recognition** via **MediaPipe** with interactive anti-spoofing liveness challenges.

---

## 🏗️ Tech Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS, Lucide Icons
- **Backend:** Firebase Authentication, Cloud Firestore, Firebase Cloud Functions
- **Biometrics:**
  - W3C WebAuthn / Passkeys API (`navigator.credentials`)
  - Browser Camera API (`navigator.mediaDevices.getUserMedia`)
  - MediaPipe FaceMesh (Client-side geometric landmark extraction)
- **AI:** Google Gemini API (Isolated via secure server-side proxy)

---

## 🔒 Security & Privacy Architecture

### 1. Hardware Biometrics (WebAuthn / Passkeys)
- **Zero Raw Data Access:** JavaScript never sees, stores, or handles fingerprint or Face ID imagery.
- **Secure Enclave:** Private keys stay locked inside device hardware (TPM / Secure Enclave).
- **Public Credential Storage:** Only public key credentials and metadata are stored in Firestore under `users/{userId}/passkeys/{credentialId}`.
- **FIDO2 Phishing Resistance:** Cryptographic challenge-response signed on-device.

### 2. Camera-Based Face Recognition
- **100% On-Device Processing:** Camera frames are analyzed locally in the browser; raw video is **never** streamed, recorded, or uploaded.
- **Explicit Consent Required:** Users must review a biometric privacy disclosure and grant consent before camera enrollment.
- **Irreversible Representation:** Converts facial geometry into a salted, one-way protected embedding (`users/{userId}/faceProfile/{profileId}`).
- **Interactive Liveness Challenges:**
  - 1. *Turn head left* (yaw angle tracking)
  - 2. *Turn head right* (yaw angle tracking)
  - 3. *Blink both eyes* (Eye Aspect Ratio dip)
- **User Control:** One-click **"Delete My Face Data"** option completely purges all face records from Firestore.
- **Security Scope:** Treated as an experimental convenience feature. High-security operations require hardware WebAuthn passkeys.

### 3. Decoupled Google Gemini AI Assistant
- **Strict Isolation:** Biometric data, embeddings, passkeys, and camera frames are **strictly sanitized** and never sent to Gemini.
- **No Client Secrets:** Gemini API calls are proxied through Firebase Cloud Functions (`functions/index.js`).

---

## 🗄️ Firestore Database Schema

```
users/{userId}
  ├── name: string
  ├── email: string
  ├── createdAt: timestamp
  ├── faceEnabled: boolean
  └── passkeyEnabled: boolean

users/{userId}/faceProfile/{profileId}
  ├── protectedEmbedding: string (salted irreversible representation)
  ├── createdAt: timestamp
  └── updatedAt: timestamp

users/{userId}/passkeys/{credentialId}
  ├── credentialId: string (base64url)
  ├── publicKey: string (base64url public key)
  ├── signCount: number
  └── createdAt: timestamp
```

---

## 🛡️ Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /faceProfile/{profileId} {
        allow read, write: if isOwner(userId);
      }

      match /passkeys/{credentialId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase Environment (Optional)
Create `.env` or set environment variables:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_FUNCTION_URL=/api/geminiAssistant
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## ☁️ Firebase Cloud Functions Deployment

Navigate to `functions/` and deploy:
```bash
cd functions
npm install
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
firebase deploy --only functions
```
