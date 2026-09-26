"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { ArrowUpRight, Github, Mail, Globe } from "lucide-react";

export function Footer() {
  const [localTime, setLocalTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t border-border bg-card/60 backdrop-blur-sm pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-border/60">
          {/* Main Statement */}
          <div className="md:col-span-6 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              TRISHNA BAPNA
            </h2>
            <div className="space-y-1 font-mono text-sm tracking-widest text-[#FF5A36] uppercase font-bold">
              <p>BUILDING.</p>
              <p>LEARNING.</p>
              <p>CREATING.</p>
            </div>
            <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
              {siteConfig.bioSummary}
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              NAVIGATION
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/projects" className="text-foreground hover:text-[#FF5A36] transition-colors">
                  Projects &amp; Case Studies
                </Link>
              </li>
              <li>
                <Link href="/lab" className="text-foreground hover:text-[#FF5A36] transition-colors">
                  Creative Lab
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-foreground hover:text-[#FF5A36] transition-colors">
                  Blog / Dev Logs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-foreground hover:text-[#FF5A36] transition-colors">
                  Contact &amp; Inquiries
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-muted-foreground hover:text-[#FF5A36] transition-colors text-xs font-mono">
                  Admin Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect & Timezone */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              VERIFIED CHANNELS
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={siteConfig.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-foreground hover:text-[#FF5A36] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    GitHub
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </li>
              {siteConfig.socials.email && (
                <li>
                  <Link
                    href="/contact"
                    className="flex items-center justify-between text-foreground hover:text-[#FF5A36] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Form
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </li>
              )}
            </ul>

            <div className="pt-4 border-t border-border/40 font-mono text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <Globe className="h-3.5 w-3.5 text-[#FF5A36]" />
                <span>India Standard Time (IST)</span>
              </div>
              <p className="text-[11px] text-[#FF5A36] font-semibold">{localTime || "Syncing clock..."}</p>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <p>© {new Date().getFullYear()} Trishna Bapna. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>Designed &amp; Built with Next.js, TypeScript &amp; Tailwind</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FF5A36]"></span>
          </p>
        </div>
      </div>
    </footer>
  );
}
