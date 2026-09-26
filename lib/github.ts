import { GitHubRepo, GitHubUser, GitHubEvent } from "@/types/github";

const GITHUB_USERNAME = "TrishnaBapna";
const GITHUB_API_BASE = "https://api.github.com";

// Real verified fallback repositories from Trishna's GitHub account
export const FALLBACK_REPOSITORIES: GitHubRepo[] = [
  {
    id: 1385653391,
    name: "Saksham",
    full_name: "TrishnaBapna/Saksham",
    description:
      "Cognitive Wellness & Parkinson's Routine Studio. Empowering patients with rhythmic independence, anti-overwhelm evening guard, gamified XP, and multi-signal telemetry.",
    html_url: "https://github.com/TrishnaBapna/Saksham",
    homepage: "https://trishnabapna.github.io/Saksham/",
    language: "JavaScript / HTML5",
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    created_at: "2026-09-24T14:12:12Z",
    updated_at: "2026-09-26T08:42:28Z",
    pushed_at: "2026-09-26T08:42:25Z",
    topics: ["assistive-tech", "cognitive-wellness", "parkinsons", "telemetry", "pwa"],
    size: 388,
    default_branch: "main",
    archived: false,
    fork: false,
  },
  {
    id: 1377411214,
    name: "Kaushal-Setu",
    full_name: "TrishnaBapna/Kaushal-Setu",
    description:
      "Longitudinal Skilling Outcomes, Quality Feedback & Triangulation System. Tracking vocational apprenticeships, DBT top-ups, and placement verification.",
    html_url: "https://github.com/TrishnaBapna/Kaushal-Setu",
    homepage: "https://kaushal-setu-eta.vercel.app",
    language: "HTML / Tailwind CSS",
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    created_at: "2026-09-19T17:00:27Z",
    updated_at: "2026-09-19T17:16:20Z",
    pushed_at: "2026-09-19T17:08:11Z",
    topics: ["vocational-training", "analytics", "triangulation", "public-good"],
    size: 52,
    default_branch: "main",
    archived: false,
    fork: false,
  },
  {
    id: 1388940192,
    name: "Saarthi",
    full_name: "TrishnaBapna/Saarthi",
    description:
      "Saarthi AI — Livestock Health Platform. Protecting livestock with AI-powered early disease detection, digital animal records, and low-connectivity triage.",
    html_url: "https://github.com/TrishnaBapna/Saarthi",
    homepage: "https://trishnabapna.github.io/Saarthi/",
    language: "JavaScript / HTML5",
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    created_at: "2026-09-26T09:07:25Z",
    updated_at: "2026-09-26T11:11:12Z",
    pushed_at: "2026-09-26T11:11:09Z",
    topics: ["ai-triage", "livestock-health", "agritech", "offline-first"],
    size: 87,
    default_branch: "main",
    archived: false,
    fork: false,
  },
  {
    id: 1344832600,
    name: "LUXORA",
    full_name: "TrishnaBapna/LUXORA",
    description:
      "Intelligent Guest Service & Staff Coordination Platform. Smart hospitality platform categorizing requests, tracking live SLA countdowns, and room-aware ordering.",
    html_url: "https://github.com/TrishnaBapna/LUXORA",
    homepage: "https://github.com/TrishnaBapna/LUXORA",
    language: "JavaScript / HTML5",
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    created_at: "2026-08-24T10:34:24Z",
    updated_at: "2026-08-30T11:00:34Z",
    pushed_at: "2026-08-30T11:00:20Z",
    topics: ["hospitality", "sla-tracking", "task-coordination", "operations"],
    size: 34,
    default_branch: "main",
    archived: false,
    fork: false,
  },
  {
    id: 1361266051,
    name: "trishya-anime-study-app",
    full_name: "TrishnaBapna/trishya-anime-study-app",
    description:
      "SHONEN STUDY ACADEMY (少年勉強アカデミー) — Gamified Anime Focus & Productivity App featuring leveling up, XP progression, and cadet streak tracking.",
    html_url: "https://github.com/TrishnaBapna/trishya-anime-study-app",
    homepage: "https://trishya-anime-study-app.vercel.app",
    language: "HTML / CSS / JavaScript",
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    created_at: "2026-09-08T10:59:35Z",
    updated_at: "2026-09-08T11:28:17Z",
    pushed_at: "2026-09-08T11:09:46Z",
    topics: ["gamification", "study-timer", "anime-ui", "productivity"],
    size: 28,
    default_branch: "main",
    archived: false,
    fork: false,
  },
  {
    id: 1360134651,
    name: "trishya",
    full_name: "TrishnaBapna/trishya",
    description:
      "DEADPOOL: MERC WITH A BROWSER // Official Webtoon Interactive Platform by Team Trishya with comic panel canvas viewer.",
    html_url: "https://github.com/TrishnaBapna/trishya",
    homepage: "https://trishya.vercel.app",
    language: "HTML / CSS",
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    created_at: "2026-09-07T11:20:43Z",
    updated_at: "2026-09-07T11:41:08Z",
    pushed_at: "2026-09-07T11:33:57Z",
    topics: ["webtoon", "comic-ui", "interactive-canvas"],
    size: 28,
    default_branch: "main",
    archived: false,
    fork: false,
  },
  {
    id: 1341361124,
    name: "git-practice",
    full_name: "TrishnaBapna/git-practice",
    description: "My first Git and GitHub practice project — starting the version control journey.",
    html_url: "https://github.com/TrishnaBapna/git-practice",
    homepage: null,
    language: "Git / Markdown",
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    created_at: "2026-08-21T03:30:57Z",
    updated_at: "2026-08-21T03:30:57Z",
    pushed_at: "2026-08-21T03:30:57Z",
    topics: ["git", "learning", "first-commit"],
    size: 0,
    default_branch: "main",
    archived: false,
    fork: false,
  },
];

export const FALLBACK_USER: GitHubUser = {
  login: "TrishnaBapna",
  id: 319284049,
  avatar_url: "https://avatars.githubusercontent.com/u/319284049?v=4",
  html_url: "https://github.com/TrishnaBapna",
  name: "Trishna Bapna",
  company: null,
  blog: "https://trishnabapna.dev",
  location: "India",
  email: null,
  bio: "Creative Technologist • Student • Developer • Artist • Builder",
  public_repos: 7,
  followers: 0,
  following: 0,
  created_at: "2026-08-21T02:39:46Z",
  updated_at: "2026-08-27T10:08:17Z",
};

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "TrishnaBapna-Portfolio-App",
  };
  if (process.env.GITHUB_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`;
  }
  return headers;
}

/**
 * Fetch all public repositories for TrishnaBapna with ISR caching
 */
export async function getRepositories(): Promise<GitHubRepo[]> {
  try {
    const res = await fetch(
      `${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`,
      {
        headers: getHeaders(),
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!res.ok) {
      console.warn(`GitHub API repos returned ${res.status}. Falling back to cached repository data.`);
      return FALLBACK_REPOSITORIES;
    }

    const repos: GitHubRepo[] = await res.json();
    return repos.length > 0 ? repos : FALLBACK_REPOSITORIES;
  } catch (error) {
    console.error("Error fetching repositories from GitHub:", error);
    return FALLBACK_REPOSITORIES;
  }
}

/**
 * Fetch single repository by name
 */
export async function getRepository(name: string): Promise<GitHubRepo | null> {
  try {
    const res = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${name}`,
      {
        headers: getHeaders(),
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      const match = FALLBACK_REPOSITORIES.find(
        (r) => r.name.toLowerCase() === name.toLowerCase()
      );
      return match || null;
    }

    return await res.json();
  } catch (error) {
    console.error(`Error fetching repo ${name}:`, error);
    const match = FALLBACK_REPOSITORIES.find(
      (r) => r.name.toLowerCase() === name.toLowerCase()
    );
    return match || null;
  }
}

/**
 * Fetch programming languages for repository
 */
export async function getRepositoryLanguages(
  name: string
): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${name}/languages`,
      {
        headers: getHeaders(),
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return {};
    return await res.json();
  } catch (error) {
    console.error(`Error fetching languages for ${name}:`, error);
    return {};
  }
}

/**
 * Fetch repository README content
 */
export async function getRepositoryReadme(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${name}/readme`,
      {
        headers: getHeaders(),
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch (error) {
    console.error(`Error fetching readme for ${name}:`, error);
    return null;
  }
}

/**
 * Fetch Trishna's GitHub profile
 */
export async function getUserProfile(): Promise<GitHubUser> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}`, {
      headers: getHeaders(),
      next: { revalidate: 3600 },
    });

    if (!res.ok) return FALLBACK_USER;
    return await res.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return FALLBACK_USER;
  }
}

/**
 * Fetch recent activity events
 */
export async function getRecentActivity(): Promise<GitHubEvent[]> {
  try {
    const res = await fetch(
      `${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/events/public?per_page=20`,
      {
        headers: getHeaders(),
        next: { revalidate: 1800 },
      }
    );

    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error fetching GitHub events:", error);
    return [];
  }
}
