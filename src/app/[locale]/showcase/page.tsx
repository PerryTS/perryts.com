import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShowcaseCard } from "@/components/ShowcaseCard";
import { showcaseProjects } from "@/lib/showcase";

export const metadata: Metadata = {
  title: "Showcase - Perry",
  description: "Projects built with Perry — the native TypeScript compiler.",
};

export default async function ShowcaseIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("showcase");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">{t("title")}</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {showcaseProjects.map((project) => (
              <ShowcaseCard key={project.slug} project={project} />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
