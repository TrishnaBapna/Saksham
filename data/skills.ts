export type SkillProficiency = "using" | "learning" | "exploring";

export interface SkillItem {
  name: string;
  category:
    | "Frontend"
    | "Backend"
    | "Programming"
    | "AI / Data"
    | "Database"
    | "Tools"
    | "Creative";
  status: SkillProficiency; // "using" = Currently using, "learning" = Currently learning, "exploring" = Exploring
  levelDescription?: string;
  iconName?: string;
}

export const SKILL_CATEGORIES = [
  "Frontend",
  "Backend",
  "Programming",
  "AI / Data",
  "Database",
  "Tools",
  "Creative",
] as const;

export const STATUS_LABELS: Record<SkillProficiency, { label: string; badge: string; desc: string }> = {
  using: {
    label: "Currently Using",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    desc: "Actively implemented in real repositories and production prototypes",
  },
  learning: {
    label: "Currently Learning",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    desc: "Actively studying, applying in ongoing projects, and deepening concepts",
  },
  exploring: {
    label: "Exploring",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    desc: "Researching, experimenting with prototypes, and evaluating future potential",
  },
};

export const SKILLS_DATA: SkillItem[] = [
  // Frontend
  { name: "JavaScript (ES6+)", category: "Frontend", status: "using" },
  { name: "HTML5 & Semantic DOM", category: "Frontend", status: "using" },
  { name: "Tailwind CSS", category: "Frontend", status: "using" },
  { name: "Web Audio API", category: "Frontend", status: "using" },
  { name: "Responsive Mobile UI", category: "Frontend", status: "using" },
  { name: "React", category: "Frontend", status: "learning" },
  { name: "Next.js App Router", category: "Frontend", status: "learning" },
  { name: "TypeScript", category: "Frontend", status: "learning" },
  { name: "Radix UI Primitives", category: "Frontend", status: "learning" },
  { name: "Canvas / Creative WebGL", category: "Frontend", status: "exploring" },
  { name: "View Transitions API", category: "Frontend", status: "exploring" },

  // Backend
  { name: "Node.js Basics", category: "Backend", status: "using" },
  { name: "RESTful Endpoints", category: "Backend", status: "using" },
  { name: "Next.js Route Handlers", category: "Backend", status: "learning" },
  { name: "Server Actions", category: "Backend", status: "learning" },
  { name: "Zod Schema Validation", category: "Backend", status: "learning" },
  { name: "WebSockets & Live State", category: "Backend", status: "exploring" },
  { name: "Microservices Architecture", category: "Backend", status: "exploring" },

  // Programming
  { name: "JavaScript", category: "Programming", status: "using" },
  { name: "Python Basics", category: "Programming", status: "using" },
  { name: "TypeScript", category: "Programming", status: "learning" },
  { name: "Data Structures & Algos", category: "Programming", status: "learning" },
  { name: "Systems / Rust Fundamentals", category: "Programming", status: "exploring" },

  // AI / Data
  { name: "Rule-Based Triage Matrices", category: "AI / Data", status: "using" },
  { name: "Telemetry & Data Visualization", category: "AI / Data", status: "using" },
  { name: "Python for Data Analysis", category: "AI / Data", status: "learning" },
  { name: "LLM Prompting & API Integration", category: "AI / Data", status: "learning" },
  { name: "Edge Computer Vision (TF.js)", category: "AI / Data", status: "exploring" },
  { name: "Predictive Health Modeling", category: "AI / Data", status: "exploring" },

  // Database
  { name: "LocalStorage & Client Caching", category: "Database", status: "using" },
  { name: "IndexedDB", category: "Database", status: "using" },
  { name: "PostgreSQL", category: "Database", status: "learning" },
  { name: "Prisma ORM", category: "Database", status: "learning" },
  { name: "SQL Query Optimization", category: "Database", status: "learning" },
  { name: "Vector Databases & Embeddings", category: "Database", status: "exploring" },

  // Tools
  { name: "Git & GitHub", category: "Tools", status: "using" },
  { name: "VS Code", category: "Tools", status: "using" },
  { name: "Chrome DevTools", category: "Tools", status: "using" },
  { name: "Vercel Deployment", category: "Tools", status: "using" },
  { name: "GitHub Actions CI/CD", category: "Tools", status: "learning" },
  { name: "Vitest & Testing Suite", category: "Tools", status: "learning" },
  { name: "Docker Containerization", category: "Tools", status: "exploring" },

  // Creative
  { name: "Digital Sketching & Drawing", category: "Creative", status: "using" },
  { name: "UI/UX Prototyping", category: "Creative", status: "using" },
  { name: "SVG Vector Illustration", category: "Creative", status: "using" },
  { name: "Sound Design & Metronomes", category: "Creative", status: "learning" },
  { name: "Interactive Comic Layouts", category: "Creative", status: "learning" },
  { name: "Generative Art (p5.js)", category: "Creative", status: "exploring" },
];
