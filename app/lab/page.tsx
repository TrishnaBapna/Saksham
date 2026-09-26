"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { GALLERY_ITEMS, GalleryItem } from "@/data/gallery";
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
  Sliders,
  Volume2,
} from "lucide-react";

export default function CreativeLabPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(
    null
  );

  // Audio Metronome Mini-Sandbox State
  const [metronomeBpm, setMetronomeBpm] = useState(60);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const categories = [
    "All",
    "Artwork",
    "Sketches",
    "Photography",
    "Creative Coding",
    "Design",
    "Experiments",
  ];

  const filteredItems = GALLERY_ITEMS.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory
  );

  // Lightbox Keyboard Navigation: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeLightboxIndex === null) return;
      if (e.key === "Escape") setActiveLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setActiveLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : null
        );
      }
      if (e.key === "ArrowRight") {
        setActiveLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % filteredItems.length : null
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxIndex, filteredItems.length]);

  // Metronome Sound Engine
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isMetronomeActive) {
      const ctx = audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (!audioCtx) setAudioCtx(ctx);

      const intervalMs = (60 / metronomeBpm) * 1000;
      intervalId = setInterval(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        } catch {
          // ignore audio suspension
        }
      }, intervalMs);
    }
    return () => clearInterval(intervalId);
  }, [isMetronomeActive, metronomeBpm, audioCtx]);

  const activeItem: GalleryItem | null =
    activeLightboxIndex !== null ? filteredItems[activeLightboxIndex] : null;

  return (
    <div className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-[#FF5A36] mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO HOME</span>
        </Link>

        {/* Section Header */}
        <div className="max-w-3xl space-y-4 mb-12">
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
            DIGITAL LABORATORY &amp; ATELIER
          </span>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
            CREATIVE LAB.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            The creative space where ideas take physical and visual form before becoming production systems. Exploring traditional ink, generative waveforms, UI sketches for assistive tech, and acoustic pacing metronomes.
          </p>
        </div>

        {/* Interactive Experiment: Browser Acoustic Metronome Sandbox */}
        <div className="mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-[#FF5A36]" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Acoustic Pacing Simulator (Web Audio API)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                The sound synthesis engine designed for Saksham. External acoustic beats support gait stabilization for motor recovery. Test the cadence below:
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>TEMPO:</span>
                  <span className="font-bold text-[#FF5A36]">{metronomeBpm} BPM</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={metronomeBpm}
                  onChange={(e) => setMetronomeBpm(parseInt(e.target.value))}
                  aria-label="Metronome tempo slider"
                  className="w-36 sm:w-48 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-[#FF5A36]"
                />
              </div>

              <button
                onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                className={`rounded-xl px-5 py-2.5 text-xs font-mono font-bold transition-all ${
                  isMetronomeActive
                    ? "bg-[#FF5A36] text-white animate-pulse"
                    : "bg-[#171717] text-[#FAF8F5] dark:bg-[#FAF8F5] dark:text-[#171717]"
                }`}
              >
                {isMetronomeActive ? "STOP PULSE" : "START CADENCE"}
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-mono tracking-wider uppercase transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-[#171717] text-[#FAF8F5] dark:bg-[#FAF8F5] dark:text-[#171717] font-bold"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setActiveLightboxIndex(idx)}
              className="group cursor-pointer rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:border-[#FF5A36]/60 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-mono font-semibold text-black shadow-lg">
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Expand</span>
                  </span>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-mono text-white backdrop-blur-md">
                    {item.category}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>{item.year}</span>
                  <span className="text-[#FF5A36]">{item.tags.join(" • ")}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-foreground group-hover:text-[#FF5A36] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accessible Lightbox Modal */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          {/* Close button */}
          <button
            onClick={() => setActiveLightboxIndex(null)}
            aria-label="Close lightbox"
            className="absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Navigation Controls */}
          <button
            onClick={() =>
              setActiveLightboxIndex((prev) =>
                prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : null
              )
            }
            aria-label="Previous artwork"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={() =>
              setActiveLightboxIndex((prev) =>
                prev !== null ? (prev + 1) % filteredItems.length : null
              )
            }
            aria-label="Next artwork"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Content Card */}
          <div className="flex flex-col max-w-4xl w-full max-h-[90vh] rounded-2xl overflow-hidden bg-[#181817] text-white border border-white/10 shadow-2xl">
            <div className="relative aspect-[16/10] w-full bg-black/60">
              <Image
                src={activeItem.imageUrl}
                alt={activeItem.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-contain"
              />
            </div>

            <div className="p-6 bg-[#181817] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#FF5A36] uppercase font-bold">
                    {activeItem.category} // {activeItem.year}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold">
                  {activeItem.title}
                </h3>
                <p className="text-xs text-zinc-400 max-w-xl">
                  {activeItem.caption}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {activeItem.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-mono text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
