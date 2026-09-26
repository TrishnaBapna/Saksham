"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Share2,
  Settings,
  LogOut,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, render clean layout without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Projects", href: "/admin/projects", icon: FolderGit2 },
    { label: "Blog / Logs", href: "/admin/blog", icon: FileText },
    { label: "Gallery / Lab", href: "/admin/gallery", icon: ImageIcon },
    { label: "Messages", href: "/admin/messages", icon: MessageSquare },
    { label: "Social Links", href: "/admin/social", icon: Share2 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#FF5A36] font-bold">
              PORTFOLIO CMS
            </span>
            <h2 className="font-display text-xl font-bold text-foreground">
              TRISHNA.ADMIN
            </h2>
          </div>

          <nav className="space-y-1.5" aria-label="Admin Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-mono transition-colors ${
                    isActive
                      ? "bg-[#171717] text-[#FAF8F5] font-bold dark:bg-[#FAF8F5] dark:text-[#171717]"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#FF5A36]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-border/60 space-y-2 mt-6">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-mono text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <span>Live Portfolio</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-mono text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
