import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import { getLandingContent } from "@/content/landing/registry";

const SLUG = "getting-started";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { meta, resolvedLocale } = await getLandingContent(SLUG, locale);
  const canonicalLocale = resolvedLocale ?? locale;
  return {
    title: meta.absoluteTitle ? { absolute: meta.title } : meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${canonicalLocale}/getting-started/`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${canonicalLocale}/getting-started/`,
      type: "website",
    },
  };
}

export default async function GettingStartedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { default: Content, meta } = await getLandingContent(SLUG, locale);

  return (
    <main className="min-h-screen">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: `/${locale}/` },
          { name: meta.breadcrumb, path: `/${locale}/getting-started/` },
        ])}
      />
      <Header />
      <Content />
      <Footer />
    </main>
  );
}
