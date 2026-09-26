export interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export interface SiteConfig {
  name: string;
  role: string;
  status: string;
  tagline: string;
  heroStatement: string;
  bioSummary: string;
  github: string;
  photo: string;
  location: string;
  socials: {
    github: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
    email?: string;
  };
  navigation: NavItem[];
  music: {
    enabled: boolean;
    title: string;
    artist: string;
    source: string;
  };
  terminal: {
    systemName: string;
    version: string;
    welcomeMessage: string;
  };
  seo: {
    title: string;
    description: string;
    url: string;
    keywords: string[];
  };
}

export const siteConfig: SiteConfig = {
  name: "Trishna Bapna",
  role: "Creative Technologist",
  status: "Student • Developer • Artist • Builder",
  tagline: "Curious by default. Learn. Build. Create.",
  heroStatement: "I BUILD DIGITAL THINGS THAT TURN IDEAS INTO EXPERIENCES.",
  bioSummary:
    "Student, developer, and builder passionate about creating intuitive user experiences, exploring AI & data science, and merging visual arts with interactive software.",
  github: "https://github.com/TrishnaBapna",
  photo: "/images/profile.jpg",
  location: "India",
  socials: {
    github: "https://github.com/TrishnaBapna",
    instagram: "",
    youtube: "",
    linkedin: "",
    email: "contact@trishnabapna.dev",
  },
  navigation: [
    { label: "HOME", href: "/" },
    { label: "ABOUT", href: "/#about" },
    { label: "PROJECTS", href: "/projects" },
    { label: "LAB", href: "/lab" },
    { label: "BLOG", href: "/blog" },
    { label: "GITHUB", href: "/#github" },
    { label: "CONTACT", href: "/contact" },
  ],
  music: {
    enabled: true,
    title: "Midnight Ambient Bloom",
    artist: "Trishna Creative Sessions",
    source: "/music/background.mp3",
  },
  terminal: {
    systemName: "TRISHNA.OS",
    version: "v2.6.4 (darwin-arm64)",
    welcomeMessage:
      "Type 'help' to inspect available system commands, or navigate freely through the portfolio.",
  },
  seo: {
    title: "Trishna Bapna — Creative Technologist & Developer",
    description:
      "Personal portfolio and digital laboratory of Trishna Bapna. Exploring full-stack engineering, AI, assistive tech, and creative computing.",
    url: "https://trishnabapna.dev",
    keywords: [
      "Trishna Bapna",
      "Creative Technologist",
      "Student Developer",
      "Full Stack Engineer",
      "Frontend Architect",
      "Saksham Parkinson Studio",
      "Kaushal Setu",
      "Saarthi AI",
      "LUXORA",
      "Interactive Web Applications",
    ],
  },
};
