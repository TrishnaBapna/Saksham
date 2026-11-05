# Saksham — Development Changelog

## [0.2.0] - Unified Authentication & Adaptive UI (2026-11-05)

### Unified Authentication Architecture & Strict RBAC
- Built a single shared authentication system with four visually distinct adaptive role login experiences:
  - **Patient**: Soft lavender/pink identity with animated Asha character visualizer, large typography, and warm speech cues.
  - **Caregiver**: Soft teal/blue medical care styling, patient invitation linking status notice.
  - **Doctor**: Medical navy/teal styling with license verification notice and doctor registration application.
  - **Admin**: Slate/navy security styling with strict zero-public-registration governance.
- Common entry screen (`RoleSelector.tsx`) with Saksham branding, tagline *"Care • Connection • Confidence"*, and 4 interactive role cards.
- **Strict Free-Tier (Firebase Spark) Enforcement**:
  - Operates completely within free quotas without paid Blaze dependencies or billing accounts.
  - Uses Firebase Authentication (Email/Password) and Cloud Firestore (`users/{uid}`) with security rules preventing client role modifications.
  - Designed for seamless zero-code upgrade to Blaze / Custom Claims in the future.
- **Strict RBAC & Boundary Enforcement**:
  - Role portal selection is purely aesthetic/navigation; backend & verified records govern true role identity.
  - Cross-role login attempts (e.g. logging into Doctor portal with Caregiver account) are automatically rejected with friendly guidance.
  - Status enforcement: Pending doctor accounts and suspended accounts are prevented from accessing protected dashboards.
- Route security guard (`ProtectedRoute.tsx`) guarding `/patient/*`, `/caregiver/*`, `/doctor/*`, and `/admin/*`.
- 13 new automated tests added (total 22 frontend + 7 backend tests, all passing).

## [0.1.0] - Phase 1 Milestone (2026-11-05)

### Initial Architecture & Documentation
- Established clean root structure: `frontend/`, `backend/`, and `docs/`.
- Authored comprehensive architectural specifications:
  - `docs/ARCHITECTURE.md`: Layered system design, safe AI whitelist, accessibility patterns.
  - `docs/DATABASE_SCHEMA.md`: 20 Firestore collection contracts and composite indices.
  - `docs/ROLE_PERMISSIONS.md`: Cryptographic RBAC, Custom Claims, and Firestore rules.
  - `docs/UI_GUIDELINES.md`: Soft lavender/purple design tokens, typography, contrast specs.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase-by-phase development blueprint.

### Frontend Foundation
- Scaffolded React 18 + TypeScript + Vite client with mobile-first responsive layout.
- Integrated Tailwind CSS styling tokens with lavender (`#F3E8FF`, `#8B5CF6`, `#7C3AED`) and soft rose palettes.
- Created character asset framework (`frontend/src/assets/characters/`) with 8 emotional/interactive states (Idle, Greeting, Listening, Speaking, Thinking, Happy, Reminder, Encouraging) and dual avatars (Asha & Kabir).
- Implemented core Patient Home experience:
  - Interactive AI Companion with voice and text input.
  - Whitelisted safe action dispatcher.
  - 11:00 AM Next Activity reminder card with assisted recall prompt.
  - 3 primary care modules: Daily Routines, Loved Ones, and Mind Games.
  - Gentle progress tracker and bottom navigation bar.
- Implemented role-based route structure for Patient, Caregiver, Doctor, and Admin with role-switching simulator for prototype evaluation.
- Added accessibility context with dynamic font sizing (Normal, Large, Extra Large), high contrast mode, and simple mode.

### Backend Scaffolding
- Structured Firebase Cloud Functions in TypeScript.
- Authored production-ready `firestore.rules` and `storage.rules`.
- Created backend AI proxy route handler with action validation.

### Testing & Verification
- Unit test suite for frontend AI action parsing, character state engine, role route guards, and 3-chance assisted recall logic.
- Backend test suite for role validation and permission policies.
