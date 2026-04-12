import { type ComponentType } from "react";
import { locales } from "@/i18n/routing";

type ContentLoader = () => Promise<{ default: ComponentType }>;

const slugs = [
  "introducing-perry",
  "cross-platform-native-ui",
  "building-pry",
  "compiling-hono-trpc-strapi",
  "plugin-systems-are-a-performance-tax",
  "all-six-platforms-ui-parity",
  "from-compiler-to-ecosystem",
  "the-full-pipeline",
  "cross-compile-windows-game-loops-and-parity",
  "true-multithreading-i18n-and-watchos",
  "tvos-cross-compile-and-perry-login",
  "cranelift-to-llvm",
] as const;

// Build a loader map: slug -> locale -> dynamic import
// Using explicit imports for each slug to ensure static analysis works
const loaders: Record<string, Record<string, ContentLoader>> = {
  "introducing-perry": {
    en: () => import("./introducing-perry/en"),
    de: () => import("./introducing-perry/de"),
    es: () => import("./introducing-perry/es"),
    fr: () => import("./introducing-perry/fr"),
    it: () => import("./introducing-perry/it"),
    ja: () => import("./introducing-perry/ja"),
    ko: () => import("./introducing-perry/ko"),
    pt: () => import("./introducing-perry/pt"),
    th: () => import("./introducing-perry/th"),
    tr: () => import("./introducing-perry/tr"),
    vi: () => import("./introducing-perry/vi"),
    id: () => import("./introducing-perry/id"),
    "zh-Hans": () => import("./introducing-perry/zh-Hans"),
  },
  "cross-platform-native-ui": {
    en: () => import("./cross-platform-native-ui/en"),
    de: () => import("./cross-platform-native-ui/de"),
    es: () => import("./cross-platform-native-ui/es"),
    fr: () => import("./cross-platform-native-ui/fr"),
    it: () => import("./cross-platform-native-ui/it"),
    ja: () => import("./cross-platform-native-ui/ja"),
    ko: () => import("./cross-platform-native-ui/ko"),
    pt: () => import("./cross-platform-native-ui/pt"),
    th: () => import("./cross-platform-native-ui/th"),
    tr: () => import("./cross-platform-native-ui/tr"),
    vi: () => import("./cross-platform-native-ui/vi"),
    id: () => import("./cross-platform-native-ui/id"),
    "zh-Hans": () => import("./cross-platform-native-ui/zh-Hans"),
  },
  "building-pry": {
    en: () => import("./building-pry/en"),
    de: () => import("./building-pry/de"),
    es: () => import("./building-pry/es"),
    fr: () => import("./building-pry/fr"),
    it: () => import("./building-pry/it"),
    ja: () => import("./building-pry/ja"),
    ko: () => import("./building-pry/ko"),
    pt: () => import("./building-pry/pt"),
    th: () => import("./building-pry/th"),
    tr: () => import("./building-pry/tr"),
    vi: () => import("./building-pry/vi"),
    id: () => import("./building-pry/id"),
    "zh-Hans": () => import("./building-pry/zh-Hans"),
  },
  "compiling-hono-trpc-strapi": {
    en: () => import("./compiling-hono-trpc-strapi/en"),
    de: () => import("./compiling-hono-trpc-strapi/de"),
    es: () => import("./compiling-hono-trpc-strapi/es"),
    fr: () => import("./compiling-hono-trpc-strapi/fr"),
    it: () => import("./compiling-hono-trpc-strapi/it"),
    ja: () => import("./compiling-hono-trpc-strapi/ja"),
    ko: () => import("./compiling-hono-trpc-strapi/ko"),
    pt: () => import("./compiling-hono-trpc-strapi/pt"),
    th: () => import("./compiling-hono-trpc-strapi/th"),
    tr: () => import("./compiling-hono-trpc-strapi/tr"),
    vi: () => import("./compiling-hono-trpc-strapi/vi"),
    id: () => import("./compiling-hono-trpc-strapi/id"),
    "zh-Hans": () => import("./compiling-hono-trpc-strapi/zh-Hans"),
  },
  "plugin-systems-are-a-performance-tax": {
    en: () => import("./plugin-systems-are-a-performance-tax/en"),
    de: () => import("./plugin-systems-are-a-performance-tax/de"),
    es: () => import("./plugin-systems-are-a-performance-tax/es"),
    fr: () => import("./plugin-systems-are-a-performance-tax/fr"),
    it: () => import("./plugin-systems-are-a-performance-tax/it"),
    ja: () => import("./plugin-systems-are-a-performance-tax/ja"),
    ko: () => import("./plugin-systems-are-a-performance-tax/ko"),
    pt: () => import("./plugin-systems-are-a-performance-tax/pt"),
    th: () => import("./plugin-systems-are-a-performance-tax/th"),
    tr: () => import("./plugin-systems-are-a-performance-tax/tr"),
    vi: () => import("./plugin-systems-are-a-performance-tax/vi"),
    id: () => import("./plugin-systems-are-a-performance-tax/id"),
    "zh-Hans": () => import("./plugin-systems-are-a-performance-tax/zh-Hans"),
  },
  "all-six-platforms-ui-parity": {
    en: () => import("./all-six-platforms-ui-parity/en"),
    de: () => import("./all-six-platforms-ui-parity/de"),
    es: () => import("./all-six-platforms-ui-parity/es"),
    fr: () => import("./all-six-platforms-ui-parity/fr"),
    it: () => import("./all-six-platforms-ui-parity/it"),
    ja: () => import("./all-six-platforms-ui-parity/ja"),
    ko: () => import("./all-six-platforms-ui-parity/ko"),
    pt: () => import("./all-six-platforms-ui-parity/pt"),
    th: () => import("./all-six-platforms-ui-parity/th"),
    tr: () => import("./all-six-platforms-ui-parity/tr"),
    vi: () => import("./all-six-platforms-ui-parity/vi"),
    id: () => import("./all-six-platforms-ui-parity/id"),
    "zh-Hans": () => import("./all-six-platforms-ui-parity/zh-Hans"),
  },
  "from-compiler-to-ecosystem": {
    en: () => import("./from-compiler-to-ecosystem/en"),
    de: () => import("./from-compiler-to-ecosystem/de"),
    es: () => import("./from-compiler-to-ecosystem/es"),
    fr: () => import("./from-compiler-to-ecosystem/fr"),
    it: () => import("./from-compiler-to-ecosystem/it"),
    ja: () => import("./from-compiler-to-ecosystem/ja"),
    ko: () => import("./from-compiler-to-ecosystem/ko"),
    pt: () => import("./from-compiler-to-ecosystem/pt"),
    th: () => import("./from-compiler-to-ecosystem/th"),
    tr: () => import("./from-compiler-to-ecosystem/tr"),
    vi: () => import("./from-compiler-to-ecosystem/vi"),
    id: () => import("./from-compiler-to-ecosystem/id"),
    "zh-Hans": () => import("./from-compiler-to-ecosystem/zh-Hans"),
  },
  "the-full-pipeline": {
    en: () => import("./the-full-pipeline/en"),
    de: () => import("./the-full-pipeline/de"),
    es: () => import("./the-full-pipeline/es"),
    fr: () => import("./the-full-pipeline/fr"),
    it: () => import("./the-full-pipeline/it"),
    ja: () => import("./the-full-pipeline/ja"),
    ko: () => import("./the-full-pipeline/ko"),
    pt: () => import("./the-full-pipeline/pt"),
    th: () => import("./the-full-pipeline/th"),
    tr: () => import("./the-full-pipeline/tr"),
    vi: () => import("./the-full-pipeline/vi"),
    id: () => import("./the-full-pipeline/id"),
    "zh-Hans": () => import("./the-full-pipeline/zh-Hans"),
  },
  "cross-compile-windows-game-loops-and-parity": {
    en: () => import("./cross-compile-windows-game-loops-and-parity/en"),
    de: () => import("./cross-compile-windows-game-loops-and-parity/de"),
    es: () => import("./cross-compile-windows-game-loops-and-parity/es"),
    fr: () => import("./cross-compile-windows-game-loops-and-parity/fr"),
    it: () => import("./cross-compile-windows-game-loops-and-parity/it"),
    ja: () => import("./cross-compile-windows-game-loops-and-parity/ja"),
    ko: () => import("./cross-compile-windows-game-loops-and-parity/ko"),
    pt: () => import("./cross-compile-windows-game-loops-and-parity/pt"),
    th: () => import("./cross-compile-windows-game-loops-and-parity/th"),
    tr: () => import("./cross-compile-windows-game-loops-and-parity/tr"),
    vi: () => import("./cross-compile-windows-game-loops-and-parity/vi"),
    id: () => import("./cross-compile-windows-game-loops-and-parity/id"),
    "zh-Hans": () => import("./cross-compile-windows-game-loops-and-parity/zh-Hans"),
  },
  "true-multithreading-i18n-and-watchos": {
    en: () => import("./true-multithreading-i18n-and-watchos/en"),
    de: () => import("./true-multithreading-i18n-and-watchos/de"),
    es: () => import("./true-multithreading-i18n-and-watchos/es"),
    fr: () => import("./true-multithreading-i18n-and-watchos/fr"),
    it: () => import("./true-multithreading-i18n-and-watchos/it"),
    ja: () => import("./true-multithreading-i18n-and-watchos/ja"),
    ko: () => import("./true-multithreading-i18n-and-watchos/ko"),
    pt: () => import("./true-multithreading-i18n-and-watchos/pt"),
    th: () => import("./true-multithreading-i18n-and-watchos/th"),
    tr: () => import("./true-multithreading-i18n-and-watchos/tr"),
    vi: () => import("./true-multithreading-i18n-and-watchos/vi"),
    id: () => import("./true-multithreading-i18n-and-watchos/id"),
    "zh-Hans": () => import("./true-multithreading-i18n-and-watchos/zh-Hans"),
  },
  "tvos-cross-compile-and-perry-login": {
    en: () => import("./tvos-cross-compile-and-perry-login/en"),
    de: () => import("./tvos-cross-compile-and-perry-login/de"),
    es: () => import("./tvos-cross-compile-and-perry-login/es"),
    fr: () => import("./tvos-cross-compile-and-perry-login/fr"),
    it: () => import("./tvos-cross-compile-and-perry-login/it"),
    ja: () => import("./tvos-cross-compile-and-perry-login/ja"),
    ko: () => import("./tvos-cross-compile-and-perry-login/ko"),
    pt: () => import("./tvos-cross-compile-and-perry-login/pt"),
    th: () => import("./tvos-cross-compile-and-perry-login/th"),
    tr: () => import("./tvos-cross-compile-and-perry-login/tr"),
    vi: () => import("./tvos-cross-compile-and-perry-login/vi"),
    id: () => import("./tvos-cross-compile-and-perry-login/id"),
    "zh-Hans": () => import("./tvos-cross-compile-and-perry-login/zh-Hans"),
  },
  "cranelift-to-llvm": {
    en: () => import("./cranelift-to-llvm/en"),
    de: () => import("./cranelift-to-llvm/de"),
    es: () => import("./cranelift-to-llvm/es"),
    fr: () => import("./cranelift-to-llvm/fr"),
    it: () => import("./cranelift-to-llvm/it"),
    ja: () => import("./cranelift-to-llvm/ja"),
    ko: () => import("./cranelift-to-llvm/ko"),
    pt: () => import("./cranelift-to-llvm/pt"),
    th: () => import("./cranelift-to-llvm/th"),
    tr: () => import("./cranelift-to-llvm/tr"),
    vi: () => import("./cranelift-to-llvm/vi"),
    id: () => import("./cranelift-to-llvm/id"),
    "zh-Hans": () => import("./cranelift-to-llvm/zh-Hans"),
  },
};

export async function getBlogContent(
  slug: string,
  locale: string
): Promise<ComponentType | null> {
  const slugLoaders = loaders[slug];
  if (!slugLoaders) return null;

  const loader = slugLoaders[locale] ?? slugLoaders["en"];
  if (!loader) return null;

  try {
    const mod = await loader();
    return mod.default;
  } catch {
    // Fallback to English if locale file doesn't exist
    try {
      const mod = await slugLoaders["en"]();
      return mod.default;
    } catch {
      return null;
    }
  }
}
