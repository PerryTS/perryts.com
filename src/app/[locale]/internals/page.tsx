import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("internals");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/en/internals/" },
  };
}

export default async function InternalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("internals");
  const tc = await getTranslations("common");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {locale !== "en" && (
            <p className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-sm text-amber-200">
              {(await getTranslations("hero"))("factsLanguageNotice")}
            </p>
          )}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {t.rich("title", {
                gradient: (chunks) => <span className="gradient-text">{chunks}</span>,
              })}
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="feature-card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-perry-400">01</span>
                Value Representation
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {t("nanBoxing.p1")}
              </p>
              <p className="text-slate-500 text-sm">
                {t("nanBoxing.p2")}
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-perry-400">02</span>
                Monomorphization
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {t("monomorphization.p1")}
              </p>
              <p className="text-slate-500 text-sm">
                {t("monomorphization.p2")}
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-perry-400">03</span>
                Static + Dynamic Dispatch
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {t("staticDispatch.p1")}
              </p>
              <p className="text-slate-500 text-sm">
                {t("staticDispatch.p2")}
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-perry-400">04</span>
                Runtime Model
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {t("zeroCost.p1")}
              </p>
              <p className="text-slate-500 text-sm">
                {t("zeroCost.p2")}
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                />
              </svg>
              {tc("backToHome")}
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
