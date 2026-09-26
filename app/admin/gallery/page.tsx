"use client";

import React from "react";
import { GALLERY_ITEMS } from "@/data/gallery";
import { Image as ImageIcon, Eye, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AdminGalleryPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
            CREATIVE ASSETS
          </span>
          <h1 className="font-display text-3xl font-extrabold text-foreground">
            Creative Lab &amp; Artwork
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {GALLERY_ITEMS.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border bg-card overflow-hidden space-y-3 p-4"
          >
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-secondary">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="text-[#FF5A36]">{item.category}</span>
                <span>{item.year}</span>
              </div>
              <h3 className="font-display text-sm font-bold text-foreground truncate">
                {item.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
