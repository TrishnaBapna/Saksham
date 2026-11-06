# SAKSHAM (सक्षम) — PHASE 3, MILESTONE 1: SYSTEM AUDIT & ARCHITECTURAL BASELINE REPORT
**Document Reference:** `docs/phase-3/PHASE_3_MILESTONE_1_SYSTEM_AUDIT.md`  
**Audit Execution Date:** November 6, 2026  
**Auditor:** Antigravity AI Engineering & Architecture Team  
**Git Branch:** `phase-2-patient-experience`  
**Base Commit:** `7404231`  
**Audit Scope:** Read-Only Technical Audit of Phase 2 Patient Experience, Services, Data Layers, Tests, and Security

---

## 1. Executive Summary

### 1.1 Overview
The Saksham (सक्षम) Neuro-Care Companion Ecosystem aims to provide an accessible, empathetic, and cognitively supportive platform for individuals with cognitive impairments, neurodivergence, or memory challenges. Phase 2 focused on designing, implementing, and refining the patient-facing core across four distinct milestones:
1. **Milestone 1:** Patient Dashboard & Asha AI Companion
2. **Milestone 2:** Daily Routines & Care (Assisted Recall Engine)
3. **Milestone 3:** Loved Ones (Family & Identity Anchor)
4. **Milestone 4:** Mind Games (Cognitive Wellness & Engagement)

This technical audit establishes the formal architectural baseline before Phase 3 implementation. It evaluates component architecture, data persistence, state synchronization, identity continuity, security rules, test fidelity, and Firebase Spark (free tier) compliance.

### 1.2 Key Audit Verdict
* **UI/UX & Accessibility (Grade: A+):** Exceptional empathetic visual identity, high-contrast lavender/plum palettes, large tap targets, accessible font scaling (`A-` / `A+`), and non-punitive, supportive progressive feedback.
* **Component Architecture (Grade: A):** Clean modularity, decoupled design, and robust fallback resilience.
* **Data Layer & Cloud Synchronization (Grade: C-):** While Firestore and Firebase Storage security rules are defined and verified via logical policy simulators, the frontend services (`routineService.ts`, `lovedOnesService.ts`, `gamesService.ts`) persist data **exclusively in client-side `localStorage`**. No records are currently synchronized to Cloud Firestore.
* **Identity Continuity (Grade: B):** Authentication tokens and roles are securely verified, but fallback patient ID strings diverge across pages (`'default-patient'` vs `'default_patient'`), creating segregated local data silos in guest or fallback modes.
* **Build & Static Analysis (Grade: A):** TypeScript strict compilation (`tsc --noEmit`) passes with zero errors; the production Vite build completes cleanly in 2.42s (`950.98 kB`).
* **Test Suite Health (Grade: B+):** 
  - Backend: 27/27 tests passed across 3 test suites (tested via an in-memory logical policy simulator).
  - Frontend: 71/72 tests passed across 12 test suites. Exactly 1 test failed (`DailyRoutinesMilestone2.test.tsx`) due to hardcoded calendar dates (`2026-11-04`) that became stale relative to the test runner's system date.

---

## 2. Current Architecture

```
                                  +---------------------------------------+
                                  |       React 18 / TypeScript SPA       |
                                  |     (Vite + Tailwind CSS + Lucide)     |
                                  +---------------------------------------+
                                                      |
            +-----------------------------------------+-----------------------------------------+
            |                                         |                                         |
+-----------------------+                 +-----------------------+                 +-----------------------+
|   AuthContext / Guard |                 |   Patient Dashboard   |                 |    Asha AI Companion  |
|  - Role claims        |                 |  - Welcome & Date     |                 |  - Empathy animations |
|  - Mock fallback      |                 |  - Quick Navigation   |                 |  - Safe intent regex  |
|  - Auth subscriber    |                 |  - Accessibility bar  |                 |  - Route dispatcher   |
+-----------------------+                 +-----------------------+                 +-----------------------+
            |                                         |                                         |
            +-----------------------------------------+-----------------------------------------+
                                                      |
            +-----------------------------------------+-----------------------------------------+
            |                                         |                                         |
+-----------------------+                 +-----------------------+                 +-----------------------+
| Daily Routines & Care |                 |       Loved Ones      |                 |       Mind Games      |
|  - Recall Engine      |                 |  - Family memory deck |                 |  - Pattern Matching   |
|  - 3-tier hints       |                 |  - Voice notes (TTS)  |                 |  - Word Association   |
|  - Web Audio beeps    |                 |  - Rel. tags & photos |                 |  - Gentle streak calc |
+-----------------------+                 +-----------------------+                 +-----------------------+
            |                                         |                                         |
+-----------------------+                 +-----------------------+                 +-----------------------+
|   routineService.ts   |                 |   lovedOnesService.ts |                 |    gamesService.ts    |
|  (localStorage only)  |                 |  (localStorage only)  |                 |  (localStorage only)  |
+-----------------------+                 +-----------------------+                 +-----------------------+
            \                                         |                                        /
             \________________________________________|_______________________________________/
                                                      |
                                  +---------------------------------------+
                                  |    Browser Storage / Local Cache      |
                                  |   (Keys: saksham_*, in-memory fall)   |
                                  +---------------------------------------+
                                                      :
                                              [MISSING LINK]
                                                      :
                                  +---------------------------------------+
                                  |   Cloud Firestore / Firebase Storage  |
                                  |  - firestore.rules (present & tested) |
                                  |  - storage.rules (present & tested)   |
                                  +---------------------------------------+
```

### 2.1 Technology Stack
* **Runtime & Framework:** Node.js, React 18.3, TypeScript 5.5, Vite 5.4.
* **Styling & Icons:** Tailwind CSS 3.4, Lucide React 0.453.
* **Testing:** Vitest 2.1, React Testing Library, JSDOM.
* **Audio & Synthesis:** Web Audio API (native browser oscillator synth) and Web Speech API (`window.speechSynthesis`).
* **Cloud & Auth:** Firebase Web SDK 10.13 (Auth, Firestore, Storage) configured on the Spark Free Plan.

---

## 3. Four-Module Audit (Milestones 1–4)

### 3.1 Milestone 1: Patient Dashboard & Asha AI Companion
* **Primary Source Files:**
  - `frontend/src/pages/patient/PatientDashboard.tsx`
  - `frontend/src/features/ai-companion/AICompanion.tsx`
  - `frontend/src/services/aiService.ts`
* **Architectural Review:**
  - **Asha AI Companion:** Features an expressive chibi-style avatar supporting 5 visual emotional states (`happy`, `listening`, `thinking`, `encouraging`, `celebrating`). Intent extraction is strictly rule-based via safe whitelist regex matching in `aiService.ts` (`NAVIGATE_ROUTINES`, `NAVIGATE_FAMILY`, `NAVIGATE_GAMES`, `ENCOURAGE`, `REMIND_WATER`, etc.). This eliminates external LLM costs and latency, perfectly fitting the Spark tier.
  - **Accessibility Toolbar:** Allows instant real-time toggle between standard (`100%`), medium (`115%`), and large (`130%`) viewport-wide font scalings, alongside high-contrast mode toggles.
  - **Identified Gap:** The "Today's Care Plan" card and the progress indicator (`"1 of 3 daily care steps done"`, `"80% peaceful consistency"`) are static React state mockups inside `PatientDashboard.tsx`. They do not subscribe to or read from `routineService.ts` or `gamesService.ts`.

### 3.2 Milestone 2: Daily Routines & Care
* **Primary Source Files:**
  - `frontend/src/pages/patient/DailyRoutines.tsx`
  - `frontend/src/features/routines/services/routineService.ts`
  - `frontend/src/features/routines/components/AssistedRecallModal.tsx`
* **Architectural Review:**
  - **Assisted Recall Engine:** Reusable modal with 3 progressive hint tiers (General Reminder $\rightarrow$ Specific Cue $\rightarrow$ Direct Solution). Patients can skip or ask for hints without penalties.
  - **Audio System:** Integrates a zero-dependency Web Audio API synthesizer generating gentle two-tone chimes (C5 $\rightarrow$ G5) on success and warm low pulses on hints.
  - **Streak & History Engine:** Computes consecutive days with at least one completed care routine.
  - **Identified Gap:** Fallback patient identifier is hardcoded as `currentUser?.uid || 'default-patient'` (hyphenated). Service history seeding contained fixed calendar dates (`2026-11-04`, `2026-11-03`), causing time-dependent test failures when executed on subsequent dates.

### 3.3 Milestone 3: Loved Ones (Family & Identity Anchor)
* **Primary Source Files:**
  - `frontend/src/pages/patient/LovedOnes.tsx`
  - `frontend/src/features/lovedOnes/services/lovedOnesService.ts`
  - `frontend/src/features/lovedOnes/components/LovedOneModal.tsx`
* **Architectural Review:**
  - **Memory Cards & Profiles:** Warm, non-intimidating presentation of close family members, relationships, personal nicknames, memory anchors, and familiar phrases.
  - **Voice Notes & Audio Anchors:** Uses browser Web Speech API (`speechSynthesis`) with voice selection (prefers natural female Indian-English or local regional accents when available).
  - **Emergency Fast Dial:** Provides direct call buttons with confirmation guards.
  - **Identified Gap:** Fallback patient identifier is `currentUser?.uid || 'default_patient'` (underscore), mismatching Milestone 2's `'default-patient'`. Photos are embedded SVG data URIs or Unsplash external URLs; there is no Firebase Storage upload pipeline.

### 3.4 Milestone 4: Mind Games (Cognitive Wellness & Engagement)
* **Primary Source Files:**
  - `frontend/src/pages/patient/MindGames.tsx`
  - `frontend/src/features/games/services/gamesService.ts`
  - `frontend/src/features/games/components/PatternMatchingGame.tsx`
  - `frontend/src/features/games/components/WordRecallGame.tsx`
  - `frontend/src/features/games/components/CardMemoryGame.tsx`
  - `frontend/src/features/games/components/SoundSequenceGame.tsx`
* **Architectural Review:**
  - **Cognitive Activities:** Four micro-games targeting distinct cognitive domains: visual pattern recognition, verbal association, spatial card recall, and auditory working memory.
  - **Gentle Difficulty Scaling:** Dynamic adaptation without timers or failure buzzers. Sessions record attempts, hint requests, and calm completion tokens.
  - **Identified Gap:** Game records persist solely in `saksham_game_sessions_${patientUid}` in `localStorage`. There is no doctor or caregiver analytics view to track longitudinal cognitive variance.

---

## 4. Unified Patient Identity Assessment

### 4.1 Fallback Identity Discrepancy
Across the codebase, when a user is not authenticated or when authentication is initializing, pages invoke fallback patient identifiers with divergent naming conventions:

| Component / Service | Implementation | Fallback String |
| :--- | :--- | :--- |
| `DailyRoutines.tsx` (Line 26) | `currentUser?.uid \|\| 'default-patient'` | `'default-patient'` (Hyphen) |
| `LovedOnes.tsx` (Line 27) | `currentUser?.uid \|\| 'default_patient'` | `'default_patient'` (Underscore) |
| `MindGames.tsx` (Line 40) | `currentUser?.uid \|\| 'default_patient'` | `'default_patient'` (Underscore) |
| `routineService.ts` (Line 44) | `patientId \|\| 'default'` | `'default'` |

### 4.2 Architectural Impact
1. **Data Siloing:** In guest, preview, or demo modes, data written in Daily Routines is saved under `saksham_routines_default-patient`, whereas Loved Ones is stored under `saksham_loved_ones_default_patient`.
2. **Context Switching:** If a patient logs in with a verified Firebase Auth UID (`uid_12345`), the pages correctly switch to `saksham_*_uid_12345`, but previously created local items are orphaned under the divergent fallback keys without migration.
3. **Phase 3 Recommendation:** Implement a centralized identity helper `getEffectivePatientId(user: User | null): string` in `frontend/src/utils/identity.ts` or expose it directly from `useAuth()`.

---

## 5. Data Persistence Assessment

### 5.1 Client Storage vs Cloud Storage Audit

```
+------------------------+-------------------------+--------------------------+
| Module                 | Frontend Service Store  | Backend Cloud Firestore  |
+------------------------+-------------------------+--------------------------+
| User Profiles & Roles  | AuthContext + Memory    | /users/{userId}          |
| Daily Routines         | localStorage            | /routines/{routineId}    |
| Recall Progress Logs   | localStorage            | /routines/.../attempts   |
| Loved Ones / Family    | localStorage            | /lovedOnes/{id}          |
| Cognitive Game Logs    | localStorage            | /gameSessions/{id}       |
+------------------------+-------------------------+--------------------------+
```

### 5.2 Deep-Dive into Frontend Services
A codebase-wide search for Firestore mutation methods (`addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `getDocs`, `onSnapshot`) revealed:
* Firestore SDK methods are **only** called in:
  - `frontend/src/features/auth/services/roleService.ts` (`getDoc(doc(db, 'users', uid))`)
  - `frontend/src/features/auth/services/registrationService.ts` (`setDoc(doc(db, 'users', uid), ...)`)
* `routineService.ts`, `lovedOnesService.ts`, and `gamesService.ts` have **zero** Firestore imports or calls. They operate completely offline on `window.localStorage`.

### 5.3 Firestore Security Rules Readiness
`backend/firestore.rules` already has detailed rules defining access for:
* `/routines/{routineId}`
* `/lovedOnes/{lovedOneId}`
* `/gameSessions/{sessionId}`

The schemas enforced in `backend/firestore.rules` and tested in `backend/src/test/securityRules.test.ts` match the TypeScript types in the frontend (`Routine`, `LovedOne`, `GameSessionRecord`). Connecting frontend services to Firestore in Phase 3 requires no rule redesign—only service adapter implementations.

---

## 6. Cross-Module Integration Matrix

| Source Module | Target Module | Data / Trigger | Current Status | Remediation Required for Phase 3 |
| :--- | :--- | :--- | :--- | :--- |
| **Asha Companion** | Daily Routines | Action: `NAVIGATE_ROUTINES` | **Functional** (UI navigation) | Connect Asha to query completed routines ("Asha, did I take my medicine?") |
| **Asha Companion** | Loved Ones | Action: `NAVIGATE_FAMILY` | **Functional** (UI navigation) | Enable Asha to reference loved ones' names during conversations |
| **Asha Companion** | Mind Games | Action: `NAVIGATE_GAMES` | **Functional** (UI navigation) | Display cognitive encouragement after high-stress routine skips |
| **Daily Routines** | Patient Dashboard | Completion Count & Streak | **Disconnected** (Mock display) | Subscribe `PatientDashboard.tsx` to `routineService.getRoutines()` |
| **Mind Games** | Patient Dashboard | Daily Brain Check-in | **Disconnected** (Mock display) | Add cognitive wellness card on `PatientDashboard.tsx` |
| **Loved Ones** | Daily Routines | Audio Cue by Caregiver | **Isolated** | Permit caregiver recorded audio clips inside routine steps |
| **AuthContext** | All Patient Pages | Active `patientUid` | **Partial** (Fallback divergence) | Unified `getEffectivePatientId()` resolver |

---

## 7. Offline and Synchronisation Assessment

### 7.1 Current Offline Capabilities
* Because all patient data is held in browser `localStorage`, the patient experience is currently **100% resilient to network drops**. A patient can open routines, complete hint steps, review loved ones, and play mind games with zero internet connectivity.

### 7.2 Current Synchronization Deficits
1. **Cross-Device Invisibility:** If a caregiver enters emergency contacts or daily medication routines on a laptop or mobile phone, the patient's tablet does not receive them.
2. **Cache Eviction Risk:** If the browser cache or website data is cleared, all patient routines, custom loved ones, and game streaks are permanently lost.
3. **No Synchronization Queue:** There is no queue or background sync worker to reconcile local writes when an internet connection is re-established.
4. **Phase 3 Recommendation:** Use Cloud Firestore with `persistentLocalCache` and `persistentMultipleTabManager` enabled in `firebase.ts`. This allows automatic offline indexing, persistence, and background sync natively without custom sync code.

---

## 8. Security and Privacy Assessment

### 8.1 Local Data Exposure
* **Unencrypted LocalStorage:** PII such as loved ones' full names, relationships, phone numbers, personal notes, and medical routines are stored in unencrypted browser `localStorage`.
* **Shared Device Vulnerability:** On shared tablets, calling `authService.signOut()` clears `'saksham_auth_user'`, but leaves `saksham_routines_*` and `saksham_loved_ones_*` in storage. Any subsequent user on the browser can read past patient records.

### 8.2 Backend Security Rules Status
* Verified that `backend/firestore.rules` enforces:
  - Strict role immutability on user profiles.
  - Active assignment checks for doctors (`isAssignedDoctor(patientId)`).
  - Explicit approval checks for caregivers (`isApprovedCaregiver(patientId)`).
  - Proper ownership verification (`isOwner(patientId)`).
* All 27 logical security rule tests in `backend/src/test/securityRules.test.ts` pass.

### 8.3 Neuro-Care Privacy Considerations
* Patient voice cues and personal reflections are sensitive health data. When synchronizing with Cloud Firestore and Storage, data must be partitioned strictly under patient-owned collections with read access restricted exclusively to the patient, verified assigned doctors, and approved caregivers.

---

## 9. Firebase Spark Compliance

The Firebase Spark Plan provides generous free-tier quotas suitable for Saksham's neuro-care companion:

| Spark Free Plan Feature | Free Quota Limit | Saksham Current Usage | Compliance Status |
| :--- | :--- | :--- | :--- |
| **Cloud Firestore Reads** | 50,000 / day | ~50 / day (local mock heavy) | **100% Compliant** |
| **Cloud Firestore Writes** | 20,000 / day | ~10 / day (profile only) | **100% Compliant** |
| **Cloud Firestore Storage** | 1 GiB total | < 1 MB | **100% Compliant** |
| **Firebase Storage Bucket** | 5 GB total (1 GB/day transfer) | 0 MB (uses data URIs / SVGs) | **100% Compliant** |
| **Cloud Functions** | **0 (Paid Blaze only)** | **0 Functions deployed** | **100% Compliant** |
| **Authentication** | Unlimited Email/Password | Email/Password + Mock | **100% Compliant** |
| **External AI APIs** | None in Spark | Client-side Regex & Web Speech | **100% Compliant** |

Saksham requires **zero paid APIs, zero Cloud Functions, and zero external billing**. It operates entirely within Spark tier boundaries.

---

## 10. Testing and Build Results

### 10.1 Test Execution Matrix

| Test Suite / Target | Command Run | Passed | Failed | Total | Duration | Test Type |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Frontend TypeScript Lint** | `npm run lint --prefix frontend` | 0 err | 0 | 0 err | 1.84s | `tsc --noEmit` (Strict Typecheck) |
| **Frontend Production Build** | `npm run build --prefix frontend` | Clean | 0 | 1 dist | 2.42s | Vite Production Bundle (950 kB) |
| **Backend Security Rules** | `npm test --prefix backend` | 27 | 0 | 27 | 1.34s | Policy Simulator (`vitest run`) |
| **Frontend Component & Unit** | `npm test --prefix frontend` | 71 | 1 | 72 | 4.88s | React Testing Library (`vitest run`) |

### 10.2 Details on Backend Tests
* All 27 backend tests (`securityRules.test.ts`, `doctorAssignmentSecurity.test.ts`, `caregiverRelationshipSecurity.test.ts`) execute against a TypeScript-based policy simulator (`SecurityRulesPolicySimulator`). 
* *Note for Audit:* They test the logical AST expressions of the security rules; they were not run against the live official Google Firebase Emulator Suite (Java binary), as no local emulator daemon was running during the test cycle.

### 10.3 Details on Frontend Test Failure (`DailyRoutinesMilestone2.test.tsx`)
* **Failed Assertion:** `AssertionError: expected 0 to be greater than or equal to 1` at line 83 of `frontend/src/test/DailyRoutinesMilestone2.test.tsx`.
* **Root Cause:**
  ```typescript
  // DailyRoutinesMilestone2.test.tsx lines 74-77
  const mockHistory = [
    { date: '2026-11-04', completedRoutineIds: ['r1', 'r2'], totalSteps: 2, completedSteps: 2 },
    { date: '2026-11-03', completedRoutineIds: ['r1'], totalSteps: 1, completedSteps: 1 }
  ];
  ```
  The test seeded history with fixed date `'2026-11-04'`. The `calculateStreak` algorithm tests whether the streak includes *today* or *yesterday*. Because the test was executed on `2026-11-06`, `'2026-11-04'` was two days ago, resetting the streak calculation to `0`.
* **Resolution Strategy (Phase 3):** Parameterize mock test dates using dynamic relative dates:
  ```typescript
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  ```
  *(Preserved in Milestone 1 without modification to honor the strict read-only audit constraint).*

---

## 11. Critical Issues & Deficiencies

The findings are classified into five standard severity tiers: `Critical`, `High`, `Medium`, `Low`, and `Informational`.

```
========================================================================================
[AUD-CRIT-01] CLOUD FIRESTORE DISCONNECTED IN CORE PATIENT MODULES
Severity:     CRITICAL
Location:     frontend/src/features/routines/services/routineService.ts
              frontend/src/features/lovedOnes/services/lovedOnesService.ts
              frontend/src/features/games/services/gamesService.ts
Impact:       Patient routines, family profiles, voice cues, and cognitive game records
              are stored exclusively in browser localStorage. No data is saved to 
              Cloud Firestore. Patient data is lost if browser cache is cleared and
              is completely inaccessible from doctor/caregiver devices.
Remediation:  Implement Firestore client repositories with automatic fallback to
              localStorage for offline support.
========================================================================================

[AUD-HIGH-01] PATIENT DASHBOARD PROGRESS DISCONNECTED FROM SERVICE LAYER
Severity:     HIGH
Location:     frontend/src/pages/patient/PatientDashboard.tsx (Lines 20-30, 160-195)
Impact:       The Patient Dashboard displays hardcoded routines ("1 of 3 daily care steps done")
              and a static completion percentage ("80%"). Completing routines in the Daily
              Routines module has zero effect on the Patient Dashboard.
Remediation:  Refactor PatientDashboard to subscribe to routineService and gamesService
              state hooks so dashboard cards react dynamically to actual patient actions.
========================================================================================

[AUD-HIGH-02] DIVERGENT FALLBACK PATIENT IDENTIFIERS
Severity:     HIGH
Location:     frontend/src/pages/patient/DailyRoutines.tsx (Line 26)
              frontend/src/pages/patient/LovedOnes.tsx (Line 27)
              frontend/src/pages/patient/MindGames.tsx (Line 40)
Impact:       Daily Routines uses 'default-patient' (hyphen) while Loved Ones and Mind Games
              use 'default_patient' (underscore). In fallback mode, modules create separate
              uncoordinated data stores.
Remediation:  Create a single identity resolver: getEffectivePatientId(currentUser).
========================================================================================

[AUD-MED-01] TIME-SENSITIVE STREAK TEST HARDCODED CALENDAR DATE
Severity:     MEDIUM
Location:     frontend/src/test/DailyRoutinesMilestone2.test.tsx (Lines 74-84)
Impact:       Fails frontend test runner when executed after 2026-11-04 because calendar dates
              in mock data are static rather than relative to test execution time.
Remediation:  Update test to use relative ISO dates based on Date.now().
========================================================================================

[AUD-MED-02] INCOMPLETE LOCAL STORAGE PURGE ON USER SIGN OUT
Severity:     MEDIUM
Location:     frontend/src/features/auth/services/authService.ts (Lines 105-115)
Impact:       Signing out removes 'saksham_auth_user' but leaves patient routines, loved ones
              information, and game session histories in localStorage. On shared or clinic
              devices, the next patient or caregiver can view previous patient PII.
Remediation:  Add full patient session cache purge or scoped encryption to authService.signOut().
========================================================================================

[AUD-LOW-01] ABSENCE OF OFFLINE WRITE SYNCHRONIZATION QUEUE
Severity:     LOW
Location:     frontend/src/services/
Impact:       If a device loses connectivity while writing, data remains in localStorage
              with no reconciliation queue when internet connectivity resumes.
Remediation:  Leverage Cloud Firestore's native persistentIndexedDb cache.
========================================================================================

[AUD-INFO-01] BACKEND SECURITY TESTS USE LOGICAL POLICY SIMULATOR
Severity:     INFORMATIONAL
Location:     backend/src/test/securityRules.test.ts
Impact:       Backend security tests pass completely (27/27), but run against an in-memory
              TypeScript simulator rather than the official Firebase Java Emulator Suite.
Remediation:  Maintain simulator for rapid CI/CD; introduce an optional emulator test script.
========================================================================================

[AUD-INFO-02] 100% SPARK FREE-TIER COMPLIANT ARCHITECTURE
Severity:     INFORMATIONAL
Location:     Architecture-wide
Impact:       The platform successfully delivers conversational AI, speech synthesis, sound
              effects, and cognitive games without invoking any paid third-party APIs.
========================================================================================
```

---

## 12. Recommended Improvements

### 12.1 Priority 1: Data Integration & Dual-Storage Architecture
1. **Firestore Client Service Layer:** Refactor `routineService`, `lovedOnesService`, and `gamesService` to use a dual-storage pattern:
   - Read from Firestore cache / server when online or cached.
   - Write to Cloud Firestore while immediately updating `localStorage` as an instant synchronous cache.
2. **Unified Patient Resolver:** Standardize patient UID resolution across all components.

### 12.2 Priority 2: Dashboard Reactivity
1. **Dynamic Dashboard Hook:** Create `usePatientCareOverview(patientId)` that consolidates:
   - Number of routines due today and number completed today.
   - Current consecutive streak.
   - Today's completed cognitive activities.
   - Asha's proactive morning/afternoon/evening prompt.

### 12.3 Priority 3: Shared Device Session Security
1. **Safe Sign-Out Pipeline:** Update `authService.signOut()` to clear all `saksham_routines_*`, `saksham_loved_ones_*`, and `saksham_game_sessions_*` keys from browser storage unless an explicit "Remember this device" setting is active.

---

## 13. Proposed Phase 3 Implementation Order

To ensure architectural integrity and avoid regressions, Phase 3 should proceed in the following structured sequence:

```
+-------------------------------------------------------------------------------+
| Phase 3, Milestone 1: Technical Audit & Architectural Baseline [COMPLETED]    |
| - Read-only assessment, test audit, risk matrix, report generation            |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Phase 3, Milestone 2: Unified Identity & Data Layer Migration                 |
| - Unify patient UID fallback resolver across all modules                      |
| - Wire routineService, lovedOnesService, gamesService to Cloud Firestore      |
| - Enable Firestore persistent IndexedDb caching for seamless offline use      |
| - Fix dynamic relative dates in DailyRoutinesMilestone2.test.tsx               |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Phase 3, Milestone 3: Real-Time Patient Dashboard & Asha Ecosystem Bridge     |
| - Replace static dashboard state with live subscriptions to routines & games  |
| - Connect Asha AI intent engine to live patient progress & routine queries    |
| - Implement safe sign-out session purge for shared-device security            |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Phase 3, Milestone 4: Caregiver & Doctor Patient Synchronization              |
| - Implement Caregiver view to configure patient routines and loved ones cards |
| - Implement Doctor view to review cognitive game trends & recall attempts     |
| - Validate multi-role data access via Firestore security rules                |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Phase 3, Milestone 5: End-to-End System Verification & Release Candidate      |
| - Run complete test suite (Unit, Component, Security Simulator)               |
| - Full production build verification                                          |
| - Final documentation and handoff                                             |
+-------------------------------------------------------------------------------+
```

---

## 14. Files Likely to Require Changes in Future Milestones

| Target File | Expected Modifications | Planned Milestone |
| :--- | :--- | :---: |
| `frontend/src/utils/identity.ts` | New file: Centralized `getEffectivePatientId(user)` resolver | Milestone 2 |
| `frontend/src/test/DailyRoutinesMilestone2.test.tsx` | Replace hardcoded `'2026-11-04'` dates with dynamic `Date.now()` dates | Milestone 2 |
| `frontend/src/features/routines/services/routineService.ts` | Add Cloud Firestore reads/writes with local cache fallback | Milestone 2 |
| `frontend/src/features/lovedOnes/services/lovedOnesService.ts` | Add Cloud Firestore reads/writes with local cache fallback | Milestone 2 |
| `frontend/src/features/games/services/gamesService.ts` | Add Cloud Firestore reads/writes with local cache fallback | Milestone 2 |
| `frontend/src/pages/patient/DailyRoutines.tsx` | Use unified identity resolver; synchronize state | Milestone 2 |
| `frontend/src/pages/patient/LovedOnes.tsx` | Use unified identity resolver; synchronize state | Milestone 2 |
| `frontend/src/pages/patient/MindGames.tsx` | Use unified identity resolver; synchronize state | Milestone 2 |
| `frontend/src/pages/patient/PatientDashboard.tsx` | Wire dynamic care plan indicators to `routineService` & `gamesService` | Milestone 3 |
| `frontend/src/features/ai-companion/AICompanion.tsx` | Allow Asha to query live routine completion status | Milestone 3 |
| `frontend/src/features/auth/services/authService.ts` | Secure multi-key storage purge on sign-out | Milestone 3 |
| `frontend/src/pages/caregiver/CaregiverDashboard.tsx` | Real-time observation of assigned patient routines & games | Milestone 4 |
| `frontend/src/pages/doctor/DoctorDashboard.tsx` | Clinical review of cognitive recall and game performance metrics | Milestone 4 |

---

## 15. Risks and Dependencies

1. **Firestore Free Quota Management:**
   - *Risk:* Real-time listeners (`onSnapshot`) on dashboard widgets could consume the 50,000 daily read quota if listeners re-subscribe on every keystroke or rerender.
   - *Mitigation:* Debounce subscriptions, fetch once on mount, and rely heavily on Firestore's built-in IndexedDb offline cache.
2. **Offline Data Conflict Resolution:**
   - *Risk:* If a caregiver edits a routine online while a patient completes it offline on a tablet, data collision might occur.
   - *Mitigation:* Last-write-wins with field-level timestamps (`updatedAt`).
3. **Cognitive Load & UI Stability:**
   - *Risk:* Adding real-time data loading indicators or spinners could confuse or disorient neuro-care patients.
   - *Mitigation:* Use optimistic UI rendering with instant local updates and subtle, non-intrusive background sync indicators.
4. **Third-Party Dependency Minimization:**
   - *Risk:* Introducing external cloud SDKs or paid AI microservices would violate the project's zero-cost Firebase Spark constraint.
   - *Mitigation:* Retain all existing zero-dependency modules (browser Web Speech API, Web Audio API synthesizer, regex-based Asha intent engine).

---

## 16. Audit Conclusion & Next Steps

The Saksham Patient Experience architecture is exceptionally well-engineered from a human-computer interaction, accessibility, and domain-empathy standpoint. The codebase compiles cleanly with strict TypeScript checks, builds without bundling errors, and demonstrates a strong architectural separation of concerns.

The primary objective for Phase 3 is bridging the present client-only persistence layer (`localStorage`) with the pre-configured Cloud Firestore data models and security rules, ensuring patient progress and memory anchors survive cross-device sessions and empower caregiver/doctor collaboration.

**Action Required:**
This completes the Phase 3, Milestone 1 System Audit. Awaiting user review and authorization to proceed to **Phase 3, Milestone 2: Unified Identity & Data Layer Migration**.
