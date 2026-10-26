import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Blog posts: one file per locale at `src/content/blog/<slug>/<locale>.md` (or `.mdx` when a post
 * needs components). Entry ids are "<slug>/<locale>". English is required; other locales are optional
 * and fall back to the English text with a notice.
 */
const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
