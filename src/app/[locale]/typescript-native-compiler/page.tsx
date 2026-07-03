import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import { getLandingContent } from "@/content/landing/registry";

const SLUG = "typescript-native-compiler";

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
      canonical: `/${locale}/typescript-native-compiler/`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${locale}/typescript-native-compiler/`,
      type: "article",
    },
  };
}

export default async function TypescriptNativeCompilerPage({
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
            path: `/${locale}/typescript-native-compiler/`,
          },
        ])}
      />
      <Header />
      <Content />
      <Footer />
    </main>
  );
}
