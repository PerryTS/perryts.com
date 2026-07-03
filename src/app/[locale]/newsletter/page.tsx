import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsletterForm } from "@/components/NewsletterForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "newsletter" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: { canonical: `/${locale}/newsletter/` },
    openGraph: {
      title: t("pageTitle"),
      description: t("pageDescription"),
      url: `/${locale}/newsletter/`,
    },
    twitter: {
      card: "summary_large_image",
      title: t("pageTitle"),
      description: t("pageDescription"),
    },
  };
}

export default async function NewsletterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsletter");

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">{t("pageTitle")}</span>
          </h1>
          <p className="text-lg text-slate-400 mb-10">{t("pageSubtitle")}</p>

          <div className="text-left">
            <NewsletterForm variant="hero" source="newsletter-page" />
          </div>

          <ul className="mt-10 grid sm:grid-cols-3 gap-4 text-sm text-slate-400 text-left">
            <li className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="font-semibold text-white mb-1">{t("bullet1Title")}</div>
              <div>{t("bullet1Body")}</div>
            </li>
            <li className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="font-semibold text-white mb-1">{t("bullet2Title")}</div>
              <div>{t("bullet2Body")}</div>
            </li>
            <li className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="font-semibold text-white mb-1">{t("bullet3Title")}</div>
              <div>{t("bullet3Body")}</div>
            </li>
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  );
}
