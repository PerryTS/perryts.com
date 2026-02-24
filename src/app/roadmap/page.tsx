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
        title: "macOS native UI (AppKit)",
        description: "Full AppKit integration — NSWindow, NSView, NSButton, NSTextField, menus, and more.",
      },
      {
        title: "iOS & iPadOS native UI (UIKit)",
        description: "UIKit integration for iPhone and iPad — UIViewController, UIView, UIButton, UITableView.",
      },
      {
        title: "Android native UI (JNI + Views)",
        description: "Android support via JNI — Activity, View, Button, TextView, RecyclerView, and Android lifecycle.",
      },
      {
        title: "Linux native UI (GTK4)",
        description: "GTK4 integration — GtkWindow, GtkBox, GtkButton, GtkEntry, GtkListBox, and CSS theming.",
      },
      {
        title: "Windows native UI (Win32)",
        description: "Win32 API integration — CreateWindowEx, message loop, common controls, and GDI rendering.",
      },
      {
        title: "27+ native npm package implementations",
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
        title: "Cross-compilation (macOS → Linux, macOS → iOS)",
        description: "Build for other platforms from your development machine without needing the target OS.",
      },
      {
        title: "62/62 tests passing",
        description: "Comprehensive test suite covering compilation, runtime behavior, and platform-specific features.",
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
        title: "UI widget library expansion",
        description: "Adding State<string>, SecureField, ProgressView, Alert, DatePicker, and more across all platforms.",
      },
      {
        title: "Performance optimization",
        description: "Improving string operations, object creation, and memory management for even faster binaries.",
      },
      {
        title: "Full regex support",
        description: "Complete ECMAScript-compatible regular expression engine compiled to native code.",
      },
      {
        title: "Stream module",
        description: "Node.js-compatible Readable, Writable, Transform, and Duplex stream implementations.",
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
        title: "WASM compilation target",
        description: "Compile TypeScript to WebAssembly for browser and edge runtime deployment.",
      },
      {
        title: "Multi-threading support",
        description: "Native thread spawning and shared memory for CPU-intensive workloads.",
      },
      {
        title: "Package manager integration",
        description: "First-class integration with npm/yarn/pnpm for dependency resolution and native compilation.",
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
    dotColor: "bg-gradient-to-br from-perry-500 to-cyan-500",
    milestones: [
      {
        title: "One TypeScript codebase → native apps on all 6 platforms",
        description: "Write once, compile to native GUI and CLI apps on macOS, iPadOS, iOS, Android, Linux, and Windows.",
      },
      {
        title: "Full GUI framework parity across all platforms",
        description: "Every widget, layout, gesture, and animation available on every supported platform.",
      },
      {
        title: "Hot reload for native UI development",
        description: "Instant preview of UI changes during development without recompiling the entire binary.",
      },
      {
        title: "Perry Cloud",
        description: "CI/CD service for multi-platform builds — push TypeScript, get native binaries for all platforms.",
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
