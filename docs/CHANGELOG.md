# Saksham — Development Changelog

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
