"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid credentials";
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A36]/10 text-[#FF5A36]">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            TRISHNA.CMS // ADMIN
          </h1>
          <p className="text-xs font-mono text-muted-foreground">
            Restricted control panel for portfolio management
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-password"
              className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold"
            >
              Admin Master Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter master password..."
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-[#FF5A36]"
              autoFocus
              required
            />
            <p className="text-[11px] font-mono text-muted-foreground">
              Configured via ADMIN_PASSWORD in .env
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#171717] py-3 text-sm font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] disabled:opacity-50 transition-colors dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Enter Admin Panel</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-border/60 text-center">
          <Link
            href="/"
            className="font-mono text-xs text-muted-foreground hover:text-[#FF5A36] transition-colors"
          >
            ← Return to Public Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
