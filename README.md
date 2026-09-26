# 🌐 Trishna Bapna — Production Portfolio & Digital Laboratory

> **"I BUILD DIGITAL THINGS THAT TURN IDEAS INTO EXPERIENCES."**  
> *Creative Technologist • Student • Developer • Artist • Builder*  
> Official GitHub: [https://github.com/TrishnaBapna](https://github.com/TrishnaBapna)

---

## ⚡ Overview

A production-grade, full-stack personal portfolio and digital laboratory designed and built for **Trishna Bapna**. Built with an editorial aesthetic using **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **Framer Motion**, and **Web Audio API**.

The portfolio is strictly grounded in Trishna's **real GitHub projects** and public code repositories—never fabricating experience, metrics, or imaginary client projects.

### 🌟 Key Highlights

1. **Editorial Design System**: Custom warm editorial palette (`#F1EEE7` background, `#171717` primary, `#777777` muted, `#FF5A36` flame accent) with typography pairing Space Grotesk, Manrope, and DM Mono.
2. **Authentic Project Showcase & Case Studies**: Comprehensive 16-section deep-dive case studies for Trishna's real repositories:
   - **[Saksham (सक्षम)](https://github.com/TrishnaBapna/Saksham)** — Cognitive Wellness & Parkinson's Routine Studio with tremor-safe targets, anti-overwhelm evening guard, and Doctor's animated SVG progress rings.
   - **[Kaushal Setu (कौशल सेतू)](https://github.com/TrishnaBapna/Kaushal-Setu)** — Longitudinal Skilling Outcomes & Triangulation System for vocational apprenticeships and DBT top-ups.
   - **[Saarthi AI (सारथी)](https://github.com/TrishnaBapna/Saarthi)** — Livestock Health Platform with offline-first rural veterinary triage.
   - **[LUXORA](https://github.com/TrishnaBapna/LUXORA)** — Intelligent hotel guest service platform with live SLA countdown timers.
   - **[Shonen Study Academy](https://github.com/TrishnaBapna/trishya-anime-study-app)** — Gamified anime productivity timer with XP progression.
   - **[Deadpool: Merc with a Browser](https://github.com/TrishnaBapna/trishya)** — Interactive comic webtoon reader with pop-art canvas.
   - **[Git Practice](https://github.com/TrishnaBapna/git-practice)** — The foundational genesis of Trishna's software engineering journey.
3. **Live GitHub Integration**: Layered in `lib/github.ts` with ISR caching, real-time repository stats, language breakdown, and resilient offline fallback data.
4. **Interactive Terminal (`TRISHNA.OS`)**: A keyboard-accessible command-line simulator (`Cmd+K`) supporting commands (`help`, `about`, `skills`, `projects`, `github`, `contact`, `music`, `social`, `clear`).
5. **Grounded AI Assistant (`ASK TRISHNA AI`)**: Server-side assistant strictly answering from verified project data and skills, with intelligent error recovery.
6. **Creative Lab**: Dedicated atelier for traditional ink studies, UI sketches, generative waveforms, and an interactive **Browser Acoustic Metronome** running on the Web Audio API.
7. **Custom Music Player**: Audio player docked with volume controls, track seeking, persistence in localStorage, and Web Audio API synthesizer fallback.
8. **Protected Admin CMS (`/admin`)**: Secure control panel for managing projects, dev-log articles, creative lab items, and reviewing contact messages.
9. **Full Accessibility & Performance**: WCAG AAA considerations, high contrast, reduced-motion preferences, dark/light theme switching, and optimized SVGs.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router, Server Components, Route Handlers) |
| **Language** | TypeScript (Strict mode enabled) |
| **Styling** | Tailwind CSS, CSS Variables, Editorial Theme Tokens |
| **Motion** | Framer Motion, Spring Physics |
| **Audio** | Native HTML5 Audio, Web Audio API Oscillators & Synthesis |
| **Database** | Prisma ORM, PostgreSQL (with SQLite zero-config local fallback) |
| **Validation** | Zod Schemas (client and server side) |
| **Forms** | React Hook Form, `@hookform/resolvers/zod` |
| **Testing** | Vitest (Unit tests), Playwright (End-to-End tests), JSDOM |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) |

---

## 📁 Project Directory Structure

```
excited-pascal/
├── app/
│   ├── admin/               # Protected CMS (/admin, /admin/projects, /admin/messages)
│   ├── api/                 # Next.js Route Handlers (contact, ai/chat, admin/auth)
│   ├── blog/                # Dev Log index & dynamic [slug] article pages
│   ├── contact/             # Contact page with React Hook Form + Zod
│   ├── lab/                 # Creative Lab with Lightbox & Acoustic Metronome
│   ├── projects/            # Real projects index & 16-section [slug] case studies
│   ├── error.tsx            # Error boundary
│   ├── globals.css          # Theme tokens, font variables, scrollbars
│   ├── layout.tsx           # Root layout with fonts, JSON-LD schema, music player
│   ├── not-found.tsx        # 404 page
│   ├── page.tsx             # Homepage composing all editorial sections
│   ├── robots.ts            # Dynamic robots.txt
│   └── sitemap.ts           # Dynamic XML sitemap
├── components/
│   ├── home/                # Modular homepage sections (Hero, About, Skills, GitHub)
│   ├── ai-assistant-modal.tsx # "Ask Trishna AI" grounded modal
│   ├── custom-cursor.tsx    # Subtle desktop trailing cursor with a11y fallbacks
│   ├── interactive-terminal.tsx # TRISHNA.OS interactive terminal
│   ├── music-player.tsx     # Custom audio player with Web Audio synth fallback
│   ├── navbar.tsx           # Responsive navigation with full-screen mobile menu
│   └── footer.tsx           # Expressive footer with live IST timezone clock
├── data/
│   ├── projects.ts          # Trishna's REAL verified projects with 16 sections
│   ├── skills.ts            # Categorized skills (Using, Learning, Exploring)
│   ├── blog.ts              # Authentic student dev-log articles
│   └── gallery.ts           # Creative Lab artifacts & metadata
├── lib/
│   ├── db.ts                # Prisma client singleton and health checks
│   ├── github.ts            # GitHub API service layer with ISR cache & fallback
│   ├── site-config.ts       # Single source of truth configuration
│   └── validations/         # Zod schemas for forms
├── prisma/
│   └── schema.prisma        # PostgreSQL relational schema
├── public/
│   ├── images/              # profile.jpg, project SVGs, artwork, blog covers
│   └── music/               # background.mp3 ambient focus track
├── tests/
│   ├── e2e/                 # Playwright test specs
│   ├── contact.test.ts      # Zod validation tests
│   ├── github.test.ts       # GitHub resilience tests
│   └── projects.test.ts     # Real projects data integrity tests
├── .env.example             # Example environment variables
├── package.json
├── playwright.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 🚀 Quickstart & Installation

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/TrishnaBapna/trishna-portfolio.git
cd trishna-portfolio
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your environment settings:
- `ADMIN_PASSWORD`: Master password for `/admin` (Default: `trishna-admin-secure-2026`).
- `DATABASE_URL`: PostgreSQL connection string (or use default SQLite for local dev).
- `GITHUB_ACCESS_TOKEN`: *(Optional)* GitHub personal access token for higher API rate limits.
- `AI_API_KEY`: *(Optional)* OpenAI or Gemini API key if using cloud AI (has built-in local grounded fallback).
- `RESEND_API_KEY`: *(Optional)* For forwarding contact messages to your personal inbox.

### 3. Initialize Prisma Database

```bash
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your portfolio.

---

## 🛠️ How Trishna Can Customize Her Site

Everything personal is centralized in **`lib/site-config.ts`** and **`data/`**:

### 1. Update Profile Photo
Place your real photo at:
```
public/images/profile.jpg
```
The application will automatically render and optimize it using Next.js Image.

### 2. Change Ambient Focus Music
Replace or add your audio track to:
```
public/music/background.mp3
```
You can also update track title, artist name, and defaults in `lib/site-config.ts` under the `music` object.

### 3. Add New Projects or Case Studies
Open `data/projects.ts` and add your project entry adhering to the `ProjectItem` schema. When your project exists on GitHub, provide its exact repository name and link!

### 4. Add Blog Posts / Dev Logs
Open `data/blog.ts` and append a new post to `BLOG_POSTS`. Include your markdown content, reading time, and related project link.

### 5. Add Creative Lab Artwork
Drop your artwork/sketch images into `public/images/artwork/` and add the item details to `data/gallery.ts`.

### 6. Update Social Links
Edit `lib/site-config.ts` under `socials`:
```ts
socials: {
  github: "https://github.com/TrishnaBapna",
  linkedin: "https://linkedin.com/in/your-profile",
  instagram: "https://instagram.com/your-handle",
  youtube: "https://youtube.com/@your-channel",
  email: "your-email@example.com"
}
```

---

## 🧪 Running Tests

### Unit Tests (Vitest)
```bash
npm run test
```

### End-to-End Tests (Playwright)
```bash
npm run test:e2e
```

### Type Checking
```bash
npx tsc --noEmit
```

### Production Build
```bash
npm run build
```

---

## 🌐 Production Deployment

### Recommended: Deploying to Vercel
1. Push this repository to GitHub under `TrishnaBapna`.
2. Connect the repository in [Vercel](https://vercel.com).
3. Set the environment variables in the Vercel project settings (`ADMIN_PASSWORD`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`).
4. Click **Deploy**. Vercel will automatically build the Next.js App Router application and provision ISR caching.

---

## 📜 License & Attribution

Designed and developed for **Trishna Bapna**. Released under the MIT License.
