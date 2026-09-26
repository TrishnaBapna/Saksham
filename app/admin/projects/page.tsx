"use client";

import React, { useState } from "react";
import { REAL_PROJECTS } from "@/data/projects";
import { ProjectItem } from "@/types/project";
import { FolderGit2, Star, ExternalLink, Check, Eye, Plus } from "lucide-react";
import Link from "next/link";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>(REAL_PROJECTS);

  const toggleFeatured = (slug: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, featured: !p.featured } : p))
    );
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
            REPOSITORY REGISTRY
          </span>
          <h1 className="font-display text-3xl font-extrabold text-foreground">
            Manage Projects
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Toggle featured showcase status or review project content mappings.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {projects.map((p) => (
          <div
            key={p.slug}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 hover:border-[#FF5A36]/40 transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-[#FF5A36]" />
                <h3 className="font-display text-base font-bold text-foreground">
                  {p.title}
                </h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {p.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {p.tagline}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => toggleFeatured(p.slug)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-mono transition-colors ${
                  p.featured
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{p.featured ? "Featured" : "Standard"}</span>
              </button>

              <Link
                href={`/projects/${p.slug}`}
                target="_blank"
                className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
