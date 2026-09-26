import { describe, it, expect } from "vitest";
import { REAL_PROJECTS, getProjectBySlug, getFeaturedProjects } from "@/data/projects";

describe("Real Projects Data Integrity", () => {
  it("only contains real, non-fabricated projects", () => {
    const projectSlugs = REAL_PROJECTS.map((p) => p.slug);
    expect(projectSlugs).toContain("saksham");
    expect(projectSlugs).toContain("kaushal-setu");
    expect(projectSlugs).toContain("saarthi");
    expect(projectSlugs).toContain("luxora");
    expect(projectSlugs).toContain("shonen-study-academy");
    expect(projectSlugs).toContain("deadpool-merc-browser");
    expect(projectSlugs).toContain("git-practice");

    // Must NOT contain fabricated imaginary projects
    expect(projectSlugs).not.toContain("harmonycare");
    expect(projectSlugs).not.toContain("studyquest");
    expect(projectSlugs).not.toContain("trishna-studio");
  });

  it("every project satisfies all 16 required structured sections", () => {
    REAL_PROJECTS.forEach((p) => {
      // 1. Hero / Title
      expect(p.title).toBeTruthy();
      expect(p.tagline).toBeTruthy();
      // 2. Project overview
      expect(p.longDescription.length).toBeGreaterThan(30);
      // 3. Problem
      expect(p.problem.length).toBeGreaterThan(20);
      // 4. Goal
      expect(p.goal.length).toBeGreaterThan(20);
      // 5. Research
      expect(p.research.length).toBeGreaterThan(20);
      // 6. Design
      expect(p.design.length).toBeGreaterThan(20);
      // 7. Architecture
      expect(p.architecture.length).toBeGreaterThan(20);
      // 8. Technologies
      expect(p.technologies.length).toBeGreaterThan(0);
      // 9. Features
      expect(p.features.length).toBeGreaterThan(0);
      // 10. Challenges
      expect(p.challenges.length).toBeGreaterThan(20);
      // 11. Solution
      expect(p.solution.length).toBeGreaterThan(20);
      // 12. Screenshots
      expect(p.screenshots.length).toBeGreaterThan(0);
      // 13. GitHub repository
      expect(p.githubUrl).toMatch(/^https:\/\/github\.com\/TrishnaBapna\//);
      // 15. What I learned
      expect(p.whatILearned.length).toBeGreaterThan(20);
      // 16. Future improvements
      expect(p.futureImprovement.length).toBeGreaterThan(20);
    });
  });

  it("retrieves project by slug correctly", () => {
    const saksham = getProjectBySlug("saksham");
    expect(saksham).toBeDefined();
    expect(saksham?.title).toContain("Saksham");
  });

  it("filters featured projects properly", () => {
    const featured = getFeaturedProjects();
    expect(featured.length).toBeGreaterThanOrEqual(3);
    featured.forEach((p) => expect(p.featured).toBe(true));
  });
});
