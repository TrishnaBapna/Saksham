export interface BlogPostItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  date: string;
  readingTime: string;
  category: "Learning" | "Projects" | "AI" | "Web Development" | "Design" | "Experiments";
  tags: string[];
  coverImage: string;
  content: string;
  relatedProjectSlug?: string;
}

export const BLOG_POSTS: BlogPostItem[] = [
  {
    id: "post-1",
    slug: "designing-calm-interfaces-for-parkinsons",
    title: "Designing Calm Interfaces for Parkinson's: Lessons from Building Saksham",
    summary:
      "What building an assistive routine studio taught me about cognitive overload, tremor tolerance, and why calmer software matters.",
    date: "September 24, 2026",
    readingTime: "5 min read",
    category: "Projects",
    tags: ["Accessibility", "Healthcare UX", "Web Audio API", "PWA"],
    coverImage: "/images/blog/calm-interfaces.svg",
    relatedProjectSlug: "saksham",
    content: `
### The Reality of Designing for Motor & Cognitive Impairments

When I began researching **Saksham**, I quickly discovered that modern digital interfaces are often hostile to people experiencing motor tremors or cognitive fatigue. Animations are too fast, tap targets are too microscopic, and high-frequency visual noise induces unnecessary stress.

For individuals with Parkinson's disease, late afternoon brings a phenomenon known as *sundowning*—a period where cognitive reserve is depleted, tremors can exacerbate, and mental fatigue spikes.

#### 1. Why High Contrast Isn't Always the Answer

Traditional accessibility guidelines frequently stress extreme high contrast (pure black #000 on pure white #FFF). While essential for certain visual acuities, for patients suffering sensory fatigue, harsh contrast can cause visual glare and headaches.

In Saksham, I designed an **Anti-Overwhelm Evening Guard**:
- Calming muted forest and sage tones (\`#0D9488\`, \`#F1EEE7\`)
- Soft luminance transitions
- Dimmed ambient interface elements during evening hours

#### 2. The Mechanics of Tremor-Tolerant Targets

A hand tremor moves along sinusoidal oscillatory patterns. A 36px button is virtually impossible to tap reliably without accidental mis-hits.

\`\`\`css
/* Ensuring forgiving target boundaries */
.tremor-safe-button {
  min-height: 52px;
  min-width: 52px;
  padding: 0.875rem 1.5rem;
  touch-action: manipulation;
}
\`\`\`

By padding interactive components and requiring explicit, debounced confirmation rather than fleeting tap registers, mis-taps drop significantly.

#### 3. Rhythmic Auditory Stimulation via Web Audio API

One of the most fascinating aspects of neurological rehabilitation is how external acoustic rhythms can act as a bypass for damaged basal ganglia circuits in the brain. By generating a rhythmic metronome directly in the browser using the **Web Audio API**, patients can pace their walking cadence or finger taps without lag or reliance on external mp3 files.

Building Saksham proved to me that developer tools have the power to create dignified, compassionate tools.
    `,
  },
  {
    id: "post-2",
    slug: "tracking-skilling-outcomes-kaushal-setu",
    title: "Public Good Architecture: Behind the Kaushal Setu Skilling Dashboard",
    summary:
      "How I approached building a multi-stakeholder outcomes tracker and the technical challenges of Devanagari typography.",
    date: "September 19, 2026",
    readingTime: "4 min read",
    category: "Web Development",
    tags: ["GovTech", "Multilingual", "Tailwind CSS", "Data Viz"],
    coverImage: "/images/blog/kaushal-setu.svg",
    relatedProjectSlug: "kaushal-setu",
    content: `
### Why Skilling Data Needs Triangulation

Vocational training programs in India—like the Maharashtra Mukhyamantri Yuva Karya-Prashikshan Yojana (CM-MYKY)—empower thousands of youth entering solar engineering, manufacturing, and technical trades. However, a recurring issue across public skilling programs is *triangulation*:

- Did the apprentice actually receive their ₹1,500/month DBT top-up stipend?
- Did the employer find their technical competencies adequate?
- Did the trainee successfully transition into long-term formal employment?

When building **Kaushal Setu (कौशल सेतू)**, my goal was to assemble these three perspectives into a single transparent screen.

#### Multilingual Typography: Devanagari vs Latin Script

One of the most unexpected technical hurdles in bilingual design is the vertical metric discrepancy between Devanagari script (Marathi/Hindi) and Latin characters.

1. **The Shirorekha (Top Hanging Line):** Devanagari characters hang from a prominent top line, meaning standard line-heights often clip vowel matras (\`ि\`, \`ी\`, \`े\`, \`ै\`).
2. **Horizontal Glyph Expansion:** Marathi translations can be 20% to 35% wider than their English counterparts.

\`\`\`css
/* Defensive typography sizing for multilingual resilience */
.bilingual-card-heading {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  line-height: 1.6; /* Generous clearance for Devanagari matras */
}
\`\`\`

Designing for public good requires that no user is locked out due to language or device constraints.
    `,
  },
  {
    id: "post-3",
    slug: "offline-first-agritech-saarthi",
    title: "Offline-First Agritech: Building Saarthi AI for Low-Connectivity Environments",
    summary:
      "Designing clinical triage decision trees that work when internet signal drops to zero.",
    date: "September 26, 2026",
    readingTime: "4 min read",
    category: "AI",
    tags: ["Agritech", "Offline-First", "Decision Trees", "JavaScript"],
    coverImage: "/images/blog/saarthi-ai.svg",
    relatedProjectSlug: "saarthi",
    content: `
### The Low-Bandwidth Reality in Rural Agriculture

In urban tech hubs, we take persistent high-speed 5G connectivity for granted. But when you step onto a dairy farm or rural cattle shed, signal bars fluctuate wildly between 2G, 3G, and total blackout.

When an animal exhibits respiratory distress or drops milk production unexpectedly, a farmer cannot wait 30 seconds for a heavy JavaScript bundle to download or for an API server to timeout.

#### 1. Rule-Based Triage vs Heavy Server Models

While cloud-based neural networks are powerful, a lightweight, client-side rule-based expert system runs instantly in 50 lines of optimized JavaScript.

For **Saarthi AI**, I modeled clinical veterinary symptom indicators into a client-side weighted scoring matrix:

- Body Temperature (Fever vs Hypothermia)
- Gait & Stance (Limping, Recumbency)
- Feed & Water Intake
- Salivation & Lesions

The assessment runs instantaneously on the local device, scores risk urgency, and caches the entry in browser storage until connectivity is restored.

#### 2. Key Takeaways
- Always test with Chrome DevTools Network Throttling set to *Slow 3G* or *Offline*.
- Prioritize clear visual feedback over complex animations in high-sunlight outdoor usage.
    `,
  },
  {
    id: "post-4",
    slug: "genesis-of-code-git-practice",
    title: "From First Commit to Full-Stack: Reflections on My Coding Journey",
    summary:
      "A candid reflection on starting out, learning in public, and building genuine software one commit at a time.",
    date: "August 21, 2026",
    readingTime: "3 min read",
    category: "Learning",
    tags: ["Git", "Learning in Public", "Growth", "Mindset"],
    coverImage: "/images/blog/git-genesis.svg",
    content: `
### Starting with a Blank Terminal

Looking back at my first repository, \`git-practice\`, created in August 2026, I remember the initial intimidation of the terminal. Commands like \`git checkout -b\`, \`git push -u origin main\`, and resolving merge conflicts felt like learning a mysterious incantation.

Fast forward through building **LUXORA**, **Kaushal Setu**, **Saksham**, and **Saarthi**, that initial nervousness transformed into an insatiable curiosity to understand how software works from the inside out.

#### Three Principles I Live By:

1. **Curious by Default:** If something doesn't work, don't just patch it—understand *why* it broke.
2. **Build for Real Problems:** Whether it's helping a Parkinson's patient, tracking apprentice stipends, or aiding a dairy farmer, software is most meaningful when it serves real people.
3. **Document the Progress:** Learning is not linear. Celebrating small milestones and writing honest dev logs keeps you grounded.
    `,
  },
];

export function getBlogPostBySlug(slug: string): BlogPostItem | undefined {
  return BLOG_POSTS.find(
    (p) => p.slug.toLowerCase() === slug.toLowerCase()
  );
}

export function getAllBlogPosts(): BlogPostItem[] {
  return [...BLOG_POSTS];
}
