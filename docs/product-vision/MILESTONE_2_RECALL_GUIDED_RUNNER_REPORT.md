# Saksham (सक्षम) — Milestone 2 Implementation & Verification Report
## Precision 3-Chance State Machine & Guided Task Runner

**Date:** November 8, 2026  
**Branch:** `phase-2-patient-experience`  
**Feature Commit:** `db7a6e7`  
**Live URL:** [https://saksham-d3b71.web.app](https://saksham-d3b71.web.app)  
**Automated Tests:** 207/207 Passed (173 Frontend, 34 Backend)

---

## 1. Executive Summary

Milestone 2 delivers a precision three-attempt cognitive Assisted Memory Recall experience connected seamlessly to a patient-centered Guided Task Runner for Saksham (सक्षम). This implementation directly reflects the approved product vision and the reference visual structures from Saksham Legacy:

1. **Exact 3-Heart Progression & Launch-Lock** (`AssistedRecallEngine.tsx`):
   - Initial State: `❤️❤️❤️ (3 Left)`
   - 1st Incorrect Attempt: `❤️❤️🤍 (2 Left)` + gentle bell chime + clue 1.
   - 2nd Incorrect Attempt: `❤️🤍🤍 (1 Left)` + detailed hint automatically displayed.
   - 3rd Incorrect Attempt: `🤍🤍🤍 (Guided)` + solution revealed with warmth + **automatically launches the Guided Task Runner with a 15-minute countdown** (patient does not need to click another button).
   - Launch-lock ensures auto-launch triggers exactly once without infinite loops or double triggers.
   - Correct Guess celebrates memory recall (+25 XP) without prematurely completing the physical routine, offering a `▶ Start Guided Task (15m)` button.
2. **Multi-View Session Persistence** (`PatientDashboard.tsx`):
   - Heart and attempt states are preserved per task ID across the two routine subtabs (`💡 1. Memory Cues for Every Task (3 Chances + Hint)` and `📋 2. Direct Schedule Checklist`).
3. **15-Minute Activity Timer & Step Runner** (`GuidedTaskRunner.tsx`):
   - Strictly begins at 15 minutes (900 seconds) — not 50 minutes.
   - Delta-based interval ensures background tab switching does not freeze or lose time.
   - Gentle 2-minute remaining reminder and audio warning.
   - **Zero-Auto-Complete Rule**: Timer expiry at 0:00 never marks tasks completed or updates progress rings.
   - Step checklist with checkboxes and confirmation modal before completion.
4. **4-Option Stuck? Assistance** (`GuidedTaskRunner.tsx`):
   - Option A: *Break this step down* (2–3 micro-actions for active step).
   - Option B: *Explain again* (simpler phrasing with read-aloud).
   - Option C: *Ask Asha* (local companion encouragement, 100% Spark Free Plan compliant).
   - Option D: *Ask my caregiver* (genuine phone/WhatsApp buttons for registered contacts from Loved Ones, or honest fallback).
5. **Companion Nudge Banner & Follower Toast**:
   - Integrated cleanly on the Home sanctuary matching legacy screenshots.

---

## 2. Precision 3-Chance State Machine Specification

| State | Displayed Hearts | Remaining Label | Audio / Voice Feedback | Cognitive Guidance | Next Action |
|---|---|---|---|---|---|
| **0 Mistakes (Initial)** | `❤️❤️❤️` | `(3 Left)` | Silent / Ready | 3 multiple choice options displayed | Patient selects an option |
| **1st Mistake** | `❤️❤️🤍` | `(2 Left)` | Bell Chime + Reassurance | *"First chance missed. Take a calm breath! Here is a gentle clue."* | Clue 1 revealed; options remain interactive |
| **2nd Mistake** | `❤️🤍🤍` | `(1 Left)` | Bell Chime + Reassurance | *"Let's think together. Here is a helpful hint."* | Detailed clinical hint banner automatically displayed |
| **3rd Mistake** | `🤍🤍🤍` | `(Guided)` | Gentle Chime + Solution | *"Let's learn together! The scheduled activity is: [Title]. Starting your 15-minute guided timer now."* | Solution banner shown; **Guided Task Runner automatically launches in 1.2s** |
| **Correct Guess** | `❤️❤️❤️` / `❤️❤️🤍` / `❤️🤍🤍` | Unchanged | Fanfare Chime | *"Wonderful! That is exactly right."* | +25 XP awarded; physical task remains pending; `▶ Start Guided Task (15m)` offered |

### Launch-Lock Implementation
To guarantee the runner is never launched multiple times or caught in an infinite re-render loop:
```typescript
const hasAutoLaunchedRef = React.useRef(false);
const [isAutoLaunching, setIsAutoLaunching] = useState(false);

// On 3rd mistake:
if (!hasAutoLaunchedRef.current) {
  hasAutoLaunchedRef.current = true;
  setIsAutoLaunching(true);
  setTimeout(() => {
    onLaunchTaskRunner(activeRoutine);
  }, 1200);
}
```
All choice buttons are set to `disabled={isAutoLaunching}` during the transition.

---

## 3. Multi-View Session Persistence

In `PatientDashboard.tsx`, session state is stored per routine ID:
```typescript
interface RecallSessionState {
  attemptCount: number;
  selectedOption: number | null;
  feedbackState: 'idle' | 'correct' | 'hint' | 'revealed';
  isHintExpanded: boolean;
}

const [recallSessions, setRecallSessions] = useState<Record<string, RecallSessionState>>({});
```
When a patient switches between `💡 1. Memory Cues for Every Task` and `📋 2. Direct Schedule Checklist`, the broken hearts and progress are preserved. Navigating between routines loads the corresponding routine's session or initializes a fresh 3-heart attempt.

---

## 4. 15-Minute Activity Timer & Step Runner

### Delta Countdown & Tab Resilience
Standard JavaScript `setInterval` can be throttled to once per minute when browser tabs are placed in the background. To guarantee reliable timing:
```typescript
const lastTickRef = useRef<number>(Date.now());

interval = setInterval(() => {
  const now = Date.now();
  const deltaSeconds = Math.max(1, Math.round((now - lastTickRef.current) / 1000));
  lastTickRef.current = now;
  setSecondsRemaining((prev) => Math.max(0, prev - deltaSeconds));
}, 1000);
```

### Zero Auto-Complete Rule on Timer Expiry
When the countdown reaches `0:00`:
- The timer stops: `setIsTimerRunning(false)`.
- A chime plays and a voice announcement is spoken: *"15 minutes has completed. Take all the time you need to finish, or tap Complete when ready."*
- **The task is NOT completed, steps are NOT checked, and the Daily Progress Ring is NOT updated.**
- The task only completes when the patient explicitly taps `Complete Task & Auto-Tick` and confirms in the confirmation dialog.

---

## 5. 4-Option Stuck? Assistance Architecture

When a patient taps `Stuck?`, they are provided four supportive pathways:

1. **Option A: Break This Step Down**
   - Dynamically parses the current step and provides 2–3 micro-actions (e.g. laying shirt flat, aligning bottom button, resting hands between buttons).
   - Includes speech read-aloud.
2. **Option B: Explain Again**
   - Rephrases instruction in simple, comforting terms without pressure.
3. **Option C: Ask Asha**
   - Delivers in-app contextual reassurance from Asha: *"Namaste! Asha is here with you. There is no rush at all..."*
   - Operates 100% locally with zero paid APIs.
4. **Option D: Ask My Caregiver**
   - Retrieves linked contacts from `LovedOnesService.getLovedOnes(patientId)`.
   - If a caregiver contact exists with a phone number, provides genuine `tel:` and `https://wa.me/` links.
   - If no caregiver phone is registered, displays an honest explanation rather than non-functional placeholder buttons.

---

## 6. Verification & Test Suite Summary

### Frontend Vitest Suite (173 Tests Passed)
- `src/test/Milestone2PrecisionRecallRunner.test.tsx` (10 tests):
  1. 3-Heart progression: `❤️❤️❤️` -> `❤️❤️🤍` -> `❤️🤍🤍` -> `🤍🤍🤍` -> auto-launch runner.
  2. Correct recall celebrates memory (+25 XP) without auto-completing physical routine.
  3. Restores broken hearts and attempt count from external session prop.
  4. Timer starts at strictly 15 minutes (900 seconds) and displays 15:00.
  5. Supports pause/resume and +5m timer extension.
  6. Timer zero expiration NEVER auto-completes task or checks steps.
  7. Toggles step checkboxes and requires explicit confirmation before completion.
  8. Presents all 4 assistance options (Break Down, Explain Again, Ask Asha, Caregiver).
  9. Renders companion nudge banner with Let's Do It action.
  10. Renders floating companion toast with Go ★ button.
- All 18 existing test files (163 tests) continue to pass 100%.

### Backend Vitest Suite (34 Tests Passed)
- All security rules, role authorization, and AI guardrail tests passed.

---

## 7. Live Deployment & Visual Verification

- **Hosting Project:** `saksham-d3b71`
- **Live URL:** [https://saksham-d3b71.web.app](https://saksham-d3b71.web.app)
- **Status:** HTTP 200 OK (`x-served-by: cache-bom-vanm7210026-BOM`)
- **Bundle Hash:** `assets/index-wXA6JpN5.js` / `assets/index-CHam064E.css`
- **Visual Artifact:** Captured live screenshot at `live_milestone2_deployed.png`

---

## 8. Next Steps: Milestone 3 Preview
With Milestone 2 verified and deployed, subsequent work will focus on:
- Milestone 3: Loved Ones & Family Memory experience restoration.
