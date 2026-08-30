import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "@/i18n/navigation";

const CONTACT_EMAIL = "ralph@perryts.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("enterprise");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/en/enterprise/" },
  };
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center shrink-0 mt-0.5">✓</span>
      <span className="text-slate-300">{children}</span>
    </li>
  );
}

export default async function EnterprisePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("enterprise");
  const tp = await getTranslations("pricing");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {locale !== "en" && (
            <p className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200">
              {t("languageNotice")}
            </p>
          )}
          <p className="text-sm text-slate-500 mb-3">
            <Link href="/pricing" className="hover:text-slate-300 transition-colors">{tp("breadcrumbPricing")}</Link>
            <span className="mx-2">/</span><span className="text-slate-400">{t("metaTitle")}</span>
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5"><span className="gradient-text">{t("hero.title")}</span></h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">{t("hero.subtitle")}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="btn-primary inline-flex">{t("hero.primaryCta")}</a>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="feature-card">
            <h2 className="text-xl font-bold mb-5">{t("availableTitle")}</h2>
            <ul className="space-y-3">
              <Check>{t("available1")}</Check>
              <Check>{t("available2")}</Check>
              <Check>{t("available3")}</Check>
              <Check>{t("available4")}</Check>
            </ul>
          </div>
          <div className="feature-card">
            <h2 className="text-xl font-bold mb-5">{t("scopedTitle")}</h2>
            <ul className="space-y-3">
              <Check>{t("scoped1")}</Check>
              <Check>{t("scoped2")}</Check>
              <Check>{t("scoped3")}</Check>
              <Check>{t("scoped4")}</Check>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-6 sm:p-8">
          <h2 className="text-xl font-bold mb-3">{t("termsTitle")}</h2>
          <p className="text-slate-400 leading-relaxed">{t("termsBody")}</p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center feature-card">
          <h2 className="text-2xl font-bold mb-3">{t("closing.title")}</h2>
          <p className="text-slate-400 mb-6">{t("closing.body")}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="btn-primary inline-flex">{t("closing.emailCta")}</a>
        </div>
      </section>
      <Footer />
    </main>
  );
}
