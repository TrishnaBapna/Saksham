"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getFeaturedProjects } from "@/data/projects";
import { ArrowUpRight, Github, ExternalLink, BookOpen, ArrowRight } from "lucide-react";

export function ProjectsSection() {
  const featuredProjects = getFeaturedProjects();

  return (
    <section id="projects" className="py-24 border-b border-border bg-card/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
              03 // REAL GITHUB WORK
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              SELECTED PROJECTS.
            </h2>
            <p className="text-base text-muted-foreground">
              Original software architectures built by Trishna Bapna. Every project listed here maps to public repositories on GitHub.
            </p>
          </div>

          <Link
            href="/projects"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#FF5A36] hover:underline"
          >
            <span>VIEW ALL ({featuredProjects.length}+ REPOSITORIES)</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Featured Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {featuredProjects.map((project) => (
            <article
              key={project.slug}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-[#FF5A36]/60 hover:shadow-xl transition-all duration-300"
            >
              {/* Image Preview */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/50 border-b border-border">
                <Image
                  src={project.coverImage}
                  alt={`${project.title} preview`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Status Badge */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-mono font-medium text-white backdrop-blur-md">
                    {project.category}
                  </span>
                  <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-mono font-bold text-white shadow-xs">
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#FF5A36] font-semibold">
                      {project.language || "Web Architecture"}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Updated {project.updatedAt}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl font-bold tracking-tight text-foreground group-hover:text-[#FF5A36] transition-colors">
                    {project.title}
                  </h3>

                  <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-snug">
                    {project.tagline}
                  </p>

                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Tech Pills */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.technologies.slice(0, 5).map((tech, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-border/80 bg-secondary/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies.length > 5 && (
                    <span className="rounded-md px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      +{project.technologies.length - 5}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/60">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] transition-colors dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Case Study</span>
                  </Link>

                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:border-[#FF5A36]/60 transition-colors"
                  >
                    <Github className="h-3.5 w-3.5" />
                    <span>GitHub</span>
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
    </section>
  );
}
