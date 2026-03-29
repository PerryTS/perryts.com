import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogLayout } from "@/components/BlogLayout";
import { getBlogPost, getAllSlugs } from "@/lib/blog";
import { locales } from "@/i18n/routing";
import { getBlogContent } from "@/content/blog/registry";

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
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
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

  const ContentComponent = await getBlogContent(slug, locale);
  if (!ContentComponent) notFound();

  const t = await getTranslations("blogPosts");

  const localizedPost = {
    ...post,
    title: t(`${slug}.title`),
    excerpt: t(`${slug}.excerpt`),
  };

  return (
    <main className="min-h-screen">
      <Header />
      <BlogLayout post={localizedPost}>
        <ContentComponent />
      </BlogLayout>
      <Footer />
    </main>
  );
}
