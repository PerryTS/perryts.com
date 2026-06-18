export interface ShowcaseProject {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  platforms: string[];
  githubUrl: string;
  tags: string[];
  hasFeaturePage: boolean;
  logoUrl?: string;
}

export const showcaseProjects: ShowcaseProject[] = [
  {
    slug: "bloom-jump",
    name: "Bloom Jump",
    tagline: "Native arcade jumper that runs everywhere — even on your TV and watch",
    description:
      "A fast-paced arcade jumping game compiled from TypeScript to native binaries. Runs at full framerate across phones, tablets, desktops, and even tvOS and watchOS — one codebase, every screen.",
    platforms: ["iOS", "iPadOS", "macOS", "Android", "tvOS", "watchOS"],
    githubUrl: "https://bloomengine.dev/showcase",
    tags: ["game", "arcade", "native-ui"],
    hasFeaturePage: false,
  },
  {
    slug: "mango",
    name: "Mango",
    tagline: "Native MongoDB GUI that starts instantly",
    description:
      "A fast, native MongoDB database management tool with connection management, query builder, inline document editing, and index viewer. ~7 MB binary, <100 MB RAM, <1s cold start.",
    platforms: ["macOS", "Windows", "Linux", "iOS", "Android"],
    githubUrl: "https://github.com/MangoQuery/app",
    tags: ["database", "native-ui", "MongoDB"],
    hasFeaturePage: false,
    logoUrl: "/showcase/mango-logo.svg",
  },
  {
    slug: "hone",
    name: "Hone",
    tagline: "Native, AI-powered code editor",
    description:
      "A native code editor with AI-first architecture, built-in terminal, Git integration, LSP support, and cross-device sync. Sub-second startup, <100 MB RAM, <50 MB binary.",
    platforms: ["macOS", "Windows", "Linux", "iOS", "Android", "Web"],
    githubUrl: "https://hone.codes",
    tags: ["developer-tools", "AI", "code-editor"],
    hasFeaturePage: false,
    logoUrl: "/showcase/hone-icon.svg",
  },
  {
    slug: "dbmeter",
    name: "dB Meter",
    tagline: "Simple sound level measurement app",
    description:
      "Real-time decibel measurement with 60fps updates, color-coded feedback, live waveform display, and per-device calibration. One-time purchase, no subscriptions.",
    platforms: ["iOS", "macOS", "Android"],
    githubUrl: "https://dbmeter.app",
    tags: ["audio", "utility", "native-ui"],
    hasFeaturePage: false,
    logoUrl: "/showcase/dbmeter-icon.png",
  },
  {
    slug: "pry",
    name: "Pry",
    tagline: "Native JSON viewer built with Perry",
    description:
      "A fast, native JSON viewer with tree navigation, search, keyboard shortcuts, and clipboard support. Compiles from TypeScript to native macOS, iOS, and Android apps.",
    platforms: ["macOS", "iOS", "Android"],
    githubUrl: "https://github.com/perryts/pry",
    tags: ["developer-tools", "native-ui", "JSON"],
    hasFeaturePage: true,
  },
  {
    slug: "perry-demo",
    name: "Perry Demo",
    tagline: "Live benchmark comparing Perry vs Node.js vs Bun",
    description:
      "An interactive demo that benchmarks Perry-compiled executables against Node.js and Bun, showing startup time, memory usage, and binary size differences in real time.",
    platforms: ["Web"],
    githubUrl: "https://demo.perryts.com",
    tags: ["benchmark", "demo"],
    hasFeaturePage: false,
  },
  {
    slug: "perry-starter",
    name: "Perry Starter",
    tagline: "Minimal starter template for Perry projects",
    description:
      "A minimal project template to get started with Perry. Includes TypeScript configuration, build scripts, and example code for CLI and GUI applications.",
    platforms: ["macOS", "Linux", "Windows"],
    githubUrl: "https://github.com/PerryTS/perry-starter",
    tags: ["template", "starter"],
    hasFeaturePage: false,
  },
];

export function getShowcaseProject(slug: string): ShowcaseProject | undefined {
  return showcaseProjects.find((project) => project.slug === slug);
}
