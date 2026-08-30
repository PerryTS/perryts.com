import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/en/privacy/" },
  };
}

function List({ items }: { items: string[] }) {
  return <ul className="list-disc pl-6 space-y-2">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {locale !== "en" && (
            <p className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200">
              {t("languageNotice")}
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold mb-3"><span className="gradient-text">{t("title")}</span></h1>
          <p className="text-slate-400 mb-12">{t("updated")}</p>

          <div className="space-y-10 text-slate-300 leading-relaxed">
            <section><h2 className="text-2xl font-bold mb-4 text-white">{t("controllerTitle")}</h2><p>{t("controllerBody")}</p></section>
            <section><h2 className="text-2xl font-bold mb-4 text-white">{t("dataTitle")}</h2><List items={t.raw("dataItems") as string[]} /></section>
            <section><h2 className="text-2xl font-bold mb-4 text-white">{t("analyticsTitle")}</h2><p>{t("analyticsBody")}</p></section>
            <section><h2 className="text-2xl font-bold mb-4 text-white">{t("newsletterTitle")}</h2><p>{t("newsletterBody")}</p></section>
            <section><h2 className="text-2xl font-bold mb-4 text-white">{t("purposesTitle")}</h2><List items={t.raw("purposesItems") as string[]} /></section>
            <section><h2 className="text-2xl font-bold mb-4 text-white">{t("retentionTitle")}</h2><p>{t("retentionBody")}</p></section>
            <section><h2 className="text-2xl font-bold mb-4 text-white">{t("rightsTitle")}</h2><List items={t.raw("rightsItems") as string[]} /></section>
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">{t("contactTitle")}</h2>
              <p>{t("contactBody")} <a href="mailto:info@skelpo.com" className="text-amber-400 hover:text-amber-300">info@skelpo.com</a>.</p>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
