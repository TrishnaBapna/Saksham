"use client";

import React from "react";
import { BLOG_POSTS } from "@/data/blog";
import { FileText, Eye, Clock, Plus } from "lucide-react";
import Link from "next/link";

export default function AdminBlogPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
            EDITORIAL ENGINE
          </span>
          <h1 className="font-display text-3xl font-extrabold text-foreground">
            Blog &amp; Dev Logs
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        {BLOG_POSTS.map((post) => (
          <div
            key={post.slug}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 hover:border-[#FF5A36]/40 transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <h3 className="font-display text-base font-bold text-foreground">
                  {post.title}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span>{post.date}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#FF5A36]" />
                  {post.readingTime}
                </span>
                <span>•</span>
                <span className="text-[#FF5A36]">{post.category}</span>
              </div>
            </div>

            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="flex items-center gap-1 rounded-xl border border-border px-3.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground shrink-0"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Read</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
