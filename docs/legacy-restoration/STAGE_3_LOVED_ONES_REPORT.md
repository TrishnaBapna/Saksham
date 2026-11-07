# SAKSHAM — LEGACY RESTORATION STAGE 3
## FAMILY MEMORY, PHOTOS & RECALL EXPERIENCE REPORT

**Milestone**: Legacy Restoration — Stage 3: Loved Ones & Family Memory Restoration  
**Date**: November 7, 2026  
**Active Branch**: `phase-2-patient-experience`  
**Repository**: `/Users/trishnabapna/Desktop/Saksham`  
**Status**: COMPLETE — ALL TESTS PASSING (184 / 184 Tests, 0 Build Errors)

---

## 1. Executive Summary

Stage 3 restores the best patient-facing capabilities from the legacy Saksham application (`Saksham-Legacy-main`) into the new Saksham architecture while preserving:
1. Unified Cloud Firestore integration and offline-first UID-scoped caching (`lovedOnesService.ts`).
2. Clinical safeguards and non-diagnostic memory anchors.
3. 100% Spark (free-tier) compliance (on-device canvas image compression, zero paid Cloud Functions, zero paid Cloud Storage).
4. Strict privacy guarantees: zero automated facial recognition and zero AI identity guessing.
5. Role-based security: full access for patients, linked access for connected caregivers, and clinical read-only access for doctors with direct dialing and profile editing restricted.

---

## 2. Seven Core Functional Areas Implemented

### A. Family Photo Cards
- **Component**: [`FamilyMemberCard.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/lovedOnes/components/FamilyMemberCard.tsx)
- Displays high-contrast saved photograph or accessible avatar fallback with person initials.
- Shows person's full name, relationship badge, optional nickname, and personal description.
- Displays familiar phrase badge (`💬 "Namaste Ma! Time for a warm cup of cardamom tea."`).
- Direct action buttons with accessible $\ge 48\text{px}$ touch targets:
  - `📞 Call`: Initiates direct dialer link (`tel:${member.phoneNumber}`).
  - `💬 WhatsApp`: Launches WhatsApp chat (`https://wa.me/${cleanNumber}`).
  - `🔊 Voice Note`: Triggers audio playback with duration indicator.
  - `✨ Gentle Cues`: Opens non-shaming assisted memory cues exploration.
  - `View Profile →`: Opens detailed memory profile modal.

### B. Personal Memory Profile Modal
- **Component**: [`LovedOneProfileModal.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/lovedOnes/components/LovedOneProfileModal.tsx)
- Displays large hero portrait with relationship badge, nickname, and personal description.
- Direct contact action buttons (`Call` and `WhatsApp Message`).
- Important family memories list with bullet points.
- Favorite shared activities list (e.g. afternoon tea, carrom, garden visits).
- Familiar memory cues grid.
- Interactive personal notes editor with instant local and Firestore persistence.
- Audio voice note playback with speaker attribution, transcript, and duration.
- Relationship Hint toggle section.
- Role-guarded controls (edit & delete hidden for doctor role).

### C. Memory Clues
- Multi-cue storage per family member (`cues: string[]`).
- Stores verified, patient-approved life cues (e.g., "Calls you every morning at 9:00 AM", "Works as a landscape architect").
- Strictly manual verification: AI never invents memories or fabricates family relationships.

### D. Voice Assistance
- Browser-native Web Speech synthesis and genuine recorded audio support.
- Reads memory cues and profile descriptions aloud on click.
- Audio note player with full spoken transcript, duration indicator, and verified speaker attribution.
- Supports multi-language narration (English and Hindi).

### E. Relationship Hint
- Accessible toggle: `Reveal Relation` / `Hide Relation`.
- Gently displays: `"This is Ananya Sharma, your Daughter & Primary Caregiver!"` accompanied by a reassuring message.
- Available in both the Profile Modal and the Assisted Family Recall Quiz.
- Never tests, scores, or shames the patient.

### F. Assisted Family Recall Quiz
- **Component**: [`AssistedFamilyRecallQuiz.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/lovedOnes/components/AssistedFamilyRecallQuiz.tsx)
- Recreates and enhances the legacy `LovedOnesView` face recall quiz:
  - Displays one family member's portrait at a time with accessible fallbacks.
  - Displays an anchor memory clue (familiar phrase or key memory).
  - "🔊 Listen to Clue" button reads clue aloud via speech service.
  - "💡 Reveal Relation" button offers an immediate gentle hint.
  - 4 large multiple-choice name options (target person + 3 gentle distractors).
  - Positive affirmation on match with harmonic chime (`audioSynthesizer.playChime('chime')`).
  - Gentle supportive encouragement on non-match (`"A warm and loving face! Listen to the clue or tap Reveal Relationship."`), never punitive.
  - "Next Person →" button advances through the family album.
  - Non-timed, relaxed pace with an immediate exit/close button.

### G. Family Contact Actions
- Quick phone dialer link (`tel:${phoneNumber}`).
- Direct WhatsApp link (`https://wa.me/${whatsappNumber}`).
- Role-based restrictions: doctors receive clinical read-only view and cannot dial or modify profiles.

---

## 3. Photo Management & Zero-Cost Spark Plan Compression

### Limitation & Architectural Solution:
Firebase Storage is not enabled or free under the target Firebase Spark plan setup. Storing raw megabyte phone photos as base64 in Firestore documents would exceed document quotas and bloat network traffic.

### Solution Implemented:
- **Module**: [`imageCompression.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/lovedOnes/utils/imageCompression.ts)
- On-device `<canvas>` proportional downscaling to max $320\times320\text{px}$ at $0.75$ JPEG quality.
- Compresses a 2MB–10MB camera photo down to $\sim 12\text{KB}–24\text{KB}$.
- Completely fits within free-tier Firestore and localStorage without bloating records.
- Supports:
  - Camera capture via HTML5 `getUserMedia` live camera stream or native `<input type="file" capture="user">`.
  - File/gallery image upload.
  - Real-time photo preview.
  - Photo replacement and deletion (reverts to accessible initials avatar).
  - 6 warm prototype family portrait presets for zero-cost instant selection.

---

## 4. Privacy, Safety & Clinical Guardrails

1. **Zero Facial Recognition**: No unvalidated OpenCV/FaceNet/AI facial recognition libraries are loaded or used.
2. **Zero Identity Guessing**: The companion and system never guess who a visitor is or fabricate identity claims.
3. **Data Scoping**: Every family record is tagged with `patientId` and isolated per patient UID.
4. **Verified Vault**: Prominent banner displayed on the album header reminding patients and families of verified data guarantees.

---

## 5. Asha AI Companion Integration

Updated [`aiService.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/services/aiService.ts) to handle:
- **Who is this person?**: Explains identity using saved verified memory records.
- **Explain relationship**: Explains family roles (e.g., "Ananya Sharma is your Daughter & Primary Caregiver...").
- **Read memory clue**: Recites the first memory clue or familiar phrase when asked ("Tell me a memory clue for Ananya").
- **Offer recall activity**: Suggests and navigates to the Face Recall Quiz when asked about family games or memory quizzes.
- **Reassure forgetfulness**: Responds with empathy when patient says "I cannot remember" or "I forgot":
  > *"Please do not worry at all. Take a gentle breath. You are in a safe, caring space. Your loved ones are always with you, and we can take all the time you need."*
- **Truthful when unavailable**: If a requested person is not in the verified album, Asha states so plainly instead of hallucinating or guessing.

---

## 6. Patient & Caregiver Permission Rules

- **Patient**: Full access to view, call, WhatsApp, add, edit, and delete family records.
- **Caregiver**: Granted access only when connected with status `active` for the patient.
- **Doctor**: Strictly restricted from direct dialer links, WhatsApp messaging, and profile modifications. Displays `Clinical Review Mode` alert banner.
- **Firestore Security Rules**: Preserved unchanged in `backend/firestore.rules` (lines 146–163), enforcing immutable `patientId` ownership.

---

## 7. Verification & Test Results

### Frontend Test Results (`npm test --prefix frontend`):
- **17 test files passed**, **153 / 153 tests passed**.
- Dedicated Stage 3 test suite: [`LovedOnesRestorationStage3.test.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/test/LovedOnesRestorationStage3.test.tsx) (**20 / 20 tests passed**):
  - 1. Loved Ones Home & Reassuring Structure (3 tests)
  - 2. Family Photo Cards & Contact Actions (2 tests)
  - 3. Personal Memory Profile Modal (2 tests)
  - 4. Relationship Hint Toggle (1 test)
  - 5. Assisted Family Recall Quiz (4 tests)
  - 6. Photo Management & Lightweight Compression (2 tests)
  - 7. Patient Data Isolation & UID Scoping (1 test)
  - 8. Asha AI Companion Integration with Loved Ones (5 tests)
- Milestone 3 regression test suite: [`LovedOnesMilestone3.test.tsx`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/test/LovedOnesMilestone3.test.tsx) (**14 / 14 tests passed**).

### Backend Test Results (`npm test --prefix backend`):
- **3 test files passed**, **31 / 31 tests passed** (including all 24 security rule tests).

### Combined Test Status:
- **184 / 184 tests passed across 20 suites** (100% pass rate).
- Production build (`tsc && vite build`): **0 TypeScript errors, 0 Vite errors**.

---

## 8. Summary of Files Changed

| File Path | Description of Changes |
|-----------|------------------------|
| `frontend/src/types/index.ts` | Added `phoneNumber`, `whatsappNumber`, and `phone` optional fields to `FamilyMember`. |
| `frontend/src/features/lovedOnes/utils/imageCompression.ts` | Created on-device image downscaling and compression utility (~15KB JPEG output). |
| `frontend/src/features/lovedOnes/services/lovedOnesService.ts` | Added phone numbers to default family members; fixed empty album array caching. |
| `frontend/src/features/lovedOnes/components/AssistedFamilyRecallQuiz.tsx` | Created interactive face recall quiz runner with cues, reveal hint, options, and sound. |
| `frontend/src/features/lovedOnes/components/FamilyMemberCard.tsx` | Added Call and WhatsApp action buttons and role-guarded permissions. |
| `frontend/src/features/lovedOnes/components/LovedOneProfileModal.tsx` | Added contact buttons, relationship hint toggle, and doctor permission guard. |
| `frontend/src/features/lovedOnes/components/AddEditLovedOneModal.tsx` | Added telephone/WhatsApp inputs, camera capture, file compression, and remove photo. |
| `frontend/src/pages/patient/LovedOnes.tsx` | Integrated recall quiz section, doctor role banner, and empty state handling. |
| `frontend/src/services/aiService.ts` | Enhanced Asha intents for relationship explanation, clues, recall quiz, and reassurance. |
| `frontend/src/test/LovedOnesRestorationStage3.test.tsx` | Created 20 comprehensive unit and integration tests for Stage 3. |
| `docs/legacy-restoration/STAGE_3_LOVED_ONES_REPORT.md` | Created technical documentation report. |
