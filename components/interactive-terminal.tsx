"use client";

import React, { useState, useRef, useEffect } from "react";
import { siteConfig } from "@/lib/site-config";
import { REAL_PROJECTS } from "@/data/projects";
import { SKILLS_DATA } from "@/data/skills";
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, CornerDownLeft } from "lucide-react";
import Link from "next/link";

interface HistoryEntry {
  command: string;
  output: React.ReactNode;
  time: string;
}

export function InteractiveTerminal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      command: "welcome",
      output: (
        <div className="space-y-1 text-xs">
          <p className="font-bold text-[#FF5A36]">
            {siteConfig.terminal.systemName} {siteConfig.terminal.version}
          </p>
          <p className="text-muted-foreground">{siteConfig.terminal.welcomeMessage}</p>
          <p className="text-zinc-500">
            Type <span className="text-[#FF5A36] font-semibold">help</span> to view available system commands.
          </p>
        </div>
      ),
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [commandIndex, setCommandIndex] = useState<number>(-1);
  const [savedCommands, setSavedCommands] = useState<string[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const executeCommand = (cmdText: string) => {
    const trimmed = cmdText.trim().toLowerCase();
    if (!trimmed) return;

    setSavedCommands((prev) => [...prev, cmdText]);
    setCommandIndex(-1);

    const now = new Date().toLocaleTimeString();
    let outputNode: React.ReactNode = null;

    switch (trimmed) {
      case "help":
        outputNode = (
          <div className="space-y-1.5 text-xs">
            <p className="font-semibold text-foreground">Available Commands:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <div><span className="text-[#FF5A36] font-mono">about</span> : Background and creative philosophy</div>
              <div><span className="text-[#FF5A36] font-mono">skills</span> : Categorized technical competencies</div>
              <div><span className="text-[#FF5A36] font-mono">projects</span> : Verified real GitHub projects</div>
              <div><span className="text-[#FF5A36] font-mono">github</span> : GitHub repositories and profile</div>
              <div><span className="text-[#FF5A36] font-mono">contact</span> : Get in touch with Trishna</div>
              <div><span className="text-[#FF5A36] font-mono">music</span> : Audio player status</div>
              <div><span className="text-[#FF5A36] font-mono">social</span> : Verified social profiles</div>
              <div><span className="text-[#FF5A36] font-mono">clear</span> : Clear console buffer</div>
            </div>
          </div>
        );
        break;

      case "about":
        outputNode = (
          <div className="space-y-2 text-xs">
            <p className="text-foreground font-semibold">TRISHNA BAPNA</p>
            <p className="text-muted-foreground">
              Creative Technologist &amp; Student Developer based in India.
            </p>
            <p className="text-muted-foreground">
              Passionate about building digital applications that merge human empathy with practical technology.
              Focus areas include assistive healthcare UX, public-good skilling data, and offline-first systems.
            </p>
          </div>
        );
        break;

      case "skills":
        outputNode = (
          <div className="space-y-2 text-xs">
            <p className="text-foreground font-semibold">TECHNICAL SKILLS OVERVIEW:</p>
            <div className="space-y-1 text-muted-foreground">
              <p><span className="text-[#FF5A36]">Currently Using:</span> JavaScript (ES6+), HTML5, Tailwind CSS, Web Audio API, PWA, Chart.js, Git</p>
              <p><span className="text-amber-500">Currently Learning:</span> React, Next.js App Router, TypeScript, PostgreSQL, Prisma ORM, Vitest</p>
              <p><span className="text-purple-400">Exploring:</span> WebGL, Edge AI (TF.js), Microservices, Systems Programming</p>
            </div>
          </div>
        );
        break;

      case "projects":
        outputNode = (
          <div className="space-y-2 text-xs">
            <p className="text-foreground font-semibold">VERIFIED GITHUB PROJECTS ({REAL_PROJECTS.length}):</p>
            <div className="space-y-1.5">
              {REAL_PROJECTS.map((p) => (
                <div key={p.slug} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-1">
                  <div>
                    <span className="text-[#FF5A36] font-mono font-medium">{p.title}</span>
                    <span className="text-muted-foreground text-[11px] ml-2">— {p.category}</span>
                  </div>
                  <div className="flex gap-2 text-[11px] mt-0.5 sm:mt-0">
                    <Link href={`/projects/${p.slug}`} className="text-foreground hover:underline">
                      [Case Study]
                    </Link>
                    <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      [GitHub]
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        break;

      case "github":
        outputNode = (
          <div className="space-y-1.5 text-xs">
            <p className="text-foreground font-semibold">GITHUB INTEGRATION:</p>
            <p className="text-muted-foreground">Profile: <a href={siteConfig.github} target="_blank" rel="noopener noreferrer" className="text-[#FF5A36] underline">{siteConfig.github}</a></p>
            <p className="text-muted-foreground">Total Repositories: 7 public repositories</p>
            <p className="text-zinc-500">Featured projects: Saksham, Kaushal-Setu, Saarthi, LUXORA</p>
          </div>
        );
        break;

      case "contact":
        outputNode = (
          <div className="space-y-1.5 text-xs">
            <p className="text-foreground font-semibold">CONTACT CHANNELS:</p>
            <p className="text-muted-foreground">Email: {siteConfig.socials.email || "Via portfolio contact form"}</p>
            <p className="text-muted-foreground">GitHub: {siteConfig.github}</p>
            <p className="text-zinc-500">
              Navigate to <Link href="/contact" className="text-[#FF5A36] underline">/contact</Link> to send a direct message.
            </p>
          </div>
        );
        break;

      case "music":
        outputNode = (
          <div className="space-y-1 text-xs">
            <p className="text-foreground font-semibold">AUDIO SYSTEM:</p>
            <p className="text-muted-foreground">Track: {siteConfig.music.title}</p>
            <p className="text-muted-foreground">Artist: {siteConfig.music.artist}</p>
            <p className="text-zinc-500">Use the floating music controller in the bottom right corner to play.</p>
          </div>
        );
        break;

      case "social":
        outputNode = (
          <div className="space-y-1 text-xs">
            <p className="text-foreground font-semibold">ACTIVE PROFILES:</p>
            <p className="text-muted-foreground">• GitHub: <a href={siteConfig.github} target="_blank" rel="noopener noreferrer" className="text-[#FF5A36] underline">{siteConfig.github}</a></p>
            {siteConfig.socials.linkedin && (
              <p className="text-muted-foreground">• LinkedIn: <a href={siteConfig.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#FF5A36] underline">{siteConfig.socials.linkedin}</a></p>
            )}
            {siteConfig.socials.instagram && (
              <p className="text-muted-foreground">• Instagram: {siteConfig.socials.instagram}</p>
            )}
          </div>
        );
        break;

      case "clear":
        setHistory([]);
        setInputVal("");
        return;

      case "sudo":
        outputNode = (
          <p className="text-xs text-red-400">
            Permission denied: User does not belong to root. Trishna maintains admin authorization.
          </p>
        );
        break;

      default:
        outputNode = (
          <p className="text-xs text-amber-500/90">
            command not found: {cmdText}. Type <span className="font-semibold underline">help</span> for supported commands.
          </p>
        );
        break;
    }

    setHistory((prev) => [
      ...prev,
      {
        command: cmdText,
        output: outputNode,
        time: now,
      },
    ]);
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputVal);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (savedCommands.length > 0) {
        const nextIdx =
          commandIndex === -1
            ? savedCommands.length - 1
            : Math.max(0, commandIndex - 1);
        setCommandIndex(nextIdx);
        setInputVal(savedCommands[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (savedCommands.length > 0 && commandIndex !== -1) {
        const nextIdx = commandIndex + 1;
        if (nextIdx >= savedCommands.length) {
          setCommandIndex(-1);
          setInputVal("");
        } else {
          setCommandIndex(nextIdx);
          setInputVal(savedCommands[nextIdx]);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="TRISHNA.OS Terminal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        className={`flex flex-col rounded-xl border border-border bg-[#0E0E0D] text-[#FAF8F5] shadow-2xl font-mono overflow-hidden transition-all duration-200 ${
          isFullScreen
            ? "w-full h-full max-w-none"
            : "w-full max-w-3xl h-[520px] max-h-[85vh]"
        }`}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-border/40 bg-[#161615] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#EF4444]/90 inline-block"></span>
            <span className="h-3 w-3 rounded-full bg-[#F59E0B]/90 inline-block"></span>
            <span className="h-3 w-3 rounded-full bg-[#10B981]/90 inline-block"></span>
            <span className="ml-2 text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <TerminalIcon className="h-3.5 w-3.5 text-[#FF5A36]" />
              TRISHNA.OS — zsh (arm64)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              aria-label={isFullScreen ? "Exit fullscreen" : "Fullscreen"}
              className="p-1 text-zinc-400 hover:text-white"
            >
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onClose}
              aria-label="Close terminal"
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm leading-relaxed"
        >
          {history.map((entry, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="text-[#FF5A36]">trishna@os:~$</span>
                <span className="text-zinc-100 font-semibold">{entry.command}</span>
                <span className="text-[10px] text-zinc-600 ml-auto">{entry.time}</span>
              </div>
              <div className="pl-4 text-zinc-300">{entry.output}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Prompt Input Line */}
        <div className="flex items-center gap-2 border-t border-border/40 bg-[#141413] px-4 py-3">
          <span className="text-xs text-[#FF5A36] font-semibold">trishna@os:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command (try 'help', 'projects', 'about')..."
            aria-label="Terminal command input"
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 outline-none font-mono"
            autoFocus
          />
          <button
            onClick={() => executeCommand(inputVal)}
            aria-label="Submit command"
            className="p-1 text-zinc-400 hover:text-[#FF5A36]"
          >
            <CornerDownLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
