import { ProjectItem } from "@/types/project";

export const REAL_PROJECTS: ProjectItem[] = [
  {
    id: "saksham",
    slug: "saksham",
    title: "Saksham (सक्षम)",
    tagline: "Cognitive Wellness & Parkinson's Routine Studio",
    description:
      "Empowering Parkinson's & neuro-cognitive patients with rhythmic independence, anti-overwhelm evening guard, gamified XP, and multi-signal telemetry.",
    longDescription:
      "Saksham is a specialized digital therapy and routine studio developed to address the daily cognitive and motor challenges faced by individuals living with Parkinson's and neuro-cognitive impairments. Built with an accessible, high-contrast, tremor-forgiving interface, the application features an anti-overwhelm evening guard mode to combat sundowning anxiety, doctor's animated SVG progress rings, a rhythmic auditory metronome for gait stabilization, and multi-signal telemetry stored safely in browser storage.",
    category: "Assistive Tech & Healthcare",
    status: "Completed",
    featured: true,
    order: 1,
    githubUrl: "https://github.com/TrishnaBapna/Saksham",
    liveUrl: "https://trishnabapna.github.io/Saksham/",
    coverImage: "/images/projects/saksham-hero.svg",
    technologies: [
      "JavaScript (ES6+)",
      "Web Audio API",
      "PWA & Service Worker",
      "Chart.js Telemetry",
      "Tailwind CSS",
      "HTML5 LocalStorage",
      "SVG Vector Graphics",
    ],
    problem:
      "Parkinson's and cognitive impairment patients struggle with motor coordination, medication adherence, speech projection, and cognitive executive function. In the late afternoon and evening, cognitive fatigue and 'sundowning' often induce sensory overload and anxiety. Furthermore, clinical follow-ups lack objective granular adherence data.",
    goal:
      "Design and engineer a dignified, lightweight, offline-ready cognitive wellness studio that empowers patients to maintain rhythmic daily autonomy without medical anxiety, while generating actionable adherence telemetry for consulting physicians.",
    research:
      "Studied neurological rehabilitation research regarding Rhythmic Auditory Stimulation (RAS) for motor pacing, cognitive cueing techniques, high-contrast WCAG AAA accessibility for age-related vision changes, and tremor-tolerant interactive affordances with padded touch targets.",
    design:
      "Constructed a soothing teal and sage palette with high legibility typography, large 52px+ touch targets, and an 'Anti-Overwhelm Evening Guard' interface that dims high-frequency contrast and quiets ambient stimulation during vulnerable evening hours.",
    architecture:
      "Progressive Web App (PWA) client-first architecture powered by Service Worker caching for complete offline operability. Real-time audio pulse generation via Web Audio API oscillators, localized JSON telemetry datastore, and client-rendered SVG progress rings.",
    features: [
      "Achievement Badges Engine: Early Bird routine completion, Mind Master (≥80% drill accuracy), 5-Day Consistency Streak, and Hydration Hero tracking.",
      "Doctor's 3 Animated SVG Progress Rings: Real-time visual metrics for Cognitive Drills, Motor Exercises, and Daily Adherence.",
      "Anti-Overwhelm Evening Guard: Automatic and manual twilight mode minimizing visual stimuli to soothe sundowning anxiety.",
      "Rhythmic Motor Metronome: Web Audio API-driven acoustic cadence pacing for gait and hand mobility exercises.",
      "Voice Projection & Memory Drills: Interactive prompts designed to reinforce vocal volume and episodic memory recall.",
      "Privacy-First Local Telemetry: Zero third-party telemetry; all patient data remains securely in local device storage.",
    ],
    challenges:
      "Preventing inadvertent double-taps and jitter from resting or action tremors, while keeping the Web Audio API synthesizer responsive across varied mobile browsers without audio latency.",
    solution:
      "Implemented a customized debounced touch-target envelope with generous active zones, coupled with an audio context manager that initializes on the first user interaction and leverages native hardware time-stamps.",
    whatILearned:
      "Developed a profound appreciation for inclusive, assistive UX engineering. Learned low-level Web Audio API synthesis, service worker offline lifecycle management, and how empathetic software can directly improve quality of life.",
    futureImprovement:
      "Plan to integrate Web Bluetooth API to connect with lightweight wrist accelerometers for objective tremor frequency measurement, along with encrypted PDF telemetry export for clinical consultations.",
    screenshots: [
      {
        title: "Clinical Progress Rings & Routine Studio",
        caption: "Doctor's triple SVG rings tracking cognitive, motor, and hydration milestones.",
        url: "/images/projects/saksham-rings.svg",
      },
      {
        title: "Anti-Overwhelm Evening Guard Mode",
        caption: "Calming low-stimulation layout designed for twilight sundowning comfort.",
        url: "/images/projects/saksham-evening.svg",
      },
    ],
    stars: 0,
    forks: 0,
    language: "JavaScript",
    updatedAt: "2026-09-26",
  },
  {
    id: "kaushal-setu",
    slug: "kaushal-setu",
    title: "Kaushal Setu (कौशल सेतू)",
    tagline: "Longitudinal Skilling Outcomes, Quality Feedback & Triangulation System",
    description:
      "A comprehensive vocational training intelligence and outcomes platform tracking apprenticeships, employer quality feedback, DBT top-ups, and multi-stakeholder triangulation.",
    longDescription:
      "Kaushal Setu is a data intelligence platform built to bridge the systemic gap in vocational education tracking. Focusing on practical youth skilling initiatives—such as the Maharashtra Mukhyamantri Yuva Karya-Prashikshan Yojana (CM-MYKY) and green energy transitions—the system triangulates student attendance, employer feedback ratings, Direct Benefit Transfer (DBT) stipend verification (₹1,500/mo), and verifiable long-term employment placement.",
    category: "Public Good & GovTech",
    status: "Completed",
    featured: true,
    order: 2,
    githubUrl: "https://github.com/TrishnaBapna/Kaushal-Setu",
    liveUrl: "https://kaushal-setu-eta.vercel.app",
    coverImage: "/images/projects/kaushal-hero.svg",
    technologies: [
      "HTML5 & Modern DOM",
      "Tailwind CSS",
      "JavaScript (ES6+)",
      "Bilingual i18n (English & Marathi)",
      "Data Visualization Components",
      "Responsive Layout Grid",
    ],
    problem:
      "Vocational training programs frequently struggle with post-completion dropout rates, fraudulent attendance logs, delayed stipend distribution, and a lack of authentic employer feedback regarding real workforce readiness.",
    goal:
      "Provide an auditable, multi-stakeholder platform uniting vocational students, industrial training institutes, government administrators, and industrial employers with real-time feedback triangulation.",
    research:
      "Analyzed public policy documentation regarding vocational apprentice top-ups, renewable energy employment corridors (solar technician hiring across Maharashtra), and vernacular UI needs of first-generation vocational trainees.",
    design:
      "Civic-tech editorial dashboard featuring high-contrast data cards, a bilingual live bulletin ticker, color-coded status badges, and an intuitive instant toggle between English and Marathi.",
    architecture:
      "Client-rendered dashboard architecture utilizing modular state stores, dynamic DOM translation engines, and accessible metric cards optimized for low-end mobile devices and desktop monitoring stations.",
    features: [
      "Bilingual Interface: Zero-reload instant switching between English and Marathi for seamless accessibility across diverse regions.",
      "Live Skilling News Radar: Real-time announcements including DBT apprentice stipends and solar technician hiring drives.",
      "Direct Benefit Transfer (DBT) Tracker: Transparent stipend delivery status monitoring for vocational trainees.",
      "Multi-Stakeholder Triangulation: Cross-verification comparing trainee assessments against direct employer workplace reviews.",
      "Sector Hiring Radar: Highlights emerging opportunities in renewable energy, solar parks, and technical trades.",
    ],
    challenges:
      "Designing a multilingual interface that accommodates the varied typographical expansions of Marathi text without breaking layout balance or overflowing compact dashboard cards.",
    solution:
      "Built fluid container layouts with defensive CSS grid configurations and dynamic typography scaling variables tailored to Devanagari script glyph heights.",
    whatILearned:
      "Gained deep insights into civic technology architecture, the nuances of vernacular accessibility, and designing dashboards that empower public accountability.",
    futureImprovement:
      "Integrate automated SMS notifications via regional telecom gateways and verifiable cryptographic credentials for apprentice completion certificates.",
    screenshots: [
      {
        title: "Bilingual Skilling Dashboard",
        caption: "Real-time apprentice metrics and sector employment radar.",
        url: "/images/projects/kaushal-dashboard.svg",
      },
    ],
    stars: 0,
    forks: 0,
    language: "HTML",
    updatedAt: "2026-09-19",
  },
  {
    id: "saarthi",
    slug: "saarthi",
    title: "Saarthi AI (सारथी)",
    tagline: "Livestock Health Platform & Offline Veterinary Triage",
    description:
      "Protecting livestock with AI-powered early disease detection, digital animal health records, and connecting farmers with veterinarians even in limited connectivity.",
    longDescription:
      "Saarthi AI is an agritech assistive diagnostic prototype designed to protect livestock health in rural farming communities. Smallholder farmers often face delayed veterinary intervention when animals fall ill. Saarthi bridges this gap with an intuitive symptom-guided triage engine, digital livestock health passports, and dedicated role-based interfaces for farmers and veterinary doctors.",
    category: "Agritech & AI Prototypes",
    status: "Completed",
    featured: true,
    order: 3,
    githubUrl: "https://github.com/TrishnaBapna/Saarthi",
    liveUrl: "https://trishnabapna.github.io/Saarthi/",
    coverImage: "/images/projects/saarthi-hero.svg",
    technologies: [
      "JavaScript (ES6+)",
      "HTML5 & Responsive Layouts",
      "Tailwind CSS",
      "Client Triage Decision Matrix",
      "Offline Storage Engine",
      "Role-Based Authentication Simulation",
    ],
    problem:
      "Livestock diseases such as Foot and Mouth Disease (FMD), mastitis, and acute bovine respiratory infections can rapidly spread through herds before a veterinarian arrives, causing catastrophic economic loss for rural families.",
    goal:
      "Develop a practical, mobile-friendly platform that assists farmers in quickly identifying early disease risk indicators and generates clear clinical summary notes for rapid veterinary escalation.",
    research:
      "Reviewed veterinary triage guidelines, common cattle symptoms in tropical climates, and rural internet connectivity constraints requiring resilient offline operation.",
    design:
      "High-contrast card-based UI with clear iconography, straightforward yes/no and severity questions, and dedicated distinct login views for Farmers and Veterinary professionals.",
    architecture:
      "Offline-first client architecture using local browser datastores, rule-based diagnostic risk engine, and persistent animal health records.",
    features: [
      "AI Symptom Risk Detector: Step-by-step guided questionnaire assessing appetite, mobility, temperature, and milk yield.",
      "Dual Role Experience: Distinct dashboards tailored for Farmer triage entry and Veterinarian case reviews.",
      "Digital Animal Health Record: Longitudinal logs of vaccinations, past treatments, and chronic conditions.",
      "Emergency Flagging: Color-coded triage urgency (Normal, Caution, Urgent Veterinary Call required).",
      "Low-Bandwidth Optimization: Extremely lightweight assets ensuring fast loading on 2G/3G rural networks.",
    ],
    challenges:
      "Ensuring non-technical farmers can accurately report symptoms without confusing clinical jargon.",
    solution:
      "Formulated visual symptom representations with simple everyday physical cues and clear severity grading.",
    whatILearned:
      "Mastered designing for rural and non-traditional software users, offline-first client architecture, and rule-based diagnostic systems.",
    futureImprovement:
      "Train a computer vision model for lesion/gait analysis directly on device and integrate vernacular voice-assisted input.",
    screenshots: [
      {
        title: "Triage Engine & Symptom Questionnaire",
        caption: "Step-by-step risk scoring with clear visual indicators.",
        url: "/images/projects/saarthi-triage.svg",
      },
    ],
    stars: 0,
    forks: 0,
    language: "JavaScript",
    updatedAt: "2026-09-26",
  },
  {
    id: "luxora",
    slug: "luxora",
    title: "LUXORA",
    tagline: "Intelligent Guest Service & Staff Coordination Platform",
    description:
      "A smart hotel service platform categorizing guest requests, tracking live SLA countdowns, and giving guests, staff, and supervisors real-time visibility.",
    longDescription:
      "LUXORA is a modern hospitality management prototype created for hotel operations. Designed for problem statement PU PS 4 under the Hospitality theme, the platform orchestrates guest requests across Housekeeping, In-Room Dining, Concierge, and Maintenance with dynamic SLA deadline timers, digital room dining carts, and supervisor workload reassignment.",
    category: "Hospitality & Operations",
    status: "Completed",
    featured: true,
    order: 4,
    githubUrl: "https://github.com/TrishnaBapna/LUXORA",
    liveUrl: "https://github.com/TrishnaBapna/LUXORA",
    coverImage: "/images/projects/luxora-hero.svg",
    technologies: [
      "JavaScript (Vanilla ES6+)",
      "HTML5 & Modern CSS",
      "Real-Time SLA Interval Timers",
      "Reactive Client State Machine",
      "Self-Contained Browser Architecture",
    ],
    problem:
      "Hotel operations frequently suffer from lost guest requests, delayed room service, lack of visibility into staff workloads, and SLA breaches during peak check-in and dining hours.",
    goal:
      "Create a zero-dependency, self-contained prototype demonstrating end-to-end hotel guest request handling, department routing, and live SLA monitoring across multiple user roles.",
    research:
      "Mapped out hospitality service level agreements (SLAs), escalation pathways for luxury hotels, and friction points in guest-to-staff communication.",
    design:
      "Refined dark luxury visual identity with golden accents, tactile order buttons, clear department tabs, and dynamic countdown timers with color-coded urgency states.",
    architecture:
      "A single self-contained frontend application running in any browser with zero build steps, featuring an event-driven architecture managing tickets, timers, and role views.",
    features: [
      "Tri-Role Workflow: Single-click toggling between Guest, Staff, and Operations Supervisor views.",
      "Live SLA Countdown Engine: Visual ticking countdowns that turn amber and red as deadlines approach.",
      "In-Room Dining Digital Cart: Interactive food menu with item customization and direct cart ordering.",
      "Supervisor Reassignment: Allows supervisors to rebalance task loads across active floor staff.",
      "AI Concierge Chat Simulator: Quick assistance for hotel amenities, checkout policies, and local queries.",
    ],
    challenges:
      "Coordinating dozens of concurrent interval-based timers across tasks without UI lag or memory leaks in a single self-contained script.",
    solution:
      "Consolidated timer updates into a centralized tick loop using delta timestamps rather than multiple uncoordinated setInterval calls.",
    whatILearned:
      "Gained expertise in multi-persona operational workflows, timer lifecycle management, and delivering high-fidelity prototypes without external framework bloat.",
    futureImprovement:
      "Connect with a WebSocket backend for multi-device synchronization and integrate QR-code table/room auto-pairing.",
    screenshots: [
      {
        title: "Live SLA Dashboard & Guest Service Console",
        caption: "Real-time task timers with supervisor reassignment tools.",
        url: "/images/projects/luxora-console.svg",
      },
    ],
    stars: 0,
    forks: 0,
    language: "JavaScript",
    updatedAt: "2026-08-30",
  },
  {
    id: "shonen-study-academy",
    slug: "shonen-study-academy",
    title: "SHONEN STUDY ACADEMY",
    tagline: "少年勉強アカデミー — Gamified Anime Focus & Productivity App",
    description:
      "Anime-themed gamified study and productivity platform featuring Shonen-style leveling up, XP progression, cadet training ranks, and battle focus sprints.",
    longDescription:
      "Shonen Study Academy transforms mundane study routines into an exhilarating anime battle-training experience. Designed to combat procrastination and study fatigue, the app implements RPG-style progression mechanics where every minute of focused effort earns XP, elevates the user's Cadet Rank, unlocks achievements, and powers up battle streaks.",
    category: "Gamification & Creative Web",
    status: "Completed",
    featured: false,
    order: 5,
    githubUrl: "https://github.com/TrishnaBapna/trishya-anime-study-app",
    liveUrl: "https://trishya-anime-study-app.vercel.app",
    coverImage: "/images/projects/anime-hero.svg",
    technologies: [
      "HTML5 & CSS3 Animations",
      "JavaScript (ES6+)",
      "Audio Synthesizer Cues",
      "Gamification Progression Engine",
      "LocalStorage Data Persistence",
    ],
    problem:
      "Students frequently experience study fatigue, loss of focus, and lack of tangible short-term motivation during exam preparations and self-directed learning.",
    goal:
      "Harness the psychological engagement of Shonen manga tropes to create a vibrant, motivating productivity timer that turns study hours into rewarding XP milestones.",
    research:
      "Researched flow state triggers, the Pomodoro technique, variable reward schedules in game design, and aesthetic preferences in anime-inspired UI design.",
    design:
      "Energetic comic and anime aesthetic featuring dynamic typography, vibrant neon pink and yellow accents, XP meter bars, and badge celebration modals.",
    architecture:
      "Event-driven browser application with sound synthesis triggers, XP multiplier algorithms, streak calculation, and persistent state in browser storage.",
    features: [
      "Cadet Leveling Engine: Earn XP per focus minute and rank up from Level 0 Cadet to Anime Grandmaster.",
      "Shonen Focus Sprints: Battle-themed Pomodoro intervals with auditory start and completion fanfare.",
      "Clean Slate & Streak Protection: Daily study reset with streak bonuses for consecutive days of training.",
      "Quest Achievement Matrix: Milestone badges unlocked upon completing study missions.",
    ],
    challenges:
      "Balancing high-energy gamified visuals with the need for a distraction-free environment once a study session is active.",
    solution:
      "Designed a smart focus mode that hides vibrant UI elements during active countdowns and surfaces rewarding animations upon interval completion.",
    whatILearned:
      "Mastered behavioral design and gamification mechanics, sound design in the browser, and creating distinctive high-personality interfaces.",
    futureImprovement:
      "Implement collaborative multiplayer study guild rooms where study groups can defeat 'boss' study targets together.",
    screenshots: [
      {
        title: "Academy Focus Console & XP Meter",
        caption: "Level progression and battle sprint countdown interface.",
        url: "/images/projects/anime-sprint.svg",
      },
    ],
    stars: 0,
    forks: 0,
    language: "HTML",
    updatedAt: "2026-09-08",
  },
  {
    id: "deadpool-merc-browser",
    slug: "deadpool-merc-browser",
    title: "DEADPOOL: Merc with a Browser",
    tagline: "Official Webtoon Interactive Platform by Team Trishya",
    description:
      "An interactive webtoon reader and comic panel experience inspired by Deadpool, featuring pop-art comic visuals and dynamic panel navigation.",
    longDescription:
      "Deadpool: Merc with a Browser is an experimental webtoon platform blending irreverent fourth-wall-breaking comic aesthetics with smooth vertical digital reading. Developed under Team Trishya, it showcases creative frontend styling with comic halftone overlays, speech-bubble micro-interactions, and custom panel navigation.",
    category: "Creative Web & Digital Media",
    status: "Completed",
    featured: false,
    order: 6,
    githubUrl: "https://github.com/TrishnaBapna/trishya",
    liveUrl: "https://trishya.vercel.app",
    coverImage: "/images/projects/deadpool-hero.svg",
    technologies: [
      "HTML5 Canvas & DOM",
      "Tailwind CSS",
      "JavaScript",
      "Responsive Comic Panel Viewer",
      "Pop-Art CSS Filters",
    ],
    problem:
      "Standard digital comic readers often present static flat scans that fail to convey the dynamic pacing and interactive personality of modern webtoons.",
    goal:
      "Build a responsive webtoon reading environment tailored for desktop and mobile screens that honors classic comic book typography and bold pop-art flair.",
    research:
      "Explored digital webtoon vertical rhythm, Roy Lichtenstein pop-art halftone dots, and mobile touch swipe ergonomics.",
    design:
      "Bold red and ink black palette, thick bordered comic panels, halftone dot patterns, and playful comic onomatopoeia cards.",
    architecture:
      "Lightweight responsive web application designed for fast asset streaming and smooth touch-driven reading.",
    features: [
      "Vertical Webtoon Reading Flow: Optimized for natural thumb scrolling on mobile devices.",
      "Pop-Art Graphic Overlays: Halftone comic effects and stylized speech dialogue bubbles.",
      "Interactive Character Cards: Clickable comic panels revealing character bios and quotes.",
    ],
    challenges:
      "Rendering stylized halftone patterns and thick borders consistently across different browser rendering engines without pixel distortion.",
    solution:
      "Utilized pure CSS SVG patterns and calculated border widths for crisp resolution-independent rendering.",
    whatILearned:
      "Refined creative CSS styling techniques, learned digital comic pacing, and experimented with bold unconventional visual layouts.",
    futureImprovement:
      "Add interactive sound effects triggered by scroll position using the Intersection Observer API.",
    screenshots: [
      {
        title: "Comic Panel Reader",
        caption: "Halftone graphic layout with interactive dialogue bubbles.",
        url: "/images/projects/deadpool-reader.svg",
      },
    ],
    stars: 0,
    forks: 0,
    language: "HTML",
    updatedAt: "2026-09-07",
  },
  {
    id: "git-practice",
    slug: "git-practice",
    title: "Git Practice & Developer Genesis",
    tagline: "The First Step into Version Control & Open Source",
    description:
      "Trishna's inaugural GitHub repository marking the inception of disciplined version control, commit conventions, and open-source development.",
    longDescription:
      "Every developer journey starts with a first commit. Git Practice represents Trishna Bapna's foundational project where she explored Git version control, branch workflows, markdown documentation, and GitHub remote repository synchronization. This milestone established the methodical development practices that power all her subsequent applications.",
    category: "Developer Foundations",
    status: "Completed",
    featured: false,
    order: 7,
    githubUrl: "https://github.com/TrishnaBapna/git-practice",
    liveUrl: null,
    coverImage: "/images/projects/git-hero.svg",
    technologies: ["Git", "GitHub CLI", "Markdown", "Command Line Interface"],
    problem:
      "Learning professional software engineering requires mastering distributed version control, non-linear history tracking, and collaborative workflows.",
    goal:
      "Build hands-on fluency with Git primitives: commits, branching, merging, remote syncing, and clean repository documentation.",
    research:
      "Studied Git's directed acyclic graph (DAG) data model, semantic commit conventions, and repository structure best practices.",
    design:
      "Concise, well-structured documentation repository with clear commit histories and structured README layout.",
    architecture:
      "Git version control graph maintaining intentional commits and branching experiments.",
    features: [
      "Genesis Commit: The starting point of Trishna's public GitHub portfolio.",
      "Branch Management: Hands-on exploration of branching and conflict resolution.",
      "Markdown Craft: Developing structured documentation standards.",
    ],
    challenges:
      "Navigating terminal workflows and understanding the nuances of detached HEADs and merge strategies.",
    solution:
      "Maintained regular CLI practice and systematically documented Git command patterns.",
    whatILearned:
      "Understood that great software engineering is built on great version control hygiene and clear commit documentation.",
    futureImprovement:
      "Continues to serve as the benchmark for commit discipline across all active repositories.",
    screenshots: [
      {
        title: "Initial Commit & Repository Tree",
        caption: "The foundation stone of Trishna's software development journey.",
        url: "/images/projects/git-cli.svg",
      },
    ],
    stars: 0,
    forks: 0,
    language: "Markdown",
    updatedAt: "2026-08-21",
  },
];

export function getProjectBySlug(slug: string): ProjectItem | undefined {
  return REAL_PROJECTS.find(
    (p) => p.slug.toLowerCase() === slug.toLowerCase()
  );
}

export function getFeaturedProjects(): ProjectItem[] {
  return REAL_PROJECTS.filter((p) => p.featured).sort(
    (a, b) => a.order - b.order
  );
}

export function getAllProjects(): ProjectItem[] {
  return [...REAL_PROJECTS].sort((a, b) => a.order - b.order);
}
