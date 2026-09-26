"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Mail, Calendar, Trash2, CheckCircle, RefreshCw, Inbox } from "lucide-react";

interface MessageItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/contact");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
            COMMUNICATIONS INBOX
          </span>
          <h1 className="font-display text-3xl font-extrabold text-foreground">
            Contact Messages
          </h1>
        </div>

        <button
          onClick={fetchMessages}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-mono text-foreground hover:border-[#FF5A36]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="py-20 text-center space-y-4 rounded-2xl border border-dashed border-border bg-card/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-foreground">
              No Messages Yet
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When visitors or recruiters send inquiries through the /contact page, they will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-2xl border border-border bg-card p-6 space-y-4 transition-all hover:border-[#FF5A36]/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {msg.subject}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <span className="text-foreground font-semibold">{msg.name}</span>
                    <span>•</span>
                    <a
                      href={`mailto:${msg.email}`}
                      className="text-[#FF5A36] hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {msg.email}
                    </a>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {msg.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
