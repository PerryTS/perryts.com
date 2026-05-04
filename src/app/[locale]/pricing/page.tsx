import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Perry Publish — Pricing",
  description:
    "Build, sign, and distribute your Perry apps. Free for most developers. Pro for teams that ship fast.",
};

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

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const tc = await getTranslations("common");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-4xl mx-auto mb-10">
            <Link
              href="/enterprise"
              className="block rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/8 to-orange-500/8 hover:border-amber-500/50 hover:from-amber-500/12 hover:to-orange-500/12 transition-all duration-200 px-4 py-3 text-sm text-center"
            >
              <span className="text-slate-300">{t("enterpriseBanner.text")}</span>{" "}
              <span className="text-amber-400 font-semibold">{t("enterpriseBanner.link")}</span>
            </Link>
          </div>
          <div className="text-center mb-16">
            <p className="text-sm text-slate-500 mb-3">
              <Link href="/publish" className="hover:text-slate-300 transition-colors">{t("breadcrumbPublish")}</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-400">{t("breadcrumbPricing")}</span>
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">{t("title")}</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="feature-card flex flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1">{t("free")}</h2>
                <p className="text-slate-500 text-sm">{t("noAccountRequired")}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-slate-500 ml-2">{t("perMonth")}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <Feature>{t("feature_publishes15")}</Feature>
                <Feature>{t("feature_deepVerify2")}</Feature>
                <Feature>{t("feature_lightVerify")}</Feature>
                <Feature>{t("feature_allPlatforms")}</Feature>
                <Feature>{t("feature_codeSigning")}</Feature>
                <Feature>{t("feature_storeSubmission")}</Feature>
                <Feature>{t("feature_unlimitedProjects")}</Feature>
              </ul>
              <Link
                href="https://docs.perryts.com/getting-started"
                className="btn-secondary text-center"
              >
                {tc("getStarted")}
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="feature-card flex flex-col border-amber-500/30 relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t("mostPopular")}
                </span>
              </div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1">{t("pro")}</h2>
                <p className="text-slate-500 text-sm">{t("forDevs")}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-slate-500 ml-2">{t("perMonth")}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <Feature>{t("feature_publishes50")}</Feature>
                <Feature>{t("feature_deepVerify20")}</Feature>
                <Feature>{t("feature_lightVerify")}</Feature>
                <Feature>{t("feature_allPlatforms")}</Feature>
                <Feature>{t("feature_codeSigning")}</Feature>
                <Feature>{t("feature_storeSubmission")}</Feature>
                <Feature>{t("feature_unlimitedProjectsPro")}</Feature>
                <Feature>{t("feature_priorityQueue")}</Feature>
                <Feature>{t("feature_overage")}</Feature>
              </ul>
              <a
                href="https://app.perryts.com/dashboard/billing?plan=pro"
                className="btn-primary text-center"
              >
                {t("subscribeToPro")}
              </a>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-20 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">{t("comparePlans")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 pr-4 text-slate-400 font-medium"></th>
                    <th className="py-3 px-4 text-slate-300 font-semibold">{t("col_free")}</th>
                    <th className="py-3 px-4 text-amber-400 font-semibold">{t("col_pro")}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">{t("row_monthlyPublishes")}</td>
                    <td className="py-3 px-4 text-slate-300">15</td>
                    <td className="py-3 px-4 text-slate-300">50</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">{t("row_deepVerifyRuns")}</td>
                    <td className="py-3 px-4 text-slate-300">2</td>
                    <td className="py-3 px-4 text-slate-300">20</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">{t("row_lightVerify")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_everyPublish")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_everyPublish")}</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">{t("row_overagePublish")}</td>
                    <td className="py-3 px-4 text-slate-300">$0.99</td>
                    <td className="py-3 px-4 text-slate-300">$0.49</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">{t("row_overageVerify")}</td>
                    <td className="py-3 px-4 text-slate-300">$2.99</td>
                    <td className="py-3 px-4 text-slate-300">$1.49</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">{t("row_buildQueue")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_standard")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_priority")}</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">{t("row_projects")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_unlimitedStar")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_unlimited")}</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">{t("row_accountRequired")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_accountFreeDesc")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_accountProDesc")}</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-slate-400">{t("row_failedBuilds")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_noStar")}</td>
                    <td className="py-3 px-4 text-slate-300">{t("row_noStar")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {t("failedBuildsNote")}
            </p>
          </div>

          {/* Self-host callout */}
          <div className="mt-20 max-w-3xl mx-auto">
            <div className="feature-card text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4 mx-auto">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">{t("selfHost.title")}</h2>
              <p className="text-slate-400 text-sm max-w-xl mx-auto mb-4">
                {t("selfHost.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://github.com/PerryTS/perry"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  {tc("viewOnGithub")}
                </a>
                <a
                  href="https://docs.perryts.com/self-hosting"
                  className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
                >
                  {t("selfHost.selfHostingGuide")}
                </a>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">{t("faq.title")}</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">
                  {t("faq.q1")}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t.rich("faq.a1", {
                    code: (chunks) => <code className="text-amber-400/80">{chunks}</code>,
                  }) || (
                    <>
                      No. Your first <code className="text-amber-400/80">perry publish</code> just
                      works — no signup, no payment. You get 15 publishes per month. To publish
                      multiple projects, run <code className="text-amber-400/80">perry login</code> to
                      create a free GitHub-linked account. No payment needed.
                    </>
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">
                  {t("faq.q2")}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t("faq.a2")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">
                  {t("faq.q3")}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t.rich("faq.a3", {
                    code: (chunks) => <code className="text-amber-400/80">{chunks}</code>,
                  }) || (
                    <>
                      Yes. The Perry compiler, build server (perry-hub), verification service,
                      and build workers are all open source. Clone the repo, run the hub on
                      your own Mac Mini or Linux box, and set{" "}
                      <code className="text-amber-400/80">PERRY_HUB_SELF_HOSTED=true</code> to
                      disable rate limiting. You get unlimited builds with zero cost. The
                      hosted service at hub.perryts.com exists for convenience — no infra to manage,
                      no signing certs to juggle, no build queue to monitor.
                    </>
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">
                  {t("faq.q4")}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t.rich("faq.a4", {
                    code: (chunks) => <code className="text-amber-400/80">{chunks}</code>,
                  }) || (
                    <>
                      One invocation of <code className="text-amber-400/80">perry publish &lt;platform&gt;</code>.
                      Each platform is a separate publish. A publish includes building,
                      code signing, light verification (app launches successfully), and
                      store submission or artifact generation.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
