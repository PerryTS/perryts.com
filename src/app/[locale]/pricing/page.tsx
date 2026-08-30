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
  const t = await getTranslations("pricing");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/en/pricing/" },
  };
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center shrink-0 mt-0.5">✓</span>
      <span className="text-slate-300">{children}</span>
    </li>
  );
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {locale !== "en" && (
            <p className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-center text-sm text-amber-200">
              {t("languageNotice")}
            </p>
          )}
          <div className="text-center mb-14">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4"><span className="gradient-text">{t("title")}</span></h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">{t("subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="feature-card flex flex-col">
              <div className="mb-6">
                <p className="text-sm text-emerald-400 mb-2">MIT</p>
                <h2 className="text-2xl font-bold mb-2">{t("localTitle")}</h2>
                <p className="text-slate-400">{t("localDescription")}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <Check>{t("localFeature1")}</Check>
                <Check>{t("localFeature2")}</Check>
                <Check>{t("localFeature3")}</Check>
              </ul>
              <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="btn-secondary text-center">
                {t("viewSource")}
              </a>
            </section>

            <section className="feature-card flex flex-col border-amber-500/30">
              <div className="mb-6">
                <p className="text-sm text-amber-300 mb-2">{t("hostedAvailability")}</p>
                <h2 className="text-2xl font-bold mb-2">{t("hostedTitle")}</h2>
                <p className="text-slate-400">{t("hostedDescription")}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <Check>{t("hostedFeature1")}</Check>
                <Check>{t("hostedFeature2")}</Check>
                <Check>{t("hostedFeature3")}</Check>
              </ul>
              <Link href="/publish" className="btn-primary text-center">{t("publishDetails")}</Link>
            </section>
          </div>

          <section className="mt-10 rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-6 sm:p-8">
            <h2 className="text-xl font-bold mb-3">{t("selfHost.title")}</h2>
            <p className="text-slate-400 leading-relaxed">{t("selfHost.description")}</p>
          </section>

          <section className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">{t("faq.title")}</h2>
            <div className="space-y-7">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-2 text-slate-200">{t(`currentFaq.q${i}` as "currentFaq.q1")}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{t(`currentFaq.a${i}` as "currentFaq.a1")}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="feature-card text-center mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-3">{t("needTermsTitle")}</h2>
            <p className="text-slate-400 mb-6">{t("needTermsDescription")}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="btn-primary inline-flex">{t("contact")}</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
