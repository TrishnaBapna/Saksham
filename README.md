# Saksham (सक्षम) — Cognitive Wellness & Routine Studio

> **Tremor-Resilient, Voice-First Daily Management & Cognitive Therapy for Parkinson's Patients, Caregivers, and Doctors**  
> Live Production: [https://saksham-rho-six.vercel.app/](https://saksham-rho-six.vercel.app/)

---

## 🌟 Overview

**Saksham** is an accessible, multilingual Progressive Web Application (PWA) backed by **PostgreSQL (via Supabase)** with an intelligent **offline-first local synchronization engine**. It is specifically designed for elderly patients living with Parkinson's Disease (Hoehn & Yahr Stages I–III), their family caregivers, and attending neurologists.

Built with high-contrast accessibility, tremor-friendly interactive targets, hands-free voice control, and localized Indian language recognition (Hindi, Marathi, Gujarati, Kannada, Malayalam, Marwari/Rajasthani, and English).

---

## 🗄️ Database Architecture & Cloud Backend

Saksham employs a **Database-First with Offline Local Synchronization & Fallback Pattern**:

1. **Primary Database Engine: PostgreSQL via Supabase**
   - Normalized relational tables with Foreign Keys, Cascading Deletes, JSONB sub-structures, and Indexes.
   - Row Level Security (RLS) policies for secure multi-tenant data access.
   - Instant client synchronization via the official Supabase JS SDK.
2. **Offline-First Resilience**:
   - For elderly patients in areas with spotty connectivity, the app transparently syncs data to local state and `localStorage`.
   - 0ms latency user interactions: UI updates optimistically while writes are queued and mirrored to PostgreSQL.
3. **In-App Cloud DB Manager**:
   - Users and developers can configure or test their Supabase database connection at any time by clicking the **Cloud DB** indicator in the top navigation header or via the mobile tools drawer.

---

## 📊 Database Schema & Tables

The schema is defined in [`db/schema.sql`](file:///Users/trishnabapna/Documents/antigravity/excited-pascal/db/schema.sql) and seeded via [`db/seed.sql`](file:///Users/trishnabapna/Documents/antigravity/excited-pascal/db/seed.sql):

| Table Name | Description | Key Fields |
|---|---|---|
| `profiles` | User accounts across Patient, Caregiver, and Doctor roles | `id` (PK), `name`, `role`, `caregiver_name`, `caregiver_phone`, `lang`, `pin` |
| `tasks` | Scheduled daily activities, 3-chance cues, and step runners | `id` (PK), `user_id` (FK), `title`, `time`, `tag`, `status`, `runner_steps`, `diagnostic_checkpoints` |
| `loved_ones` | Photo vault, facial recall quizzes, and emergency contacts | `id` (PK), `user_id` (FK), `name`, `role`, `phone`, `whatsapp`, `clue`, `img`, `options` |
| `caregiver_alerts` | Real-time task latency, snooze, and adherence notifications | `id` (PK), `user_id` (FK), `time`, `text`, `severity`, `acknowledged` |
| `clinical_notes` | Observations recorded by family caregivers for neurologists | `id` (PK), `user_id` (FK), `author_role`, `author_name`, `title`, `body` |
| `doctor_directives` | Neurologist medical directives and Levodopa guidance | `id` (PK), `user_id` (FK), `doctor_name`, `title`, `body` |
| `telemetry_records` | Daily motor stability, speech dB, and completion metrics | `id` (PK), `user_id` (FK), `record_date`, `status`, `tasks_completed`, `latency_minutes`, `speech_db` |
| `user_progression` | Gamified cognitive XP, level tiers, streaks, and badges | `id` (PK), `user_id` (FK), `xp`, `level`, `streak`, `water_logged`, `badges` |

---

## 🛠️ Database Setup & Migrations

### Option A: Using Supabase Cloud (Recommended)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Run the schema creation script:
   - Copy and paste contents of [`db/schema.sql`](file:///Users/trishnabapna/Documents/antigravity/excited-pascal/db/schema.sql) and click **Run**.
4. Run the seed data script:
   - Copy and paste contents of [`db/seed.sql`](file:///Users/trishnabapna/Documents/antigravity/excited-pascal/db/seed.sql) and click **Run**.
5. Copy your **Project URL** and **Anon Public Key** from **Project Settings > API**.
6. In Saksham:
   - Click the **Cloud DB** pill in the top header.
   - Paste your Project URL and Anon Key, then click **Save & Connect**.
   - All tasks, profiles, clinical notes, and telemetry will automatically synchronize!

### Option B: Zero-Dependency Node Migration CLI

Run the migration utility in your terminal:
```bash
node db/migrate.js
```

Or execute directly with PostgreSQL `psql`:
```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

---

## 🔑 Environment Configuration

Create a `.env` file from the provided [`.env.example`](file:///Users/trishnabapna/Documents/antigravity/excited-pascal/.env.example):

```bash
# Supabase PostgreSQL Database
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.your-project-id.supabase.co:5432/postgres"

# Google Gemini AI Intelligence
GEMINI_API_KEY=""
```

---

## 📁 Repository Structure

```
├── index.html                  # Accessible Single Page Application UI
├── sw.js                       # PWA Service Worker v5 (offline caching & background alarms)
├── manifest.json               # Web App Manifest for mobile installation
├── privacy.html                # Privacy Policy & Local Data Sovereignty documentation
├── .env.example                # Environment variables template
│
├── db/                         # Database Schema & Migrations
│   ├── schema.sql              # PostgreSQL DDL with 8 tables, indexes & RLS policies
│   ├── seed.sql                # Complete initial data seed matching mock state
│   └── migrate.js              # Zero-dependency Node.js migration runner
│
├── css/                        # Stylesheets
│   └── style.css               # Clean typography, high-contrast & animation rules
│
├── js/                         # Modular Application Architecture
│   ├── config/
│   │   ├── constants.js        # Clinical presets, sound buffers, speech commands
│   │   └── db-config.js        # Runtime database connection manager
│   ├── state/
│   │   └── store.js            # Unified reactive state store & sync orchestrator
│   ├── services/
│   │   ├── db.js               # Database CRUD repository service (Supabase + Local Sync)
│   │   ├── audio.js            # Web Audio API synthesizers & chimes
│   │   ├── speech.js           # Multi-language speech recognition & TTS
│   │   ├── gemini.js           # Google Gemini 1.5 Flash API connector
│   │   ├── notifications.js    # Web Push & Audio Alarms
│   │   └── share.js            # Clinical PDF & Web Share export
│   ├── features/
│   │   ├── navigation.js       # Language selection & modal navigation
│   │   ├── routine.js          # Scheduled tasks, step-runner & 3-chance cues
│   │   ├── games.js            # Mind clinic cognitive games & scoring
│   │   ├── vault.js            # Loved ones memory cards & photo quiz
│   │   ├── movement.js         # 100 BPM metronome & LSVT speech dB meter
│   │   ├── calendar.js         # Interactive telemetry adherence calendar
│   │   ├── caregiver.js        # Caregiver hub, notes, doctor directives
│   │   └── ai-assistant.js     # Multilingual voice AI drawer
│   ├── utils/
│   │   ├── helpers.js          # Gamification XP, level calculation & hydration
│   │   └── intent.js           # Natural voice intent parsing (English + Indian tongues)
│   └── app.js                  # PWA bootstrap, authentication gateway & lifecycle
│
└── vercel.json                 # Static progressive web app configuration
```

---

## 🚀 Live Deployment

The application is deployed on Vercel:
- **Production URL**: [https://saksham-rho-six.vercel.app/](https://saksham-rho-six.vercel.app/)
