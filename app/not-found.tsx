import React from "react";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 sm:p-12 text-center space-y-6 shadow-xl">
        <span className="font-mono text-5xl font-extrabold text-[#FF5A36] block">
          404
        </span>

        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Page Not Found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            The requested route or resource does not exist in Trishna Bapna&apos;s digital portfolio.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-5 py-2.5 text-xs font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] transition-colors dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Return to Portfolio</span>
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground hover:border-[#FF5A36]/60 transition-colors"
          >
            <span>Explore Projects</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
