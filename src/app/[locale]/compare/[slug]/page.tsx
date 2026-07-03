import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareLayout } from "@/components/CompareLayout";
import { JsonLd } from "@/components/JsonLd";
import { getCompareItem, getAllCompareSlugs } from "@/lib/compare";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import { locales } from "@/i18n/routing";

export function generateStaticParams() {
  const slugs = getAllCompareSlugs();
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
  const item = getCompareItem(slug);
  if (!item) return {};
  const t = await getTranslations("compare");
  const data = t.raw(`items.${slug}`) as { metaTitle: string; metaDescription: string };
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: `/compare/${slug}`,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `/compare/${slug}`,
      type: "article",
      publishedTime: item.updated,
    },
    twitter: {
      card: "summary_large_image",
      title: data.metaTitle,
      description: data.metaDescription,
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const item = getCompareItem(slug);
  if (!item) notFound();

  return (
    <main className="min-h-screen">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: `/${locale}/` },
          { name: "Compare", path: `/${locale}/compare/` },
          {
            name: `Perry vs ${item.competitor}`,
            path: `/${locale}/compare/${slug}/`,
          },
        ])}
      />
      <Header />
      <CompareLayout item={item} />
      <Footer />
    </main>
  );
}
