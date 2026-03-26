import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

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

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm text-slate-500 mb-3">
              <Link href="/publish" className="hover:text-slate-300 transition-colors">Perry Publish</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-400">Pricing</span>
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">Simple pricing</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              One command to build, sign, and ship. Free for most developers.
              No account required to get started.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="feature-card flex flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1">Free</h2>
                <p className="text-slate-500 text-sm">No account required</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-slate-500 ml-2">/month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <Feature>15 publishes per month</Feature>
                <Feature>2 deep verify runs per month</Feature>
                <Feature>Light verify on every publish</Feature>
                <Feature>All platforms (macOS, iOS, Android, Windows, Linux)</Feature>
                <Feature>Code signing &amp; notarization</Feature>
                <Feature>App Store &amp; Play Store submission</Feature>
                <Feature>Unlimited projects (with free account)</Feature>
              </ul>
              <Link
                href="https://docs.perryts.com/getting-started"
                className="btn-secondary text-center"
              >
                Get started
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="feature-card flex flex-col border-amber-500/30 relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most popular
                </span>
              </div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1">Pro</h2>
                <p className="text-slate-500 text-sm">For developers who ship fast</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-slate-500 ml-2">/month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <Feature>50 publishes per month</Feature>
                <Feature>20 deep verify runs per month</Feature>
                <Feature>Light verify on every publish</Feature>
                <Feature>All platforms (macOS, iOS, Android, Windows, Linux)</Feature>
                <Feature>Code signing &amp; notarization</Feature>
                <Feature>App Store &amp; Play Store submission</Feature>
                <Feature>Unlimited projects</Feature>
                <Feature>Priority build queue</Feature>
                <Feature>$0.49/publish overage (vs $0.99 free)</Feature>
              </ul>
              <a
                href="https://app.perryts.com/dashboard/billing?plan=pro"
                className="btn-primary text-center"
              >
                Subscribe to Pro
              </a>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-20 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Compare plans</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 pr-4 text-slate-400 font-medium"></th>
                    <th className="py-3 px-4 text-slate-300 font-semibold">Free</th>
                    <th className="py-3 px-4 text-amber-400 font-semibold">Pro</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">Monthly publishes</td>
                    <td className="py-3 px-4 text-slate-300">15</td>
                    <td className="py-3 px-4 text-slate-300">50</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">Deep verify runs</td>
                    <td className="py-3 px-4 text-slate-300">2</td>
                    <td className="py-3 px-4 text-slate-300">20</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">Light verify</td>
                    <td className="py-3 px-4 text-slate-300">Every publish</td>
                    <td className="py-3 px-4 text-slate-300">Every publish</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">Overage per publish</td>
                    <td className="py-3 px-4 text-slate-300">$0.99</td>
                    <td className="py-3 px-4 text-slate-300">$0.49</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">Overage per deep verify</td>
                    <td className="py-3 px-4 text-slate-300">$2.99</td>
                    <td className="py-3 px-4 text-slate-300">$1.49</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">Build queue priority</td>
                    <td className="py-3 px-4 text-slate-300">Standard</td>
                    <td className="py-3 px-4 text-slate-300">Priority</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">Projects</td>
                    <td className="py-3 px-4 text-slate-300">Unlimited*</td>
                    <td className="py-3 px-4 text-slate-300">Unlimited</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4 text-slate-400">Account required</td>
                    <td className="py-3 px-4 text-slate-300">No (1 project) / GitHub (multiple)</td>
                    <td className="py-3 px-4 text-slate-300">Yes (GitHub)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-slate-400">Failed builds count?</td>
                    <td className="py-3 px-4 text-slate-300">No*</td>
                    <td className="py-3 px-4 text-slate-300">No*</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              * Builds that fail before compilation (invalid config, missing dependencies)
              do not count against your monthly allowance.
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
              <h2 className="text-xl font-bold mb-2">Or self-host everything</h2>
              <p className="text-slate-400 text-sm max-w-xl mx-auto mb-4">
                Perry is 100% open source — the compiler, runtime, build server, verification
                service, and this website. You can run the entire publish pipeline on your own
                hardware for free. No vendor lock-in, ever.
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
                  View on GitHub
                </a>
                <a
                  href="https://docs.perryts.com/self-hosting"
                  className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
                >
                  Self-hosting guide
                </a>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">
                  Do I need an account to publish?
                </h3>
                <p className="text-slate-400 text-sm">
                  No. Your first <code className="text-amber-400/80">perry publish</code> just
                  works — no signup, no payment. You get 15 publishes per month. To publish
                  multiple projects, run <code className="text-amber-400/80">perry login</code> to
                  create a free GitHub-linked account. No payment needed.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">
                  What happens when I hit the limit?
                </h3>
                <p className="text-slate-400 text-sm">
                  Your builds are paused until the next month. Upgrade to Pro for more
                  publishes, or add a payment method for pay-as-you-go overage.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">
                  Can I self-host the build server?
                </h3>
                <p className="text-slate-400 text-sm">
                  Yes. The Perry compiler, build server (perry-hub), verification service,
                  and build workers are all open source. Clone the repo, run the hub on
                  your own Mac Mini or Linux box, and set{" "}
                  <code className="text-amber-400/80">PERRY_HUB_SELF_HOSTED=true</code> to
                  disable rate limiting. You get unlimited builds with zero cost. The
                  hosted service at hub.perryts.com exists for convenience — no infra to manage,
                  no signing certs to juggle, no build queue to monitor.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">
                  What does a &ldquo;publish&rdquo; include?
                </h3>
                <p className="text-slate-400 text-sm">
                  One invocation of <code className="text-amber-400/80">perry publish &lt;platform&gt;</code>.
                  Each platform is a separate publish. A publish includes building,
                  code signing, light verification (app launches successfully), and
                  store submission or artifact generation.
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
