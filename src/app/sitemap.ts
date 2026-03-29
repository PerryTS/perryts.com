import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";
import { locales } from "@/i18n/routing";

export const dynamic = "force-static";

const BASE = "https://perryts.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/blog",
    "/roadmap",
    "/showcase",
    "/showcase/pry",
    "/publish",
    "/pricing",
    "/internals",
  ];

  const staticPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
    }))
  );

  const postPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    blogPosts.map((post) => ({
      url: `${BASE}/${locale}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    }))
  );

  return [...staticPages, ...postPages];
}
