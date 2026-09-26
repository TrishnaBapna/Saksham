"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F1EEE7] text-[#171717] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-[#DDD8CF] bg-[#FAF8F5] p-8 text-center space-y-5 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold">Application Error</h1>
          <p className="text-xs text-zinc-600">
            A critical root error occurred. Click below to reload the application.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5A36] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
