import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getAllBlogPosts, getBlogPostBySlug } from "@/data/blog";
import { getProjectBySlug } from "@/data/projects";
import { ArrowLeft, Clock, ArrowRight, BookOpen, Share2 } from "lucide-react";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: `${post.title} | Trishna Bapna`,
      description: post.summary,
      images: [{ url: post.coverImage }],
    },
  };
}

export default function BlogPostDetailPage({ params }: Props) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const relatedProject = post.relatedProjectSlug
    ? getProjectBySlug(post.relatedProjectSlug)
    : null;

  return (
    <article className="py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Navigation Breadcrumb */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-[#FF5A36] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO DEV LOG</span>
        </Link>

        {/* Post Header */}
        <header className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#FF5A36]/10 px-3 py-1 font-mono text-xs font-semibold text-[#FF5A36] border border-[#FF5A36]/30">
              {post.category}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {post.date}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-[#FF5A36]" />
              {post.readingTime}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            {post.title}
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground leading-relaxed">
            {post.summary}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {post.tags.map((tag, i) => (
              <span
                key={i}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-mono text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Cover Image */}
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-border bg-secondary shadow-lg mt-8">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        </header>

        {/* Post Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed pt-6 border-t border-border">
          <div className="whitespace-pre-line font-sans space-y-4">
            {post.content}
          </div>
        </div>

        {/* Related Project Callout if present */}
        {relatedProject && (
          <div className="rounded-2xl border border-[#FF5A36]/40 bg-[#FF5A36]/5 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#FF5A36]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-bold">
                RELATED PROJECT CASE STUDY
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">
              {relatedProject.title} — {relatedProject.tagline}
            </h3>
            <p className="text-sm text-muted-foreground">
              {relatedProject.description}
            </p>
            <div className="pt-2">
              <Link
                href={`/projects/${relatedProject.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] transition-colors dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
              >
                <span>Read Full Case Study</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-8 border-t border-border flex justify-between items-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-[#FF5A36] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Articles</span>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#FF5A36] hover:underline"
          >
            <span>Discuss this article</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
