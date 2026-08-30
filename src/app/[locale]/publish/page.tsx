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
  const t = await getTranslations("publish");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/en/publish/" },
  };
}

export default async function PublishPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("publish");
  const tc = await getTranslations("common");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {locale !== "en" && (
            <p className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
              {(await getTranslations("hero"))("factsLanguageNotice")}
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">{t("title")}</span>
          </h1>

          <p className="text-xl text-slate-400 mb-12">
            {t("subtitle")}
          </p>

          <div className="code-block text-left mb-12 max-w-lg mx-auto">
            <code className="text-amber-400">$ perry publish ios</code>
            <br />
            <span className="text-slate-500">  {t("buildingForIos")}</span>
            <br />
            <span className="text-slate-500">  {t("signingCert")}</span>
            <br />
            <span className="text-slate-500">  {t("verifyingLaunch")}</span>
            <br />
            <span className="text-green-400">  {t("publishedToAppStore")}</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-16">
            <div className="feature-card text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4 mx-auto">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">{t("buildSign")}</h3>
              <p className="text-sm text-slate-500">
                {t("buildSignPlatforms")}
              </p>
            </div>

            <div className="feature-card text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4 mx-auto">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">{t("distribute")}</h3>
              <p className="text-sm text-slate-500">
                {t("distributePlatforms")}
              </p>
            </div>

            <div className="feature-card text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4 mx-auto">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">{t("verify")}</h3>
              <p className="text-sm text-slate-500">
                {t("verifyDesc")}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing" className="btn-primary inline-flex items-center justify-center gap-2">
              {tc("seePricing")}
            </Link>
            <Link href="/" className="btn-secondary inline-flex items-center justify-center gap-2">
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
