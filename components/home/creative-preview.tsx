"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { GALLERY_ITEMS } from "@/data/gallery";
import { ArrowRight, Sparkles, Youtube, ExternalLink } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function CreativePreview() {
  const previewItems = GALLERY_ITEMS.slice(0, 3);

  return (
    <section className="py-24 border-b border-border bg-card/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
              05 // CREATIVE LAB &amp; EXPERIMENTS
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              WHERE LOGIC MEETS ART.
            </h2>
            <p className="text-base text-muted-foreground">
              Beyond production software, I cultivate an experimental space for digital sketches, generative canvas algorithms, traditional ink studies, and sound synthesis.
            </p>
          </div>

          <Link
            href="/lab"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#FF5A36] hover:underline"
          >
            <span>ENTER CREATIVE LAB</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Gallery Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {previewItems.map((item) => (
            <Link
              key={item.id}
              href="/lab"
              className="group block rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-[#FF5A36]/60 transition-all"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-mono text-white backdrop-blur-md">
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
                  <span>{item.year}</span>
                  <span className="text-[#FF5A36]">{item.tags.join(" • ")}</span>
                </div>
                <h3 className="font-display text-base font-bold text-foreground group-hover:text-[#FF5A36] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.caption}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* YouTube Section Card (Requirement 15) */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 text-red-600 dark:text-red-400 shrink-0">
              <Youtube className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-foreground">
                Trishna Bapna // Video &amp; Dev Demos
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Walkthroughs, prototype demonstrations, and learning reflections will be shared here.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {siteConfig.socials.youtube ? (
              <a
                href={siteConfig.socials.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <span>Visit YouTube Channel</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="rounded-full border border-border px-3.5 py-1.5 text-xs font-mono text-muted-foreground">
                Channel Ready for Connection
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
