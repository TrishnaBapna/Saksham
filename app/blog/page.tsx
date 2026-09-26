import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { getAllBlogPosts } from "@/data/blog";
import { ArrowLeft, Clock, ArrowRight, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Dev Log & Engineering Reflections",
  description:
    "Reflections on software architecture, assistive UX, Devanagari typography, and offline-first systems by Trishna Bapna.",
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-[#FF5A36] mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO HOME</span>
        </Link>

        {/* Header */}
        <div className="max-w-3xl space-y-4 mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
            DEVELOPMENT JOURNAL
          </span>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
            DEV LOG &amp; WRITING.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Honest, unfiltered reflections from an active builder. Documenting the engineering hurdles, architectural trade-offs, and design breakthroughs behind each project.
          </p>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-[#FF5A36]/60 hover:shadow-xl transition-all duration-300"
            >
              {/* Cover Image */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary border-b border-border">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4">
                  <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-mono font-medium text-white backdrop-blur-md">
                    {post.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                    <span>{post.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#FF5A36]" />
                      {post.readingTime}
                    </span>
                  </div>

                  <h2 className="font-display text-2xl font-bold tracking-tight text-foreground group-hover:text-[#FF5A36] transition-colors leading-snug">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>

                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-border/60 bg-secondary/50 px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#FF5A36] hover:underline"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
