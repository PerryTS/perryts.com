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
  {
    slug: "cranelift-to-llvm",
    title: "From Cranelift to LLVM: How Perry Got 24x Faster",
    date: "2026-04-12",
    excerpt:
      "Perry's backend migration from Cranelift to LLVM is finished. The initial cutover made benchmarks 70x slower — then six targeted optimizations made Perry faster than Node.js on every benchmark, with up to 24.6x speedups.",
    tags: ["compilers", "llvm", "cranelift", "performance", "milestone"],
    content: () => null,
  },
  {
    slug: "optimizing-everything",
    title: "Optimizing Everything: One Week, 68 Releases, and a 547x JSON Speedup",
    date: "2026-04-17",
    excerpt:
      "Perry v0.5.13 → v0.5.80 in seven days. JSON.parse closes a 547x gap to Node. mimalloc lands as the global allocator. Inline caches, shape transitions, typed buffer slots, i32-native bitwise ops, scalar replacement, and a native event loop that keeps Fastify and WebSocket servers alive.",
    tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"],
    content: () => null,
  },
  {
    slug: "npm-perry-dev-and-beating-bun",
    title: "npm Distribution, perry dev, and Winning Every Benchmark",
    date: "2026-04-23",
    excerpt:
      "Perry v0.5.80 → v0.5.174 in six days. @perryts/perry ships on npm for all seven supported platforms. perry dev adds watch-mode auto-recompile on top of an in-memory AST cache and on-disk per-module object cache. json_roundtrip closes its last gap — Perry now wins every benchmark against both Node.js and Bun.",
    tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"],
    content: () => null,
  },
  {
    slug: "gen-gc-lazy-json-and-defensible-benchmarks",
    title: "Generational GC, Lazy JSON, and Benchmarks That Hold Up to Scrutiny",
    date: "2026-04-26",
    excerpt:
      "Perry v0.5.174 → v0.5.306 in three days, plus the GC and JSON work that landed alongside. The generational GC ships as default. The Small String Optimization ships as default. The JSON pipeline gets a lazy tape that lands at 75 ms median on validate-and-roundtrip — best in the dynamic-typing pack. The benchmarks page is rewritten with RUNS=11 median + p95 + σ, simdjson and AssemblyScript+json-as added as peers, and every weakness Perry has surfaced honestly.",
    tags: ["GC", "JSON", "performance", "benchmarks", "milestone"],
    content: () => null,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
