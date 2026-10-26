/**
 * Public product facts that change as Perry evolves.
 *
 * Keep volatile numbers and support labels here so the homepage, metadata, and
 * comparison pages do not each invent their own snapshot. Every exact number
 * below points at the product repository source used to publish it.
 */

export const PRODUCT_FACTS = {
  documentedTargetCount: 11,
  nativeWidgetCount: "35+",
  nodeParity: "~97%",
  nodeModuleCount: 53,
  nativePackageCount: "~50",
  helloWorldSize: "~330 KB",
  mangoSize: "~7 MB",
  measuredMacStartup: "~3.2 ms",
  measuredMacStartupContext: "runtime-only hello world on an Apple M-series Mac",
  benchmarkVersion: "Perry 0.5.1355",
  benchmarkDate: "2026-08-08",
  benchmarkHost: "Apple M1, 8 GB",
  benchmarkNode: "Node.js 22.23.1",
  benchmarkBun: "Bun 1.3.14",
  benchmarkSource:
    "https://github.com/PerryTS/perry/blob/main/benchmarks/results/public-node-bun-v1.json",
  benchmarkMethodology:
    "https://github.com/PerryTS/perry/blob/main/benchmarks/README.md",
  limitationsUrl:
    "https://perryts.github.io/perry/language/limitations.html",
  platformsUrl:
    "https://perryts.github.io/perry/platforms/overview.html",
} as const;

export type SupportStatus = "broad" | "core" | "preview";

export const PLATFORM_FACTS: ReadonlyArray<{
  name: string;
  framework: string;
  status: SupportStatus;
  note?: string;
}> = [
  { name: "macOS", framework: "AppKit", status: "broad" },
  { name: "iOS", framework: "UIKit", status: "broad" },
  { name: "iPadOS", framework: "UIKit", status: "broad" },
  { name: "visionOS", framework: "UIKit (2D)", status: "core" },
  { name: "tvOS", framework: "UIKit", status: "broad" },
  { name: "watchOS", framework: "SwiftUI", status: "core" },
  { name: "Android", framework: "Android SDK", status: "broad" },
  { name: "Wear OS", framework: "Android SDK", status: "core" },
  { name: "Windows", framework: "Win32", status: "broad" },
  { name: "Linux", framework: "GTK4", status: "broad" },
  {
    name: "Web / WASM",
    framework: "DOM/CSS bridge",
    status: "broad",
    note: "--target web and --target wasm are aliases",
  },
  {
    name: "HarmonyOS",
    framework: "ArkUI",
    status: "preview",
    note: "Separate preview; not included in the 11 documented targets",
  },
];

export type BenchmarkResult = "win" | "mixed" | "loss";

export const PUBLIC_BENCHMARKS: ReadonlyArray<{
  name: string;
  description: string;
  perry: number;
  node: number;
  bun: number;
  result: BenchmarkResult;
}> = [
  { name: "factorial", description: "Modular accumulation", perry: 94, node: 95, bun: 95, result: "win" },
  { name: "method calls", description: "Class method dispatch", perry: 9, node: 10, bun: 8, result: "mixed" },
  { name: "closure", description: "Closure creation and invocation", perry: 47, node: 49, bun: 49, result: "win" },
  { name: "binary trees", description: "Tree allocation and traversal", perry: 4, node: 6, bun: 6, result: "win" },
  { name: "string concat", description: "String append loop", perry: 2, node: 4, bun: 1, result: "mixed" },
  { name: "prime sieve", description: "Sieve of Eratosthenes", perry: 28, node: 6, bun: 5, result: "loss" },
  { name: "mandelbrot", description: "Complex-number iteration", perry: 22, node: 24, bun: 28, result: "win" },
  { name: "matrix multiply", description: "Matrix multiplication", perry: 85, node: 33, bun: 33, result: "loss" },
  { name: "JSON roundtrip", description: "Parse and stringify ~1 MB JSON", perry: 184, node: 380, bun: 220, result: "win" },
];
