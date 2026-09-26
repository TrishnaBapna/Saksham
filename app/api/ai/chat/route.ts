import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/site-config";
import { REAL_PROJECTS } from "@/data/projects";
import { SKILLS_DATA } from "@/data/skills";
import { BLOG_POSTS } from "@/data/blog";

// Knowledge base constructed strictly from verified portfolio facts
const GROUNDED_SYSTEM_PROMPT = `
You are the official AI Assistant for Trishna Bapna's personal portfolio.
Your role is to assist visitors, recruiters, and collaborators by answering questions accurately about Trishna's work, background, and skills.

CRITICAL INSTRUCTIONS:
1. Answer ONLY based on verified portfolio facts provided below.
2. NEVER fabricate, assume, or invent internships, jobs, degrees, statistics, awards, or projects.
3. If an imaginary project is asked about (for example, "HarmonyCare", "StudyQuest", or "Trishna Studio"), politely and explicitly state that it is not part of Trishna's real portfolio, and direct them to her genuine projects.
4. Trishna's authentic identity:
   - Role: Creative Technologist
   - Stage: Student, Developer, Artist, and Builder
   - GitHub: https://github.com/TrishnaBapna
   - Location: India
   - Tone: Humble, curious, passionate about assistive tech, public-good data, and creative computing.

VERIFIED PROJECTS:
${REAL_PROJECTS.map(
  (p) => `
- ${p.title} (${p.slug}):
  Category: ${p.category}
  Tagline: ${p.tagline}
  Technologies: ${p.technologies.join(", ")}
  GitHub: ${p.githubUrl}
  Live URL: ${p.liveUrl || "Self-contained repository"}
  Summary: ${p.description}
  Key Features: ${p.features.slice(0, 3).join("; ")}
`
).join("\n")}

VERIFIED SKILLS:
- Currently Using: ${SKILLS_DATA.filter((s) => s.status === "using").map((s) => s.name).join(", ")}
- Currently Learning: ${SKILLS_DATA.filter((s) => s.status === "learning").map((s) => s.name).join(", ")}
- Exploring: ${SKILLS_DATA.filter((s) => s.status === "exploring").map((s) => s.name).join(", ")}

CONTACT INFO:
- Contact form on the website at /contact
- GitHub: https://github.com/TrishnaBapna
- Email: ${siteConfig.socials.email}

Keep responses concise, informative, friendly, and structured in Markdown.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages payload" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = typeof lastMessage === "string" ? lastMessage : lastMessage?.content || "";
    const lower = userPrompt.toLowerCase();

    // Check if an external AI API key is configured
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (apiKey && process.env.AI_PROVIDER === "openai") {
      // Optional call to OpenAI API if user supplied key
      try {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: GROUNDED_SYSTEM_PROMPT },
              ...messages,
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (aiRes.ok) {
          const data = await aiRes.json();
          const reply = data.choices[0]?.message?.content || "No response received.";
          return NextResponse.json({ reply });
        }
      } catch (err) {
        console.warn("External AI call failed, falling back to local grounded reasoning:", err);
      }
    }

    // High-Precision Local Knowledge Engine (Grounding guarantee without token leak or API cost)
    let reply = "";

    if (lower.includes("harmonycare") || lower.includes("studyquest") || lower.includes("trishna studio")) {
      reply = `**Note on Projects:** **HarmonyCare** is not a real project by Trishna Bapna. 

Trishna's actual, verified projects in her GitHub repositories include:
- **Saksham (सक्षम)**: Cognitive Wellness & Parkinson's Routine Studio with anti-overwhelm evening guard.
- **Kaushal Setu (कौशल सेतू)**: Longitudinal vocational skilling outcomes and triangulation system.
- **Saarthi AI**: Livestock health platform with offline veterinary triage.
- **LUXORA**: Intelligent guest service and hotel staff SLA coordination platform.
- **Shonen Study Academy**: Anime-themed gamified focus timer.

Would you like to explore the case study for **Saksham** or **Kaushal Setu**?`;
    } else if (lower.includes("project") || lower.includes("built") || lower.includes("portfolio")) {
      reply = `Trishna has built several verified real-world web applications and prototypes:

1. **[Saksham (सक्षम)](/projects/saksham)**: An assistive cognitive wellness PWA for Parkinson's patients, featuring Web Audio metronomes, tremor-safe buttons, and anti-overwhelm evening modes.
2. **[Kaushal Setu (कौशल सेतू)](/projects/kaushal-setu)**: A public-good skilling analytics dashboard tracking apprentice DBT stipends (₹1,500/mo) and renewable energy technician openings.
3. **[Saarthi AI](/projects/saarthi)**: An agritech offline-first platform helping rural farmers triage cattle health risks before veterinary visits.
4. **[LUXORA](/projects/luxora)**: A hospitality operations prototype with real-time countdown SLA timers for hotel guest requests.
5. **[Shonen Study Academy](/projects/shonen-study-academy)**: A gamified anime study timer with XP progression and Pomodoro focus sprints.

All source code is publicly accessible on her [GitHub profile](https://github.com/TrishnaBapna).`;
    } else if (lower.includes("technology") || lower.includes("stack") || lower.includes("technologies") || lower.includes("skills")) {
      reply = `Here is Trishna's authentic skill breakdown:

- **Currently Using**: JavaScript (ES6+), HTML5 Semantic DOM, Tailwind CSS, Web Audio API, PWA Service Workers, Chart.js, Git & GitHub.
- **Currently Learning**: React, Next.js App Router, TypeScript, Radix UI Primitives, PostgreSQL, Prisma ORM, Vitest.
- **Exploring**: WebGL / Canvas creative coding, Edge AI (TensorFlow.js), Microservices architecture.

She prioritizes high accessibility (WCAG), thoughtful interaction design, and practical offline-first resilience.`;
    } else if (lower.includes("learning") || lower.includes("study") || lower.includes("curious")) {
      reply = `Trishna is currently deepening her mastery of:
- **Full-Stack Next.js 14 App Router** and Server Actions
- **TypeScript** strict static typing for resilient enterprise systems
- **PostgreSQL & Prisma ORM** relational schema architecture
- **Assistive UX Engineering** & accessibility for neurodiverse and motor-impaired users
- **Automated Testing** with Vitest and Playwright`;
    } else if (lower.includes("contact") || lower.includes("hire") || lower.includes("reach") || lower.includes("email")) {
      reply = `You can get in touch with Trishna directly through:
- **Contact Form**: Head over to the [/contact](/contact) page on this website.
- **GitHub**: [github.com/TrishnaBapna](https://github.com/TrishnaBapna)
- **Email**: ${siteConfig.socials.email || "Via the /contact page"}

She welcomes discussions on collaborative projects, frontend engineering, and civic-tech ideas!`;
    } else if (lower.includes("who is") || lower.includes("about") || lower.includes("background")) {
      reply = `**Trishna Bapna** is a Creative Technologist, student, developer, and builder based in India. 

Her philosophy is **"Curious by default. Learn. Build. Create."** She doesn't just write code; she builds digital tools that solve tangible problems—from Parkinson's routine assistance in *Saksham* to vocational apprentice tracking in *Kaushal Setu*.`;
    } else {
      reply = `Thank you for your question! As Trishna's AI assistant, I can share details regarding:
- Her **real GitHub projects** (*Saksham*, *Kaushal Setu*, *Saarthi AI*, *LUXORA*)
- Her **technological stack** and current learning journey
- Her **creative experiments** in the Creative Lab
- How to get in touch via the **Contact form**

Feel free to click any of the suggested questions below!`;
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
