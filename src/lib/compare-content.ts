export interface ComparisonContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  tldr: string;
  competitorWhat: string;
  perryWhat: string;
  table: Array<{ feature: string; perry: string; competitor: string }>;
  perryWins: string[];
  competitorWins: string[];
  whenPerry: string;
  whenCompetitor: string;
  verdict: string;
  sources: Array<{ label: string; url: string }>;
}

const perryWhat =
  "Perry parses TypeScript and JavaScript with SWC and compiles supported code ahead of time through LLVM. Native builds do not require an external Node.js installation or JavaScript engine, but they do statically link the Perry runtime and garbage collector. Perry is pre-1.0, implements a practical language and Node.js subset, and offers an optional embedded V8 fallback for code that needs engine semantics.";

const perrySources = [
  { label: "Perry README and current support summary", url: "https://github.com/PerryTS/perry#readme" },
  { label: "Perry language limitations", url: "https://perryts.github.io/perry/language/limitations.html" },
  { label: "Perry public benchmark artifact", url: "https://github.com/PerryTS/perry/blob/main/benchmarks/results/public-node-bun-v1.json" },
];

export const comparisonContent: Record<string, ComparisonContent> = {
  bun: {
    title: "Perry vs Bun",
    metaTitle: "Perry vs Bun: AOT native compiler vs JavaScript runtime",
    metaDescription: "A sourced comparison of Perry's LLVM AOT model and Bun's standalone executable model, including runtimes, targets, compatibility, and tradeoffs.",
    tldr: "Both can produce a single executable, but the contents differ. Bun bundles the application with a copy of the Bun runtime. Perry compiles supported code to native machine code and statically links its own runtime and GC without a JavaScript engine by default.",
    competitorWhat: "Bun is an all-in-one JavaScript and TypeScript runtime, package manager, test runner, and bundler. Bun's official executable documentation says --compile bundles imported code and packages together with a copy of the Bun runtime.",
    perryWhat,
    table: [
      { feature: "Execution model", perry: "LLVM ahead-of-time machine code", competitor: "JavaScriptCore through the Bun runtime" },
      { feature: "Standalone executable", perry: "Target-specific native binary", competitor: "Application plus a copy of the Bun runtime" },
      { feature: "Runtime model", perry: "Perry runtime + GC statically linked; no JS engine by default", competitor: "Bun runtime and JavaScriptCore embedded" },
      { feature: "Documented targets", perry: "11 targets plus HarmonyOS preview", competitor: "Official --compile targets cover macOS, Linux, and Windows variants" },
      { feature: "Native UI", perry: "Platform widgets where supported", competitor: "No built-in cross-platform native-widget layer" },
      { feature: "Package compatibility", perry: "Practical subset; optional V8 fallback", competitor: "Broad Bun and Node API compatibility" },
      { feature: "Benchmark position", perry: "Wins, mixed results, and losses in the published suite", competitor: "Wins several current suite rows, including prime sieve and matrix multiply" },
    ],
    perryWins: ["Mobile, wearable, TV, and Web/WASM targets", "A native-widget UI model", "No JavaScript engine in native output by default", "Small outputs are possible when few features are linked"],
    competitorWins: ["More mature runtime and tooling ecosystem", "Broader npm and dynamic JavaScript compatibility", "Integrated package manager, test runner, and bundler", "JIT execution can win on important workloads"],
    whenPerry: "Choose Perry when native widgets or Perry's mobile, wearable, TV, and Web/WASM targets are central, and you can validate your code against Perry's current compatibility surface.",
    whenCompetitor: "Choose Bun when you need a mature all-in-one runtime, broad package compatibility, or its integrated package-manager, test, and bundling workflow.",
    verdict: "This is an architecture choice, not a universal speed ranking. Validate the exact workload, package graph, target, output size, and startup behavior you plan to ship.",
    sources: [{ label: "Bun standalone executable documentation", url: "https://bun.sh/docs/bundler/executables" }, ...perrySources],
  },
  deno: {
    title: "Perry vs Deno",
    metaTitle: "Perry vs Deno: AOT native compiler vs Deno compile",
    metaDescription: "A sourced comparison of Perry's LLVM AOT model and Deno compile, including runtimes, permissions, targets, compatibility, and tradeoffs.",
    tldr: "Deno compile produces a standalone executable by bundling a slimmed-down Deno runtime with the program. Perry compiles supported code through LLVM and does not include a JavaScript engine by default, while statically linking its own runtime and GC.",
    competitorWhat: "Deno is a JavaScript and TypeScript runtime with built-in tooling and a permissions model. Its official compile documentation describes a standalone executable that contains the program and a slimmed-down Deno runtime.",
    perryWhat,
    table: [
      { feature: "Execution model", perry: "LLVM ahead-of-time machine code", competitor: "V8 through the bundled Deno runtime" },
      { feature: "Standalone executable", perry: "Target-specific native binary", competitor: "Program plus slimmed-down Deno runtime" },
      { feature: "Runtime model", perry: "Perry runtime + GC statically linked; no JS engine by default", competitor: "Deno runtime and V8 embedded" },
      { feature: "Permissions", perry: "Operating-system process permissions", competitor: "Runtime permission flags and policy" },
      { feature: "Native UI and mobile", perry: "Perry UI targets desktop, mobile, wearable, TV, and Web/WASM", competitor: "Runtime/CLI/server focus" },
      { feature: "Compatibility", perry: "Practical subset; optional V8 fallback", competitor: "V8 plus Deno, web, and Node compatibility layers" },
    ],
    perryWins: ["Native-widget UI targets", "No JavaScript engine in native output by default", "Mobile, wearable, TV, and Web/WASM target model", "Small outputs are possible for narrowly linked applications"],
    competitorWins: ["Mature runtime and tooling", "Granular runtime permissions", "Broad dynamic JavaScript and package compatibility", "Built-in formatter, linter, test runner, and related tools"],
    whenPerry: "Choose Perry for validated native applications where its targets, UI model, and AOT tradeoffs fit the product.",
    whenCompetitor: "Choose Deno for runtime-centric server, CLI, or scripting work where its permissions model, tooling, and V8 compatibility are more important.",
    verdict: "Both can ship one file, but one file does not mean the same architecture. Compare your actual application rather than extrapolating from hello world or a microbenchmark.",
    sources: [{ label: "Deno compile documentation", url: "https://docs.deno.com/runtime/reference/cli/compile/" }, ...perrySources],
  },
  "static-hermes": {
    title: "Perry vs Static Hermes",
    metaTitle: "Perry vs Static Hermes: two AOT approaches",
    metaDescription: "A sourced comparison of Perry and the Static Hermes research branch without maturity or performance overclaims.",
    tldr: "Perry and Static Hermes both explore ahead-of-time JavaScript/TypeScript compilation, but they have different runtimes, toolchains, target goals, and maturity. Static Hermes remains an active branch of the Hermes project; Perry ships a pre-1.0 CLI and platform stack.",
    competitorWhat: "Hermes is Meta's JavaScript engine for React Native. The Static Hermes work lives on the static_h branch and includes an AOT-oriented runtime and compiler implementation; its own project discussion describes documentation and implementation as ongoing work.",
    perryWhat,
    table: [
      { feature: "Compiler path", perry: "SWC → Perry HIR → LLVM", competitor: "Hermes Static H compiler/runtime branch" },
      { feature: "Runtime", perry: "Perry runtime + GC", competitor: "Static Hermes runtime" },
      { feature: "Primary product scope", perry: "CLI, server, native UI, mobile, wearable, TV, Web/WASM", competitor: "Hermes/React Native research and runtime ecosystem" },
      { feature: "Distribution", perry: "Pre-1.0 CLI with release packages", competitor: "Source-oriented project workflow" },
      { feature: "Compatibility", perry: "Documented practical subset", competitor: "Typed/static subset and Hermes semantics; check branch documentation" },
    ],
    perryWins: ["Packaged Perry CLI and documented commands", "Broader declared target and native UI scope", "Published Perry limitations and benchmark artifact"],
    competitorWins: ["Backed by the established Hermes and React Native ecosystem", "Deep integration potential with Hermes and React Native", "Active compiler research from Meta and contributors"],
    whenPerry: "Choose Perry when its current CLI, target matrix, and UI stack match a product you can validate today.",
    whenCompetitor: "Evaluate Static Hermes when React Native/Hermes integration or compiler research is the primary goal and building from its current source workflow is acceptable.",
    verdict: "Neither project should be reduced to an unsupported 'production versus research' slogan. Evaluate the current branch, tooling, semantics, and target needed by your application.",
    sources: [{ label: "Hermes repository", url: "https://github.com/facebook/hermes" }, { label: "Static Hermes branch", url: "https://github.com/facebook/hermes/tree/static_h" }, ...perrySources],
  },
  electron: {
    title: "Perry vs Electron",
    metaTitle: "Perry vs Electron: native widgets vs Chromium UI",
    metaDescription: "A sourced comparison of Perry and Electron across runtime architecture, UI, targets, ecosystem, and tradeoffs without universal size claims.",
    tldr: "Electron embeds Chromium and Node.js and renders application UI as web content. Perry compiles supported TypeScript through LLVM and maps its UI model to platform widgets where supported. Electron is more mature and web-compatible; Perry targets a different UI and deployment model.",
    competitorWhat: "Electron's official documentation describes a desktop framework that embeds Chromium and Node.js. Its main process runs in Node.js and each BrowserWindow loads web content in a renderer process based on Chromium's multi-process architecture.",
    perryWhat,
    table: [
      { feature: "UI rendering", perry: "Platform widgets where supported", competitor: "HTML/CSS in Chromium renderer processes" },
      { feature: "Runtime", perry: "Perry runtime + GC; no JS engine by default", competitor: "Chromium, V8, Node.js, and Electron APIs" },
      { feature: "Targets", perry: "Desktop plus mobile, wearable, TV, Web/WASM", competitor: "Desktop: macOS, Windows, Linux" },
      { feature: "Web compatibility", perry: "Perry UI and supported APIs", competitor: "Chromium web platform" },
      { feature: "Ecosystem maturity", perry: "Pre-1.0", competitor: "Established framework and tooling ecosystem" },
    ],
    perryWins: ["Native-widget UI model", "No bundled browser engine in native builds", "Targets beyond desktop", "AOT machine code for supported code"],
    competitorWins: ["Mature ecosystem and documentation", "Chromium-consistent web rendering", "Broad Node.js and npm compatibility", "Fast reuse of existing web applications and teams"],
    whenPerry: "Choose Perry when real platform widgets and non-desktop targets matter and your application fits its current support surface.",
    whenCompetitor: "Choose Electron when web compatibility, ecosystem maturity, desktop focus, and reuse of an existing web frontend outweigh browser-engine distribution costs.",
    verdict: "Electron and Perry optimize for different constraints. Measure your real installer, memory, startup, accessibility, package compatibility, and UI requirements before choosing.",
    sources: [{ label: "Electron introduction", url: "https://www.electronjs.org/docs/latest/" }, { label: "Electron process model", url: "https://www.electronjs.org/docs/latest/tutorial/process-model" }, ...perrySources],
  },
  tauri: {
    title: "Perry vs Tauri",
    metaTitle: "Perry vs Tauri: native widgets vs system webviews",
    metaDescription: "A sourced comparison of Perry and Tauri across UI architecture, runtime, targets, ecosystem, and tradeoffs.",
    tldr: "Tauri combines a compiled Rust core with HTML, CSS, and JavaScript rendered in an operating-system webview. Perry compiles supported TypeScript through LLVM and maps Perry UI to platform widgets. Tauri benefits from web frontend compatibility; Perry targets a no-webview UI model.",
    competitorWhat: "Tauri's official architecture documentation describes a Rust core plus HTML rendered in a webview, with communication between the webview and native side. It uses the operating system's webview rather than bundling a browser engine into every application.",
    perryWhat,
    table: [
      { feature: "UI rendering", perry: "Platform widgets where supported", competitor: "HTML/CSS/JavaScript in the system webview" },
      { feature: "Native-side language", perry: "TypeScript compiled through LLVM", competitor: "Rust core, with optional Swift/Kotlin/plugin bindings" },
      { feature: "Browser engine distribution", perry: "No browser engine for native UI", competitor: "Uses the OS webview instead of bundling one" },
      { feature: "Frontend ecosystem", perry: "Perry UI", competitor: "Web frameworks and browser tooling" },
      { feature: "Targets", perry: "11 documented targets plus preview", competitor: "Desktop and mobile targets documented by Tauri" },
    ],
    perryWins: ["Real platform-widget UI model", "One TypeScript language for supported UI and application logic", "Wearable, TV, and Web/WASM target scope"],
    competitorWins: ["Mature web frontend ecosystem", "Small apps without bundling a browser engine", "Rust plugin and backend ecosystem", "Broader compatibility with existing HTML/CSS frontends"],
    whenPerry: "Choose Perry when platform widgets and its broader target model outweigh the smaller current ecosystem.",
    whenCompetitor: "Choose Tauri when an HTML/CSS frontend, system webview, and Rust-native backend/plugin model fit your team and product.",
    verdict: "Both avoid Electron's bundled-browser model, but Tauri remains a webview architecture while Perry uses platform widgets. That difference matters more than an isolated binary-size number.",
    sources: [{ label: "Tauri architecture", url: "https://v2.tauri.app/concept/architecture/" }, { label: "Tauri webview versions", url: "https://tauri.app/reference/webview-versions/" }, ...perrySources],
  },
  "react-native": {
    title: "Perry vs React Native",
    metaTitle: "Perry vs React Native: AOT TypeScript vs Hermes",
    metaDescription: "A sourced comparison of Perry and React Native across runtime, native components, targets, ecosystem, and tradeoffs.",
    tldr: "React Native normally runs JavaScript through Hermes and renders host-platform views through its renderer and native-component system. Perry compiles supported TypeScript through LLVM and statically links its runtime and GC. React Native is much more mature; Perry offers a different AOT and target model.",
    competitorWhat: "React Native's current documentation says most applications use Hermes, an open-source JavaScript engine optimized for React Native. Fabric and native components connect React code to host-platform views, widgets, and controllers.",
    perryWhat,
    table: [
      { feature: "Execution", perry: "LLVM ahead-of-time machine code", competitor: "JavaScript through Hermes in most applications" },
      { feature: "UI", perry: "Perry UI mapped to platform widgets", competitor: "React renderer plus host/native components" },
      { feature: "Primary mobile platforms", perry: "iOS, iPadOS, visionOS, Android, Wear OS, watchOS, tvOS", competitor: "Core documentation centers on iOS and Android; additional platforms use ecosystem projects" },
      { feature: "Ecosystem", perry: "Pre-1.0 Perry packages and native APIs", competitor: "Established React Native and Expo ecosystem" },
      { feature: "Compatibility", perry: "Practical subset; optional V8 fallback", competitor: "Hermes/React Native JavaScript environment" },
    ],
    perryWins: ["AOT native machine code for supported TypeScript", "No JavaScript engine in native output by default", "Declared wearable, TV, desktop, and Web/WASM target model"],
    competitorWins: ["Far larger production ecosystem", "Mature React and Expo tooling", "Broad library and community support", "Deeply developed iOS and Android workflows"],
    whenPerry: "Choose Perry when its AOT model, target set, and validated widget/API coverage fit the application.",
    whenCompetitor: "Choose React Native when ecosystem maturity, Expo, community libraries, and established iOS/Android production workflows are decisive.",
    verdict: "Perry's architecture is unusual; React Native's ecosystem is the safer default for many mobile teams today. Validate Perry when its AOT output or target reach solves a specific product constraint.",
    sources: [{ label: "React Native JavaScript environment", url: "https://reactnative.dev/docs/javascript-environment" }, { label: "React Native native platform APIs", url: "https://reactnative.dev/docs/native-platform" }, ...perrySources],
  },
};

export function getComparisonContent(slug: string): ComparisonContent | undefined {
  return comparisonContent[slug];
}
