import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import { getLandingContent } from "@/content/landing/registry";

const SLUG = "compile-typescript-to-binary";

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
      canonical: `/${locale}/compile-typescript-to-binary/`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${locale}/compile-typescript-to-binary/`,
      type: "article",
    },
  };
}

export default async function CompileTypescriptToBinaryPage({
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
          {
            name: meta.breadcrumb,
            path: `/${locale}/compile-typescript-to-binary/`,
          },
        ])}
      />
      <Header />
      <Content />
      <Footer />
    </main>
  );
}
