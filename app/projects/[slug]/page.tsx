import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getAllProjects, getProjectBySlug } from "@/data/projects";
import {
  ArrowLeft,
  Github,
  ExternalLink,
  Target,
  Search,
  Palette,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  Sparkles,
  Camera,
} from "lucide-react";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const projects = getAllProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProjectBySlug(params.slug);
  if (!project) return { title: "Project Not Found" };

  return {
    title: `${project.title} — Case Study`,
    description: project.description,
    openGraph: {
      title: `${project.title} | Trishna Bapna`,
      description: project.description,
      images: [{ url: project.coverImage }],
    },
  };
}

export default function ProjectDetailPage({ params }: Props) {
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  return (
    <article className="py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Navigation Breadcrumb */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-[#FF5A36] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>ALL PROJECTS</span>
        </Link>

        {/* 1. Hero */}
        <header className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#FF5A36]/10 px-3 py-1 font-mono text-xs font-semibold text-[#FF5A36] border border-[#FF5A36]/30">
              {project.category}
            </span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Status: {project.status}
            </span>
            <span className="font-mono text-xs text-muted-foreground ml-auto">
              Updated {project.updatedAt}
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
            {project.title}
          </h1>

          <p className="font-display text-xl sm:text-2xl text-muted-foreground font-medium">
            {project.tagline}
          </p>

          {/* Quick Action Links: 13. GitHub repository & 14. Live demo */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/60">
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-5 py-3 text-xs font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] transition-all dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
            >
              <Github className="h-4 w-4" />
              <span>13. View GitHub Repository</span>
            </a>

            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-xs font-semibold text-foreground hover:border-[#FF5A36]/60 transition-all"
              >
                <ExternalLink className="h-4 w-4 text-[#FF5A36]" />
                <span>14. Launch Live Demo</span>
              </a>
            )}
          </div>

          {/* Hero Cover Image */}
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-border bg-secondary shadow-lg mt-8">
            <Image
              src={project.coverImage}
              alt={`${project.title} architecture overview`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        </header>

        {/* 2. Project Overview */}
        <section className="space-y-4 pt-6 border-t border-border">
          <h2 className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-bold">
            02 // PROJECT OVERVIEW
          </h2>
          <div className="text-base sm:text-lg text-foreground leading-relaxed">
            {project.longDescription}
          </div>
        </section>

        {/* 3. Problem & 4. Goal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 3. Problem */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                03. The Problem
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {project.problem}
            </p>
          </section>

          {/* 4. Goal */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                04. The Goal
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {project.goal}
            </p>
          </section>
        </div>

        {/* 5. Research & 6. Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 5. Research */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                05. Research &amp; Foundations
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {project.research}
            </p>
          </section>

          {/* 6. Design */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                <Palette className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                06. Design &amp; Aesthetics
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {project.design}
            </p>
          </section>
        </div>

        {/* 7. Architecture */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Cpu className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              07. Technical Architecture
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {project.architecture}
          </p>
        </section>

        {/* 8. Technologies */}
        <section className="space-y-4 pt-6 border-t border-border">
          <h2 className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-bold">
            08 // TECHNOLOGIES USED
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {project.technologies.map((t, i) => (
              <span
                key={i}
                className="rounded-xl border border-border bg-card px-4 py-2 font-mono text-xs text-foreground shadow-xs"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* 9. Features */}
        <section className="space-y-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#FF5A36]" />
            <h2 className="font-display text-2xl font-bold text-foreground">
              09. Core Engineered Features
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {project.features.map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <CheckCircle2 className="h-4 w-4 text-[#FF5A36] mt-0.5 shrink-0" />
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 10. Challenges & 11. Solution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 10. Challenges */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                10. Technical Challenges
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {project.challenges}
            </p>
          </section>

          {/* 11. Solution */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
                <Lightbulb className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                11. Engineered Solution
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {project.solution}
            </p>
          </section>
        </div>

        {/* 12. Screenshots */}
        <section className="space-y-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#FF5A36]" />
            <h2 className="font-display text-2xl font-bold text-foreground">
              12. Interface Screenshots &amp; Visual Telemetry
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {project.screenshots.map((shot, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="relative aspect-[16/10] w-full bg-secondary">
                  <Image
                    src={shot.url}
                    alt={shot.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <p className="font-semibold text-sm text-foreground">
                    {shot.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shot.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 15. What I Learned & 16. Future Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
          {/* 15. What I Learned */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                15. What I Learned
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {project.whatILearned}
            </p>
          </section>

          {/* 16. Future Improvements */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                16. Future Roadmap
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {project.futureImprovement}
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-12 border-t border-border flex justify-between items-center">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-[#FF5A36] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Projects</span>
          </Link>
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#FF5A36] hover:underline"
          >
            <span>Inspect Code on GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
