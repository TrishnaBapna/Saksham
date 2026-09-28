"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";
import { ArrowDown, ArrowUpRight, Github, Sparkles, Terminal } from "lucide-react";
import { motion } from "framer-motion";

export function HeroSection({
  onOpenTerminal,
}: {
  onOpenTerminal?: () => void;
}) {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden pt-12 pb-20 border-b border-border">
      {/* Background Animated Subtle Grid & Geometry */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-40 dark:opacity-20">
        <div className="absolute -top-[30%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#FF5A36]/15 to-transparent blur-3xl animate-pulseGlow" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-500/10 to-transparent blur-3xl" />
        {/* Subtle grid lines */}
        <div className="h-full w-full bg-[linear-gradient(to_right,#DDD8CF_1px,transparent_1px),linear-gradient(to_bottom,#DDD8CF_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262624_1px,transparent_1px),linear-gradient(to_bottom,#262624_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Main Editorial Text */}
          <div className="lg:col-span-8 space-y-6">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-mono text-muted-foreground shadow-xs">
                <span className="h-2 w-2 rounded-full bg-[#FF5A36] animate-ping" />
                <span>{siteConfig.status}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <span className="text-[#FF5A36]">●</span> Available for Collaborations
              </span>
            </div>

            {/* Name & Title */}
            <div>
              <p className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#FF5A36] font-semibold mb-2">
                PORTFOLIO // {siteConfig.role}
              </p>
              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
                {siteConfig.name}
              </h1>
            </div>

            {/* Large Statement */}
            <blockquote className="border-l-2 border-[#FF5A36] pl-4 sm:pl-6 py-1">
              <p className="font-display text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-foreground/90 uppercase leading-snug">
                &ldquo;{siteConfig.heroStatement}&rdquo;
              </p>
            </blockquote>

            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              {siteConfig.bioSummary}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/projects"
                className="group inline-flex items-center gap-2 rounded-xl bg-[#171717] px-6 py-3.5 text-sm font-semibold text-[#FAF8F5] transition-all hover:bg-[#FF5A36] hover:shadow-lg active:scale-95 dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
              >
                <span>EXPLORE PROJECTS</span>
                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </Link>

              <Link
                href="/prototype"
                className="inline-flex items-center gap-2 rounded-xl border border-[#FF1825]/40 bg-[#FF1825]/10 px-5 py-3.5 text-sm font-semibold text-[#FF1825] transition-all hover:bg-[#FF1825] hover:text-white hover:shadow-md active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>SOLAR PROTOTYPE</span>
              </Link>

              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-[#FF5A36]/60 hover:shadow-sm active:scale-95"
              >
                <Github className="h-4 w-4" />
                <span>VIEW GITHUB</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>

              {onOpenTerminal && (
                <button
                  onClick={onOpenTerminal}
                  aria-label="Launch interactive terminal"
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3.5 text-sm font-mono text-muted-foreground hover:text-foreground hover:border-[#FF5A36] transition-colors"
                >
                  <Terminal className="h-4 w-4 text-[#FF5A36]" />
                  <span>TRISHNA.OS</span>
                </button>
              )}
            </div>
          </div>

          {/* Profile Photo & Editorial Frame */}
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <div className="relative group max-w-[320px] w-full">
              {/* Decorative accent offset border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-[#FF5A36]/40 translate-x-3 translate-y-3 -z-10 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-300" />
              
              <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
                <div className="relative aspect-square w-full bg-secondary/40">
                  <Image
                    src={siteConfig.photo}
                    alt="Trishna Bapna — Creative Technologist profile photo"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="font-display text-sm font-bold tracking-wide">
                      Trishna Bapna
                    </p>
                    <p className="font-mono text-[11px] text-zinc-300">
                      GitHub: @TrishnaBapna
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-border/60 bg-card space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>STATUS</span>
                    <span className="text-[#FF5A36] font-semibold">ONLINE // BUILDING</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Developing assistive healthcare software, civic data tools, and exploring modern full-stack web architectures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
