"use client";

import React from "react";
import { siteConfig } from "@/lib/site-config";
import { GitHubRepo, GitHubUser } from "@/types/github";
import {
  Github,
  GitBranch,
  Star,
  FolderGit2,
  Calendar,
  ExternalLink,
  Code2,
  ArrowUpRight,
} from "lucide-react";

export function GitHubSection({
  repositories,
  user,
}: {
  repositories: GitHubRepo[];
  user: GitHubUser;
}) {
  const publicRepos = repositories.slice(0, 6);

  return (
    <section id="github" className="py-24 border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
              04 // OPEN SOURCE FOOTPRINT
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              CODE IN PUBLIC.
            </h2>
            <p className="text-base text-muted-foreground">
              Direct connection to GitHub account{" "}
              <span className="font-mono text-foreground font-semibold">
                @{user.login}
              </span>
              . Every repository reflects genuine commits and learning milestones.
            </p>
          </div>

          <a
            href={user.html_url || siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-xl bg-[#171717] px-5 py-3 text-xs font-semibold text-[#FAF8F5] transition-all hover:bg-[#FF5A36] hover:shadow-lg dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
          >
            <Github className="h-4 w-4" />
            <span>VIEW GITHUB PROFILE</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* GitHub Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-[#FF5A36]">
                <FolderGit2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">
                  {user.public_repos || repositories.length}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  Public Repositories
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-amber-500">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">
                  7
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  Languages &amp; Stacks
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-emerald-500">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">
                  100%
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  Open Source
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-purple-500">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">
                  Active
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  2026 Commit Radar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Repositories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {publicRepos.map((repo) => (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 hover:border-[#FF5A36]/60 hover:shadow-md transition-all duration-200"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 text-[#FF5A36]" />
                    <span className="font-mono text-sm font-bold text-foreground group-hover:text-[#FF5A36] transition-colors">
                      {repo.name}
                    </span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-60 group-hover:opacity-100" />
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {repo.description || "Interactive software repository by Trishna Bapna."}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#FF5A36]"></span>
                  <span>{repo.language || "Web Architecture"}</span>
                </span>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    <span>{repo.stargazers_count}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>{repo.forks_count}</span>
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
