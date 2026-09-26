export interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: string;
  status: "Completed" | "In Development" | "Prototype";
  featured: boolean;
  order: number;
  githubUrl: string;
  liveUrl: string | null;
  coverImage: string;
  technologies: string[];
  problem: string;
  goal: string;
  research: string;
  design: string;
  architecture: string;
  features: string[];
  challenges: string;
  solution: string;
  whatILearned: string;
  futureImprovement: string;
  screenshots: Array<{
    title: string;
    caption: string;
    url: string;
  }>;
  stars?: number;
  forks?: number;
  language?: string;
  updatedAt?: string;
}
