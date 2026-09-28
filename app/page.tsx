import React from "react";
import { CharacterHero } from "@/components/home/character-hero";
import { AboutSection } from "@/components/home/about-section";
import { SkillsSection } from "@/components/home/skills-section";
import { ProjectsSection } from "@/components/home/projects-section";
import { GitHubSection } from "@/components/home/github-section";
import { CreativePreview } from "@/components/home/creative-preview";
import { getRepositories, getUserProfile } from "@/lib/github";

export const revalidate = 3600; // ISR cache revalidation every hour

export default async function HomePage() {
  const [repositories, user] = await Promise.all([
    getRepositories(),
    getUserProfile(),
  ]);

  return (
    <div className="flex flex-col">
      {/* 1. Luxury Character Hero Section with Cursor Tracking */}
      <CharacterHero />

      {/* Marquee Banner Ticker */}
      <div className="border-y border-border bg-card py-3 overflow-hidden select-none">
        <div className="flex w-max animate-marquee space-x-8 text-xs font-mono tracking-widest uppercase text-muted-foreground">
          <span>● ASSISTIVE HEALTHCARE SOFTWARE</span>
          <span>● COGNITIVE WELLNESS</span>
          <span>● VOCATIONAL SKILLING TRIANGULATION</span>
          <span>● OFFLINE-FIRST ARCHITECTURES</span>
          <span>● WEB AUDIO API OSCILLATORS</span>
          <span>● DEVANAGARI &amp; BILINGUAL UI</span>
          <span>● CREATIVE COMPUTING</span>
          <span>● 100% OPEN SOURCE ON GITHUB</span>
          {/* Duplicate for infinite loop */}
          <span>● ASSISTIVE HEALTHCARE SOFTWARE</span>
          <span>● COGNITIVE WELLNESS</span>
          <span>● VOCATIONAL SKILLING TRIANGULATION</span>
          <span>● OFFLINE-FIRST ARCHITECTURES</span>
          <span>● WEB AUDIO API OSCILLATORS</span>
          <span>● DEVANAGARI &amp; BILINGUAL UI</span>
          <span>● CREATIVE COMPUTING</span>
          <span>● 100% OPEN SOURCE ON GITHUB</span>
        </div>
      </div>

      {/* 2. About Section */}
      <AboutSection />

      {/* 3. Skills Section */}
      <SkillsSection />

      {/* 4. Projects Showcase Section */}
      <ProjectsSection />

      {/* 5. GitHub Code in Public Section */}
      <GitHubSection repositories={repositories} user={user} />

      {/* 6. Creative Lab Preview */}
      <CreativePreview />
    </div>
  );
}
