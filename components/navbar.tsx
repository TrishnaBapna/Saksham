"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { siteConfig } from "@/lib/site-config";
import {
  Menu,
  X,
  Moon,
  Sun,
  Terminal,
  Bot,
  ArrowUpRight,
} from "lucide-react";
import { InteractiveTerminal } from "./interactive-terminal";
import { AiAssistantModal } from "./ai-assistant-modal";

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  // Keyboard shortcut listener: Cmd/Ctrl + K opens terminal, Esc closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setTerminalOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setTerminalOpen(false);
        setAiAssistantOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    { label: "HOME", href: "/" },
    { label: "ABOUT", href: "/#about" },
    { label: "PROJECTS", href: "/projects" },
    { label: "LAB", href: "/lab" },
    { label: "BLOG", href: "/blog" },
    { label: "GITHUB", href: "/#github" },
    { label: "CONTACT", href: "/contact" },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-border bg-background/85 backdrop-blur-md shadow-sm"
            : "border-b border-border/40 bg-background/60 backdrop-blur-xs"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-2 font-display text-base sm:text-lg font-bold tracking-tight text-foreground transition-colors hover:text-[#FF5A36]"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#FF5A36] group-hover:scale-125 transition-transform"></span>
            <span>TRISHNA BAPNA</span>
            <span className="hidden md:inline-block text-[11px] font-mono text-muted-foreground font-normal ml-1">
              / portfolio
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href.replace("/#", "/"));
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-xs font-mono tracking-widest transition-colors hover:text-[#FF5A36] ${
                    isActive
                      ? "text-[#FF5A36] font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {/* Terminal Launcher */}
            <button
              onClick={() => setTerminalOpen(true)}
              aria-label="Open TRISHNA.OS Terminal (Shortcut: Cmd+K)"
              title="Open Terminal (Cmd+K)"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-[#FF5A36]/40 transition-colors"
            >
              <Terminal className="h-3.5 w-3.5 text-[#FF5A36]" />
              <span className="hidden lg:inline">OS</span>
              <kbd className="hidden lg:inline rounded bg-secondary px-1 text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            {/* AI Assistant Launcher */}
            <button
              onClick={() => setAiAssistantOpen(true)}
              aria-label="Open ASK TRISHNA AI Assistant"
              title="Ask AI Assistant"
              className="flex items-center gap-1 rounded-lg border border-[#FF5A36]/30 bg-[#FF5A36]/10 px-2.5 py-1.5 text-xs font-mono text-[#FF5A36] hover:bg-[#FF5A36]/20 transition-colors"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ASK AI</span>
            </button>

            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
                aria-label={`Switch to ${
                  resolvedTheme === "dark" ? "light" : "dark"
                } mode`}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Animated Mobile Menu */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur-xl p-6 md:hidden animate-in fade-in duration-200"
        >
          {/* Top Bar with Close button */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="font-display text-lg font-bold text-foreground">
              TRISHNA BAPNA
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Links list */}
          <nav className="my-auto flex flex-col space-y-5" aria-label="Mobile Menu Links">
            {navLinks.map((link, idx) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center justify-between text-2xl font-display font-semibold text-foreground hover:text-[#FF5A36] transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    0{idx + 1}
                  </span>
                  <span>{link.label}</span>
                </span>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-[#FF5A36] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            ))}
          </nav>

          {/* Bottom Shortcuts */}
          <div className="border-t border-border pt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTerminalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-xs font-mono text-foreground"
              >
                <Terminal className="h-4 w-4 text-[#FF5A36]" />
                TRISHNA.OS
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAiAssistantOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#FF5A36]/40 bg-[#FF5A36]/10 py-3 text-xs font-mono text-[#FF5A36]"
              >
                <Bot className="h-4 w-4" />
                ASK AI
              </button>
            </div>

            <p className="text-center font-mono text-[11px] text-muted-foreground">
              {siteConfig.status}
            </p>
          </div>
        </div>
      )}

      {/* Terminal Modal */}
      <InteractiveTerminal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
      />

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
      />
    </>
  );
}
