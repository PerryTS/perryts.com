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
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
