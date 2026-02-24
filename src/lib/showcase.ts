export interface ShowcaseProject {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  platforms: string[];
  githubUrl: string;
  tags: string[];
  hasFeaturePage: boolean;
}

export const showcaseProjects: ShowcaseProject[] = [
  {
    slug: "pry",
    name: "Pry",
    tagline: "Native JSON viewer built with Perry",
    description:
      "A fast, native JSON viewer with tree navigation, search, keyboard shortcuts, and clipboard support. Compiles from TypeScript to native macOS, iOS, and Android apps.",
    platforms: ["macOS", "iOS", "Android"],
    githubUrl: "https://github.com/nicktrebes/perry-pry",
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
    githubUrl: "https://github.com/skelpo/perry-starter",
    tags: ["template", "starter"],
    hasFeaturePage: false,
  },
];

export function getShowcaseProject(slug: string): ShowcaseProject | undefined {
  return showcaseProjects.find((project) => project.slug === slug);
}
