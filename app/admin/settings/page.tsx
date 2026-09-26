"use client";

import React, { useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { Settings, Save, Check } from "lucide-react";

export default function AdminSettingsPage() {
  const [config, setConfig] = useState({
    name: siteConfig.name,
    role: siteConfig.role,
    status: siteConfig.status,
    heroStatement: siteConfig.heroStatement,
    bioSummary: siteConfig.bioSummary,
    photo: siteConfig.photo,
    musicSource: siteConfig.music.source,
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="pb-6 border-b border-border">
        <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
          SYSTEM PREFERENCES
        </span>
        <h1 className="font-display text-3xl font-extrabold text-foreground">
          Website Settings
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          Single source of truth configurations for hero banners, editorial copy, and audio tracks.
        </p>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>Website configuration updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Full Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Professional Role
          </label>
          <input
            type="text"
            value={config.role}
            onChange={(e) => setConfig({ ...config, role: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Status Pill
          </label>
          <input
            type="text"
            value={config.status}
            onChange={(e) => setConfig({ ...config, status: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Hero Statement Quote
          </label>
          <textarea
            rows={2}
            value={config.heroStatement}
            onChange={(e) => setConfig({ ...config, heroStatement: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Bio Summary
          </label>
          <textarea
            rows={3}
            value={config.bioSummary}
            onChange={(e) => setConfig({ ...config, bioSummary: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Profile Photo Path
          </label>
          <input
            type="text"
            value={config.photo}
            onChange={(e) => setConfig({ ...config, photo: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
            required
          />
          <p className="text-[11px] font-mono text-muted-foreground">
            Drop new image file into /public/images/profile.jpg
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Audio Player File Source
          </label>
          <input
            type="text"
            value={config.musicSource}
            onChange={(e) => setConfig({ ...config, musicSource: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
            required
          />
          <p className="text-[11px] font-mono text-muted-foreground">
            Location: /public/music/background.mp3
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-6 py-2.5 text-xs font-mono font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] transition-colors dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
        >
          <Save className="h-4 w-4" />
          <span>Save System Settings</span>
        </button>
      </form>
    </div>
  );
}
