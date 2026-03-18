export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/8 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-sm text-amber-300">
            v0.2.194 — Runtime performance, CLI improvements
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          One Codebase. Every Platform.
          <br />
          <span className="gradient-text">Native Performance.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-12">
          Perry compiles TypeScript to native GUI and CLI apps on{" "}
          <span className="text-slate-300">macOS, iPadOS, iOS, Android, Linux, Windows, WebAssembly, and the Web.</span>{" "}
          No runtime. No Electron. Just native binaries.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a href="#installation" className="btn-primary flex items-center gap-2">
            Get Started
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
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
          <a
            href="https://github.com/PerryTS/perry"
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            View on GitHub
          </a>
        </div>

        {/* Quick code example */}
        <div className="max-w-2xl mx-auto">
          <div className="code-block glow">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">terminal</span>
            </div>
            <div className="space-y-2">
              <p>
                <span className="text-slate-500">$</span>{" "}
                <span className="text-cyan-400">perry</span> compile main.ts
              </p>
              <p className="text-slate-500">Compiling main.ts...</p>
              <p className="text-green-400">
                ✓ Compiled executable: main (2.3 MB)
              </p>
              <p className="mt-4">
                <span className="text-slate-500">$</span> ./main
              </p>
              <p className="text-slate-300">Hello, World!</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">8</div>
            <div className="text-slate-500 text-sm mt-1">Targets</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">25+</div>
            <div className="text-slate-500 text-sm mt-1">Native UI widgets</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">0 ms</div>
            <div className="text-slate-500 text-sm mt-1">Startup time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">App Store</div>
            <div className="text-slate-500 text-sm mt-1">Ready</div>
          </div>
        </div>
      </div>
    </section>
  );
}
