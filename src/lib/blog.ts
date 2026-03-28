import { ReactNode } from "react";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  content: () => ReactNode;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "introducing-perry",
    title: "Introducing Perry",
    date: "2025-01-15",
    excerpt:
      "Perry is a native TypeScript compiler written in Rust that compiles your TypeScript directly to standalone executables. No runtime, no Electron, no compromises.",
    tags: ["announcement", "compiler", "TypeScript"],
    content: () => null, // Content rendered inline in the post page
  },
  {
    slug: "cross-platform-native-ui",
    title: "Cross-Platform Native UI from TypeScript",
    date: "2025-02-01",
    excerpt:
      "How Perry maps one TypeScript codebase to AppKit, UIKit, Android Views, GTK4, and Win32 — delivering truly native UI on every platform.",
    tags: ["architecture", "UI", "cross-platform"],
    content: () => null,
  },
  {
    slug: "building-pry",
    title: "Building Pry: A Native JSON Viewer in TypeScript",
    date: "2025-02-20",
    excerpt:
      "A walkthrough of building Pry — a native JSON viewer that compiles from TypeScript to a native ARM64 binary. No runtime, no web views.",
    tags: ["tutorial", "showcase", "Pry"],
    content: () => null,
  },
  {
    slug: "plugin-systems-are-a-performance-tax",
    title: "Plugin Systems Are a Performance Tax",
    date: "2026-02-27",
    excerpt:
      "Plugin architectures trade performance for extensibility. But what if extensibility happened at build time instead of runtime? Compile-time composition gives you both — zero overhead, full flexibility.",
    tags: ["architecture", "performance", "compiler"],
    content: () => null,
  },
  {
    slug: "compiling-hono-trpc-strapi",
    title: "Compiling Hono, tRPC, and Strapi to Native Binaries",
    date: "2026-02-25",
    excerpt:
      "Perry now compiles three major TypeScript frameworks — Hono, tRPC, and Strapi — into native ARM64 executables. They compile in under a second, produce binaries under 2 MB, and run without crashes.",
    tags: ["compiler", "frameworks", "progress"],
    content: () => null,
  },
  {
    slug: "all-six-platforms-ui-parity",
    title: "All Six Platforms, Full Feature Parity",
    date: "2026-02-28",
    excerpt:
      "20+ native UI widgets, a Canvas widget, Table views, system notifications, keychain access, multi-window support, and full feature parity across macOS, iOS, iPadOS, Android, Linux, and Windows — all from a single TypeScript codebase.",
    tags: ["UI", "cross-platform", "release", "milestone"],
    content: () => null,
  },
  {
    slug: "from-compiler-to-ecosystem",
    title: "From Compiler to Ecosystem: React, Databases, and Cloud Builds",
    date: "2026-03-06",
    excerpt:
      "Perry grows from a compiler into a full ecosystem. perry/ui at the core, Prisma-compatible ORMs for MySQL/PostgreSQL/SQLite, universal push notifications, distributed builds with App Store publishing, and a React compatibility layer — all in one week.",
    tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"],
    content: () => null,
  },
  {
    slug: "the-full-pipeline",
    title: "The Full Pipeline: Docs, Distribution, and WidgetKit",
    date: "2026-03-13",
    excerpt:
      "82 commits in one week: a 49-page documentation site, automated App Store and Play Store publishing, Homebrew and APT packages, native WidgetKit extensions from TypeScript, new widgets, http/https modules, and a self-hosting LLVM compiler.",
    tags: ["distribution", "documentation", "WidgetKit", "milestone"],
    content: () => null,
  },
  {
    slug: "cross-compile-windows-game-loops-and-parity",
    title: "Cross-Compile to Windows, iOS Game Loops, and 100% Test Parity",
    date: "2026-03-20",
    excerpt:
      "103 commits in one week: cross-compile to Windows from Linux via lld-link, iOS game loop support, crash reporting, a two-stage Hub build pipeline, and the self-hosting compiler hits 68/68 deterministic test parity.",
    tags: ["compiler", "cross-compilation", "infrastructure", "milestone"],
    content: () => null,
  },
  {
    slug: "true-multithreading-i18n-and-watchos",
    title: "True Multi-Threading, Compile-Time i18n, and watchOS",
    date: "2026-03-23",
    excerpt:
      "Perry v0.4.0: real OS threads with compile-time safety, a zero-ceremony internationalization system for 30+ locales, watchOS as the 9th compilation target, audio and camera APIs, and a parallel compiler pipeline.",
    tags: ["threading", "i18n", "watchOS", "compiler", "milestone"],
    content: () => null,
  },
  {
    slug: "tvos-cross-compile-and-perry-login",
    title: "tvOS, Cross-Compile iOS from Linux, and Perry Login",
    date: "2026-03-28",
    excerpt:
      "Perry v0.4.24: tvOS as the 10th compilation target, cross-compile iOS and macOS from Linux via ld64.lld, perry login with usage-based billing, Windows UI overhaul, macOS notarization, and 120 commits in 5 days.",
    tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"],
    content: () => null,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
