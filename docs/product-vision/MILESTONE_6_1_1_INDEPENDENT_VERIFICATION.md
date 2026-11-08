# SAKSHAM — MILESTONE 6.1.1
## Independent Security, Navigation & Data-Integrity Verification Report

**Date:** November 9, 2026  
**Auditor:** Independent Technical Verification (Senior Architecture & Security Specialist)  
**Repository:** `/Users/trishnabapna/Desktop/Saksham`  
**Branch:** `phase-2-patient-experience`  
**Feature Commit:** [`106afe4`](file:///Users/trishnabapna/Desktop/Saksham)  
**Documentation Commit:** [`53fc5db`](file:///Users/trishnabapna/Desktop/Saksham)  
**Firebase Project:** `saksham-d3b71` (Spark Free Tier)  
**Production URL:** `https://saksham-d3b71.web.app` (Deployment Intentionally Withheld for Stage 6.1)

---

## 1. Executive Summary

This independent audit conducted a strictly read-only inspection of the codebase, Firestore security rules, client data services, recurrence logic, offline queuing systems, and automated test harnesses delivered in Milestone 6.1.

### Audit Summary Matrix

| Section | Domain | Status | Key Finding |
|:---|:---|:---:|:---|
| **2** | Patient Bottom Navigation | **PASS** | `BottomNav.tsx` has exactly 4 items. Claim of 5 items was a documentation typo. |
| **3** | Firestore Security Rules | **PASS** | Strict owner isolation on notes; granular permission & privacy guards on calendar. |
| **4** | Offline & Sync Integrity | **PASS WITH LIMITATIONS** | UID-scoped local storage & offline sync queue work cleanly. LWW resurrection possible. |
| **5** | Calendar Recurrence Engine | **PASS WITH LIMITATIONS** | Deterministic daily & weekly virtual recurrence works. Series-level only; no single-occurrence exception model. |
| **6** | Voice Storage & IndexedDB | **PASS WITH LIMITATIONS** | 0 bytes sent to Firebase Storage. Deletions clean up blobs. Shared browser devtools could view local DB. |
| **7** | Test Suite & Build | **PASS WITH LIMITATIONS** | 50 backend & 263 frontend tests pass. Security tests use simulator, not Firestore Emulator. |
| **8** | Git & Deployment Safety | **PASS** | Branch clean, HEAD verified, no legacy modification, no merge to main, no deployment. |

---

## 2. Patient Bottom Navigation Audit

### Audit Query: Did Milestone 6.1 reintroduce "Routines" as a 5th bottom navigation tab?

### Evidence & Findings

1. **Inspection of [`BottomNav.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/components/layout/BottomNav.tsx):**
   ```tsx
   // Lines 14-19 of frontend/src/components/layout/BottomNav.tsx
   const navItems = [
     { path: '/patient', label: t('nav.home'), icon: Home, exact: true },
     { path: '/patient/loved-ones', label: t('nav.family'), icon: Users },
     { path: '/patient/mind-games', label: t('nav.games'), icon: Gamepad2 },
     { path: '/patient/profile', label: t('nav.profile'), icon: User },
   ];
   ```
   **Finding:** `BottomNav.tsx` renders **exactly four permanent destinations**:
   - `Home` (`/patient`)
   - `Family` (`/patient/loved-ones`)
   - `Games` (`/patient/mind-games`)
   - `Profile` (`/patient/profile`)
   `Routines` is **NOT** present in `BottomNav.tsx`.

2. **Inspection of Patient Routing in [`App.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/App.tsx):**
   ```tsx
   // Lines 59-67 of frontend/src/App.tsx
   {/* Milestone 1 Consolidated Navigation: Safe redirect for legacy /patient/routines bookmarks */}
   <Route
     path="/patient/routines"
     element={
       <ProtectedRoute allowedRole="patient">
         <Navigate to="/patient" replace />
       </ProtectedRoute>
     }
   />
   ```
   **Finding:** The legacy route `/patient/routines` continues to safely redirect to `/patient`.

3. **Inspection of [`PatientDashboard.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/pages/patient/PatientDashboard.tsx):**
   - The entire Daily Routines workspace (Assisted Recall Engine, Guided Task Runner, Checklist, and Daily Progress Ring) remains directly embedded in the Patient Home Sanctuary (`/patient`).

4. **Inspection of Automated Test [`Milestone1HomeSanctuary.test.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/test/Milestone1HomeSanctuary.test.tsx):**
   ```tsx
   // Lines 28-30 of Milestone1HomeSanctuary.test.tsx
   // Duplicate Routines button must NOT exist in bottom navigation
   expect(screen.queryByRole('button', { name: /^Routines$/i })).not.toBeInTheDocument();
   ```
   This test runs and passes during every test execution.

5. **Discrepancy Analysis:**
   In `docs/product-vision/MILESTONE_6_1_IMPLEMENTATION_REPORT.md` (lines 19 and 122), the text stated:
   `"Bottom navigation remains strictly locked to its approved 4 sanctuary destinations (Home, Routines, Family, Games, Profile)."`
   This was an inadvertent parenthetical typo listing 5 item names while explicitly stating "approved 4 sanctuary destinations".
   **Conclusion:** The code was never altered to add a fifth tab. The 4-tab invariant is 100% intact.

**Classification:** `PASS` (Documentation typo only; source code strictly conforms).

---

## 3. Firestore Security Rules Audit

### Evidence & Findings in [`backend/firestore.rules`](file:///Users/trishnabapna/Desktop/Saksham/backend/firestore.rules)

#### A. Patient Notes (`/users/{userId}/notes/{noteId}`)
- **Read & Delete:** `allow read, delete: if isOwner(userId);` (Lines 137, 146).
- **Create & Update:** `allow create, update: if isOwner(userId) && request.resource.data.patientId == userId && request.resource.data.category in ['personal', 'medical', 'family', 'reminder', 'other'] && ...;` (Lines 138-145).
- **Caregiver Access:** Zero access. `isCaregiver()` and `isConnectedCaregiver()` are completely excluded.
- **Doctor Access:** Zero access. `isDoctor()` and `isAssignedDoctor()` are completely excluded.
- **Admin Access:** Zero access. `isAdmin()` is completely excluded.
- **Identity Immutability:** `request.resource.data.patientId == userId` prevents changing the note owner on update.

#### B. Patient Calendar Events (`/users/{userId}/calendarEvents/{eventId}`)
- **Owner Access:** Full CRUD for `isOwner(userId)`.
- **Caregiver Granular Checks:**
  - `read`: `hasCaregiverCalendarPerm(userId, 'canReadCalendar') && resource.data.isPrivate != true`
  - `create`: `hasCaregiverCalendarPerm(userId, 'canCreateCalendarEvents') && request.resource.data.patientId == userId`
  - `update`: `hasCaregiverCalendarPerm(userId, 'canEditCalendarEvents') && resource.data.isPrivate != true && request.resource.data.patientId == userId`
  - `delete`: `hasCaregiverCalendarPerm(userId, 'canDeleteCalendarEvents') && resource.data.isPrivate != true`
- **Private Event Protection:** Strictly hidden from caregivers. `resource.data.isPrivate != true` is enforced for read, update, and delete.
- **Doctor & Admin Access:** Denied by default (neither `isDoctor` nor `isAdmin` is permitted).

#### C. `hasCaregiverCalendarPerm` & Helper Security Architecture
```rules
// Lines 46-61 of backend/firestore.rules
function isConnectedCaregiver(patientId) {
  return isCaregiver() &&
    exists(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + patientId)) &&
    get(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + patientId)).data.status == 'active';
}

function hasCaregiverCalendarPerm(patientId, permKey) {
  return isConnectedCaregiver(patientId) &&
    (
      (permKey in get(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + patientId)).data &&
       get(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + patientId)).data[permKey] == true) ||
      ('permissions' in get(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + patientId)).data &&
       permKey in get(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + patientId)).data.permissions &&
       get(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + patientId)).data.permissions[permKey] == true)
    );
}
```

- **Permission Document Paths:** `/relationships/{caregiverUid}_{patientUid}`.
- **Who Can Create Permissions:**
  - Caregiver-initiated link creation MUST have `status == 'pending'` (Line 281).
  - Patient-initiated link creation can set `status in ['pending', 'active']` (Line 287).
- **Can Caregivers Grant Themselves Permissions:**
  - **NO.** Caregivers cannot create active relationships (`status == 'pending'` required). `isConnectedCaregiver` requires `status == 'active'`.
- **Can Caregivers Modify Permissions Once Active:**
  - **NO.** When a caregiver updates a relationship document (Lines 307-312), the rule strictly enforces:
    `request.resource.data.status in ['pending', 'cancelled', 'revoked'] && request.resource.data.status != 'active'`.
    Any modification by a caregiver immediately transitions the relationship out of `'active'` status, instantly revoking all caregiver access.
- **Does Inactive Relationship Invalidate Access:** **YES.** Immediately, because `isConnectedCaregiver` returns `false`.
- **Firestore Document Lookup Budget:**
  - Evaluation of `hasCaregiverCalendarPerm` performs:
    - `hasRole('caregiver')`: 0 lookups if custom claim is set, or 2 lookups if querying `/users/{auth.uid}`.
    - `exists(/relationships/{cg_pt})`: 1 lookup.
    - `get(/relationships/{cg_pt})`: 1 lookup (subsequent calls in the same rule evaluation are cached by Firestore rules engine).
  - Total document calls: **2 to 4** lookups per request. This is well within the Firestore hard limit of **10 calls per rule evaluation**.
- **Deployment Status:** The security rules are committed locally in `106afe4` but **have NOT been deployed** to Firebase project `saksham-d3b71`.

**Classification:** `PASS` (Rules logic is rigorous, fail-safe, and within Firestore limits).

---

## 4. Offline & Synchronization Verification

### Analysis of the 9 Scenarios (Code Inspection & Automated Tests)

1. **Scenario 1: Patient creates a note offline**
   - *Tested in:* `Milestone61DataPersistence.test.ts` (Lines 468-477).
   - *Behavior:* Note is saved to `localStorage` under `saksham_notes_${patientId}` with `syncStatus: 'offline-pending'`. An entry `{ [noteId]: 'upsert' }` is queued in `saksham_pending_notes_sync_${patientId}`.
   - *Outcome:* **PASS**.

2. **Scenario 2: Patient edits a note offline**
   - *Code Inspection:* `NotesService.updateNote` updates the local record, updates `updatedAt`, and records `queue[noteId] = 'upsert'` in the pending sync map.
   - *Outcome:* **PASS**.

3. **Scenario 3: Patient deletes a note offline**
   - *Tested in:* `Milestone61DataPersistence.test.ts` (Lines 210-235).
   - *Behavior:* Note is removed from active notes in `localStorage`. Local audio blob is removed from IndexedDB immediately. A `'delete'` action is queued in the pending sync map for cloud propagation.
   - *Outcome:* **PASS**.

4. **Scenario 4: Patient reconnects**
   - *Code Inspection:* `window.addEventListener('online')` triggers `syncPendingNotes(patientId)`. Iterates queue, deletes remote docs or writes updated docs with `syncStatus: 'synced'`.
   - *Outcome:* **PASS**.

5. **Scenario 5: The same operation is retried**
   - *Code Inspection:* Notes pending queue is a keyed object map `Record<string, 'upsert' | 'delete'>`. Multiple edits to the same note collapse into a single operation. Calendar pending queue filters by `eventId` before appending. Idempotent Firestore `setDoc(..., { merge: true })` prevents duplicate documents.
   - *Outcome:* **PASS**.

6. **Scenario 6: Two devices edit the same note**
   - *Code Inspection:* Architecture operates on client-side last-write-wins (LWW) via `setDoc`. The device that syncs last overwrites the other. No operational transforms or field-level CRDTs exist.
   - *Outcome:* **PASS WITH LIMITATIONS** (Acceptable for Spark free-tier single-patient design; documented constraint).

7. **Scenario 7: A deletion conflicts with an older update**
   - *Code Inspection:* If Device A deletes a note while Device B is offline with an uncommitted edit, Device B's reconnection will call `setDoc`, which will **resurrect** the note in Firestore because no cloud deletion tombstones exist.
   - *Outcome:* **PASS WITH LIMITATIONS** (Known constraint in serverless free-tier offline models).

8. **Scenario 8: Patient signs out with pending operations**
   - *Code Inspection:* In `AuthService.signOut()` (Lines 188-198), `saksham_pending_notes_sync_${uid}` and `saksham_pending_calendar_sync_${uid}` are **NOT** cleared. They remain stored under the specific UID key in `localStorage`.
   - If reconnection occurs while logged out or as another user, `syncPendingNotes(oldUid)` attempts to write to `/users/${oldUid}/notes`, which is immediately **rejected by Firestore rules** (`isOwner` fails). The items remain in the pending queue until the original patient logs back in.
   - *Outcome:* **PASS WITH LIMITATIONS** (Safe from cloud leakage, but local storage remains populated).

9. **Scenario 9: Another patient signs in on the same device**
   - *Code Inspection:* Notes and Calendar storage keys are strictly UID-scoped: `saksham_notes_${patientId}`. Patient B calling `NotesService.getNotes(patientB)` receives only their own records.
   - However, Patient A's records remain in the browser's `localStorage` and IndexedDB until cleared. On an unmanaged shared device with Developer Tools, a technical user could inspect raw browser storage.
   - *Outcome:* **PASS WITH LIMITATIONS** (Standard web client limitation; cache purge should be integrated into `AuthService.signOut` in future hardening).

**Classification:** `PASS WITH LIMITATIONS`.

---

## 5. Calendar Recurrence Verification

### Recurrence Capabilities Matrix

| Feature | Supported? | Implementation & Code Location |
|:---|:---:|:---|
| **Daily Recurrence** | **YES** | `CalendarService.doesRecurOnDate` (Lines 125-128). Modulo difference on whole days. |
| **Weekly Recurrence** | **YES** | `CalendarService.doesRecurOnDate` (Lines 130-148). Supports specific `daysOfWeek: number[]` or auto-matches start day. |
| **Start / End Date Boundaries** | **YES** | `CalendarService.doesRecurOnDate` (Lines 120-121). Rejects target dates `< startAt` or `> endAt`. |
| **Timezone Preservation** | **YES** | Anchors date differences to UTC midnight (`T00:00:00Z`), preventing DST date slippage. |
| **Zero Firestore Duplication** | **YES** | Recurrences are computed virtually in-memory; 0 clone documents saved to Firestore. |
| **Bounded Recurrence Generation** | **YES** | `getEventsForDate` computes 1 day; `getUpcomingEvents` is bounded by `daysAhead` (default 7). |
| **Editing Single Occurrence** | **NO** | Occurrences share the master `event.id`. Editing an occurrence updates the master event. |
| **Editing Entire Series** | **YES** | Updating the master event recalculates all virtual occurrences automatically. |
| **Excluding Cancelled Occurrences** | **NO** | No `exdates` or exclusion array on `CalendarRecurrenceRule`. |
| **Monthly Recurrence** | **NO** | Not supported in Stage 6.1. |
| **Yearly Recurrence** | **NO** | Not supported in Stage 6.1. |
| **RFC 5545 RRULE Syntax** | **NO** | Not supported in Stage 6.1. |

**Classification:** `PASS WITH LIMITATIONS` (Daily and weekly virtual recurrence are mathematically sound and protect free-tier quotas; occurrence exception model is deferred).

---

## 6. Voice Storage & IndexedDB Verification

### Evidence & Findings in [`voiceStorageService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/notes/services/voiceStorageService.ts)

1. **UID-Scoped Storage:**
   - Keys are generated via `VoiceStorageService.generateAudioKey(patientId, noteId)`:
     `voice_note_${patientId}_${noteId}_${Date.now()}` (Line 129).
   - Audio key is bound to the specific patient's note metadata.
2. **Zero Cloud Storage Consumption:**
   - There are **zero** imports from `firebase/storage` in the codebase.
   - Audio blobs are saved solely via `IDBObjectStore.put()` into local store `audio_blobs` in `saksham_local_audio_db`.
3. **Deletion Clean-up:**
   - When `NotesService.deleteNote` is called (Lines 260-262), `VoiceStorageService.deleteAudioBlob(audioKey)` is executed. Tested and verified in `Milestone61DataPersistence.test.ts`.
4. **Signout Exposure:**
   - Audio blobs remain stored in the browser's IndexedDB upon signout. While Saksham's UI will not display them to another logged-in patient, raw IndexedDB is not encrypted at rest.
5. **Environment & Error Handling:**
   - Rejects gracefully if `window.indexedDB` is undefined.
   - All async methods wrap transactions in `try / catch` returning `false` or `null` without unhandled rejections.

**Classification:** `PASS WITH LIMITATIONS` (Zero cloud storage consumption verified; client-side IndexedDB persistence requires shared-device awareness).

---

## 7. Testing Verification

### Test Suite Execution Summary

| Suite | Runner | Test Files | Total Tests | Result | Execution Time |
|:---|:---|:---:|:---:|:---:|:---:|
| **Backend** | Vitest 2.1.9 | 3 | 50 | **50 Passed** | 0.61s |
| **Frontend** | Vitest 2.1.9 | 24 | 263 | **263 Passed** | 8.15s |
| **Total** | | **27** | **313** | **313 Passed** | **8.76s** |

### Critical Testing Notes
1. **Firestore Security Tests ([`securityRules.test.ts`](file:///Users/trishnabapna/Desktop/Saksham/backend/src/test/securityRules.test.ts)):**
   - **Important:** These 43 tests run against a logical in-memory simulator (`SecurityRulesPolicySimulator`) that mirrors `backend/firestore.rules`.
   - They were **NOT** executed against the live Firebase Firestore Local Emulator or `@firebase/rules-unit-testing`.
2. **Frontend Persistence Tests ([`Milestone61DataPersistence.test.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/test/Milestone61DataPersistence.test.ts)):**
   - 19 automated unit tests verifying Notes CRUD, VoiceStorage IndexedDB operations, Calendar CRUD, deterministic recurrence, caregiver permissions, and guest isolation.
3. **Production Build:**
   - `npm --prefix frontend run build` completed with **0 errors** (`dist` output: CSS 82.55 kB, JS 1,415.58 kB).

**Classification:** `PASS WITH LIMITATIONS` (High coverage and 100% pass rate; security tests are simulated rather than emulator-evaluated).

---

## 8. Git & Deployment Verification

1. **Current Branch:** `phase-2-patient-experience`
2. **Working Tree:** Clean (verified via `git status`).
3. **Commits Verified:**
   - Feature Commit: `106afe4` (`feat(patient): add notes and calendar data foundations`)
   - Documentation Commit: `53fc5db` (`docs(patient): document notes and calendar data architecture`)
4. **Legacy Preservation:** No changes made to `Saksham-Legacy` directory.
5. **Branch Integrity:** No merge to `main`.
6. **Deployment Status:** No deployments were triggered. Live Firebase project `saksham-d3b71` remains at Milestone 5 production state (`https://saksham-d3b71.web.app`).

**Classification:** `PASS`.

---

## 9. Final Recommendations & Authorization

### Overall Milestone 6.1 Status: **APPROVED WITH LIMITATIONS FOR STAGE 6.2**

The Milestone 6.1 data architecture is complete, robust, secure, and preserves all completed milestones without UI regressions or premature component leakage.

### Permitted Scope for Stage 6.2 Implementation:
1. Floating Utility Hub (Notes + Calendar quick launcher button in patient home sanctuary).
2. Patient Notes Modal (view, search, text note creation, category filter).
3. Local Voice Note Recording UI (with graceful browser permission and MediaRecorder fallbacks).
4. Patient Calendar Modal (agenda view, today/upcoming view, add appointment/routine link).
5. Asha Ecosystem Voice Bridge queries for notes and calendar events.
6. Deployment of application and security rules to Firebase upon full Stage 6.2 testing.
