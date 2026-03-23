import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Roadmap - Perry",
  description:
    "Perry development roadmap — what's shipped, what's in progress, and what's planned for the native TypeScript compiler.",
};

interface Milestone {
  title: string;
  description: string;
}

interface RoadmapSection {
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  dotColor: string;
  milestones: Milestone[];
}

const sections: RoadmapSection[] = [
  {
    label: "Shipped",
    color: "text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/10",
    dotColor: "bg-green-500",
    milestones: [
      {
        title: "Native TS → executable compilation",
        description: "SWC parsing + Cranelift code generation for AOT compilation of TypeScript to native machine code.",
      },
      {
        title: "9-target compilation: 7 native platforms + WASM + Web",
        description: "AppKit, UIKit, Android Views (JNI), GTK4, Win32, SwiftUI (watchOS), WebAssembly, and JavaScript — 25+ widgets, Canvas, Table, system APIs across all targets.",
      },
      {
        title: "React compatibility layer (perry-react)",
        description: "Optional bridge: write React/JSX and it compiles to perry/ui widgets underneath. Phase 1 shipped.",
      },
      {
        title: "Prisma-compatible ORMs (MySQL, PostgreSQL, SQLite)",
        description: "Drop-in @prisma/client replacements backed by Rust FFI + sqlx. Full CRUD, transactions, raw SQL — zero runtime overhead.",
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
        description: "mysql2, pg, mongodb, axios, bcrypt, express, ws, jsonwebtoken, uuid, chalk, and more — compiled natively.",
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
        title: "Cross-compilation (macOS → Linux, macOS → iOS, Linux → Windows)",
        description: "Build for other platforms from your development machine without needing the target OS. Linux → Windows via lld-link and xwin-style sysroot.",
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
        title: "perry/widget — Native WidgetKit from TypeScript",
        description: "Compile TypeScript widget definitions to native SwiftUI WidgetKit extensions. HIR-level render tree emitted as SwiftUI source code.",
      },
      {
        title: "iPad native support",
        description: "Full iPad support with UIDeviceFamily [1,2], orientation, LaunchScreen storyboard, and device idiom detection.",
      },
      {
        title: "http/https native modules",
        description: "Client-side HTTP via reqwest: request(), get(), ClientRequest, IncomingMessage — matching the Node.js http API.",
      },
      {
        title: "better-sqlite3 support",
        description: "Full better-sqlite3 API: new Database(), prepare, exec, run, get, all — with NaN-boxing and named column access.",
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
        title: "perry run — one-step compile and launch",
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
        description: "perry run ios, perry publish macos — platform is now a positional argument instead of boolean flags, making commands more intuitive.",
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
        title: "perry/widget — 4-platform widget support",
        description: "Expanded from iOS-only to iOS, Android (Glance), watchOS, and Wear OS (Tiles). Four new compile targets for widget extensions.",
      },
      {
        title: "Audio & camera capture APIs",
        description: "perry/system audio capture (AVAudioEngine, AudioRecord, PulseAudio, WASAPI, Web Audio) and perry/ui camera capture (AVCaptureSession) with A-weighted dB measurement and color sampling.",
      },
      {
        title: "perry run android — full APK pipeline",
        description: "One-step compile, package, assembleDebug, install, and launch for Android apps with Gradle integration.",
      },
      {
        title: "Push notifications & StoreKit packages",
        description: "perry/push (APNs permission, token retrieval, badge count) and perry/storekit (StoreKit 2 purchases, subscriptions, receipt validation) as first-party native packages.",
      },
      {
        title: "Cranelift 0.121 + parallel compilation",
        description: "Upgraded from Cranelift 0.113 to 0.121. Module codegen, transform passes, and symbol scanning parallelized via rayon across all CPU cores.",
      },
    ],
  },
  {
    label: "In Progress",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
    dotColor: "bg-blue-500",
    milestones: [
      {
        title: "perry/ui expansion",
        description: "Drag and drop, accessibility labels, custom context menus, DatePicker, and more layout primitives across all platforms.",
      },
      {
        title: "Full regex support",
        description: "Complete ECMAScript-compatible regular expression engine compiled to native code.",
      },
      {
        title: "Further performance optimization",
        description: "Continuing to improve object creation, memory management, and code generation for even faster binaries. v0.4.0 shipped parallel compilation, TimSort, Cranelift 0.121, and Windows function splitting.",
      },
      {
        title: "Framework compatibility layers",
        description: "Improving React, Angular, and Ionic bridges as on-ramps — all mapping to perry/ui underneath.",
      },
      {
        title: "perrysdad: self-hosting LLVM compiler",
        description: "Alternative LLVM IR backend for Perry written in TypeScript, compiled by Perry itself. 68/68 deterministic tests passing (100% parity). Phase 6: async/await, generators, interface dispatch.",
      },
    ],
  },
  {
    label: "Planned",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
    dotColor: "bg-purple-500",
    milestones: [
      {
        title: "Hub public beta",
        description: "Opening distributed builds to external users — push TypeScript, get signed native binaries for all platforms.",
      },
      {
        title: "Stream module",
        description: "Node.js-compatible Readable, Writable, Transform, and Duplex stream implementations.",
      },
      {
        title: "Source maps & debug info",
        description: "DWARF debug info and source maps for native debugging with lldb/gdb and IDE integration.",
      },
      {
        title: "VS Code extension",
        description: "Language server, build integration, and debugging support directly in VS Code.",
      },
      {
        title: "Perry package registry",
        description: "A registry for Perry-optimized packages with pre-compiled native implementations.",
      },
    ],
  },
  {
    label: "Vision",
    color: "text-slate-300",
    borderColor: "border-slate-600/30",
    bgColor: "bg-slate-500/10",
    dotColor: "bg-gradient-to-br from-amber-500 to-orange-500",
    milestones: [
      {
        title: "One TypeScript codebase → every platform and the web",
        description: "Write once, compile to native GUI and CLI apps on macOS, iPadOS, iOS, Android, Linux, Windows, WebAssembly, and the Web.",
      },
      {
        title: "Full perry/ui framework with layout engine",
        description: "Advanced layout system, animations, gestures, and accessibility — the most complete native UI toolkit for TypeScript.",
      },
      {
        title: "Hot reload for native UI development",
        description: "Instant preview of UI changes during development without recompiling the entire binary.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">Roadmap</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Where Perry is today and where it&apos;s headed. From native compilation to
              a full cross-platform development ecosystem.
            </p>
          </div>

          <div className="space-y-16">
            {sections.map((section) => (
              <div key={section.label}>
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${section.bgColor} ${section.color} border ${section.borderColor}`}
                  >
                    {section.label}
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
