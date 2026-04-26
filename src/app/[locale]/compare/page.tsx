import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareCard } from "@/components/CompareCard";
import { compareItems } from "@/lib/compare";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const ui = await getTranslations("compare.ui");
  return {
    title: ui("indexMetaTitle"),
    description: ui("indexMetaDescription"),
    alternates: {
      canonical: "/compare",
    },
    openGraph: {
      title: ui("indexMetaTitle"),
      description: ui("indexMetaDescription"),
      url: "/compare",
      type: "website",
    },
  };
}

export default async function CompareIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ui = await getTranslations("compare.ui");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">{ui("indexTitle")}</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {ui("indexSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {compareItems.map((item) => (
              <CompareCard key={item.slug} item={item} />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
