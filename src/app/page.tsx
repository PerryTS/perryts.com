import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { PlatformSupport } from "@/components/PlatformSupport";
import { CodeExample } from "@/components/CodeExample";
import { Performance } from "@/components/Performance";
import { Installation } from "@/components/Installation";
import { FeatureTable } from "@/components/FeatureTable";
import { Architecture } from "@/components/Architecture";
import { NativeLibraries } from "@/components/NativeLibraries";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <PlatformSupport />
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
