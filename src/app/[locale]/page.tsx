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
import { Footer } from "@/components/Footer";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="min-h-screen">
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
      <Footer />
    </main>
  );
}
