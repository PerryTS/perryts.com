export interface CompareItem {
  slug: string;
  competitor: string;
  category: "runtime" | "compiler" | "ui-framework";
  updated: string;
}

export const compareItems: CompareItem[] = [
  {
    slug: "bun",
    competitor: "Bun",
    category: "runtime",
    updated: "2026-04-26",
  },
  {
    slug: "deno",
    competitor: "Deno",
    category: "runtime",
    updated: "2026-04-26",
  },
  {
    slug: "static-hermes",
    competitor: "Static Hermes",
    category: "compiler",
    updated: "2026-07-03",
  },
  {
    slug: "electron",
    competitor: "Electron",
    category: "ui-framework",
    updated: "2026-04-26",
  },
  {
    slug: "tauri",
    competitor: "Tauri",
    category: "ui-framework",
    updated: "2026-04-26",
  },
  {
    slug: "react-native",
    competitor: "React Native",
    category: "ui-framework",
    updated: "2026-04-26",
  },
];

export function getCompareItem(slug: string): CompareItem | undefined {
  return compareItems.find((c) => c.slug === slug);
}

export function getAllCompareSlugs(): string[] {
  return compareItems.map((c) => c.slug);
}
