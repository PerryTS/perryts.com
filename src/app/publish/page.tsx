import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Perry Publish",
  description:
    "Build, sign, and distribute your Perry apps to the App Store, Play Store, and beyond.",
};

export default function PublishPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-8">
            <span className="text-sm text-amber-300">Coming soon</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">Perry Publish</span>
          </h1>

          <p className="text-xl text-slate-400 mb-12">
            One command to build, sign, and ship your app to every store. Perry
            Publish handles code signing, notarization, packaging, and
            submission — so you can focus on your code.
          </p>

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
              <h3 className="font-semibold mb-1">Build & Sign</h3>
              <p className="text-sm text-slate-500">
                macOS, iOS, Android, Windows
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
              <h3 className="font-semibold mb-1">Distribute</h3>
              <p className="text-sm text-slate-500">
                App Store, Play Store, direct
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
              <h3 className="font-semibold mb-1">Verify</h3>
              <p className="text-sm text-slate-500">
                Geisterhand cross-platform testing
              </p>
            </div>
          </div>

          <p className="text-slate-500 text-sm mb-8">
            Free for open-source projects. Team plans coming soon.
          </p>

          <Link href="/" className="btn-secondary inline-flex items-center gap-2">
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
            Back to Home
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
