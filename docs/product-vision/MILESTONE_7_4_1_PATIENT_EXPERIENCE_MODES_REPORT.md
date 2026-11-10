# SAKSHAM — MILESTONE 7.4.1 IMPLEMENTATION REPORT
# CONFIGURABLE PATIENT EXPERIENCE: ASHA-ONLY (CONVERSATION-FIRST) VS. HYBRID NAVIGATION

**Milestone:** 7.4.1 — Configurable Patient Experience Modes  
**Date:** 10 November 2026  
**Repository:** `/Users/trishnabapna/Desktop/Saksham`  
**Branch:** `phase-2-patient-experience`  
**Firebase Plan:** Spark Free Tier ($0.00 / Zero Paid APIs / Zero Cloud Functions / Zero Blaze upgrade)  
**Production URL:** `https://saksham-d3b71.web.app` (Deployment intentionally withheld)  

---

## 1. Executive Summary & Objective

Milestone 7.4.1 implements the **Configurable Patient Experience** for the Saksham Neuro-Care ecosystem, fulfilling the master product vision of an empathetic, character-led conversational neuro-care sanctuary while empowering independent seniors who prefer traditional navigation.

Patients can now choose between two distinct, accessible navigation experiences:
1. **Mode A: Asha-Only (Conversation-First):** Asha is the primary, distraction-free companion. The four bottom navigation tabs are hidden, screen padding is optimized for generous vertical spacing, and Asha guides patients directly to routines, games, memories, notes, and calendar via voice or text. Tactile quick actions, the tactile navigation drawer, and direct Settings access remain permanently reachable without requiring speech or microphone permissions.
2. **Mode B: Asha + Navigation (Hybrid — Safe Default):** Asha remains central on the Home sanctuary stage, accompanied by the persistent, familiar four-destination bottom navigation bar (`Home`, `Family`, `Games`, `Profile`). All existing and newly registered patients default strictly to Hybrid mode to guarantee zero disruption.

---

## 2. Technical Architecture & Component Implementation

### 2.1 State Management & Context (`frontend/src/context/PatientExperienceContext.tsx`)
A dedicated, lightweight React Context (`PatientExperienceContext`) provides state management and persistence for the patient experience mode:
- **Type Definition:** `PatientExperienceMode = 'asha-only' | 'hybrid'`.
- **Synchronous Cache Initialization:** On component mount, the initial state is read synchronously from browser `localStorage` using the scoped key `saksham_patient_experience_mode_${effectivePatientId}`. This guarantees **zero layout shift (CLS = 0)** upon page load.
- **Safe Fallback:** If the key is absent or contains an invalid value, it returns strictly `'hybrid'`.
- **Identity-Scoped Persistence:** The key incorporates `getEffectivePatientId(currentUser)`. When switching accounts or logging out, preferences do not leak across users. Guest users are isolated to `saksham_patient_experience_mode_guest_patient_local`.
- **Remote Profile Sync:** For authenticated non-guest patients, `setMode` writes to Firestore document `/users/{patientId}` property `patientExperienceMode` and updates `updatedAt`. If offline or on guest mode, it gracefully operates local-first ($0.00 cost).
- **Reactive Notification:** Calls `notifyDataChange('patient_experience', effectivePatientId)` to alert cross-tab and component subscribers.
- **Safe Hook:** Exports `usePatientExperienceSafe()` which falls back to `{ mode: 'hybrid', isAshaOnly: false, isHybrid: true }` when mounted outside the provider (e.g., in unit test harnesses).

### 2.2 Root Layout Decoupling (`frontend/src/App.tsx`)
In `App.tsx`, `<PatientExperienceProvider>` wraps the component tree. In `AppContent`, bottom navigation is conditionally rendered:
```tsx
{/* Persistent Patient Floating Utilities & Bottom Nav */}
{isPatientRoute && !isAuthRoute && (
  <>
    <FloatingUtilityHub />
    {isHybrid && <BottomNav />}
  </>
)}
```
- In **Hybrid mode**, `<BottomNav />` mounts and renders all 4 permanent tabs: `Home`, `Family`, `Games`, `Profile`.
- In **Asha-Only mode**, `<BottomNav />` is completely unmounted and absent from the DOM.
- `<FloatingUtilityHub />` remains permanently mounted in both modes, ensuring patient access to Notes and Calendar modals.
- Caregiver (`/caregiver`), Doctor (`/doctor`), and Admin (`/admin`) routes are completely unaffected.

### 2.3 Sanctuary Stage & Padding Optimization (`PatientDashboard.tsx` & `ConversationalSanctuaryStage.tsx`)
- **Dynamic Padding:** In [`PatientDashboard.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/pages/patient/PatientDashboard.tsx), container bottom padding dynamically adjusts based on mode:
  ```tsx
  <div className={`${isAshaOnly ? 'pb-10' : 'pb-28'} pt-4 px-4 max-w-4xl mx-auto space-y-6`}>
  ```
  In Asha-Only mode, removing the 56px bottom navigation bar frees up vertical screen space, expanding touch target clearance for Parkinson's patients with resting hand tremors.
- **Permanent Stage Settings Access:** In [`ConversationalSanctuaryStage.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/ai-companion/components/ConversationalSanctuaryStage.tsx), when `isAshaOnly` is true:
  1. A 6th tactile quick-action chip **"Settings & Profile"** (`data-testid="stage-quick-settings"`) is added to the 1-tap quick action grid.
  2. An interactive **"Asha-Only" mode badge** is rendered in the Sanctuary Top Bar (`data-testid="asha-only-mode-badge"`) allowing 1-tap navigation to Settings.
- **Preserved Tactile Fallbacks (Voice Optional):** Speech recognition is never mandatory. The patient always has:
  - Accessible text input bar with keyboard focus and submit button.
  - Tactile quick action chips (`Daily Routines`, `Family Memories`, `Mind Games`, `Notes`, `Calendar`, and `Settings`).
  - Tactile Navigation Drawer ([`TactileNavigationDrawer.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/components/layout/TactileNavigationDrawer.tsx)) accessible with 1 tap.

### 2.4 Profile Settings Selection UI (`frontend/src/pages/patient/PatientProfile.tsx`)
A new dedicated card **"Patient Experience & Navigation Style"** is embedded in `PatientProfile.tsx`:
- **Card 1: Asha + Navigation (Hybrid — Recommended Default):**
  - Radio button indicator (selected when `mode === 'hybrid'`).
  - Badge: `"Recommended Default"` (green styling).
  - Description: *"Asha companion on Home, plus standard bottom navigation tabs for direct one-tap access to Family, Games, and Profile."*
- **Card 2: Asha-Only (Conversation-First):**
  - Radio button indicator (selected when `mode === 'asha-only'`).
  - Badge: `"Distraction-Free"` (purple styling).
  - Description: *"Simple, calm, distraction-free screen without bottom tabs. Talk or type to Asha, or tap quick action buttons."*
- **Data Safety Reassurance Badge:**
  - Includes a green check shield: *"Switching modes keeps all your notes, routines, and games intact."*
- **Accessible Interactivity:** Supports touch, mouse click, and keyboard navigation (`Enter` and `Space` keys).

---

## 3. Strict Invariants & Non-Negotiable Boundaries

| Invariant | Implementation Evidence | Verification Status |
| :--- | :--- | :---: |
| **Safe Default** | `getStoredPatientExperienceMode` strictly defaults to `'hybrid'` | **VERIFIED** |
| **Exactly 4 Bottom Tabs** | `BottomNav.tsx` permanently renders exactly 4 tabs (Home, Family, Games, Profile) | **VERIFIED** |
| **No Route Deletion** | Routes `/patient`, `/patient/loved-ones`, `/patient/mind-games`, `/patient/profile` intact | **VERIFIED** |
| **Zero Data Mutation** | Switching modes touches visual layout only; routines, games, notes, calendar untouched | **VERIFIED** |
| **Identity Scoping** | Local storage key scoped to active UID (`saksham_patient_experience_mode_${uid}`) | **VERIFIED** |
| **Voice Optional** | Text input, tactile chips, and tactile drawer fully operable without microphone | **VERIFIED** |
| **Permanent Settings** | Reachable via TopBar Avatar, Sanctuary stage chip, stage badge, and tactile drawer | **VERIFIED** |
| **Role Isolation** | Caregiver, doctor, and admin dashboards completely untouched | **VERIFIED** |
| **Spark Plan ($0.00)** | Zero paid APIs, zero external LLMs, zero Cloud Functions, zero Cloud Storage | **VERIFIED** |
| **Deployment Boundary** | Live hosting deployment strictly withheld | **VERIFIED** |

---

## 4. Pan-India Multilingual Coverage

Added 11 standardized translation keys across English (`en.ts`) and Hindi (`hi.ts`) with graceful English fallbacks for the remaining 21 regional Indic language files:
- `profile.patient_experience`: Patient Experience / मरीज अनुभव मोड
- `profile.patient_experience_desc`: Choose how you prefer to explore Saksham and interact with Asha / सक्षम का उपयोग करने और आशा से बातचीत करने का अपना पसंदीदा तरीका चुनें:
- `profile.mode_hybrid`: Asha + Navigation (Hybrid) / आशा + नेविगेशन (हाइब्रिड)
- `profile.mode_hybrid_desc`: Asha companion on Home, plus standard bottom navigation tabs / होम पर आशा साथी, और परिवार, खेल और प्रोफ़ाइल के सीधे उपयोग के लिए नीचे 4 मुख्य टैब।
- `profile.mode_hybrid_badge`: Recommended Default / सुझाया गया डिफ़ॉल्ट
- `profile.mode_asha_only`: Asha-Only (Conversation-First) / केवल आशा (संवाद-प्रथम)
- `profile.mode_asha_only_desc`: Simple, calm, distraction-free screen without bottom tabs / बिना नीचे के टैब वाला सरल, शांत, भटकाव-मुक्त स्क्रीन।
- `profile.mode_asha_only_badge`: Distraction-Free / भटकाव-मुक्त
- `profile.mode_data_safe`: Switching modes keeps all your notes, routines, and games intact / मोड बदलने से आपके सभी नोट्स, रूटीन और खेल सुरक्षित रहते हैं।
- `sanctuary.action_settings`: Settings & Profile / सेटिंग्स और प्रोफ़ाइल
- `sanctuary.action_settings_desc`: Care preferences and navigation mode / देखभाल प्राथमिकताएं और नेविगेशन मोड

---

## 5. Automated Verification & Testing

### 5.1 Dedicated Test Suite (`Milestone741PatientExperienceModes.test.tsx`)
A dedicated Vitest test suite comprising **15 automated tests** verifies all aspects of Milestone 7.4.1:
- **Part A: Default Experience Mode (2 tests):**
  - Defaults to hybrid when no saved preference exists.
  - Safe fallback of `getStoredPatientExperienceMode` on null, undefined, or invalid strings.
- **Part B: Bottom Navigation Visibility Across Modes (3 tests):**
  - Renders exactly 4 bottom navigation tabs in Hybrid mode.
  - Completely suppresses `<BottomNav />` from DOM in Asha-Only mode.
  - Adjusts patient stage padding (`pb-10` in Asha-Only vs `pb-28` in Hybrid).
- **Part C: Mode Switching & Identity-Scoped Persistence (2 tests):**
  - Allows switching in both directions via `PatientProfile` settings.
  - Persists preference under patient-scoped key without cross-account leakage.
- **Part D: Direct Route Access & Continuity (1 test):**
  - Direct route access to `/patient/loved-ones`, `/patient/mind-games`, and `/patient/profile` succeeds in Asha-Only mode.
- **Part E: Settings Accessibility in Asha-Only Mode (2 tests):**
  - Surfaces Settings tactile chip on Sanctuary stage in Asha-Only mode.
  - Retains permanent TopBar Profile avatar button in both modes.
- **Part F: Tactile Interaction & Optional Voice (1 test):**
  - Allows text conversation input and submission without microphone access.
- **Part G: Zero Data Mutation Invariant (1 test):**
  - Guarantees that switching modes alters 0 routines, notes, calendar events, games, or loved ones.
- **Part H: Role Isolation (3 tests):**
  - Caregiver, Doctor, and Admin dashboards never render bottom navigation regardless of patient mode.

### 5.2 Full Test Suite Results
- **Frontend Vitest:** **424 passed across 31 test files** (0 failures).
- **Backend Vitest:** **50 passed across 3 test files** (0 failures).
- **Total Passing Tests:** **474 passed across 34 files** (100% passing).
- **Production Bundle Build:** `tsc && vite build` compiled cleanly in **2.68s** with 0 errors.

---

## 6. Exact Files Changed in Milestone 7.4.1

```
Created:
- frontend/src/context/PatientExperienceContext.tsx (Context, Provider, hook, scoped storage helpers)
- frontend/src/test/Milestone741PatientExperienceModes.test.tsx (15 automated verification tests)
- docs/product-vision/MILESTONE_7_4_1_PATIENT_EXPERIENCE_MODES_REPORT.md (Implementation report)

Modified:
- frontend/src/App.tsx (Wrapped with PatientExperienceProvider, conditional BottomNav)
- frontend/src/pages/patient/PatientDashboard.tsx (Dynamic padding pb-10 vs pb-28)
- frontend/src/features/ai-companion/components/ConversationalSanctuaryStage.tsx (Stage Settings chip & mode badge)
- frontend/src/pages/patient/PatientProfile.tsx (Patient Experience mode switcher card)
- frontend/src/i18n/locales/en.ts (11 new localization keys)
- frontend/src/i18n/locales/hi.ts (11 new native Hindi keys)
```
