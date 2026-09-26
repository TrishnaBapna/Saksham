import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { getAllProjects } from "@/data/projects";
import { Github, ExternalLink, BookOpen, ArrowLeft, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Projects & Engineering Case Studies",
  description:
    "Explore Trishna Bapna's software engineering projects, assistive healthcare apps, public-good dashboards, and prototypes.",
};

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <div className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-[#FF5A36] mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO HOME</span>
        </Link>

        {/* Page Header */}
        <div className="max-w-3xl space-y-4 mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
            INDEX OF WORK
          </span>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
            SOFTWARE &amp; PROTOTYPES.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every project listed here is derived strictly from real code in Trishna Bapna&apos;s GitHub repositories. Click into any case study for deep technical insights, architectural decisions, and honest retrospectives.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {projects.map((project) => (
            <article
              key={project.slug}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-[#FF5A36]/60 hover:shadow-xl transition-all duration-300"
            >
              {/* Cover Image */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary border-b border-border">
                <Image
                  src={project.coverImage}
                  alt={`${project.title} cover`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="rounded-full bg-black/80 px-3 py-1 text-[11px] font-mono font-medium text-white backdrop-blur-md">
                    {project.category}
                  </span>
                  <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-mono font-bold text-white shadow-xs">
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="text-[#FF5A36] font-semibold">
                      {project.language || "Web Architecture"}
                    </span>
                    <span>Updated {project.updatedAt}</span>
                  </div>

                  <h2 className="font-display text-2xl font-bold tracking-tight text-foreground group-hover:text-[#FF5A36] transition-colors">
                    {project.title}
                  </h2>

                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {project.tagline}
                  </p>

                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {project.description}
                  </p>
                </div>

                {/* Tech Badges */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.technologies.map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-border/80 bg-secondary/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/60">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] transition-colors dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Read Case Study</span>
                  </Link>

                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:border-[#FF5A36]/60 transition-colors"
                  >
                    <Github className="h-3.5 w-3.5" />
                    <span>Source Code</span>
                  </a>

                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:border-[#FF5A36]/60 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Live Demo</span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
