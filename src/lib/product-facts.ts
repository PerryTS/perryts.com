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


