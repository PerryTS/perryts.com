import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import { getLandingContent } from "@/content/landing/registry";

const SLUG = "typescript-llvm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { meta } = await getLandingContent(SLUG, locale);
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/typescript-llvm/`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${locale}/typescript-llvm/`,
      type: "article",
    },
  };
}

export default async function TypescriptLlvmPage({
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
          { name: meta.breadcrumb, path: `/${locale}/typescript-llvm/` },
        ])}
      />
      <Header />
      <Content />
      <Footer />
    </main>
  );
}
