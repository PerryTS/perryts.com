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
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
