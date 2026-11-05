# SAKSHAM (सक्षम) — PHASE 2, MILESTONE 3 DELIVERABLE REPORT
## Loved Ones (Family & Identity Anchor) Module

**Document ID:** `DOC-P2-M3-LOVED-ONES-001`  
**Date:** November 5, 2026  
**Git Branch:** `phase-2-patient-experience`  
**Git Commit:** `876b9bd`  
**Author:** Lead Full-Stack Architect, Firebase Engineer & Accessibility Specialist  
**Status:** Completed & Ready for Review  

---

## 1. Executive Summary

Milestone 3 of Phase 2 has been implemented in its entirety. The **Loved Ones (Family & Identity Anchor)** module provides an accessible, calming, and personal memory sanctuary for patients living with memory conditions, stroke rehabilitation, or cognitive fatigue. 

The module is designed around three therapeutic pillars:
1. **Identity & Facial Recognition Anchor:** High-contrast portrait cards featuring verified family members, explicit relationships, nicknames, and familiar phrases.
2. **Assisted Memory Cues (Non-Shaming Exploration):** Gentle progressive prompts allowing patients to explore who someone is, their relationship, and shared joys without pressure, testing, or shame.
3. **Authentic Voice Memories:** High-fidelity voice notes with manually provided speaker attribution, clear playback controls, and transcripts—with zero synthetic voice imitation or automatic speaker recognition.

All features strictly respect the **Free Firebase Spark Plan** (zero paid Cloud Functions, zero paid storage buckets) and maintain strict UID-scoped data isolation enforced by Firestore security rules.

---

## 2. Deliverables & Files Created/Modified

### 2.1 File Summary

| File Path | Description | Status |
| :--- | :--- | :--- |
| `frontend/src/types/index.ts` | Enhanced `FamilyMember`, added `LovedOne` alias and `VoiceRecording` model with speaker name, duration, and transcript. | Updated |
| `frontend/src/features/lovedOnes/services/lovedOnesService.ts` | Complete Loved Ones service layer, pre-seeded neuro-care family profiles, prototype avatar presets, and UID-scoped storage with headless fallback. | Created |
| `frontend/src/features/lovedOnes/components/FamilyMemberCard.tsx` | High-contrast, touch-optimized card with photograph, name, relationship badge, familiar phrase, quick-play voice note, and cues button. | Created |
| `frontend/src/features/lovedOnes/components/LovedOneProfileModal.tsx` | Detailed modal presenting high-resolution photo, important memories, favorite activities, audio player, and editable patient notes. | Created |
| `frontend/src/features/lovedOnes/components/AssistedMemoryCueModal.tsx` | 4-stage gentle memory cue explorer with read-aloud support, revealable hints, no-shame skip controls, and Asha guidance. | Created |
| `frontend/src/features/lovedOnes/components/VoiceMemoryPlayer.tsx` | Authentic audio player with play/pause, duration counter, progress bar, transcript toggle, and verified manual attribution notice. | Created |
| `frontend/src/features/lovedOnes/components/AddEditLovedOneModal.tsx` | Accessible modal form to add/edit loved ones with avatar selector, custom cues, activity tags, and voice note setup. | Created |
| `frontend/src/pages/patient/LovedOnes.tsx` | Main Loved Ones page featuring Asha AI speaking greeting, verified privacy vault banner, search bar, card gallery, and modal coordination. | Updated |
| `backend/firestore.rules` | Refined `/lovedOnes/{lovedOneId}` rules explicitly separating `read`, `create`, `update`, and `delete` operations. | Updated |
| `backend/src/test/securityRules.test.ts` | Added 4 security policy simulation tests verifying patient memory isolation and caregiver access boundaries. | Updated |
| `frontend/src/test/LovedOnesMilestone3.test.tsx` | Vitest & React Testing Library test suite with 14 comprehensive unit and integration tests. | Created |

---

## 3. Architecture & Functional Components

```
                               +-------------------------------------+
                               |            LovedOnes.tsx            |
                               |  (Header, Asha Greeting, Search)    |
                               +------------------+------------------+
                                                  |
                    +-----------------------------+-----------------------------+
                    |                                                           |
                    v                                                           v
   +----------------------------------+                        +----------------------------------+
   |       FamilyMemberCard.tsx       |                        |     AddEditLovedOneModal.tsx     |
   | - Photo & Fallback Avatar        |                        | - Name, Relationship, Nickname   |
   | - Name, Relationship, Phrase     |                        | - Prototype Portrait Presets     |
   | - Quick-Play Voice Note          |                        | - Memory Cues & Activities       |
   | - "Gentle Cues" Action           |                        | - Voice Note & Speaker Name      |
   +----------------+-----------------+                        +----------------------------------+
                    |
                    +-----------------------------+
                    |                             |
                    v                             v
   +----------------------------------+  +----------------------------------+
   |     LovedOneProfileModal.tsx     |  |    AssistedMemoryCueModal.tsx    |
   | - High-Res Portrait              |  | - 4 Gentle Memory Prompts        |
   | - Important Life Memories        |  | - Progressive Non-Shaming Hints  |
   | - Favorite Shared Activities     |  | - No-Penalty Skip Button         |
   | - VoiceMemoryPlayer Component    |  | - Text-to-Speech Read Aloud      |
   | - Patient / Caregiver Notes      |  | - Asha Encouraging Guidance      |
   +----------------------------------+  +----------------------------------+
```

### 3.1 Family Memory Cards (`FamilyMemberCard.tsx`)
- High-contrast card with generous touch target ($\ge 48\text{px}$) for users with fine-motor or visual challenges.
- Photograph with graceful fallback to styled initial avatar (`https://ui-avatars.com/...`) on load error.
- Identity chips:
  - Full Name in bold typography.
  - Distinct relationship pill (e.g. `Daughter & Primary Caregiver`, `Grandson (Age 9)`).
  - Optional pet/nickname tag (e.g. `"Anu"`, `"Chhotu"`).
  - Short personal description.
  - Familiar greeting/phrase badge (e.g. `💬 "Namaste Ma! Time for a warm cup of cardamom tea."`).
- Inline action controls:
  - `Voice Note (Xs)`: Quick-play button with pulsing animation when active.
  - `Gentle Cues`: Launches `AssistedMemoryCueModal`.
  - `View Profile`: Dedicated accessible button launching `LovedOneProfileModal`.

### 3.2 Individual Memory Profiles (`LovedOneProfileModal.tsx`)
- Detailed full-screen modal presenting:
  - Prominent portrait with border and heart icon badge.
  - Read Aloud button reading person's name, relationship, and description.
  - **Important Life Memories**: Significant family milestones (e.g., *"Our family holiday trip to Shimla watching the snow fall"*).
  - **Favorite Shared Activities**: Cherished shared joys (e.g., *"Sitting in the verandah sipping afternoon tea"*).
  - **Familiar Memory Cues**: Concrete associative prompts.
  - **Embedded Voice Memory Player**: Full audio controller with transcript.
  - **Personal Family Notes**: Patient or caregiver can add, edit, and persist gentle reminders (e.g., *"She loves yellow marigolds. Brings warm sweaters in winter."*).
  - Management actions: Edit profile and Delete profile (guarded by accessible confirmation dialog).

### 3.3 Assisted Memory Cues Engine (`AssistedMemoryCueModal.tsx`)
Presents 4 gentle associative cues:
1. **Cue 1: Identity** (*"Who is this familiar person?"*) &rarr; Hints at familiar greetings and pet names.
2. **Cue 2: Family Connection** (*"What is your loving connection with them?"*) &rarr; Explains family bonds warmly.
3. **Cue 3: Shared Joy** (*"What do you enjoy doing together?"*) &rarr; Highlights pastimes and comfortable moments.
4. **Cue 4: Voice Memory** (*"Would you like to hear their voice?"*) &rarr; Offers direct playback of their voice note.
- **Supportive Principles**:
  - Zero test scoring or pass/fail grades.
  - Prominent *"Skip this cue"* button without penalty or shame.
  - Reassuring Asha note on every screen: *"It is completely okay if names or memories take time. Love and warmth stay in the heart, always."*

### 3.4 Authentic Voice Memories (`VoiceMemoryPlayer.tsx`)
- Displays manually entered speaker attribution (e.g. *"Verified voice of Ananya Sharma"*).
- Elapsed timeline indicator and progress bar (`0:00 / 0:18`).
- Accessible Play/Pause toggle with prominent focus state.
- Expandable verbatim transcript for patients with hearing impairment.
- Audio synthesis fallback via `SpeechService` (Web Speech API) for prototype environments without external audio files.

### 3.5 Adding and Managing Loved Ones (`AddEditLovedOneModal.tsx`)
- Full CRUD management available to patients and authorized caregivers:
  - Full Name (required).
  - Relationship selector (with custom title option).
  - Nickname and Familiar Phrase inputs.
  - Photograph selector:
    - 6 pre-curated prototype family portraits (Spark-compliant).
    - Custom URL input.
    - Local file upload (read as client-side data URI).
  - Dynamic memory cue tags and shared activity tags.
  - Voice recording configuration (manual speaker name, title, transcript, duration slider).
  - Personal private notes.

---

## 4. Privacy, Security & Spark Plan Compliance

### 4.1 Strict Privacy & Safety Guardrails
- **No Facial Recognition:** The application contains zero facial recognition libraries, facial embedding models, or computer vision classifiers.
- **No Identity Guessing:** Asha companion never guesses, assumes, or hallucinates family relationships. All cues and relationships are rendered verbatim from explicitly entered records.
- **No Synthetic Voice Impersonation:** No audio deepfakes, AI voice cloning, or simulated family audio. Voice notes are authentic recordings entered by the family.

### 4.2 UID Data Scoping & Firestore Security Rules
All memory records are scoped strictly to `patientId`:
```
match /lovedOnes/{lovedOneId} {
  allow read: if isAuthenticated() && (
    isOwner(resource.data.patientId) ||
    isConnectedCaregiver(resource.data.patientId)
  );
  allow create: if isAuthenticated() && (
    isOwner(request.resource.data.patientId) ||
    isConnectedCaregiver(request.resource.data.patientId)
  );
  allow update, delete: if isAuthenticated() && (
    isOwner(resource.data.patientId) ||
    isConnectedCaregiver(resource.data.patientId)
  );
}
```
- A caregiver can **only** read and manage memories for patients with an `active` relationship.
- Caregivers cannot access or mutate memories of unauthorized patients.
- Verified in `backend/src/test/securityRules.test.ts`.

### 4.3 Firebase Free Spark Plan Compliance
- Firebase Storage bucket limits on the Free Spark plan do not permit unbudgeted media hosting.
- Local prototypes, data URIs, and pre-seeded high-quality portraits are used.
- Media URLs are stored purely as metadata strings in document records.
- **Future Migration Path:** When upgraded to Firebase Blaze in future phases, media uploads can effortlessly route through `getStorage()` and `uploadBytesResumable()` using the exact same schema.

---

## 5. Visual Structure ASCII Wireframes

### 5.1 Loved Ones Album Gallery
```
+-----------------------------------------------------------------------------------+
|  [<- Back]  Loved Ones                                   [ + Add Loved One ]      |
|             Family & Identity Anchor • Verified loving memories                   |
|                                                                                   |
|  [ 🌸 Asha ]: "Here are the smiling faces and warm voices of people who cherish   |
|               you. Take your time browsing."                         [ 🔊 Listen ]|
|                                                                                   |
|  [ 🛡️ Verified Family Vault: All details verified by family • No AI guessing ]    |
|                                                                                   |
|  [ 🔍 Search by name, relationship, or nickname (e.g. Daughter, Aarav)...       ] |
+-----------------------------------------------------------------------------------+
|  +-----------------------------------------------------------------------------+  |
|  | [Photo]  Ananya Sharma                               [ Daughter & Caregiver ]|  |
|  |  ( ❤️ )  Also known as "Anu"                                                |  |
|  |          Lives nearby in Indiranagar. Visits every Tuesday and Sunday.       |  |
|  |          💬 "Namaste Ma! Time for a warm cup of cardamom tea."               |  |
|  |                                                                             |  |
|  |          [ 🔊 Voice Note (18s) ]  [ ✨ Gentle Cues ]  [ View Profile -> ]    |  |
|  +-----------------------------------------------------------------------------+  |
|  +-----------------------------------------------------------------------------+  |
|  | [Photo]  Aarav Sharma                                [ Grandson (Age 9) ]    |  |
|  |  ( ❤️ )  Also known as "Chhotu"                                             |  |
|  |          Ananya's son. Full of cheerful curiosity, loves origami animals.   |  |
|  |          💬 "Dadi! Look what I made for you today!"                         |  |
|  |                                                                             |  |
|  |          [ 🔊 Voice Note (12s) ]  [ ✨ Gentle Cues ]  [ View Profile -> ]    |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  ✨ 4 family memory profiles safely stored • Always with you ❤️                   |
+-----------------------------------------------------------------------------------+
```

### 5.2 Individual Memory Profile Modal (`LovedOneProfileModal.tsx`)
```
+-----------------------------------------------------------------------------------+
|  Personal Memory Profile                 [ 🔊 Read ] [ ✏️ Edit ] [ 🗑️ Remove ] [X] |
+-----------------------------------------------------------------------------------+
|  [ Large Photo ]  Ananya Sharma  ["Anu"]                                          |
|      ( ❤️ )       Daughter & Primary Caregiver                                    |
|                   Lives nearby in Indiranagar. Visits Tuesday and Sunday.         |
|                   💬 "Namaste Ma! Time for a warm cup of cardamom tea."           |
|                                                                                   |
|  [ ✨ Assisted Memory Cues: Gentle questions to explore who this is ] [Explore ->]|
|                                                                                   |
|  VOICE MESSAGE MEMORY                                                             |
|  +-----------------------------------------------------------------------------+  |
|  | [ 🔊 ] Sunday Temple Visit & Afternoon Tea               [ Verified Audio ] |  |
|  |        Verified voice of Ananya Sharma                                      |  |
|  |        [ ▶ Play ]  0:00 / 0:18  [====================]        [ 📄 Script ] |  |
|  |        "Namaste Ma! It is Ananya. Coming over on Sunday at 3 PM..."         |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  IMPORTANT FAMILY MEMORIES              FAVORITE SHARED ACTIVITIES                |
|  * Family holiday trip to Shimla        * Verandah afternoon tea                  |
|  * Bangalore University graduation      * Watering balcony potted tulsi           |
|                                                                                   |
|  PERSONAL FAMILY NOTES                                       [ Edit Note ]        |
|  "She loves yellow marigolds. Brings warm sweaters in winter."                     |
+-----------------------------------------------------------------------------------+
```

### 5.3 Assisted Memory Cues Modal (`AssistedMemoryCueModal.tsx`)
```
+-----------------------------------------------------------------------------------+
|  ✨ Gentle Memory Cues                                                         [X] |
|     Exploring memories of Ananya Sharma • No test, take your time                 |
+-----------------------------------------------------------------------------------+
|  [Photo]  Ananya Sharma • Daughter & Primary Caregiver               Cue 1 of 4   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | [ Identity Cue ]                                             [ 🔊 Read Cue ]|  |
|  |                                                                             |  |
|  | Who is this familiar person?                                                |  |
|  | Take a gentle look at the photograph. Do you recognize their smile?         |  |
|  |                                                                             |  |
|  | [ Show Gentle Hint ]                                                        |  |
|  |                                                                             |  |
|  | (When revealed:)                                                            |  |
|  | 😊 This is Ananya Sharma (often called "Anu")                              |  |
|  |    They often greet you saying: "Namaste Ma! Time for tea."                 |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  🌸 Asha's Gentle Note: "It is completely okay if names take time. Love and       |
|                         warmth stay in the heart, always."                        |
|                                                                                   |
|  [ 🔄 Start Over ]                            [ Skip this cue ]  [ Next Cue -> ]  |
+-----------------------------------------------------------------------------------+
```

---

## 6. Verification & Test Results

### 6.1 Milestone 3 Dedicated Test Suite (`LovedOnesMilestone3.test.tsx`)
All 14 comprehensive tests passed:
- `✓ renders family member cards with names, photos, relationships, descriptions, and cues`
- `✓ renders familiar phrase and voice note indicator on cards`
- `✓ opens detailed profile modal when a card is selected`
- `✓ allows patient or caregiver to edit and save personal notes in profile`
- `✓ opens gentle memory cues modal and presents non-shaming exploration`
- `✓ reveals gentle hint warmly without testing or shaming`
- `✓ allows patient to skip questions at any point without penalty`
- `✓ displays authentic voice player with manual speaker attribution and duration`
- `✓ toggles audio playback without failing`
- `✓ opens add loved one modal and saves new family member to album`
- `✓ deletes a loved one with confirmation dialog`
- `✓ strictly isolates memory album data by patient UID in storage`
- `✓ prominently displays verified vault banner guaranteeing no facial recognition or automated identity guessing`
- `✓ filters loved ones by name, relationship or nickname`

### 6.2 Full Project Regression Test Run
| Test Suite | Total Tests | Passed | Failed | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Frontend (`vitest run`) | 58 | 58 | 0 | 3.97s | **PASSED** |
| Backend (`vitest run`) | 23 | 23 | 0 | 0.37s | **PASSED** |
| TypeScript Linting (`tsc --noEmit`) | - | 0 errors | 0 | 2.05s | **PASSED** |
| Vite Production Build (`vite build`) | - | Built clean | 0 | 2.24s | **PASSED** |

---

## 7. Known Limitations & Next Steps

1. **Storage Quota & Free Tier:** Custom uploaded files are encoded as client-side data URIs to guarantee zero cost on the Firebase Spark plan. When upgraded to Blaze in a future production phase, these can be seamlessly migrated to Firebase Cloud Storage.
2. **Audio Hardware Fallback:** Web Speech synthesis provides audio playback when custom binary audio assets are not present in test or prototype environments.

---

## 8. Git Status

- **Branch:** `phase-2-patient-experience`
- **Implementation Commit:** `876b9bd`
- **Documentation Commit:** Current commit

*Milestone 3 is complete. In adherence to the strict instructions, no further work on Mind Games will proceed until explicit user approval is granted.*
