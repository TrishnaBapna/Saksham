# SAKSHAM (सक्षम) — PHASE 3, MILESTONE 2: UNIFIED DATA LAYER & FIRESTORE MIGRATION REPORT
**Document Reference:** `docs/phase-3/PHASE_3_MILESTONE_2_UNIFIED_DATA_LAYER_REPORT.md`  
**Execution Date:** November 6, 2026  
**Git Branch:** `phase-2-patient-experience`  
**Feature Commit Hash:** `c7f3bca`  
**Milestone Focus:** Unified Patient Identity, Cloud Firestore Dual-Store Architecture, Legacy Migration, Dashboard Dynamic Calculation, Safe Sign-out Purge, and Security Rules Hardening

---

## 1. Executive Summary

Phase 3, Milestone 2 successfully resolves all critical, high, and medium deficiencies identified during the Milestone 1 system audit (`AUD-CRIT-01`, `AUD-HIGH-01`, `AUD-HIGH-02`, `AUD-MED-01`, and `AUD-MED-02`). 

The patient experience ecosystem now possesses a unified, authoritative identity system grounded in Firebase Authentication UIDs, backed by a dual-store architecture (synchronous client-side caching + asynchronous Cloud Firestore persistence).

### Key Architectural Deliverables
1. **Unified Identity Resolution (`identityService.ts`):** Single authoritative patient UID resolver `getEffectivePatientId(user)`. Eliminates the divergent `'default-patient'` vs `'default_patient'` fallbacks and enforces strict guest mode isolation under `guest_patient_local`.
2. **Dual-Store Cloud Firestore Migration:** Fully connects `routineService.ts`, `lovedOnesService.ts`, and `gamesService.ts` to Cloud Firestore collections (`/routines`, `/lovedOnes`, `/gameSessions`, and `/routineAttempts`) with automatic offline caching and Firestore data sanitization.
3. **Safe Legacy Data Migration Engine (`migrationService.ts`):** Non-destructive, validated migration of legacy `localStorage` records into Cloud Firestore. Prevents overwriting newer cloud records and refuses to migrate unauthenticated guest data.
4. **Dynamic Patient Dashboard Reactivity (`PatientDashboard.tsx`):** Eliminated static mockups (`"1 of 3 daily care steps done"`, `"80%"`). Progress, streaks, and milestone indicators now dynamically compute from live service data with immediate cross-module reactivity.
5. **Time-Dependent Streak Calculation Fix:** Refactored mock history in `DailyRoutinesMilestone2.test.tsx` and default service history to use dynamic dates relative to `Date.now()`, eliminating calendar decay.
6. **Device Privacy & Logout Purge (`authService.ts`):** Enhanced `signOut()` to purge all cached sensitive patient PII from browser `localStorage` on logout, preventing cross-account exposure on shared family/clinic tablets.
7. **Security Rules Hardening (`backend/firestore.rules`):** Enforced ownership field immutability (`request.resource.data.patientId == resource.data.patientId`) on update operations for `/routines` and `/lovedOnes`, and created append-only rules for `/routineAttempts`.

---

## 2. Unified Identity Architecture

### 2.1 Identity Resolution Hierarchy
```
                              +---------------------------------------+
                              |         Incoming User Context         |
                              |         (AuthContext / auth)          |
                              +---------------------------------------+
                                                  |
                                                  v
                              +---------------------------------------+
                              |      getEffectivePatientId(user)      |
                              +---------------------------------------+
                                                  |
                        +-------------------------+-------------------------+
                        |                                                   |
                        v                                                   v
          [Valid Firebase Auth UID]                               [Unauthenticated / Null]
                        |                                                   |
                        v                                                   v
          Authoritative Patient UID                              Standardized Guest UID
          (e.g., "demo-patient-001")                             ("guest_patient_local")
                        |                                                   |
                        v                                                   v
          • Firestore Sync Enabled                                • Stored Locally Only
          • Cloud Storage Active                                  • No Firestore Network Calls
          • Cross-Device Sync Active                              • Strictly Isolated Cache
```

### 2.2 Guest Mode Isolation Policy
* Unauthenticated users or users previewing the interface operate with `GUEST_PATIENT_ID = 'guest_patient_local'`.
* `isGuestPatient(patientId)` acts as a circuit breaker in all data services:
  - Any operation targeting a guest ID bypasses Cloud Firestore SDK calls completely.
  - Guest data is preserved in browser `localStorage` under `saksham_*_guest_patient_local`.
  - Silent migration of guest data into authenticated accounts is strictly forbidden.

---

## 3. Firestore Collection & Document Schema

| Collection Path | Document Key Pattern | Primary Fields | Access Controls | Immutability |
| :--- | :--- | :--- | :--- | :--- |
| `/routines/{id}` | `{patientId}_{routineId}` | `id`, `patientId`, `title`, `description`, `scheduledTime`, `category`, `period`, `streakCount`, `isCompleted`, `enableAssistedRecall`, `recallCues`, `steps`, `updatedAt` | Patient Owner, Connected Caregiver, Assigned Doctor (Read) | `patientId` immutable on update |
| `/routineAttempts/{id}` | `att_{timestamp}_{rand}` | `id`, `routineId`, `patientId`, `date`, `attemptsUsed`, `skipped`, `isCompleted`, `completedAt`, `createdAt` | Patient Owner (Create/Read), Connected Caregiver (Read), Doctor (Read) | Append-only (`update`/`delete`: false) |
| `/lovedOnes/{id}` | `{patientId}_{id}` | `id`, `patientId`, `name`, `relationship`, `nickname`, `photoUrl`, `description`, `familiarPhrase`, `cues`, `importantMemories`, `voiceRecording`, `patientNotes` | Patient Owner, Connected Caregiver | `patientId` immutable on update |
| `/gameSessions/{id}` | `sess_{timestamp}_{rand}` | `id`, `patientId`, `gameId`, `gameTitle`, `category`, `difficulty`, `date`, `durationSeconds`, `completed`, `patientFeedback`, `completedAt` | Patient Owner, Connected Caregiver, Assigned Doctor (Read) | Append-only (`update`/`delete`: false) |

---

## 4. Migrated Services & Dual-Store Implementation

### 4.1 `RoutineService` (`frontend/src/features/routines/services/routineService.ts`)
* **Dual-Store Pattern:**
  - Reads from local storage cache for instant synchronous UI rendering (`getRoutines(patientId)`).
  - Background asynchronous synchronization with Firestore (`syncRoutinesFromFirestore(patientId)`).
  - First-time cloud seed: automatically initializes default care routines in Firestore if empty.
  - Updates: toggling routine completion immediately updates local cache and asynchronously writes to `/routines` and `/routineAttempts`.
  - Loop prevention: `saveRoutines` performs deep equality comparison before updating storage or notifying subscribers.

### 4.2 `LovedOnesService` (`frontend/src/features/lovedOnes/services/lovedOnesService.ts`)
* **Cloud Persistence:**
  - `syncLovedOnesFromFirestore(patientId)` retrieves family memory profiles from `/lovedOnes`.
  - `addLovedOne`, `updateLovedOne`, and `deleteLovedOne` execute immediate synchronous local updates and dispatch background Firestore transactions.
  - Utilizes `sanitizeForFirestore` to strip `undefined` properties (such as optional `nickname` or `patientNotes`), adhering to Firestore SDK specifications.

### 4.3 `GamesService` (`frontend/src/features/games/services/gamesService.ts`)
* **Append-Only History:**
  - `syncHistoryFromFirestore(patientId)` reads patient cognitive session history from `/gameSessions`.
  - `recordSession(patientId, session)` generates unique append-only session records in Firestore and updates local cache.
  - Non-clinical adaptive difficulty algorithms analyze feedback across recent sessions without generating clinical diagnoses.

---

## 5. Legacy LocalStorage Data Migration Strategy

Implemented via `MigrationService` (`frontend/src/features/auth/services/migrationService.ts`):
1. **Targeting:** Scans for legacy keys (`saksham_routines_${uid}`, `saksham_loved_ones_${uid}`, `saksham_game_sessions_${uid}`) matching the authenticated patient UID.
2. **Conflict Prevention:** For each local record, verifies whether the corresponding document already exists in Cloud Firestore using `getDoc()`. If it exists, the local record is skipped to prevent overwriting newer cloud modifications.
3. **Idempotency Guard:** On successful migration, writes `saksham_migrated_${uid} = 'true'`. Subsequent app initializations short-circuit immediately.
4. **Guest Protection:** Explicitly rejects migration requests for `guest_patient_local`.

---

## 6. Patient Dashboard Integration (Fix for AUD-HIGH-01)

`PatientDashboard.tsx` has been refactored to consume the unified service layer:
* **Progress Calculation:** Dynamically computes `total`, `completed`, `remaining`, and `percentage` via `RoutineService.calculateProgress(routines)`.
* **Dynamic Streak:** Consistently calculates the gentle streak from completion history using `RoutineService.calculateStreak(history)`.
* **Next Scheduled Routine:** Automatically focuses on the first uncompleted daily routine (or permits patient milestone selection across Morning, Midday, and Evening cards).
* **Cross-Module Reactivity:** Subscribes to `subscribeToDataChanges`. Completing a routine in `DailyRoutines.tsx` instantly updates progress bars and milestone indicators on `PatientDashboard.tsx`.

---

## 7. Device Privacy & Sign-Out Data Cleanup (Fix for AUD-MED-02)

To prevent cross-account information leakage on shared tablets (common in neuro-care and assisted living environments):
* `AuthService.signOut()` now purges:
  - `saksham_auth_user`
  - `saksham_routines_${uid}`
  - `saksham_routine_history_${uid}`
  - `saksham_loved_ones_${uid}`
  - `saksham_game_sessions_${uid}`
  - `saksham_game_difficulty_pref_${uid}`
* Calls `clearPatientCache(uid)` across `RoutineService`, `LovedOnesService`, and `GamesService`.
* Dispatches `notifyDataChange('all', uid)` to decouple any remaining active listeners.

---

## 8. Firestore Security Rules Enhancements

Updated `backend/firestore.rules`:
* **Ownership Immutability:** On `update` operations for `/routines/{routineId}` and `/lovedOnes/{lovedOneId}`, added rule:
  ```
  && request.resource.data.patientId == resource.data.patientId
  ```
  Prevents any malicious or erroneous client request from reassigning document ownership to another patient.
* **Routine Attempt History:** Added `/routineAttempts/{attemptId}` rule:
  - `create`: strictly authorized for patient owner (`request.resource.data.patientId == request.auth.uid`).
  - `read`: authorized for patient owner, active connected caregiver, and assigned doctor.
  - `update`, `delete`: explicitly denied (`allow update, delete: if false;`).

---

## 9. Firebase Spark Compliance Audit

| Resource | Quota / Limit | Saksham Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Cloud Firestore Reads** | 50,000 / day | Cached locally on mount; reads only on cloud sync or query | **100% Compliant** |
| **Cloud Firestore Writes** | 20,000 / day | Debounced dual-store writes; deduplicated with equality checks | **100% Compliant** |
| **Cloud Functions** | Requires Blaze (Paid) | 0 Cloud Functions deployed; all logic in frontend services | **100% Compliant** |
| **Firebase Storage** | 5 GB Free / 1 GB download/day | External avatar presets / SVG data URIs; 0 billable storage | **100% Compliant** |
| **External AI APIs** | Requires Billing | Client-side Regex Intent Engine + Web Speech API (Free) | **100% Compliant** |

---

## 10. Verification, Tests, and Build Results

### 10.1 Command Execution Summary

| Test Target | Execution Command | Result | Duration | Details |
| :--- | :--- | :---: | :---: | :--- |
| **TypeScript Strict Lint** | `npm run lint --prefix frontend` | **0 errors** | 1.84s | `tsc --noEmit` strictly clean across all source files |
| **Production Vite Build** | `npm run build --prefix frontend` | **Success** | 2.22s | Production bundle: `968.01 kB` JS, `61.83 kB` CSS |
| **Backend Security Tests** | `npm test --prefix backend` | **31 / 31 Passed** | 375ms | Vitest AST policy simulator (`securityRules.test.ts`) |
| **Frontend Test Suite** | `npm test --prefix frontend` | **87 / 87 Passed** | 3.97s | 13 test files passed; 0 failures; 0 flaky tests |
| **Milestone 2 Dedicated Tests** | `vitest run src/test/UnifiedDataLayerMilestone2.test.tsx` | **15 / 15 Passed** | 1.09s | Full identity, CRUD, migration, and logout tests |

### 10.2 Official Firebase Emulator Statement
* **Limitation Disclosure:** Official Firebase Emulator tests (`firebase emulators:start`) were not executed because local port binding and daemon backgrounding within the secure execution sandbox require elevated network privileges.
* **Fidelity Notice:** Backend security verification was conducted using Vitest AST policy simulations (`SecurityRulesPolicySimulator`), and frontend Firestore interactions were verified using the comprehensive in-memory collection store (`mockFirestoreStore`). These tests are not described as equivalent to official emulator validation, but thoroughly verify rule logic and SDK operation payloads.

---

## 11. Modified and Newly Created Files

### Created Files
- `frontend/src/features/auth/services/identityService.ts`
- `frontend/src/features/auth/services/migrationService.ts`
- `frontend/src/test/UnifiedDataLayerMilestone2.test.tsx`
- `docs/phase-3/PHASE_3_MILESTONE_2_UNIFIED_DATA_LAYER_REPORT.md`

### Modified Files
- `backend/firestore.rules`
- `backend/src/test/securityRules.test.ts`
- `frontend/src/features/auth/services/authService.ts`
- `frontend/src/features/routines/services/routineService.ts`
- `frontend/src/features/lovedOnes/services/lovedOnesService.ts`
- `frontend/src/features/games/services/gamesService.ts`
- `frontend/src/pages/patient/PatientDashboard.tsx`
- `frontend/src/pages/patient/DailyRoutines.tsx`
- `frontend/src/pages/patient/LovedOnes.tsx`
- `frontend/src/pages/patient/MindGames.tsx`
- `frontend/src/test/DailyRoutinesMilestone2.test.tsx`
- `frontend/src/test/setup.ts`

---

## 12. Git Commits
* **Feature Commit:** `c7f3bca` — `feat(phase-3): implement unified identity and cloud firestore migration (Milestone 2)`
* **Documentation Commit:** Pending creation for Milestone 2 completion report.
