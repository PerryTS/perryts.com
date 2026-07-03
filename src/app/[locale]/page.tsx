import { setRequestLocale } from "next-intl/server";
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
    "macOS, Windows, Linux, iOS, iPadOS, Android, watchOS, tvOS",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Perry is a TypeScript to native compiler: standalone binaries with no Node.js runtime. 2–5 MB executables for macOS, Linux, Windows, iOS, and Android.",
  url: "https://perryts.com/en/",
  sameAs: [
    "https://github.com/PerryTS/perry",
    "https://docs.perryts.com",
  ],
};

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
      {locale === "en" && <Faq />}
      <Footer />
    </main>
  );
}
