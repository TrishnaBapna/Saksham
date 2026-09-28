# Saksham (सक्षम) — Cognitive Wellness & Routine Studio

> **Tremor-Resilient, Voice-First Daily Management & Cognitive Therapy for Parkinson's Patients, Caregivers, and Doctors**  
> Live Production: [https://saksham-rho-six.vercel.app/](https://saksham-rho-six.vercel.app/)

---

## 🌟 Overview

**Saksham** is an accessible, multilingual Progressive Web Application (PWA) specifically designed for elderly patients living with Parkinson's Disease (Hoehn & Yahr Stages I–III), their family caregivers, and attending neurologists.

Built with high-contrast accessibility, tremor-friendly interactive targets, hands-free voice control, and localized Indian language recognition (Hindi, Marathi, Gujarati, Kannada, Malayalam, Marwari/Rajasthani, and English).

---

## 🚀 Key Features

1. **Multilingual Voice-First Navigation (`SakshamAI`)**:
   - Hands-free voice recognition supporting Indian languages and Romanized phonetics (e.g. saying *"parivar"* or *"कुटुंब"* directly navigates to the Loved Ones Photo Vault).
   - Natural text-to-speech audio feedback in the patient's native regional language.
   - Quick one-tap language switching: 🇮🇳 Hindi, मराठी, ગુજરાતી, ಕನ್ನಡ, മലയാളം, राजस्थानी, and English.

2. **Daily Routine & Medication Timeline**:
   - Audio chimes, visual timeline, and automated water hydration tracking.
   - Levodopa protein-spacing advisor with countdown warnings.

3. **Mind Clinic & Cognitive Tech Lab**:
   - 8 interactive cognitive mini-games (Motor Maze Trace, Color Sequence Recall, Word Unscramble, Reaction Tap Reflex, Card Pair Match, Speed Math Sprint, and Facial Reminiscence).
   - Real-time telemetry, accuracy scoring, and XP reward animations.

4. **Movement & Speech Therapy**:
   - 100 BPM Acoustic Metronome for overcoming Freezing of Gait (FoG).
   - LSVT LOUD vocal projection dB meter with real-time decibel feedback.
   - Facial symmetry webcam exercise tracker.

5. **Loved Ones Photo Vault & Facial Recall**:
   - Memory recall cards with names, relationships, and audio voice prompts.

6. **Tri-Portal Architecture (Patient • Caregiver • Doctor)**:
   - Dedicated Caregiver dashboard for managing tasks and clinical notes.
   - Neurologist portal with printable clinical reports and directive logs.

7. **PWA & Offline Capability**:
   - Service worker offline caching (`sw.js`).
   - Web App Manifest (`manifest.json`) for full-screen home-screen installation on Android, iOS, and Desktop.

---

## 📁 Repository Structure

```
├── index.html            # Main unified application & interactive UI
├── sw.js                 # PWA Service Worker (offline caching & background updates)
├── manifest.json         # Web App Manifest for mobile installation
├── privacy.html          # Privacy Policy & HIPAA/Local Data Sovereignty documentation
├── icons/                # PWA application launcher icons (192px, 512px, maskable)
├── .well-known/          # Digital asset links for Android TWA / Play Store verification
├── PLAYSTORE_GUIDE.md    # Step-by-step Google Play Store publishing guide
└── vercel.json           # Static deployment configuration for Vercel
```

---

## 🌐 Deployment

The application is deployed as a high-performance static progressive web app:
- **Vercel URL**: [https://saksham-rho-six.vercel.app/](https://saksham-rho-six.vercel.app/)
- Zero external build dependencies — loads instantly on mobile networks.
