import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogLayout } from "@/components/BlogLayout";
import { getBlogPost, getAllSlugs } from "@/lib/blog";
import { locales } from "@/i18n/routing";
import { getBlogContent, getBlogContentLocale } from "@/content/blog/registry";

export function generateStaticParams() {
  const slugs = getAllSlugs();
  return locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getBlogPost(slug);
  if (!post) return {};
  const resolvedLocale = getBlogContentLocale(slug, locale);
  const canonicalLocale = resolvedLocale ?? locale;
  const t = await getTranslations("blogPosts");
  const title = resolvedLocale === "en" ? post.title : t(`${slug}.title`);
  const description = resolvedLocale === "en" ? post.excerpt : t(`${slug}.excerpt`);
  return {
    title,
    description,
    alternates: {
      canonical: `/${canonicalLocale}/blog/${slug}/`,
    },
    openGraph: {
      title,
      description,
      url: `/${canonicalLocale}/blog/${slug}/`,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = getBlogPost(slug);
  if (!post) notFound();

  const content = await getBlogContent(slug, locale);
  if (!content) notFound();
  const { Component: ContentComponent, resolvedLocale } = content;

  const t = await getTranslations("blogPosts");

  const localizedPost = {
    ...post,
    title: resolvedLocale === "en" ? post.title : t(`${slug}.title`),
    excerpt: resolvedLocale === "en" ? post.excerpt : t(`${slug}.excerpt`),
  };

  return (
    <main className="min-h-screen">
      <Header />
      <BlogLayout post={localizedPost} isEnglishFallback={locale !== "en" && resolvedLocale === "en"}>
        <ContentComponent />
      </BlogLayout>
      <Footer />
    </main>
  );
}
