import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CustomCursor } from "@/components/custom-cursor";
import { MusicPlayer } from "@/components/music-player";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: {
    default: siteConfig.seo.title,
    template: "%s | Trishna Bapna",
  },
  description: siteConfig.seo.description,
  keywords: siteConfig.seo.keywords,
  authors: [{ name: "Trishna Bapna", url: siteConfig.github }],
  creator: "Trishna Bapna",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://trishnabapna.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.seo.url,
    title: siteConfig.seo.title,
    description: siteConfig.seo.description,
    siteName: "Trishna Bapna Portfolio",
    images: [
      {
        url: "/images/projects/saksham-hero.svg",
        width: 1200,
        height: 630,
        alt: "Trishna Bapna — Creative Technologist",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.seo.title,
    description: siteConfig.seo.description,
    images: ["/images/projects/saksham-hero.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${siteConfig.seo.url}#person`,
        name: "Trishna Bapna",
        jobTitle: "Creative Technologist",
        description: siteConfig.bioSummary,
        url: siteConfig.seo.url,
        sameAs: [siteConfig.github],
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.seo.url}#website`,
        url: siteConfig.seo.url,
        name: "Trishna Bapna Portfolio & Digital Lab",
        publisher: { "@id": `${siteConfig.seo.url}#person` },
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="font-sans min-h-screen bg-background text-foreground antialiased selection:bg-[#FF5A36] selection:text-white noise-overlay"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <CustomCursor />
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <MusicPlayer />
        </ThemeProvider>
      </body>
    </html>
  );
}
