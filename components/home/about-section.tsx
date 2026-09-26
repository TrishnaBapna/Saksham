"use client";

import React from "react";
import { siteConfig } from "@/lib/site-config";
import { Compass, Lightbulb, Code2, HeartHandshake, Palette, BookOpen } from "lucide-react";

export function AboutSection() {
  const pillars = [
    {
      icon: Compass,
      title: "CURIOUS BY DEFAULT",
      description:
        "Driven by a relentless instinct to understand how systems operate under the hood. When code breaks or an interface feels clumsy, I investigate the core constraints rather than settling for superficial workarounds.",
    },
    {
      icon: HeartHandshake,
      title: "ASSISTIVE & CIVIC TECH",
      description:
        "Technology reaches its highest purpose when it serves vulnerable or overlooked populations. Projects like Saksham (Parkinson's cognitive support) and Kaushal Setu (vocational apprentice tracking) guide my engineering direction.",
    },
    {
      icon: Code2,
      title: "PRAGMATIC FULL-STACK",
      description:
        "Building end-to-end architectures from scratch: crafting clean semantic DOMs, managing asynchronous state, integrating Web Audio APIs, and configuring relational database schemas with strict TypeScript typing.",
    },
    {
      icon: Palette,
      title: "CREATIVE COMPUTING & ART",
      description:
        "Believing that logic and aesthetics elevate each other. I sketch by hand, experiment with generative typography and waveforms, and explore creative coding alongside traditional software engineering.",
    },
  ];

  return (
    <section id="about" className="py-24 border-b border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
            <span>01 // BACKGROUND &amp; PHILOSOPHY</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            CURIOUS BY DEFAULT.
          </h2>
          <div className="flex gap-4 font-mono text-xs uppercase tracking-wider text-muted-foreground font-bold">
            <span className="text-[#FF5A36]">LEARN</span>
            <span>•</span>
            <span className="text-[#FF5A36]">BUILD</span>
            <span>•</span>
            <span className="text-[#FF5A36]">CREATE</span>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            I am a student developer, creative technologist, and digital builder actively shaping my craft through hands-on experimentation. Rather than claiming decades of corporate seniority, I let my actual repositories, prototypes, and continuous curiosity speak for the dedication I bring to software.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="group rounded-2xl border border-border bg-card p-6 sm:p-8 transition-all hover:border-[#FF5A36]/60 hover:shadow-md"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-[#FF5A36] group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground tracking-tight">
                    {pillar.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Current Learning & Growth Card */}
        <div className="rounded-2xl border border-dashed border-[#FF5A36]/40 bg-[#FF5A36]/5 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#FF5A36]" />
                <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-bold">
                  ACTIVE LEARNING HORIZON
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                Currently immersing in Next.js 14 App Router, strict TypeScript architectures, PostgreSQL relational modeling, and neuro-inclusive human-computer interaction.
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              Updated September 2026
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
