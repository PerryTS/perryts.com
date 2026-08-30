import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { PlatformSupport } from "@/components/PlatformSupport";
import { ComparisonMatrix } from "@/components/ComparisonMatrix";
import { CodeExample } from "@/components/CodeExample";
import { Performance } from "@/components/Performance";
import { Installation } from "@/components/Installation";
import { FeatureTable } from "@/components/FeatureTable";
import { Architecture } from "@/components/Architecture";
import { CoopTeaser } from "@/components/CoopTeaser";
import { NativeLibraries } from "@/components/NativeLibraries";
import { ShipIt } from "@/components/ShipIt";
import { ShippingInProduction } from "@/components/ShippingInProduction";
import { AppShowcase } from "@/components/AppShowcase";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { Footer } from "@/components/Footer";

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Perry",
  applicationCategory: "DeveloperApplication",
  operatingSystem:
    "macOS, Windows, Linux, iOS, iPadOS, visionOS, tvOS, watchOS, Android, Wear OS, Web/WebAssembly",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Perry compiles TypeScript ahead of time to native executables. Native builds need no external Node.js installation or JavaScript engine; Perry's runtime and GC are statically linked.",
  url: "https://perryts.com/en/",
  sameAs: [
    "https://github.com/PerryTS/perry",
    "https://docs.perryts.com",
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: {
      canonical: `/${locale}/`,
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `/${locale}/`,
      siteName: "Perry",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="min-h-screen">
      <JsonLd data={softwareApplicationJsonLd} />
      <Header />
      <Hero />
      <ShippingInProduction />
      <Features />
      <AppShowcase />
      <PlatformSupport />
      <ShipIt />
      <ComparisonMatrix />
      <CodeExample />
      <Performance />
      <Installation />
      <FeatureTable />
      <NativeLibraries />
      <Architecture />
      <CoopTeaser />
      <Faq />
      <Footer />
    </main>
  );
}
