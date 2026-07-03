import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "Perry development roadmap — what's shipped, what's in progress, and what's planned for the native TypeScript compiler.",
};

interface Milestone {
  title: string;
  description: string;
}

interface RoadmapSection {
  labelKey: string;
  color: string;
  borderColor: string;
  bgColor: string;
  dotColor: string;
  milestones: Milestone[];
}

const sections: RoadmapSection[] = [
  {
    labelKey: "shipped",
    color: "text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/10",
    dotColor: "bg-green-500",
    milestones: [
      {
        title: "Native TS \u2192 executable compilation",
        description: "SWC parsing + LLVM code generation for AOT compilation of TypeScript to native machine code.",
      },
      {
        title: "10-target compilation: 8 native platforms + WASM + Web",
        description: "AppKit, UIKit, Android Views (JNI), GTK4, Win32, SwiftUI (watchOS/tvOS), WebAssembly, and JavaScript \u2014 25+ widgets, Canvas, Table, system APIs across all targets.",
      },
      {
        title: "React compatibility layer (perry-react)",
        description: "Optional bridge: write React/JSX and it compiles to perry/ui widgets underneath. Phase 1 shipped.",
      },
      {
        title: "Prisma-compatible ORMs (MySQL, PostgreSQL, SQLite)",
        description: "Drop-in @prisma/client replacements backed by Rust FFI + sqlx. Full CRUD, transactions, raw SQL \u2014 zero runtime overhead.",
      },
      {
        title: "Universal push notifications (perry-push)",
        description: "APNs, FCM, Web Push, and WNS from a single library with Rust FFI. ES256/RS256 JWT, OAuth 2.0, VAPID.",
      },
      {
        title: "Perry Hub + distributed build workers",
        description: "Cloud build orchestration server with macOS and Linux workers. Code signing, notarization, App Store and Play Store publishing.",
      },
      {
        title: "Pry: native JSON viewer on 5 platforms",
        description: "Flagship app shipping on Mac App Store and Google Play. Same TypeScript codebase, five native binaries.",
      },
      {
        title: "30+ native npm package implementations",
        description: "mysql2, pg, mongodb, axios, bcrypt, express, ws, jsonwebtoken, uuid, chalk, and more \u2014 compiled natively.",
      },
      {
        title: "Async/await, Promises, generators, closures, generics",
        description: "Full support for modern TypeScript features including generics with monomorphization.",
      },
      {
        title: "Classes with inheritance, private fields, static members",
        description: "Complete class support including extends, private fields (#field), and static methods/properties.",
      },
      {
        title: "Optional V8 runtime for JS npm compatibility",
        description: "Embed V8 to run uncompiled JavaScript npm packages when native implementations aren't available.",
      },
      {
        title: "Cross-compilation (macOS \u2192 Linux, macOS \u2192 iOS, Linux \u2192 Windows)",
        description: "Build for other platforms from your development machine without needing the target OS. Linux \u2192 Windows via lld-link and xwin-style sysroot.",
      },
      {
        title: "Documentation site (docs.perryts.com)",
        description: "49-page mdBook documentation covering language features, native UI, stdlib, CLI reference, all 6 platforms, and plugins.",
      },
      {
        title: "Homebrew + APT distribution",
        description: "Install Perry via brew install PerryTS/perry/perry on macOS or apt-get on Debian/Ubuntu. Automated release pipeline via GitHub Actions.",
      },
      {
        title: "Automated App Store & Play Store publishing",
        description: "perry publish ios / macos / android: automated certificate generation, code signing, provisioning profiles, and store submission with no manual portal visits.",
      },
      {
        title: "perry/widget \u2014 Native WidgetKit from TypeScript",
        description: "Compile TypeScript widget definitions to native SwiftUI WidgetKit extensions. HIR-level render tree emitted as SwiftUI source code.",
      },
      {
        title: "iPad native support",
        description: "Full iPad support with UIDeviceFamily [1,2], orientation, LaunchScreen storyboard, and device idiom detection.",
      },
      {
        title: "http/https native modules",
        description: "Client-side HTTP via reqwest: request(), get(), ClientRequest, IncomingMessage \u2014 matching the Node.js http API.",
      },
      {
        title: "better-sqlite3 support",
        description: "Full better-sqlite3 API: new Database(), prepare, exec, run, get, all \u2014 with NaN-boxing and named column access.",
      },
      {
        title: "WASM compilation target",
        description: "Compile TypeScript to WebAssembly bytecode. Self-contained HTML output, full perry/ui support via DOM bridge, NaN-boxing, async/await, class system.",
      },
      {
        title: "Web/JavaScript compilation target",
        description: "Compile TypeScript to optimized JavaScript with Rust-native minification and name obfuscation. Pure JS output for browser deployment.",
      },
      {
        title: "Geisterhand: cross-platform UI testing",
        description: "In-process testing framework with embedded HTTP server. Programmatic widget interaction, screenshot capture, and chaos/fuzz testing on all 5 native platforms.",
      },
      {
        title: "perry run \u2014 one-step compile and launch",
        description: "Auto-detects entry file, target platform, and connected devices. Interactive prompts for multiple targets, live console streaming, remote build fallback.",
      },
      {
        title: "Enhanced type inference",
        description: "Infers types from literals, binary ops, variable propagation, and method returns. Optional tsgo IPC integration for full type checking.",
      },
      {
        title: "Compile native npm packages",
        description: "perry.compilePackages config: compile pure TS/JS npm packages natively instead of V8. Deduplication across nested node_modules.",
      },
      {
        title: "Design system bridge (perry-styling)",
        description: "Token codegen CLI, typed PerryTheme objects, flat-primitive styling helpers, compile-time platform constants via __platform__.",
      },
      {
        title: "Telemetry & auto-update",
        description: "Opt-in anonymous usage statistics, background version check on every CLI invocation with 24h cache, perry update command.",
      },
      {
        title: "CLI: platform as positional argument",
        description: "perry run ios, perry publish macos \u2014 platform is now a positional argument instead of boolean flags, making commands more intuitive.",
      },
      {
        title: "Runtime performance optimizations",
        description: "memcmp-based string comparison, interned typeof results, inline .length access, direct field access on known types, and reduced NaN-boxing for strings, closures, and private fields.",
      },
      {
        title: "Cross-compile to Windows from Linux",
        description: "Build Windows executables from Linux using lld-link and PERRY_WINDOWS_SYSROOT. Runtime target detection replaces compile-time #[cfg] checks for true cross-compilation.",
      },
      {
        title: "iOS game loop support",
        description: "UIApplicationMain on main thread, user code on background thread via --features ios-game-loop. Enables blocking game loop patterns (while !shouldClose) on iOS where UIKit must own the main thread.",
      },
      {
        title: "Crash reporting (crash.log)",
        description: "Panic hooks and signal handlers (SIGSEGV/SIGBUS/SIGABRT) write crash details to ~/.hone/crash.log for Chirp telemetry. Caught panics clear the log.",
      },
      {
        title: "Two-stage Hub build pipeline",
        description: "Linux workers cross-compile Windows artifacts, Hub re-queues for Windows workers to sign and package. Azure VM auto-startup for Windows sign workers.",
      },
      {
        title: "Cross-platform menu APIs",
        description: "menuClear and menuAddStandardAction extended from macOS-only to all 6 native platforms.",
      },
      {
        title: "Comprehensive perry.toml and Geisterhand documentation",
        description: "Complete perry.toml reference with bundle ID resolution, build number auto-increment, and CI/CD examples. Full Geisterhand rewrite with API docs and test automation patterns.",
      },
      {
        title: "True multi-threading (v0.4.0)",
        description: "Real OS threads via perry/thread: parallelMap, parallelFilter, and spawn. Compile-time mutable capture rejection for thread safety. Thread-local arenas, SerializedValue deep-copy, parallel compiler pipeline.",
      },
      {
        title: "Compile-time i18n system (v0.3.0)",
        description: "Zero-ceremony internationalization: auto-extract string literals, CLDR plural rules for 30+ locales, compile-time validation, translations baked into binary. perry i18n extract CLI, format wrappers, native locale detection.",
      },
      {
        title: "watchOS native app support (v0.3.2)",
        description: "Full watchOS compilation target with data-driven SwiftUI renderer, 15 supported widgets, perry run watchos with simulator auto-detection, and perry setup watchos wizard.",
      },
      {
        title: "perry/widget \u2014 4-platform widget support",
        description: "Expanded from iOS-only to iOS, Android (Glance), watchOS, and Wear OS (Tiles). Four new compile targets for widget extensions.",
      },
      {
        title: "Audio & camera capture APIs",
        description: "perry/system audio capture (AVAudioEngine, AudioRecord, PulseAudio, WASAPI, Web Audio) and perry/ui camera capture (AVCaptureSession) with A-weighted dB measurement and color sampling.",
      },
      {
        title: "perry run android \u2014 full APK pipeline",
        description: "One-step compile, package, assembleDebug, install, and launch for Android apps with Gradle integration.",
      },
      {
        title: "Push notifications & StoreKit packages",
        description: "perry/push (APNs permission, token retrieval, badge count) and perry/storekit (StoreKit 2 purchases, subscriptions, receipt validation) as first-party native packages.",
      },
      {
        title: "Parallel compiler pipeline",
        description: "Module codegen, transform passes, and symbol scanning parallelized via rayon across all CPU cores.",
      },
      {
        title: "tvOS (Apple TV) target (v0.4.5)",
        description: "10th compilation target. Full tvOS support with SwiftUI renderer, same codebase as iOS/watchOS apps.",
      },
      {
        title: "Cross-compile iOS/macOS from Linux (v0.4.23\u2013v0.4.24)",
        description: "Build iOS and macOS binaries from Linux using ld64.lld. Framework linking, -lobjc, CoreGraphics/Metal/IOKit, and Mach-O codegen triple.",
      },
      {
        title: "perry login + usage-based billing (v0.4.14)",
        description: "GitHub OAuth login flow, API tokens, free tier (15 builds/month), Pro tier via Polar.sh. Dashboard at app.perryts.com with usage tracking.",
      },
      {
        title: "Hub parallel builds",
        description: "Slot-based dispatch with concurrent workers. Workers report max_concurrent capacity, artifacts served as base64 downloads.",
      },
      {
        title: "Windows UI overhaul (v0.4.8\u2013v0.4.13)",
        description: "DPI-aware scaling, GDI gradient fills, PNG/JPEG image loading, launcher-style window APIs, global hotkeys, app icons, reentrancy-safe layout.",
      },
      {
        title: "macOS notarization + GCloud KMS signing",
        description: "--notarize flag for perry publish macos with Developer ID certificate. GCloud KMS code signing for Windows builds.",
      },
      {
        title: "perry/appstorereview package",
        description: "Native app store review prompts: SKStoreReviewController (iOS) and Play In-App Review API (Android).",
      },
      {
        title: "Performance: native fcmp, string append, short-circuit (v0.4.14)",
        description: "Native floating-point comparison (mandelbrot 30% faster), in-place string append (125x faster), short-circuit AND/OR, negative literal folding at HIR level.",
      },
      {
        title: "iOS App Store readiness (v0.4.24)",
        description: "Full Info.plist with all Apple-required keys, CFBundleIcons, version/build from perry.toml, UILaunchScreen, provisioning profiles for TestFlight.",
      },
      {
        title: "LLVM backend migration (v0.5.0–v0.5.12)",
        description: "Cranelift replaced by LLVM as the sole codegen backend — loop vectorization, GVN, aggressive inlining. After the migration settled, Perry beat Node.js on every benchmark in its suite (1.7x–24.6x, two ties).",
      },
      {
        title: "Generational GC, small-string optimization, lazy JSON (v0.5.306)",
        description: "Generational garbage collector and SSO ship as defaults. Lazy JSON tape lands at 75 ms median on validate-and-roundtrip — best in the dynamic-typing pack.",
      },
      {
        title: "npm, winget, and Scoop distribution",
        description: "npm install @perryts/perry on all seven binary platforms, winget install PerryTS.Perry, and Scoop — alongside the existing Homebrew and APT channels.",
      },
      {
        title: "perry dev, live inspector, perry/updater (v0.5.359)",
        description: "Watch-mode auto-recompile on an in-memory AST cache, live inspector at localhost:7676, and a desktop auto-update package.",
      },
      {
        title: "Real npm packages compile natively (v0.5.1146)",
        description: "axios, zod v4, express, fastify, and hono compile and run through perry.compilePackages — with the V8 fallback covering the long tail.",
      },
      {
        title: "Direct JavaScript compilation (.js / .cjs / .mjs / .jsx)",
        description: "Plain JavaScript feeds the same native AOT pipeline as TypeScript — require() / module.exports are rewritten to ESM automatically. No type annotations required.",
      },
      {
        title: "node:stream + node:stream/web",
        description: "Readable, Writable, Transform, Duplex, and the WHATWG web streams — real implementations, not stubs.",
      },
      {
        title: "~97% parity against Node's own test suite",
        description: "2792/2863 cases across 53 node:* modules (Node v26.3.0): fs, http/https/http2, net/tls, dns/dgram, crypto, child_process, cluster, worker_threads, zlib, async_hooks/AsyncLocalStorage, WebCrypto, and more.",
      },
      {
        title: "95%+ on the c262 conformance suite",
        description: "Perry's test262-derived ECMAScript conformance suite passes at 95%+. The remaining gap is a known tail: lookbehind regex, console formatting edge cases, lone surrogate handling.",
      },
      {
        title: "DatePicker + drag & drop on all platforms (v0.5.1146)",
        description: "Cross-platform DatePicker widget and drag & drop across AppKit, UIKit, GTK4, Win32, and Android.",
      },
      {
        title: "Windows Fluent design + windows-winui target",
        description: "Mica materials and Fluent styling for Windows apps, plus a new windows-winui render backend target.",
      },
      {
        title: "Game-engine embedding (BloomView)",
        description: "Live Bloom Engine rendering inside perry/ui on every backend — native surface handles on macOS, iOS, tvOS, GTK4, Android, and Windows.",
      },
      {
        title: "Hub public beta — live",
        description: "Distributed builds are open to everyone: perry login (GitHub OAuth), free tier with 15 publishes/month, Pro plan, dashboard at app.perryts.com. Push TypeScript, get signed binaries and store submissions.",
      },
    ],
  },
  {
    labelKey: "inProgress",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
    dotColor: "bg-blue-500",
    milestones: [
      {
        title: "Next.js standalone server, compiled natively",
        description: "Wall-by-wall bring-up of the real Next.js 16 app-router standalone build \u2014 dozens of codegen and runtime walls already down, with the render pipeline advancing deeper every release.",
      },
      {
        title: "Server frameworks out of the box",
        description: "Express, Fastify, and Hono compile and serve today \u2014 Fastify HTTP throughput is now part of the benchmark suite. NestJS bring-up is underway.",
      },
      {
        title: "Closing the conformance tail",
        description: "From 95%+ on c262 and ~97% on Node's own tests toward the last few exceptions: lookbehind regex, console.dir/group formatting, lone surrogate handling, and the long tail of edge-case options.",
      },
      {
        title: "perry/ui expansion",
        description: "Accessibility labels, custom context menus, and more layout primitives across all platforms \u2014 plus new surfaces like WebView and perry/ads.",
      },
      {
        title: "Further performance optimization",
        description: "Perry already wins most benchmarks against Node.js and Bun. Ongoing work on JSON, GC block reclaim, typed-array fast paths, and inlining boundaries.",
      },
    ],
  },
  {
    labelKey: "planned",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
    dotColor: "bg-purple-500",
    milestones: [
      {
        title: "Compile 98% of all Node.js programs",
        description: "The next big milestone: real-world Node.js software compiles and runs with no code changes \u2014 desktop and CLI apps (opencode, Claude Code, and friends) as well as server-side stacks (Next.js, NestJS, and beyond).",
      },
      {
        title: "Source maps & debug info",
        description: "DWARF debug info and source maps for native debugging with lldb/gdb and IDE integration.",
      },
    ],
  },
  {
    labelKey: "vision",
    color: "text-slate-300",
    borderColor: "border-slate-600/30",
    bgColor: "bg-slate-500/10",
    dotColor: "bg-gradient-to-br from-amber-500 to-orange-500",
    milestones: [
      {
        title: "One TypeScript codebase \u2192 every platform and the web",
        description: "Write once, compile to native GUI and CLI apps on macOS, iPadOS, iOS, Android, Linux, Windows, WebAssembly, and the Web.",
      },
      {
        title: "Full perry/ui framework with layout engine",
        description: "Advanced layout system, animations, gestures, and accessibility \u2014 the most complete native UI toolkit for TypeScript.",
      },
      {
        title: "Hot reload for native UI development",
        description: "Instant preview of UI changes during development without recompiling the entire binary.",
      },
    ],
  },
];

export default async function RoadmapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("roadmap");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">{t("title")}</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          <div className="space-y-16">
            {sections.map((section) => (
              <div key={section.labelKey}>
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${section.bgColor} ${section.color} border ${section.borderColor}`}
                  >
                    {t(section.labelKey)}
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <div className="relative pl-8 space-y-6">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-800" />

                  {section.milestones.map((milestone) => (
                    <div key={milestone.title} className="relative">
                      {/* Dot */}
                      <div
                        className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full ${section.dotColor}`}
                      />
                      <h3 className="font-semibold text-white mb-1">
                        {milestone.title}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {milestone.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
