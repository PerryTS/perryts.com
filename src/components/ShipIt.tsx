import Link from "next/link";

export function ShipIt() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            From Code to <span className="gradient-text">App Store</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Perry doesn&apos;t just compile your app — it gets it into your
            users&apos; hands.
          </p>
        </div>

        {/* Pipeline visualization */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="relative">
            {/* Connection line - horizontal on desktop */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500/50 to-amber-500/20 hidden md:block" />

            {/* Desktop: horizontal pipeline */}
            <div className="hidden md:grid md:grid-cols-4 gap-2">
              {/* perry build */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-perry-400 z-10">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">
                  perry build
                </span>
                <span className="text-xs text-slate-500">
                  Compile & sign
                </span>
              </div>

              {/* perry publish */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 z-10">
                  <svg
                    className="w-8 h-8"
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
                <span className="mt-3 text-sm font-medium text-slate-300">
                  perry publish
                </span>
                <span className="text-xs text-slate-500">
                  Package & submit
                </span>
              </div>

              {/* App Store / Play Store */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white z-10">
                  <svg
                    className="w-8 h-8"
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
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">
                  Stores & Downloads
                </span>
                <span className="text-xs text-slate-500">
                  App Store, Play Store, direct
                </span>
              </div>

              {/* perry verify */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400 z-10">
                  <svg
                    className="w-8 h-8"
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
                <span className="mt-3 text-sm font-medium text-slate-300">
                  perry verify
                </span>
                <span className="text-xs text-slate-500">
                  Test every platform
                </span>
              </div>
            </div>

            {/* Mobile: vertical pipeline */}
            <div className="md:hidden flex flex-col items-center gap-2">
              {[
                {
                  label: "perry build",
                  sub: "Compile & sign",
                  color: "text-perry-400",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  ),
                  gradient: false,
                },
                {
                  label: "perry publish",
                  sub: "Package & submit",
                  color: "text-cyan-400",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  ),
                  gradient: false,
                },
                {
                  label: "Stores & Downloads",
                  sub: "App Store, Play Store, direct",
                  color: "text-white",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  ),
                  gradient: true,
                },
                {
                  label: "perry verify",
                  sub: "Test every platform",
                  color: "text-purple-400",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  ),
                  gradient: false,
                },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center">
                  {i > 0 && (
                    <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500/20 to-amber-500/50" />
                  )}
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${step.color} ${
                      step.gradient
                        ? "bg-gradient-to-br from-amber-500 to-orange-500"
                        : "bg-slate-900 border border-slate-700"
                    }`}
                  >
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {step.icon}
                    </svg>
                  </div>
                  <span className="mt-2 text-sm font-medium text-slate-300">
                    {step.label}
                  </span>
                  <span className="text-xs text-slate-500">{step.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Build & Sign */}
          <div className="feature-card">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4">
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
            <h3 className="text-xl font-semibold mb-2">Build & Sign</h3>
            <p className="text-slate-400">
              Cross-platform builds from one command. Code signing for macOS,
              iOS, Android, and Windows handled for you. No wrestling with Xcode
              provisioning profiles or Android keystores.
            </p>
          </div>

          {/* Distribute */}
          <div className="feature-card">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4">
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
            <h3 className="text-xl font-semibold mb-2">Distribute</h3>
            <p className="text-slate-400">
              Push to the App Store, Play Store, or ship direct downloads. Perry
              Publish handles packaging, notarization, and submission.
            </p>
          </div>

          {/* Verify */}
          <div className="feature-card">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4">
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
            <h3 className="text-xl font-semibold mb-2">Verify</h3>
            <p className="text-slate-400">
              Powered by Geisterhand. Automated UI testing across all 6
              platforms. Know your app works everywhere before your users tell
              you it doesn&apos;t.
            </p>
          </div>
        </div>

        {/* Pricing footnote */}
        <p className="text-center mt-10 text-sm text-slate-500">
          Free for open-source projects.{" "}
          <Link
            href="/publish"
            className="text-slate-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Plans for teams
          </Link>{" "}
          &rarr; /publish
        </p>
      </div>
    </section>
  );
}
