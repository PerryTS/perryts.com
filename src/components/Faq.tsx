import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/JsonLd";

const linkCls =
  "text-perry-400 hover:text-white transition-colors underline underline-offset-2";

// Rich-text tags available inside faq answers. Tag names must stay
// identical across locales; only the text between them is translated.
const answerTags = {
  bunLink: (chunks: React.ReactNode) => (
    <Link href="/compare/bun" className={linkCls}>
      {chunks}
    </Link>
  ),
  denoLink: (chunks: React.ReactNode) => (
    <Link href="/compare/deno" className={linkCls}>
      {chunks}
    </Link>
  ),
  electronLink: (chunks: React.ReactNode) => (
    <Link href="/compare/electron" className={linkCls}>
      {chunks}
    </Link>
  ),
  tauriLink: (chunks: React.ReactNode) => (
    <Link href="/compare/tauri" className={linkCls}>
      {chunks}
    </Link>
  ),
  showcaseLink: (chunks: React.ReactNode) => (
    <Link href="/showcase" className={linkCls}>
      {chunks}
    </Link>
  ),
};

export async function Faq() {
  const t = await getTranslations("faq");
  const items = t.raw("items") as { question: string; answer: string }[];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        // Strip rich-text tags so JSON-LD mirrors the visible plain text.
        text: f.answer.replace(/<\/?[a-zA-Z]+>/g, ""),
      },
    })),
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
      <JsonLd data={faqJsonLd} />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", {
              gradient: (chunks) => (
                <span className="gradient-text">{chunks}</span>
              ),
            })}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {items.map((f, i) => (
            <div key={f.question} className="feature-card">
              <h3 className="text-lg font-semibold mb-3">{f.question}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t.rich(`items.${i}.answer`, answerTags)}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-slate-400">
          {t.rich("more", {
            guideLink: (chunks) => (
              <Link href="/getting-started" className={linkCls}>
                {chunks}
              </Link>
            ),
            discussionsLink: (chunks) => (
              <a
                href="https://github.com/PerryTS/perry/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className={linkCls}
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </section>
  );
}
