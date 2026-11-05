# SAKSHAM (सक्षम) — PHASE 2, MILESTONE 2 DELIVERABLE REPORT
## Daily Routines & Care Module

**Document ID:** `DOC-P2-M2-ROUTINES-001`  
**Date:** November 5, 2026  
**Git Branch:** `phase-2-patient-experience`  
**Git Commit:** `f448824`  
**Author:** Lead Full-Stack Architect, Firebase Engineer & Accessibility Specialist  
**Status:** Completed & Ready for Review  

---

## 1. Executive Summary

Milestone 2 of Phase 2 has been implemented in its entirety. The **Daily Routines & Care** module is an empathetic, accessible neuro-care system designed specifically for individuals navigating cognitive differences, stroke recovery, early memory challenges, and neurodivergent routines.

The module provides a dual-view architecture:
1. **View A (3-Chance Assisted Recall):** A gentle, progressive cognitive reinforcement engine that lets patients initiate activities through tiered hints without pressure, shame, or diagnostic scoring.
2. **View B (Direct Schedule Checklist):** A streamlined, high-contrast daily schedule grouped into Morning, Afternoon, and Evening periods, supporting instant completion toggling, 5-minute / 15-minute snoozing, and step-by-step guidance.

All components adhere to the Free Firebase Spark plan (zero paid Cloud Functions, zero billing dependencies) and maintain strict UID-scoped data isolation in full compliance with Phase 1.5/1.6 Firestore security rules.

---

## 2. Deliverables & Artifacts

### 2.1 Files Created & Modified

| File Path | Purpose | Status |
| :--- | :--- | :--- |
| `frontend/src/types/index.ts` | Expanded `RoutineCategory`, `RoutineItem` (with `steps`, `recallQuestion`, `recallOptions`, `recallCues`, `timerMinutes`, `snoozedUntil`), and `RoutineAttemptRecord`. | Updated |
| `frontend/src/features/routines/services/routineService.ts` | Complete routine business logic, pre-seeded neuro-care activities, dynamic progress calculation, real streak calculation, snooze engine, and storage with in-memory fallback. | Created |
| `frontend/src/features/routines/components/AssistedRecallEngine.tsx` | Reusable 3-chance progressive hint recall component with text-to-speech, skip option, direct runner launcher, and celebratory feedback. | Created |
| `frontend/src/features/routines/components/RoutineChecklist.tsx` | Direct schedule to-do checklist grouped into Morning, Afternoon, and Evening periods with snooze (+5m / +15m) controls and guided runner integration. | Created |
| `frontend/src/features/routines/components/GuidedTaskRunner.tsx` | Step-by-step task navigation modal with optional countdown timer and 5-choice "Stuck? Need Help?" diagnostic checkpoint. | Created |
| `frontend/src/features/routines/components/AddRoutineModal.tsx` | Accessible modal form for adding routines with category selection, step builder, recall cues, and clinical regimen warning. | Created |
| `frontend/src/pages/patient/DailyRoutines.tsx` | Main page hosting dual-view tab switcher, dynamic completion progress bar, streak display, Asha encouragement, and state coordination. | Updated |
| `frontend/src/test/DailyRoutinesMilestone2.test.tsx` | Vitest & React Testing Library suite with 13 comprehensive integration and unit tests covering all Milestone 2 requirements. | Created |

---

## 3. Architecture & Functional Components

```
                                  +---------------------------------------+
                                  |            DailyRoutines.tsx          |
                                  |   (Shared Header, Tabs, Streaks)      |
                                  +-------------------+-------------------+
                                                      |
                          +---------------------------+---------------------------+
                          |                                                       |
                          v                                                       v
         +--------------------------------+                     +----------------------------------+
         |     RoutineChecklist.tsx       |                     |    AssistedRecallEngine.tsx      |
         |         (View B)               |                     |            (View A)              |
         |  - Morning / Afternoon / Eve   |                     |  - Progressive Hints 1, 2, 3     |
         |  - Direct One-Click Toggle     |                     |  - No-Shame Skip Button          |
         |  - Snooze (+5m / +15m)         |                     |  - Text-to-Speech Read Aloud     |
         |  - Open Task Runner            |                     |  - Positive Reinforcement        |
         +----------------+---------------+                     +-----------------+----------------+
                          |                                                       |
                          +---------------------------+---------------------------+
                                                      |
                                                      v
                                      +-------------------------------+
                                      |     GuidedTaskRunner.tsx      |
                                      |  - Step-by-Step Instructions  |
                                      |  - Optional Countdown Timer   |
                                      |  - "Stuck? Need Help?" Asha   |
                                      +-------------------------------+
```

### 3.1 Dual-View Design & Tab Switcher
- **Tab 1: Direct Schedule Checklist (To-Do List)**: Provides an organized list for patients who prefer clear structure and immediate task checking without cognitive prompts.
- **Tab 2: Step-by-Step Assisted Recall (3-Chance Engine)**: Guides patients through initiating their upcoming tasks with supportive recall cues.
- **Shared Header Elements**:
  - Live date display formatted in friendly English (e.g. `Thursday, November 5, 2026`).
  - Dynamic completion progress bar (`X of Y tasks completed • Z%`).
  - Consecutive day streak counter (`N Day Streak 🔥`).
  - Quick "+ Add Activity" button.
  - Asha companion speaking banner with dynamic encouraging quotes based on completion state.

### 3.2 3-Chance Assisted Recall Engine (`AssistedRecallEngine.tsx`)
1. **Attempt 1 (Open Prompt)**: Presents the routine's recall question with multiple-choice options.
2. **Attempt 2 (Gentle Hint 1)**: If the patient chooses an alternative option, Asha offers an environmental/contextual cue (e.g., *"A warm ceramic cup right after eating breakfast in the kitchen"*).
3. **Attempt 3 (Specific Hint 2)**: If still needed, Asha provides a concrete location/visual cue (e.g., *"Check the blue pill organizer beside the kettle on the counter"*).
4. **Final Supportive Prompt (Hint 3)**: Unveils the direct solution warmly (e.g., *"Take the morning blood pressure tablet with half a glass of warm water"*).
5. **No Shame / No Penalty**:
   - Skips are supported at any point via a prominent *"Skip this question"* button.
   - Skipped tasks trigger reassuring encouragement: *"No worries at all! Let's do it together."*
   - Incorrect responses are never framed as "Wrong" or penalized.
   - Recall performance is strictly non-diagnostic and never stored as a cognitive impairment score.

### 3.3 Direct Schedule Checklist (`RoutineChecklist.tsx`)
- Groups routines into **Morning (5 AM – 12 PM)**, **Afternoon (12 PM – 5 PM)**, and **Evening (5 PM – 10 PM)**.
- Each item card displays:
  - Scheduled time and period badge.
  - Activity title, description, and category badge with custom icons and color tokens.
  - Streak badge (`N-day streak`).
  - Snooze badge if snoozed (e.g., `Snoozed to 08:35 AM`).
  - Quick action controls:
    - Large toggle button (`Mark Complete` / `Completed ✓`).
    - Snooze dropdown menu with options: `+5 minutes` and `+15 minutes`.
    - `Read Aloud` audio button utilizing `SpeechService` (Web Speech API).
    - `Open Step-by-Step Guide` button launching `GuidedTaskRunner`.

### 3.4 Guided Task Runner & "Stuck? Need Help?" Checkpoint (`GuidedTaskRunner.tsx`)
- Presents one task instruction step at a time with a prominent progress indicator (`Step X of Y`).
- **Countdown Timer**:
  - Optional timer based on `timerMinutes`.
  - Pause and Resume controls.
  - Expiration does **not** fail the task; it gently plays an audio chime and displays: *"Time's up! Take your time to finish when you are ready."*
- **Diagnostic "Stuck? Need Help?" Checkpoint**:
  - Patients can click the *"Stuck? Need help?"* button at any time.
  - Offers 5 simple status selections:
    1. *"I just started and feel a bit lost"* -> Asha: *"Take a slow breath. We are doing this together. Start with step 1!"*
    2. *"I finished the first step, what next?"* -> Asha: *"Wonderful progress! Look at step 2 right above."*
    3. *"I got distracted or forgot what I was doing"* -> Asha: *"That happens to everyone! Re-read the current step slowly."*
    4. *"I feel overwhelmed or tired"* -> Asha: *"It is okay to pause and take a rest. Your well-being comes first."*
    5. *"I need a caregiver to help me with this"* -> Asha: *"Reach out to your caregiver. There is no rush at all."*

### 3.5 Add Activity Modal & Clinical Regimen Guard (`AddRoutineModal.tsx`)
- Enables patients to add personalized daily routines:
  - Title and Description.
  - Scheduled time picker.
  - Category selector (`Medication`, `Food & Meals`, `Hydration`, `Exercise`, `Speech Practice`, `Wellness`, `Cognitive`, `Personal Care`, `Custom`).
  - Dynamic step list (add/remove step items).
  - Optional timer duration in minutes.
  - Optional 3-chance assisted recall cues (`hint1`, `hint2`, `hint3`).
- **Clinical Regimen Warning**:
  - When the patient selects the `Medication` category, a high-visibility amber safety notice is displayed:
    > *"⚠️ Clinical Medication Notice: Please ensure any scheduled medication matches the official prescription provided by your registered doctor. Always verify dosage with your doctor or caregiver before making changes."*
  - This safeguards patients against accidental deviations from medical directives.

### 3.6 Dynamic Progress & Streak Engine (`routineService.ts`)
- **No Hardcoding**: Completion percentages are dynamically computed from active routines:
  $$\text{Percentage} = \text{round}\left(\frac{\text{Completed Tasks}}{\text{Total Tasks}} \times 100\right)$$
- **Real Consecutive Streaks**:
  - Calculated from actual `RoutineAttemptRecord[]` items stored per patient UID.
  - Traverses consecutive calendar dates (ISO format `YYYY-MM-DD`).
  - Accurately tracks active streaks, carrying over from yesterday even if today's tasks are still in progress.

---

## 4. Data Scoping & Persistence Model

### 4.1 UID-Scoped Storage Isolation
Routines and completion records are partitioned strictly by `patientId` (the authenticated user's Firebase UID):
- Routines Key: `saksham_routines_${patientId}`
- History Key: `saksham_routine_history_${patientId}`
- Multi-user isolation is verified in unit tests (`Test 7: UID Data Scoping & Persistence Isolation`), ensuring Patient A cannot see or mutate Patient B's routines.

### 4.2 Firestore Data Schema Alignment
The data model directly matches the production Firestore schema defined in `docs/DATABASE_SCHEMA.md`:
```typescript
interface RoutineItem {
  id: string;
  title: string;
  description: string;
  scheduledTime: string;
  category: RoutineCategory;
  period: 'morning' | 'afternoon' | 'evening';
  streakCount: number;
  isCompleted: boolean;
  completedAt?: string;
  snoozedUntil?: string;
  enableAssistedRecall?: boolean;
  timerMinutes?: number;
  recallQuestion?: string;
  recallOptions?: string[];
  correctOptionIndex?: number;
  recallCues?: {
    hint1: string;
    hint2: string;
    hint3: string;
  };
  steps?: string[];
}
```

---

## 5. Visual Wireframes

### 5.1 Dual-View Tab Switcher & Checklist (View B)
```
+-----------------------------------------------------------------------------------+
|  Today's Schedule & Care                                 [ + Add New Activity ]   |
|  Thursday, November 5, 2026                                                       |
|                                                                                   |
|  [ Asha ]: "Good afternoon! You are doing wonderfully today. Take your time."    |
|                                                                                   |
|  Daily Completion: [====================            ] 50%  (2 of 4 done)          |
|  Current Streak: 🔥 6 Days Active                                                 |
|                                                                                   |
|  [ View: Direct Schedule Checklist (Active) ] [ View: 3-Chance Assisted Recall ]  |
+-----------------------------------------------------------------------------------+
|  MORNING ROUTINES                                                                 |
|  +-----------------------------------------------------------------------------+  |
|  | [✓] 08:30 AM  •  Medication                                [ Streak: 6d 🔥 ] |  |
|  |     Morning Blood Pressure Medication & Warm Tea                            |  |
|  |     Take your prescribed tablet with warm herbal tea after breakfast.       |  |
|  |     [ Completed ✓ ]  [ Snooze v ]  [ 🔊 Read Aloud ]  [ 📋 Step Guide ]     |  |
|  +-----------------------------------------------------------------------------+  |
|  | [ ] 11:00 AM  •  Exercise                                  [ Streak: 4d 🔥 ] |  |
|  |     Morning Hydration & Gentle Arm Stretches                                |  |
|  |     [ Mark Complete ]  [ Snooze v ]  [ 🔊 Read Aloud ]  [ 📋 Step Guide ]    |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  AFTERNOON ROUTINES                                                               |
|  +-----------------------------------------------------------------------------+  |
|  | [ ] 02:30 PM  •  Cognitive                                 [ Streak: 3d 🔥 ] |  |
|  |     Afternoon Photo Album Walk with Ananya                                  |  |
|  |     [ Mark Complete ]  [ Snooze v ]  [ 🔊 Read Aloud ]  [ 📋 Step Guide ]    |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 5.2 3-Chance Assisted Recall View (View A)
```
+-----------------------------------------------------------------------------------+
|  [ View: Direct Schedule Checklist ] [ View: 3-Chance Assisted Recall (Active) ]  |
+-----------------------------------------------------------------------------------+
|  Step-by-Step Assisted Recall                      Card 1 of 3                    |
|  Upcoming: Afternoon Photo Album Walk with Ananya (02:30 PM)                      |
|                                                                                   |
|  QUESTION:                                                                        |
|  "What comforting afternoon activity connects you with smiling family faces?"     |
|                                                                                   |
|  [ Asha Hint (Attempt 2/3) ]:                                                     |
|  "Looking at pictures of smiling faces from your family album."                   |
|                                                                                   |
|  [ Option A ]: Looking at family memories in the Loved Ones album                 |
|  [ Option B ]: Organizing winter clothes in the attic                             |
|  [ Option C ]: Writing an email to the bank manager                               |
|                                                                                   |
|  [ 🔊 Read Question Aloud ]   [ Skip this question -> ]  [ 📋 Step Guide ]       |
+-----------------------------------------------------------------------------------+
```

### 5.3 Guided Task Runner Modal with "Stuck?" Checkpoint
```
+-----------------------------------------------------------------------------------+
|  Guided Activity: Morning Hydration & Gentle Arm Stretches                    [X] |
+-----------------------------------------------------------------------------------+
|  Step 2 of 4                                                                      |
|  [====================================                                          ] |
|                                                                                   |
|  "Stand or sit tall with your feet flat on the floor."                            |
|                                                                                   |
|  Timer: 04:32 remaining   [ Pause ] [ Reset ]                                     |
|                                                                                   |
|  [ Previous Step ]                                        [ Next Step -> ]        |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  [ 💡 Stuck? Need Help? ]                                                         |
|     * I just started and feel a bit lost                                          |
|     * I finished the first step, what next?                                       |
|     * I got distracted or forgot what I was doing                                 |
|     * I feel overwhelmed or tired                                                 |
|     * I need a caregiver to help me with this                                     |
|                                                                                   |
|     Asha: "Wonderful progress! Look at step 2 right above."                       |
|  -------------------------------------------------------------------------------  |
|                                                                                   |
|                                                 [ Finish Activity & Mark Done ✓ ] |
+-----------------------------------------------------------------------------------+
```

---

## 6. Verification & Test Results

### 6.1 Milestone 2 Test Suite (`DailyRoutinesMilestone2.test.tsx`)
All 13 comprehensive tests passed:
- `✓ renders both Direct Schedule Checklist and 3-Chance Assisted Recall view tabs`
- `✓ switches seamlessly between Checklist view and Assisted Recall view`
- `✓ calculates completion progress dynamically without hardcoding`
- `✓ calculates streaks from actual consecutive daily completion history`
- `✓ presents progressive hints across attempts 1, 2, and 3 without shaming`
- `✓ handles correct answer selection with positive celebration`
- `✓ allows patient to skip questions at any point without penalty`
- `✓ allows marking activities complete directly without requiring assisted recall`
- `✓ snoozes an activity by 5 and 15 minutes, updating the schedule time`
- `✓ navigates through step-by-step instructions and finishes activity`
- `✓ provides reassuring guidance when patient clicks "Stuck?" checkpoint`
- `✓ opens add activity modal and displays clinical medication warning when medication is chosen`
- `✓ scopes routines strictly to patient UID in storage`

### 6.2 Full Project Regression Test Run
| Test Suite | Total Tests | Passed | Failed | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Frontend (`vitest run`) | 44 | 44 | 0 | 2.79s | **PASSED** |
| Backend (`vitest run`) | 19 | 19 | 0 | 0.38s | **PASSED** |
| TypeScript Linting (`tsc --noEmit`) | - | 0 errors | 0 | 2.10s | **PASSED** |
| Vite Production Build (`vite build`) | - | Built clean | 0 | 2.06s | **PASSED** |

---

## 7. Known Limitations & Caregiver Permissions Boundary

1. **Caregiver Editing Scope**:
   - Currently, patients can create and toggle their daily routines.
   - In accordance with `docs/ROLE_PERMISSIONS.md`, future clinical medication schedule updates should ideally be verified or authorized by the assigned caregiver or doctor.
   - For Milestone 2, self-added medication routines display the prominent clinical warning banner to prevent unverified medication modifications.
2. **Audio Speech Synthesis**:
   - Web Speech API (`window.speechSynthesis`) is supported across modern browsers (Chrome, Safari, Firefox, Edge). If the browser environment disables TTS, `SpeechService` fails gracefully without disrupting UI interactions.

---

## 8. Spark Plan & Security Verification

- **Zero Paid APIs**: No billing-dependent services, Stripe, or paid AI APIs were introduced.
- **Zero Cloud Functions**: Client-side logic remains 100% self-contained in standard React TypeScript.
- **Security Rules Intact**: Firestore rules (`backend/firestore.rules`) continue to enforce that patients can only access documents where `request.auth.uid == resource.data.patientId`.

---

## 9. Next Steps

With **Phase 2, Milestone 2** successfully delivered and verified:
- Current branch: `phase-2-patient-experience`
- Current commit: `f448824`
- Awaiting user review and authorization to proceed to **Phase 2, Milestone 3: Loved Ones (Family & Identity Anchor)**.
