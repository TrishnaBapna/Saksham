"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Trash2, Sparkles, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "What projects has Trishna built?",
  "What technologies does Trishna use?",
  "Tell me about Saksham & Parkinson's care.",
  "What is Trishna currently learning?",
  "How can I contact Trishna?",
];

export function AiAssistantModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am Trishna's AI portfolio assistant. I can answer questions about her real GitHub projects, engineering competencies, and current learning journey. What would you like to know?",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || inputVal.trim();
    if (!textToSend || isLoading) return;

    setErrorMsg(null);
    setInputVal("");

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: textToSend },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error("Unable to connect to AI assistant.");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I am unable to answer right now.",
        },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error contacting assistant";
      setErrorMsg(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered a temporary connection issue. Please try again or check the Projects page directly.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Conversation cleared. How can I help you learn more about Trishna's work?",
      },
    ]);
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ask Trishna AI Assistant"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="flex flex-col w-full max-w-xl h-[600px] max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5A36]/10 text-[#FF5A36]">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">ASK TRISHNA AI</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Grounded Knowledge
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Answers strictly derived from verified projects &amp; skills
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              title="Clear conversation"
              aria-label="Clear conversation"
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close assistant"
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF5A36] text-white text-xs font-bold mt-0.5">
                  TB
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#171717] text-[#FAF8F5] dark:bg-[#FAF8F5] dark:text-[#171717]"
                    : "bg-secondary text-foreground border border-border/50"
                }`}
              >
                <div className="whitespace-pre-line prose prose-sm dark:prose-invert max-w-none">
                  {m.content}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF5A36] text-white text-xs font-bold">
                TB
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-secondary text-muted-foreground flex items-center gap-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5A36]" />
                Searching verified portfolio data...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-2 bg-secondary/50 border-t border-border/50 overflow-x-auto">
          <div className="flex gap-1.5 whitespace-nowrap pb-1">
            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mr-1">
              <Sparkles className="h-3 w-3 text-[#FF5A36]" /> Try:
            </span>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-[#FF5A36]/40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-3 bg-card border-t border-border flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything about Trishna's projects, tech stack..."
            aria-label="Ask Trishna AI message input"
            className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#FF5A36]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputVal.trim() || isLoading}
            aria-label="Send message to AI assistant"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A36] text-white hover:bg-[#E04825] disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
