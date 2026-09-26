"use client";

import React, { useState } from "react";
import {
  SKILL_CATEGORIES,
  SKILLS_DATA,
  STATUS_LABELS,
  SkillProficiency,
} from "@/data/skills";
import { Layers, Sparkles } from "lucide-react";

export function SkillsSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedProficiency, setSelectedProficiency] =
    useState<SkillProficiency | "all">("all");

  const categories = ["All", ...SKILL_CATEGORIES];

  const filteredSkills = SKILLS_DATA.filter((item) => {
    const matchCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchProficiency =
      selectedProficiency === "all" || item.status === selectedProficiency;
    return matchCategory && matchProficiency;
  });

  return (
    <section id="skills" className="py-24 border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
              02 // TECHNICAL INVENTORY
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              AUTHENTIC COMPETENCIES.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              A transparent breakdown separating what is actively deployed in real repositories from technologies currently being mastered or explored.
            </p>
          </div>

          {/* Legend indicators */}
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            {(["using", "learning", "exploring"] as SkillProficiency[]).map((st) => (
              <button
                key={st}
                onClick={() =>
                  setSelectedProficiency(
                    selectedProficiency === st ? "all" : st
                  )
                }
                className={`rounded-full px-3 py-1 border transition-all ${
                  selectedProficiency === st
                    ? "ring-2 ring-[#FF5A36] font-bold"
                    : "opacity-80 hover:opacity-100"
                } ${STATUS_LABELS[st].badge}`}
              >
                ● {STATUS_LABELS[st].label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-mono tracking-wider uppercase transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-[#171717] text-[#FAF8F5] shadow-xs dark:bg-[#FAF8F5] dark:text-[#171717]"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredSkills.map((skill, idx) => {
            const statusInfo = STATUS_LABELS[skill.status];
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[#FF5A36]/60 hover:shadow-md"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
                    {skill.category}
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-[#FF5A36] transition-colors leading-snug">
                    {skill.name}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-border/40">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-mono border ${statusInfo.badge}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Explanation Footer */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border/60 text-xs text-muted-foreground">
          <div>
            <span className="font-mono font-bold text-foreground block mb-1">
              Currently Using
            </span>
            <p>Proven in public repositories (Saksham, Kaushal-Setu, Saarthi, LUXORA).</p>
          </div>
          <div>
            <span className="font-mono font-bold text-foreground block mb-1">
              Currently Learning
            </span>
            <p>Active daily study, integration tutorials, and evolving code exercises.</p>
          </div>
          <div>
            <span className="font-mono font-bold text-foreground block mb-1">
              Exploring
            </span>
            <p>Prototyping edge possibilities to broaden technical vocabulary.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
