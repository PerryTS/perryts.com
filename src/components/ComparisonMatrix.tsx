"use client";

import { useState } from "react";

const frameworks = [
  {
    name: "Perry",
    language: "TypeScript",
    nativeCode: true,
    nativeWidgets: true,
    runtimeOverhead: "None",
    highlight: true,
    description: "AOT compiled to native binary",
  },
  {
    name: "React Native",
    language: "JS / TypeScript",
    nativeCode: false,
    nativeWidgets: true,
    runtimeOverhead: "Hermes / V8 + Bridge",
    highlight: false,
    description: "JIT / interpreted at runtime",
  },
  {
    name: "Flutter",
    language: "Dart",
    nativeCode: true,
    nativeWidgets: false,
    runtimeOverhead: "Dart VM + Skia engine",
    highlight: false,
    description: "AOT compiled, custom renderer",
  },
  {
    name: "KMP + Compose",
    language: "Kotlin",
    nativeCode: "partial" as const,
    nativeWidgets: false,
    runtimeOverhead: "Kotlin runtime + Skia",
    highlight: false,
    description: "JVM on Android, native on iOS",
  },
  {
    name: "Swift for Android",
    language: "Swift",
    nativeCode: true,
    nativeWidgets: "noUI" as const,
    runtimeOverhead: "Swift runtime on Android",
    highlight: false,
    description: "Native binary, no shared UI",
  },
  {
    name: ".NET MAUI",
    language: "C#",
    nativeCode: "partial" as const,
    nativeWidgets: true,
    runtimeOverhead: ".NET / Mono runtime",
    highlight: false,
    description: "Partial AOT via Mono",
  },
  {
    name: "NativeScript",
    language: "JS / TypeScript",
    nativeCode: false,
    nativeWidgets: true,
    runtimeOverhead: "V8 / JavaScriptCore",
    highlight: false,
    description: "JS runtime, native widget access",
  },
  {
    name: "Ionic",
    language: "JS / TypeScript",
    nativeCode: false,
    nativeWidgets: false,
    runtimeOverhead: "WebView + Capacitor",
    highlight: false,
    description: "Web app in native wrapper",
  },
];

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="#10b981" opacity="0.15" />
      <path
        d="M6 10.5L8.5 13L14 7.5"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="#ef4444" opacity="0.12" />
      <path
        d="M7 7L13 13M13 7L7 13"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Partial({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="#f59e0b" opacity="0.15" />
        <path
          d="M6 10H14"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[11px] font-medium text-amber-500">{label}</span>
    </div>
  );
}

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check />;
  if (value === false) return <Cross />;
  if (value === "partial") return <Partial label="Partial" />;
  if (value === "noUI") return <Partial label="No shared UI" />;
  return null;
}

export function ComparisonMatrix() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-12 max-w-[700px]">
          <div className="inline-block px-3.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-500 text-xs font-semibold uppercase tracking-wider mb-5">
            Framework Comparison
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            The only framework that checks{" "}
            <span className="bg-gradient-to-br from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
              every box
            </span>
          </h2>
          <p className="text-base text-slate-500 leading-relaxed">
            TypeScript compiled to native code. Real platform widgets. No runtime
            overhead.
          </p>
        </div>

        {/* Table */}
        <div className="w-full max-w-[960px] overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr>
                {[
                  "Framework",
                  "Language",
                  "Native Code",
                  "Native Widgets",
                  "Runtime Overhead",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-600 border-b border-white/[0.06] whitespace-nowrap ${
                      i === 0 ? "text-left" : "text-center"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frameworks.map((fw, idx) => {
                const isHovered = hoveredRow === idx;
                const isPerry = fw.highlight;
                return (
                  <tr
                    key={fw.name}
                    onMouseEnter={() => setHoveredRow(idx)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className="transition-all duration-200 cursor-default"
                    style={{
                      background: isPerry
                        ? "rgba(16, 185, 129, 0.06)"
                        : isHovered
                        ? "rgba(255,255,255,0.03)"
                        : "transparent",
                      borderLeft: isPerry
                        ? "3px solid #10b981"
                        : "3px solid transparent",
                    }}
                  >
                    <td className="px-5 py-[18px] border-b border-white/[0.04]">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-sm ${
                            isPerry
                              ? "font-bold text-emerald-500"
                              : "font-medium text-zinc-200"
                          }`}
                        >
                          {fw.name}
                          {isPerry && (
                            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 align-middle tracking-wide">
                              ★
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-zinc-600">
                          {fw.description}
                        </span>
                      </div>
                    </td>

                    <td
                      className={`px-5 py-[18px] text-center border-b border-white/[0.04] text-[13px] ${
                        isPerry
                          ? "text-zinc-300 font-medium"
                          : "text-zinc-500"
                      }`}
                    >
                      {fw.language}
                    </td>

                    <td className="px-5 py-[18px] text-center border-b border-white/[0.04]">
                      <div className="flex justify-center">
                        <CellValue value={fw.nativeCode} />
                      </div>
                    </td>

                    <td className="px-5 py-[18px] text-center border-b border-white/[0.04]">
                      <div className="flex justify-center">
                        <CellValue value={fw.nativeWidgets} />
                      </div>
                    </td>

                    <td
                      className={`px-5 py-[18px] text-center border-b border-white/[0.04] text-xs ${
                        isPerry
                          ? "text-emerald-500 font-semibold"
                          : "text-zinc-500"
                      }`}
                    >
                      {fw.runtimeOverhead}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom callout */}
        <div className="mt-8 flex flex-wrap justify-center gap-8">
          {[
            "Native compiled",
            "Real platform widgets",
            "Zero runtime overhead",
          ].map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 text-[13px] text-zinc-500"
            >
              <Check />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
