"use client";

import React, { useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { Share2, Check, Save } from "lucide-react";

export default function AdminSocialPage() {
  const [socials, setSocials] = useState({
    github: siteConfig.socials.github,
    linkedin: siteConfig.socials.linkedin || "",
    instagram: siteConfig.socials.instagram || "",
    youtube: siteConfig.socials.youtube || "",
    email: siteConfig.socials.email || "",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="pb-6 border-b border-border">
        <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
          CHANNELS &amp; HANDLES
        </span>
        <h1 className="font-display text-3xl font-extrabold text-foreground">
          Social Links Configuration
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          Only links with valid URLs are rendered on the public website.
        </p>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>Social links configuration updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            GitHub URL
          </label>
          <input
            type="url"
            value={socials.github}
            onChange={(e) => setSocials({ ...socials, github: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            LinkedIn Profile URL (Optional)
          </label>
          <input
            type="url"
            value={socials.linkedin}
            placeholder="https://linkedin.com/in/..."
            onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            YouTube Channel URL (Optional)
          </label>
          <input
            type="url"
            value={socials.youtube}
            placeholder="https://youtube.com/@..."
            onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Instagram URL (Optional)
          </label>
          <input
            type="url"
            value={socials.instagram}
            placeholder="https://instagram.com/..."
            onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Contact Receiver Email
          </label>
          <input
            type="email"
            value={socials.email}
            onChange={(e) => setSocials({ ...socials, email: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF5A36]"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-6 py-2.5 text-xs font-mono font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] transition-colors dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
        >
          <Save className="h-4 w-4" />
          <span>Save Social Channels</span>
        </button>
      </form>
    </div>
  );
}
