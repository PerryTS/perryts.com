"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function Installation() {
  const t = useTranslations("installation");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const [installMethod, setInstallMethod] = useState<"homebrew" | "apt" | "windows" | "source">("homebrew");

  const installMethods = {
    homebrew: {
      label: t("homebrew"),
      commands: ["brew tap PerryTS/perry", "brew install perry"],
      note: t("homebrewNote"),
    },
    apt: {
      label: t("apt"),
      commands: [
        "curl -fsSL https://perryts.github.io/perry-apt/perry.gpg.pub | sudo gpg --dearmor -o /usr/share/keyrings/perry.gpg",
        "echo 'deb [signed-by=/usr/share/keyrings/perry.gpg] https://perryts.github.io/perry-apt stable main' | sudo tee /etc/apt/sources.list.d/perry.list",
        "sudo apt update && sudo apt install perry",
      ],
      note: t("aptNote"),
    },
    windows: {
      label: t("windows"),
      commands: ["winget install PerryTS.Perry"],
      note: t("windowsNote"),
    },
    source: {
      label: t("source"),
      commands: ["git clone https://github.com/PerryTS/perry.git", "cd perry", "cargo build --release"],
      note: t("sourceNote"),
    },
  };

  const usageExamples = [
    { id: "build", label: t("compileFile"), command: "perry build main.ts", description: t("compileFileDesc") },
    { id: "output", label: t("customOutput"), command: "perry build main.ts -o myapp", description: t("customOutputDesc") },
    { id: "jsruntime", label: t("withV8"), command: "perry build main.ts --enable-js-runtime", description: t("withV8Desc") },
    { id: "check", label: t("checkCompat"), command: "perry check ./src", description: t("checkCompatDesc") },
  ];

  return (
    <section id="installation" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", { gradient: (chunks) => <span className="gradient-text">{chunks}</span> })}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Installation */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-perry-500/20 flex items-center justify-center text-perry-400 text-sm font-bold">
                1
              </span>
              {t("step1")}
            </h3>
            <div className="flex gap-2 mb-4">
              {(Object.keys(installMethods) as Array<keyof typeof installMethods>).map((key) => (
                <button
                  key={key}
                  onClick={() => setInstallMethod(key)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    installMethod === key
                      ? "bg-perry-500/20 border-perry-500/50 text-perry-400"
                      : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {installMethods[key].label}
                </button>
              ))}
            </div>
            <div className="code-block">
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs">terminal</span>
              </div>
              {installMethods[installMethod].commands.map((cmd, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between group py-1"
                >
                  <code className="text-sm break-all">
                    <span className="text-slate-500">$</span>{" "}
                    <span className="text-slate-300">{cmd}</span>
                  </code>
                  <button
                    onClick={() => copyToClipboard(cmd, `install-${i}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white p-1 shrink-0"
                    title="Copy"
                  >
                    {copied === `install-${i}` ? (
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-sm text-slate-500">
                  {installMethods[installMethod].note}
                </p>
              </div>
            </div>
          </div>

          {/* Usage */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-perry-500/20 flex items-center justify-center text-perry-400 text-sm font-bold">
                2
              </span>
              {t("step2")}
            </h3>
            <div className="space-y-4">
              {usageExamples.map((example) => (
                <div
                  key={example.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-perry-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">{example.label}</span>
                    <button
                      onClick={() => copyToClipboard(example.command, example.id)}
                      className="text-slate-500 hover:text-white transition-colors p-1"
                      title="Copy"
                    >
                      {copied === example.id ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <code className="text-sm font-mono">
                    <span className="text-cyan-400">perry</span>{" "}
                    <span className="text-slate-300">
                      {example.command.replace("perry ", "")}
                    </span>
                  </code>
                  <p className="text-xs text-slate-500 mt-2">{example.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
