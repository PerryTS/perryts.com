import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";
import { compareItems } from "@/lib/compare";
import { getBlogContentLocale } from "@/content/blog/registry";
import { locales } from "@/i18n/routing";

export const dynamic = "force-static";

const BASE = "https://perryts.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Trailing slashes everywhere: the site serves trailing-slash URLs
  // (trailingSlash: true) and canonicals resolve to that form.
  const localizedPaths = [
    "",
    "/blog",
    "/compare",
    "/showcase",
    "/showcase/pry",
    "/newsletter",
  ];
  const englishOnlyPaths = [
    "/compare/perry-vs-electron-alternatives",
    "/getting-started",
    "/compile-typescript-to-binary",
    "/typescript-native-compiler",
    "/typescript-llvm",
    "/roadmap",
    "/publish",
    "/pricing",
    "/enterprise",
    "/internals",
    "/privacy",
  ];

  const staticPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    localizedPaths.map((path) => ({
      url: `${BASE}/${locale}${path}/`,
      lastModified: new Date("2026-08-27"),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
    }))
  );
  staticPages.push(
    ...englishOnlyPaths.map((path) => ({
      url: `${BASE}/en${path}/`,
      lastModified: new Date("2026-08-27"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${BASE}/de/imprint/`,
      lastModified: new Date("2026-08-27"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  );

  const postPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    blogPosts
      .filter((post) => getBlogContentLocale(post.slug, locale) === locale)
      .map((post) => ({
        url: `${BASE}/${locale}/blog/${post.slug}/`,
        lastModified: new Date(post.date),
        changeFrequency: "yearly" as const,
        priority: 0.6,
      }))
  );

  const comparePages: MetadataRoute.Sitemap = compareItems.map((item) => ({
      url: `${BASE}/en/compare/${item.slug}/`,
      lastModified: new Date(item.updated),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...staticPages, ...postPages, ...comparePages];
}
