"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const examples = [
  {
    name: "Hello World",
    filename: "hello.ts",
    code: `// hello.ts
const greeting = "Hello, World!";
console.log(greeting);

// Compiles to ~2MB native executable
// No runtime needed!`,
  },
  {
    name: "File System",
    filename: "files.ts",
    code: `import * as fs from 'fs';
import * as path from 'path';

const configPath = path.join(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath));

console.log(\`Loaded config: \${config.name}\`);`,
  },
  {
    name: "HTTP Client",
    filename: "fetch.ts",
    code: `import axios from 'axios';

// Native Rust implementation - no npm install needed
const response = await axios.get('https://api.example.com/data');

console.log(\`Status: \${response.status}\`);
console.log(response.data);`,
  },
  {
    name: "Classes & Generics",
    filename: "classes.ts",
    code: `class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  get size(): number {
    return this.items.length;
  }
}

const stack = new Stack<number>();
stack.push(1);
stack.push(2);
console.log(stack.pop()); // 2`,
  },
  {
    name: "Async/Await",
    filename: "async.ts",
    code: `async function fetchData(url: string): Promise<string> {
  // setTimeout is natively supported
  await new Promise(resolve => setTimeout(resolve, 100));
  return \`Data from \${url}\`;
}

const result = await fetchData("https://api.example.com");
console.log(result);`,
  },
];

export function CodeExample() {
  const [activeTab, setActiveTab] = useState(0);
  const t = useTranslations("codeExample");

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", { gradient: (chunks) => <span className="gradient-text">{chunks}</span> })}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === index
                    ? "bg-perry-500/20 text-perry-400 border border-perry-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {example.name}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="code-block">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs">{examples[activeTab].filename}</span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(examples[activeTab].code)}
                className="text-slate-500 hover:text-white transition-colors p-1"
                title="Copy to clipboard"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <pre className="text-sm leading-relaxed">
              <code className="text-slate-300">
                {examples[activeTab].code.split('\n').map((line, i) => (
                  <div key={i} className="hover:bg-slate-800/50 -mx-6 px-6">
                    {formatCodeLine(line)}
                  </div>
                ))}
              </code>
            </pre>
          </div>

          {/* Compile command */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex-1 font-mono text-sm">
                <span className="text-slate-500">$</span>{" "}
                <span className="text-cyan-400">perry</span>{" "}
                <span className="text-white">compile</span>{" "}
                <span className="text-yellow-400">{examples[activeTab].filename}</span>
              </div>
              <div className="text-green-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t("nativeBinary")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatCodeLine(line: string): React.ReactNode {
  // Simple syntax highlighting
  const patterns: [RegExp, string][] = [
    [/\/\/.*/g, "text-slate-500"], // Comments
    [/"[^"]*"|'[^']*'|`[^`]*`/g, "text-green-400"], // Strings
    [/\b(import|export|from|const|let|var|function|class|return|if|else|for|while|async|await|new|typeof|extends|implements|get|set|private|public|static)\b/g, "text-purple-400"], // Keywords
    [/\b(string|number|boolean|void|any|never|unknown|null|undefined|Promise|T)\b/g, "text-cyan-400"], // Types
    [/\b(\d+)\b/g, "text-orange-400"], // Numbers
    [/\$\{[^}]+\}/g, "text-cyan-300"], // Template literals
  ];

  let result = line;
  const spans: { start: number; end: number; className: string; text: string }[] = [];

  patterns.forEach(([pattern, className]) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(line)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        className,
        text: match[0],
      });
    }
  });

  if (spans.length === 0) {
    return result || "\u00A0";
  }

  // Sort by start position and filter overlapping
  spans.sort((a, b) => a.start - b.start);
  const filteredSpans: typeof spans = [];
  let lastEnd = -1;
  for (const span of spans) {
    if (span.start >= lastEnd) {
      filteredSpans.push(span);
      lastEnd = span.end;
    }
  }

  // Build the result
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  filteredSpans.forEach((span, i) => {
    if (span.start > lastIndex) {
      parts.push(line.slice(lastIndex, span.start));
    }
    parts.push(
      <span key={i} className={span.className}>
        {span.text}
      </span>
    );
    lastIndex = span.end;
  });
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? parts : "\u00A0";
}
