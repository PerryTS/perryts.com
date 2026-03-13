import Link from "next/link";

export function Architecture() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From TypeScript source to native executable in seconds
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Pipeline visualization */}
          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500/50 to-amber-500/20 -translate-y-1/2 hidden md:block" />

            <div className="grid md:grid-cols-5 gap-4 md:gap-2">
              {/* Step 1 */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-perry-400 z-10">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">TypeScript</span>
                <span className="text-xs text-slate-500">.ts files</span>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 z-10">
                  <span className="text-lg font-bold">SWC</span>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">Parser</span>
                <span className="text-xs text-slate-500">Fast parsing</span>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400 z-10">
                  <span className="text-lg font-bold">HIR</span>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">Transform</span>
                <span className="text-xs text-slate-500">Monomorphization</span>
              </div>

              {/* Step 4 */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-orange-400 z-10">
                  <span className="text-sm font-bold leading-tight text-center">Crane<br />lift</span>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">Codegen</span>
                <span className="text-xs text-slate-500">Machine code</span>
              </div>

              {/* Step 5 */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white z-10">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">Executable</span>
                <span className="text-xs text-slate-500">2-5 MB binary</span>
              </div>
            </div>
          </div>

          {/* Link to internals */}
          <p className="mt-12 text-center text-slate-400">
            Want to know how the compiler works under the hood?{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Compiler internals
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
