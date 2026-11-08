# Saksham (सक्षम) — Milestone 6 Architecture, Feasibility & Integration Audit
## Patient Notes & Calendar Experience (READ-ONLY TECHNICAL AUDIT)

**Audit Date:** November 8, 2026  
**Repository:** `/Users/trishnabapna/Desktop/Saksham`  
**Active Branch:** `phase-2-patient-experience`  
**Firebase Project:** `saksham-d3b71`  
**Firebase Plan:** Spark (100% Free Tier Only — Zero Billing, Zero Paid APIs, Zero Cloud Functions)  
**Production URL:** https://saksham-d3b71.web.app  
**Latest Feature Commit:** `81c9e9a` (`feat(localization): add pan-india multilingual patient experience`)  
**Latest Documentation Commit:** `361afb0` (`docs(localization): record final multilingual quality audit`)  
**Audit Status:** STRICT READ-ONLY AUDIT & ARCHITECTURAL BLUEPRINT  

---

## 1. Executive Summary & Audit Mandate

This document provides a comprehensive, read-only architectural feasibility audit and implementation blueprint for **Milestone 6: Patient Notes & Calendar**.

### Strict Architectural Boundaries:
1. **Preserve Permanent Bottom Navigation:** The patient bottom navigation bar **must remain strictly 4 tabs**:
   1. Home (`/patient`)
   2. Family (`/patient/loved-ones`)
   3. Games (`/patient/mind-games`)
   4. Profile (`/patient/profile`)
   Notes and Calendar **must NOT** become permanent bottom navigation tabs.
2. **Access via Floating Utility Button:** Patient access to Notes and Calendar must be routed through a gentle, accessible floating utility button positioned on the Patient Home Sanctuary (`/patient`).
3. **100% Firebase Spark Free-Tier Guarantee:**
   - Zero paid APIs (no Google Maps API, no paid routing engines, no paid AI services).
   - Zero Cloud Functions (all logic executes client-side).
   - **Voice Note Audio Blobs:** Firebase Storage must **not** be used for patient audio recordings due to free-tier quota overflow and bandwidth exhaustion risks. Audio notes must be stored in client-side **IndexedDB**, with lightweight metadata and transcripts in Firestore.
   - **Guest Sessions:** Guests (`guest_patient_local`) write **0** records to Firestore; all notes and calendar events remain strictly in `localStorage` / `IndexedDB`.
4. **Data Isolation & Patient Privacy:**
   - Personal patient notes are strictly private (`users/{uid}/notes/{noteId}`), accessible **only** to the authenticated patient (`isOwner(userId)`). Caregivers, doctors, and administrators do **not** receive automatic read access.
   - Calendar events (`users/{uid}/calendarEvents/{eventId}`) are accessible to the patient and authorized connected caregivers (`isConnectedCaregiver(userId)`) for collaborative appointment care.
5. **No AI Hallucinations / No Unconfirmed Mutations:** The Asha AI Companion must execute deterministic local intent matching only, and must **never** create, modify, or delete a note or calendar event without explicit user confirmation.

---

## A. Current Architecture & Codebase Inspection

The audit inspected the actual repository codebase to establish concrete integration baselines:

### 1. Navigation & Routing Structure
- **Persistent Bottom Navigation:** [`frontend/src/components/layout/BottomNav.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/components/layout/BottomNav.tsx)
  - Configures exactly 4 items: `Home` (`/patient`), `Family` (`/patient/loved-ones`), `Games` (`/patient/mind-games`), `Profile` (`/patient/profile`).
  - Styled as fixed bottom bar: `fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md py-2 px-3`.
  - Height is ~64px, requiring content padding `pb-28` on patient pages.
- **TopBar:** [`frontend/src/components/layout/TopBar.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/components/layout/TopBar.tsx)
  - Features Saksham branding, active character visualizer (`Asha` / `Kabir`), Globe language picker button, high-contrast toggle, font size cycler, and user menu.
- **Application Routing:** [`frontend/src/App.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/App.tsx)
  - Root route `/` redirects to `/patient`.
  - Legacy `/patient/routines` safely redirects to `/patient` (Milestone 1 consolidation).
  - RBAC protection enforced by [`ProtectedRoute.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/auth/components/ProtectedRoute.tsx) for roles: `'patient'`, `'caregiver'`, `'doctor'`, `'admin'`.

### 2. Patient Home Sanctuary Workspace
- **Dashboard File:** [`frontend/src/pages/patient/PatientDashboard.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/pages/patient/PatientDashboard.tsx)
  - Max width container: `max-w-xl mx-auto space-y-5 px-4 pb-28 pt-4`.
  - Section 1: Welcome Header with localized date and sanctuary synchronization pill.
  - Section 2: Asha AI Companion card ([`AICompanion.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/ai-companion/AICompanion.tsx)).
  - Section 3: Daily Progress Ring & Streak card.
  - Section 4: Daily Routine Care Workspace with 2 subtabs (`assistedRecall` and `checklist`).

### 3. Data Services & Scoped Persistence Patterns
- **Firebase Initialization:** [`frontend/src/services/firebase.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/services/firebase.ts)
  - Configures `initializeFirestore` with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` for multi-tab offline IndexedDB synchronization.
- **Patient Identity & Event Bus:** [`frontend/src/features/auth/services/identityService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/auth/services/identityService.ts)
  - `getEffectivePatientId(currentUser)` returns authenticated `uid` or `guest_patient_local`.
  - `isGuestPatient(patientId)` checks for unauthenticated sessions.
  - `notifyDataChange(module, patientId)` and `subscribeToDataChanges(cb)` provide reactive event dispatch across components.
- **Storage Scoping Convention:**
  - Authenticated: `saksham_<module>_${uid}` (e.g., `saksham_adaptive_profile_${uid}`).
  - Guest: `saksham_<module>_guest_patient_local`.
  - Pending Sync Queue: `saksham_pending_<module>_sync_${uid}`.
  - Reconnection listener: `window.addEventListener('online', ...)` in [`adaptiveDifficultyService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/games/services/adaptiveDifficultyService.ts).

### 4. Existing Notification & Reminder System
- **Reminder Settings Modal:** [`frontend/src/features/routines/components/ReminderSettingsModal.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/routines/components/ReminderSettingsModal.tsx)
- **Reminder Service:** [`frontend/src/features/routines/services/routineService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/routines/services/routineService.ts)
  - `ReminderSettings` interface: `enabled`, `quietHoursEnabled`, `quietHoursStart` (`"22:00"`), `quietHoursEnd` (`"07:00"`), `snoozeDurationMinutes` (3, 5, 15), `soundEnabled`, `voiceEnabled`.
  - `RoutineService.isQuietHoursActive(settings, nowMinutes)`: Correctly handles overnight quiet periods (e.g. 10 PM to 7 AM).
  - Web Notifications API permission check: `Notification.permission` (`'default'`, `'granted'`, `'denied'`).
  - Audio Chimes: [`audioSynthesizerService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/services/audioSynthesizerService.ts) generates Web Audio API synthetic chimes without external audio assets.

### 5. Existing Speech & AI Companion Architecture
- **Speech Service:** [`frontend/src/services/speechService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/services/speechService.ts)
  - Mapped to all 23 BCP-47 tags (`hi-IN`, `ta-IN`, `ur-IN`, `sat-IN`, etc.).
  - `findBestVoice()` prevents English phonetic voice distortion when no native voice is installed.
  - `startListening()` provides browser Web Speech API speech-to-text.
- **AI Companion Intent Parser:** [`frontend/src/services/aiService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/services/aiService.ts)
  - `parseAIIntentLocally(transcript, context, language)`: Deterministic regex and substring pattern matching.
  - `PERMITTED_ACTIONS`: Strictly enforces whitelisted actions (`NAVIGATE_HOME`, `NAVIGATE_MIND_GAMES`, etc.).

---

## B. Notes Feasibility Analysis

Audit of all 12 proposed capabilities for **Feature A — My Notes**:

| # | Proposed Capability | Technical Feasibility Classification | Architectural Rationale & Implementation Strategy |
|---|---------------------|--------------------------------------|---------------------------------------------------|
| 1 | **Create a note** | **Requires new implementation** | Straightforward state/service logic. Auto-assigns UUID, `createdAt`, `updatedAt`, and `patientId`. |
| 2 | **Edit an existing note** | **Requires new implementation** | In-place editing modal with optimistic local updates and dirty-checking. |
| 3 | **Delete a note** | **Requires new implementation** | Soft-delete (`isDeleted: true`) locally, followed by deletion from Firestore. Removes linked local audio blobs. |
| 4 | **Add title and description** | **Requires new implementation** | Form with accessible, high-contrast inputs, autofocus, and 16px+ base font size to prevent mobile auto-zoom. |
| 5 | **Search and filter notes** | **Requires new implementation** | Fast, client-side substring search over title and content. Category filter pills. |
| 6 | **Pin important notes** | **Requires new implementation** | Boolean flag `isPinned: boolean`. Comparator sorts pinned notes to top followed by `updatedAt` descending. |
| 7 | **Categories (Personal, Family, Health, Appointments, General)** | **Requires new implementation** | Enum `NoteCategory` with gentle pastel badge styling matching Saksham lavender design language. |
| 8 | **Read note aloud via browser TTS** | **Supported by existing architecture** | Directly calls `SpeechService.speak(note.content, ..., language)`. Inherits voice distortion prevention. |
| 9 | **Create voice note via browser recording** | **Requires additional research / Requires new local-only implementation** | **SPARK RESTRICTION:** Storing audio files in Firebase Cloud Storage is **NOT safely feasible** on Spark Free Tier. **Proposed Safe Solution:** Record via `MediaRecorder` API (WebM/Opus), store audio blob in client-side **IndexedDB** (`saksham_audio_blobs`), and transcribe via `SpeechService.startListening()` to store transcript in the Firestore note document (<1KB). Label as **"Device Voice Note"**. |
| 10 | **Display creation and modification dates** | **Supported by existing architecture** | Formatted via `formatDate(date, language)` and `formatTime(date, language)` in `interpolate.ts`. |
| 11 | **Link note to routine or calendar event** | **Requires new implementation** | Optional fields: `linkedRoutineId?: string` and `linkedEventId?: string`. Displays clickable link badge. |
| 12 | **Offline persistence and safe sync** | **Supported by existing architecture** | Reuses the proven `adaptiveDifficultyService` pattern: instant local write to `localStorage`/`IndexedDB`, queued in `saksham_pending_notes_sync_${uid}`, synced on reconnection. |

---

## C. Calendar Feasibility Analysis

Audit of all 14 proposed capabilities for **Feature B — My Calendar**:

| # | Proposed Capability | Technical Feasibility Classification | Architectural Rationale & Implementation Strategy |
|---|---------------------|--------------------------------------|---------------------------------------------------|
| 1 | **Monthly calendar view** | **Requires new implementation** | Accessible 7x5/6 grid with minimum 44px tap targets, day-of-week headers, today indicator, and event dot pills. |
| 2 | **Weekly view** | **Requires new implementation** | 7-day horizontal scroll strip with expansive cards, ideal for mobile touch screens. |
| 3 | **Daily agenda view** | **Requires new implementation** | Chronological vertical timeline list with category badges, time slots, and routine anchors. |
| 4 | **Create, edit, delete events** | **Requires new implementation** | Modal editor with validation, conflict detection, and optimistic updates. |
| 5 | **Event title and description** | **Requires new implementation** | High-contrast elder-friendly text inputs. |
| 6 | **Date and time selection** | **Requires new implementation** | 12-hour AM/PM picker matching `RoutineService.parseTimeToMinutes` conventions (`"10:30 AM"`). |
| 7 | **Event categories (Doctor, Family, Personal, Medication, Other)** | **Requires new implementation** | Enum `CalendarCategory` with calming, non-alarming color tokens. |
| 8 | **Recurring events** | **Requires additional research / Requires limited deterministic implementation** | **SPARK RESTRICTION:** Storing repeated individual event documents in Firestore causes read/write amplification. **Proposed Safe Solution:** Store recurrence rule metadata on the parent event (`recurrence: 'daily' | 'weekly' | 'none'`). Virtual occurrences are calculated client-side in memory. |
| 9 | **Reminder scheduling** | **Supported by existing architecture** | Reuses `RoutineService.getReminderSettings(patientId)` and `isQuietHoursActive()`. Triggers local browser notification if permitted. |
| 10 | **Read-aloud event info through Asha** | **Supported by existing architecture** | Formats event summary ("You have a doctor appointment with Dr. Vikram at 3:00 PM") and speaks via `SpeechService`. |
| 11 | **Linking event to Daily Routine** | **Requires new implementation** | Optional field `linkedRoutineId?: string`. Allows launching the Guided Task Runner directly from calendar. |
| 12 | **Offline creation and synchronization** | **Supported by existing architecture** | Optimistic local updates in `saksham_calendar_${uid}`, queued in `saksham_pending_calendar_sync_${uid}`. |
| 13 | **Search and upcoming-event list** | **Requires new implementation** | Chronological index of future events within next 30 days. Substring search over title and description. |
| 14 | **Visual indicators for today & overdue** | **Requires new implementation** | Gentle badges: `"Today"` (emerald pill), `"Upcoming"` (purple pill), `"Past"` (muted lavender). Avoids aggressive red warning colors to prevent patient anxiety. |

---

## D. UI Integration Plan: Floating Utility Button

### 1. Positioning & Layout Compatibility
- **Location on Patient Home (`/patient`):**
  - Mobile: Floating above the bottom navigation bar at `bottom-20 right-4` (`rtl:right-auto rtl:left-4`).
  - Desktop: `sm:bottom-24 sm:right-8`.
  - Z-Index: `z-30` (sits above page content, sits below modals at `z-50`, does not overlap `BottomNav` at `z-40`).
- **Touch Target & Button Dimensions:**
  - Outer button: `56px x 56px` circular floating action button (`min-h-[56px] min-w-[56px]`).
  - Icon: Sparkles or Notebook-Calendar icon (`w-6 h-6`).
  - Styling: Soft lavender border (`border-2 border-purple-300`), vibrant purple background (`bg-purple-600 hover:bg-purple-700`), elevated shadow (`shadow-soft-purple`).
  - Aria Label: `t('utility_menu.quick_actions')` ("Quick Actions: Notes & Calendar").

```
  Desktop / Mobile Patient Home Sanctuary Layout:
  ┌──────────────────────────────────────────────────────────┐
  │ TopBar: Branding | Language (Globe) | Font | Theme | User│
  ├──────────────────────────────────────────────────────────┤
  │ Header: "Namaste, Kalyani Ji" (Calm date & status pill)  │
  │                                                          │
  │ Asha AI Companion: Warm card & suggestion chips          │
  │                                                          │
  │ Daily Progress Ring & Streak                             │
  │                                                          │
  │ Daily Routine Care Workspace: 3-Chance Assisted Recall   │
  │                                                          │
  │                                        ┌───────────────┐ │
  │                                        │  [Notes]      │ │
  │                                        │  [Calendar]   │ │
  │                                        ├───────────────┤ │
  │                                        │ 🌟 Utility FAB│ │
  │                                        └───────────────┘ │
  ├──────────────────────────────────────────────────────────┤
  │ BottomNav: [Home]    [Family]    [Games]    [Profile]    │
  └──────────────────────────────────────────────────────────┘
```

### 2. Expandable Menu Interaction
- **Trigger:** Tapping the FAB expands a compact vertical popover menu above the button.
- **Menu Options:**
  1. **My Notes:** Icon `BookOpen` or `StickyNote`, title "My Notes", subtitle "Personal thoughts & memory reminders".
  2. **My Calendar:** Icon `Calendar`, title "My Calendar", subtitle "Appointments & upcoming family days".
- **Keyboard & Accessibility Compliance:**
  - `aria-haspopup="true"`, `aria-expanded={isMenuOpen}`.
  - Pressing `Escape` closes the menu.
  - Tapping anywhere outside the menu backdrop closes the menu.
  - Full keyboard focus trap when expanded.
- **Respects Accessibility Preferences:**
  - Honors `fontSize` ('large', 'extra-large') from `AccessibilityContext`.
  - Honors `highContrast` with high-contrast borders (`border-purple-900 bg-white`).
  - Honors RTL text direction (`dir="rtl"`) for Urdu, Sindhi, and Kashmiri.

### 3. Modal / Drawer Presentation
- Clicking **My Notes** opens `<NotesModal />` (a clean, full-viewport sheet on mobile, centered modal on desktop).
- Clicking **My Calendar** opens `<CalendarModal />`.
- Both modals include:
  - Accessible top bar with title, active language support, and large 48px `Close` (`X`) button.
  - Does **not** change URL or navigate away from `/patient`, ensuring patient continuity.
  - Pressing `Escape` or tapping `Close` returns smoothly to the Patient Home Sanctuary.

---

## E. Firestore Data Model & Offline Architecture

### 1. Firestore Collection Hierarchy
To guarantee strict patient privacy, Notes and Calendar events are modeled as **subcollections under the patient's user document**:

```
users/{userId}/
├── (user profile document)
├── adaptiveProfiles/current
├── notes/{noteId}                 <-- PRIVATE TO PATIENT
└── calendarEvents/{eventId}       <-- PATIENT + CONNECTED CAREGIVER
```

### 2. Data Schemas

#### A. Patient Note Schema (`users/{userId}/notes/{noteId}`)
```typescript
export type NoteCategory = 'personal' | 'family' | 'health' | 'appointments' | 'general';

export interface PatientNote {
  id: string;                      // UUID or Firestore Doc ID
  patientId: string;               // Owning patient UID
  title: string;                   // Note title (max 100 chars)
  content: string;                 // Note text body (max 5000 chars)
  category: NoteCategory;          // Categorization
  isPinned: boolean;               // Pin to top of list
  linkedRoutineId?: string;        // Optional link to Daily Routine
  linkedEventId?: string;          // Optional link to Calendar Event
  
  // Audio Voice Note Metadata (Local-First Architecture)
  voiceNote?: {
    isRecorded: boolean;           // True if an audio note exists
    durationSeconds: number;       // Duration in seconds
    transcript?: string;           // Speech-to-text transcript
    localAudioKey?: string;        // IndexedDB key for client-side playback
  };

  syncStatus?: 'synced' | 'offline-pending' | 'local-only';
  createdAt: string;               // ISO-8601 string
  updatedAt: string;               // ISO-8601 string
}
```

#### B. Calendar Event Schema (`users/{userId}/calendarEvents/{eventId}`)
```typescript
export type CalendarCategory = 'doctor' | 'family' | 'personal' | 'medication' | 'other';
export type RecurrenceType = 'none' | 'daily' | 'weekly';

export interface CalendarEvent {
  id: string;                      // UUID or Firestore Doc ID
  patientId: string;               // Owning patient UID
  title: string;                   // Event title (max 120 chars)
  description?: string;            // Details / Instructions
  category: CalendarCategory;      // Event category
  
  // Date & Time
  startDate: string;               // YYYY-MM-DD
  startTime?: string;              // "10:30 AM" (12-hr format)
  endDate?: string;                // YYYY-MM-DD
  endTime?: string;                // "11:30 AM"
  allDay: boolean;                 // All-day toggle
  
  // Recurrence (Client-Side Virtual Calculation)
  recurrence: RecurrenceType;      // Virtual recurrence rule
  recurrenceEnd?: string;          // YYYY-MM-DD

  // Reminder & Routine Integration
  reminderMinutesBefore: number;   // 0, 15, 30, 60 (-1 for none)
  linkedRoutineId?: string;        // Optional link to Daily Routine ID
  
  // Future Milestones 7 & 8 Location Slot (Optional, unpopulated in M6)
  location?: {
    label: string;                 // "City Hospital, Room 204"
  };

  syncStatus?: 'synced' | 'offline-pending' | 'local-only';
  createdAt: string;
  updatedAt: string;
}
```

### 3. Proposed Firestore Security Rules
```rules
// Subcollection: Private Patient Notes
match /users/{userId}/notes/{noteId} {
  // STRICT PRIVACY: Only the patient owns their personal notes
  // Caregivers, doctors, and admins have NO automatic access
  allow read, write: if isAuthenticated() && isOwner(userId);
}

// Subcollection: Collaborative Calendar Events
match /users/{userId}/calendarEvents/{eventId} {
  // Patient has full access; connected caregiver has collaborative access for appointments
  allow read: if isAuthenticated() && (isOwner(userId) || isConnectedCaregiver(userId));
  allow create, update, delete: if isAuthenticated() && (isOwner(userId) || isConnectedCaregiver(userId));
}
```

### 4. Offline Persistence & Sync Flow
1. **Local Write:** `NotesService.saveNote(patientId, note)` immediately updates `localStorage.setItem('saksham_notes_' + patientId, ...)`.
2. **Pending Queue:** If offline (`!navigator.onLine`), the note is added to `saksham_pending_notes_sync_${patientId}` with `syncStatus: 'offline-pending'`.
3. **Reconnection Sync:** When `window.addEventListener('online')` fires, the queue flushes pending writes to Firestore (`setDoc(doc(db, 'users', uid, 'notes', noteId), cleanNote)`).
4. **Guest Sessions:** If `isGuestPatient(patientId)` is true, the service **never** contacts Firestore, persisting only in `localStorage` and `IndexedDB`.

---

## F. Asha AI Companion Integration Plan

### 1. Whitelisted Actions Extension
In [`frontend/src/services/aiService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/services/aiService.ts), extend `WhitelistedAction` with 4 safe actions:
```typescript
export type WhitelistedAction =
  | 'NAVIGATE_HOME'
  | 'NAVIGATE_ROUTINES'
  | 'NAVIGATE_LOVED_ONES'
  | 'NAVIGATE_MIND_GAMES'
  | 'NAVIGATE_ROOM_MEMORY'
  | 'TRIGGER_ROUTINE_REMINDER'
  | 'SHOW_FAMILY_MEMBER'
  | 'TRIGGER_ASSISTANCE_TRAY'
  | 'OPEN_NOTES'                   // Milestone 6: Open My Notes
  | 'OPEN_CALENDAR'                // Milestone 6: Open My Calendar
  | 'READ_PINNED_NOTES'            // Milestone 6: Read aloud pinned notes
  | 'LIST_TODAY_EVENTS';           // Milestone 6: Recite today's schedule
```

### 2. Multi-Language Intent Capabilities Matrix

| User Intent Query | English (`en`) | Hindi (`hi`) | Major Indic (`bn`, `ta`, `te`, `mr`, `gu`, `kn`, `ml`, `pa`) | RTL Indic (`ur`, `sd`, `ks`) | Regional / Tribal (`sat`, `mni`, `as`, `or`, etc.) | Confirmation Required? |
|-------------------|:--------------:|:------------:|:-------------------------------------------------------------:|:-----------------------------:|:----------------------------------------------------:|:----------------------:|
| **"Open my notes"** | Supported (`notes`) | Supported (`नोट्स`, `डायरी`) | Supported (`নোট`, `குறிப்புகள்`, `గమనికలు`, `नोंदी`) | Supported (`نوٹس`, `یادداشت`) | Supported (`ᱱᱳᱴ`, `ꯅꯣꯠ`) | No (Direct Navigation) |
| **"Show my calendar"** | Supported (`calendar`) | Supported (`कैलेंडर`, `पंचांग`) | Supported (`ক্যালেন্ডার`, `நாட்காட்டி`, `క్యాలెండర్`) | Supported (`کیلنڈر`) | Supported (`ᱠᱮᱞᱮᱱᱰᱟᱨ`, `ꯀꯦꯂꯦꯟꯗꯔ`) | No (Direct Navigation) |
| **"Read my important notes"** | Supported (`pinned notes`) | Supported (`ज़रूरी नोट्स पढ़ें`) | Supported via category keywords | Supported (`خاص نوٹس`) | English / Hindi fallback | No (Read-Only TTS) |
| **"What appointments do I have today?"** | Supported (`today appointments`) | Supported (`आज की मुलाक़ातें`, `डॉक्टर`) | Supported via date/doctor keywords | Supported (`آج کی ملاقاتیں`) | English / Hindi fallback | No (Read-Only TTS) |
| **"Create a note: buy tea"** | Propose Draft | Propose Draft | Fallback to Opening Notes | Fallback to Opening Notes | Fallback to Opening Notes | **YES: Must display confirmation card with [Save Note] button** |
| **"Add event: Doctor visit at 3 PM"** | Propose Draft | Propose Draft | Fallback to Opening Calendar | Fallback to Opening Calendar | Fallback to Opening Calendar | **YES: Must display confirmation card with [Confirm Event] button** |

### 3. Consequential Safety Rule
- Asha **never** commits a create, edit, or delete operation directly to the database based on voice input alone.
- If a patient says "Create a note" or "Add an event", Asha responds by setting `characterState: 'thinking'` and providing a draft preview card with an explicit, high-contrast **"Save Note"** or **"Add to Calendar"** button. The record is only saved when the patient taps the confirmation button.

---

## G. Localization Plan Across 23 Languages

To maintain the Pan-India localization standard established in Milestone 5, Milestone 6 will extend all 23 language dictionaries in [`frontend/src/i18n/locales/`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/i18n/locales/) with 28 new standardized keys:

### 1. Required Translation Key Namespaces (28 New Keys)

```typescript
// Utility FAB & Menu (4 keys)
'utility.quick_actions': 'Quick Actions: Notes & Calendar',
'utility.my_notes': 'My Notes',
'utility.my_calendar': 'My Calendar',
'utility.close': 'Close Menu',

// Notes Sanctuary (12 keys)
'notes.title': 'My Personal Notes',
'notes.subtitle': 'Gentle thoughts, family reminders, and daily reflections',
'notes.new_note': 'Write a Note',
'notes.search_placeholder': 'Search notes by title or words...',
'notes.empty': 'No notes written yet. Tap Write a Note to capture a peaceful thought.',
'notes.pin': 'Pin to top',
'notes.unpin': 'Unpin note',
'notes.read_aloud': 'Read Note Aloud',
'notes.voice_note': 'Voice Note (Device Only)',
'notes.delete_confirm': 'Are you sure you wish to remove this note?',
'notes.category_personal': 'Personal',
'notes.category_health': 'Health',

// Calendar Sanctuary (12 keys)
'calendar.title': 'My Calendar',
'calendar.subtitle': 'Upcoming appointments, family gatherings, and peaceful days',
'calendar.view_month': 'Month',
'calendar.view_week': 'Week',
'calendar.view_agenda': 'Agenda',
'calendar.today': 'Today',
'calendar.new_event': 'Add Event',
'calendar.empty_day': 'No events scheduled for this day. Enjoy your peaceful rest!',
'calendar.category_doctor': 'Doctor Appointment',
'calendar.category_family': 'Family Gathering',
'calendar.category_medication': 'Medication Reminder',
'calendar.status_today': 'Today',
'calendar.status_upcoming': 'Upcoming',
```

### 2. Bi-Directional RTL Compliance
- All new modal dialogs, search bars, category filters, and calendar grid cells must respect `[dir='rtl']` rules in `index.css`.
- Floating Action Button flips alignment to the bottom-left corner (`rtl:left-4 rtl:right-auto`) when Urdu (`ur`), Sindhi (`sd`), or Kashmiri (`ks`) is active.

---

## H. Notification & Reminder Plan

### 1. Safety Invariants for Elder Care
1. **Medication Administration Disclaimer:**
   - A calendar reminder for medication **must never** claim or record that the medication was physically ingested.
   - Text must read: *"Gentle reminder: Your morning blood pressure care was scheduled for 09:00 AM. Please check with your caregiver or medicine tray."*
2. **Duplicate Notification Prevention:**
   - Calendar reminders and Daily Routines must **not** fire duplicate alerts for the same activity.
   - If an event is linked to a routine (`linkedRoutineId`), only the Daily Routine engine triggers the reminder.
3. **Quiet Hours Enforcement:**
   - Calendar alerts must strictly respect `RoutineService.isQuietHoursActive(settings)`. During quiet hours (e.g. 10:00 PM – 07:00 AM), sound and speech alerts are suppressed.
4. **Browser Notification Realism:**
   - The UI must clearly state: *"Browser notifications appear when Saksham is open in your browser tab. For guaranteed morning alarms, please also set your bedside clock."*

---

## I. Security, Privacy & RBAC Audit

### 1. Threat Modeling & Access Safeguards

| Threat Vector | Risk Level | Architectural Safeguard |
|---------------|:----------:|-------------------------|
| **Cross-Patient Note Snooping** | Critical | Strict path-based Firestore rule: `match /users/{userId}/notes/{noteId}` allows access **only** if `request.auth.uid == userId`. No collectionGroup queries permitted. |
| **Unconsented Caregiver Inspection** | High | Notes are **not** readable by caregivers by default. Even active relationships (`relationships/{relId}`) grant access only to routines and loved ones, never personal notes. |
| **Doctor Overreach into Personal Reflections** | High | Doctors have read access to `/patients/{id}` clinical summaries and `/routines/{id}`, but are blocked by rule from `/users/{id}/notes`. |
| **Admin Database Dump** | High | Firestore security rules explicitly deny administrative access to `/users/{userId}/notes` (`isAdmin()` is omitted from notes rules). |
| **External AI Data Exfiltration** | Critical | Zero note text is transmitted to third-party LLMs or external cloud endpoints. All intent parsing is local. |
| **Guest Data Leakage** | High | Guest notes and events are isolated in `localStorage.getItem('saksham_notes_guest_patient_local')`. No unauthenticated Firestore writes are permitted. |

---

## J. Firebase Spark Free-Tier Compliance Verification

| Spark Free-Tier Dimension | Free Limit | Milestone 6 Projected Usage | Compliance Status |
|---------------------------|:----------:|:----------------------------:|:-----------------:|
| **Cloud Firestore Reads** | 50,000 / day | ~50–100 reads / active patient / day | **100% Compliant** (<1% of quota) |
| **Cloud Firestore Writes** | 20,000 / day | ~5–10 writes / patient / day (cached locally) | **100% Compliant** (<1% of quota) |
| **Cloud Firestore Storage** | 1 GiB total | ~50 KB / patient (text notes & events) | **100% Compliant** |
| **Firebase Cloud Storage** | 5 GB / 1 GB download/day | **0 bytes used** (Audio stored in client IndexedDB) | **100% Compliant** (Zero risk) |
| **Cloud Functions** | 0 (Requires Blaze) | **0 Cloud Functions used** (All client-side) | **100% Compliant** |
| **Google Maps / Routing APIs** | Paid / Requires Billing | **0 Maps APIs invoked** (Plain text location labels) | **100% Compliant** |
| **Third-Party Paid AI APIs** | Paid | **0 External API calls** (Deterministic local parser) | **100% Compliant** |

---

## K. Implementation Milestone Breakdown (Phased Sub-Stages)

To ensure safe, testable progress without regressions, Milestone 6 should be executed in 4 sequential stages:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 6.1: Core Types, Services & Firestore Security Rules             │
│ • PatientNote & CalendarEvent interfaces in types/index.ts             │
│ • NotesService & CalendarService with offline queues & IndexedDB       │
│ • backend/firestore.rules subcollection security & 20+ unit tests      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Stage 6.2: Floating Utility Button & Expandable Menu Component         │
│ • FloatingUtilityMenu.tsx on Patient Home Sanctuary                    │
│ • WCAG 56px touch target, Escape key, backdrop click, RTL positioning │
│ • Mounts empty modal wrappers for Notes and Calendar                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Stage 6.3: My Notes & My Calendar UI Interfaces                        │
│ • NotesModal.tsx: Category pills, pin/unpin, search, TTS read-aloud    │
│ • CalendarModal.tsx: Month grid, week strip, daily agenda, linking     │
│ • Web Audio chimes & ReminderSettings quiet-hours integration          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Stage 6.4: Asha AI Integration, 23-Language Dictionaries & QA Audit    │
│ • OPEN_NOTES & OPEN_CALENDAR whitelisted intent parsing                │
│ • 28 new keys added to all 23 language dictionaries in i18n/locales    │
│ • Comprehensive Vitest regression test suite & live deployment         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## L. Comprehensive Test Plan

1. **Unit & Logical Security Policy Tests (`backend/src/test/securityRules.test.ts`):**
   - Verify patient can create, read, update, delete their own notes in `/users/{uid}/notes/{id}`.
   - Verify other patients receive `permission-denied` (403).
   - Verify caregivers, doctors, and admins are blocked from `/users/{uid}/notes/{id}`.
   - Verify connected caregivers can read/write calendar events in `/users/{uid}/calendarEvents/{id}`.
2. **Data Service & Offline Synchronization Tests:**
   - Test optimistic local cache writes when `navigator.onLine === false`.
   - Test pending sync queue flushing upon `window.dispatchEvent(new Event('online'))`.
   - Test guest patient isolation: verify guest data stays in `guest_patient_local` keys.
3. **UI & Accessibility Tests (React Testing Library / Vitest):**
   - Verify floating action button renders with `min-h-[56px] min-w-[56px]`.
   - Verify pressing `Escape` closes the utility menu and modals.
   - Verify screen reader `aria-expanded` and `aria-label` attributes.
   - Verify high-contrast class propagation.
4. **Asha Companion Intent Parser Tests:**
   - Test navigation queries: `"open notes"`, `"नोट्स खोलो"`, `"show calendar"`, `"कैलेंडर दिखाओ"`.
   - Verify confirmation gate: ensure Asha does not commit notes or events without user confirmation.
   - Verify fallback safety on unsupported requests.
5. **Localization Completeness Tests:**
   - Validate that all 28 new keys are present across all 23 language dictionaries.
   - Validate RTL layout direction for Urdu, Sindhi, and Kashmiri.

---

## M. Technical Risks, Limitations & Mitigations

1. **Browser Voice Recording Format Incompatibilities:**
   - *Risk:* Different browsers record audio in different MIME types (`audio/webm;codecs=opus` on Chrome/Firefox vs `audio/mp4` on Safari iOS).
   - *Mitigation:* Audio feature must detect supported MIME types dynamically via `MediaRecorder.isTypeSupported()`. If unsupported, fallback cleanly to speech-to-text transcription only.
2. **IndexedDB Storage Quota Eviction on iOS:**
   - *Risk:* Safari on iOS may evict IndexedDB storage if device storage runs critically low.
   - *Mitigation:* Important note content is always stored as text in `localStorage` and Firestore. Local audio blobs are treated as enhancement recordings, not sole data stores.
3. **Recurrence Inflation in Calendar:**
   - *Risk:* Expanding recurring events into individual Firestore documents multiplies write and read operations, threatening Spark quotas.
   - *Mitigation:* Store single event document with `recurrence: 'daily' | 'weekly'`. Compute occurrences dynamically in memory on the client when rendering the month or agenda view.
4. **Caregiver Confusion over Private Notes:**
   - *Risk:* Caregivers might expect to view all patient notes.
   - *Mitigation:* UI clearly displays a privacy shield badge on the Notes screen: *"Personal Sanctuary: Private to Patient"*. Calendar events remain collaborative for appointments.

---

## N. Final Architectural Recommendation

### **Recommendation: APPROVED FOR IMPLEMENTATION (WITH DOCUMENTED SAFEGUARDS)**

### Architectural Verdict:
Milestone 6 is **architecturally sound, technically feasible, and highly aligned** with Saksham's neuro-care sanctuary principles. It expands patient empowerment without destabilizing completed milestones, provided the following **four non-negotiable safeguards** are enforced during implementation:

1. **Bottom Navigation Invariant:** The bottom navigation bar must strictly maintain its 4 permanent tabs (`Home`, `Family`, `Games`, `Profile`). Notes and Calendar must be accessed exclusively via the floating utility button on Patient Home.
2. **Local-Only Audio Storage:** Patient voice note audio recordings must be stored in client-side **IndexedDB**, never uploaded to Firebase Storage, keeping the application 100% compliant with the Firebase Spark Free Tier.
3. **Strict Firestore Privacy Rules:** Personal notes must reside at `/users/{userId}/notes/{noteId}` with read/write access restricted solely to `isOwner(userId)`.
4. **Confirmation-Gated Asha Mutations:** Voice commands to create notes or calendar appointments must propose draft cards requiring an explicit user tap on a confirmation button before writing to state.

---
*Audit completed under strict read-only parameters. No application source code, database records, security rules, or deployments were modified.*
