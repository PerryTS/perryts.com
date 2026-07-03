import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareCard } from "@/components/CompareCard";
import { compareItems } from "@/lib/compare";
import { Link } from "@/i18n/navigation";

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
      canonical: `/${locale}/compare/`,
    },
    openGraph: {
      title: ui("indexMetaTitle"),
      description: ui("indexMetaDescription"),
      url: `/${locale}/compare/`,
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
  const t = await getTranslations("compare");
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
            <Link
              href="/compare/perry-vs-electron-alternatives"
              className="feature-card block group"
            >
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {ui("category.ui-framework")}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                {t("electronAlternatives.title")}
              </h3>
              <p className="text-slate-400 text-sm line-clamp-3">
                {t("electronAlternatives.tldr")}
              </p>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
