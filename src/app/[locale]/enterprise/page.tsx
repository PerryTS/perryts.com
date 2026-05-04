import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "@/i18n/navigation";

const CONTACT_EMAIL = "ralph@perryts.com";
const TEAM_CHECKOUT_LINK = "https://buy.stripe.com/8x2eVdcq90BIeDOg5H24002";

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
  };
}

function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-amber-400 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckIcon />
      <span className="text-slate-300">{children}</span>
    </li>
  );
}

export default async function EnterprisePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("enterprise");
  const tp = await getTranslations("pricing");

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-slate-500 mb-3">
            <Link href="/pricing" className="hover:text-slate-300 transition-colors">
              {tp("breadcrumbPricing")}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-400">{t("metaTitle")}</span>
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5">
            <span className="gradient-text">{t("hero.title")}</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="btn-primary inline-flex items-center justify-center"
          >
            {t("hero.primaryCta")}
          </a>
        </div>
      </section>

      {/* Who this is for */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">{t("audience.title")}</h2>
          <ul className="space-y-3 max-w-2xl mx-auto">
            <Feature>{t("audience.item1")}</Feature>
            <Feature>{t("audience.item2")}</Feature>
            <Feature>{t("audience.item3")}</Feature>
            <Feature>{t("audience.item4")}</Feature>
          </ul>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">{t("included.title")}</h2>
          <div className="feature-card">
            <ul className="space-y-3">
              <Feature>{t("included.item1")}</Feature>
              <Feature>{t("included.item2")}</Feature>
              <Feature>{t("included.item3")}</Feature>
              <Feature>{t("included.item4")}</Feature>
              <Feature>{t("included.item5")}</Feature>
              <Feature>{t("included.item6")}</Feature>
              <Feature>{t("included.item7")}</Feature>
              <Feature>{t("included.item8")}</Feature>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">{t("tiers.title")}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t("tiers.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Team Tier */}
            <div className="feature-card flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-1">{t("tiers.team.name")}</h3>
                <p className="text-slate-500 text-sm">{t("tiers.team.tagline")}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">{t("tiers.team.price")}</span>
                <span className="text-slate-500 ml-2">{t("tiers.perMonth")}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <Feature>{t("tiers.team.feature1")}</Feature>
                <Feature>{t("tiers.team.feature2")}</Feature>
                <Feature>{t("tiers.team.feature3")}</Feature>
                <Feature>{t("tiers.team.feature4")}</Feature>
                <Feature>{t("tiers.team.feature5")}</Feature>
                <Feature>{t("tiers.team.feature6")}</Feature>
              </ul>
              <a href={TEAM_CHECKOUT_LINK} className="btn-secondary text-center">
                {t("tiers.team.cta")}
              </a>
            </div>

            {/* Enterprise Tier — recommended */}
            <div className="feature-card flex flex-col border-amber-500/30 relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t("tiers.recommended")}
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-1">{t("tiers.enterprise.name")}</h3>
                <p className="text-slate-500 text-sm">{t("tiers.enterprise.tagline")}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">{t("tiers.enterprise.price")}</span>
              </div>
              <p className="text-sm text-slate-400 mb-3">{t("tiers.enterprise.everythingIn")}</p>
              <ul className="space-y-3 mb-8 flex-1">
                <Feature>{t("tiers.enterprise.feature1")}</Feature>
                <Feature>{t("tiers.enterprise.feature2")}</Feature>
                <Feature>{t("tiers.enterprise.feature3")}</Feature>
                <Feature>{t("tiers.enterprise.feature4")}</Feature>
                <Feature>{t("tiers.enterprise.feature5")}</Feature>
                <Feature>{t("tiers.enterprise.feature6")}</Feature>
              </ul>
              <a href={`mailto:${CONTACT_EMAIL}`} className="btn-primary text-center">
                {t("tiers.enterprise.cta")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">{t("faq.title")}</h2>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i}>
                <h3 className="font-semibold mb-2 text-slate-200">
                  {t(`faq.q${i}` as "faq.q1")}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t(`faq.a${i}` as "faq.a1")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="feature-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ralph-kuepper.jpg"
              alt="Ralph Kuepper"
              className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-1 ring-white/10"
            />
            <h2 className="text-2xl font-bold mb-3">{t("closing.title")}</h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-6">{t("closing.body")}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="btn-primary inline-flex items-center justify-center"
            >
              {t("closing.emailCta")}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
