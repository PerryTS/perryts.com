import type { ComponentType } from "react";

export interface LandingMeta {
  /** <title> value; the root layout appends the Perry brand unless absoluteTitle. */
  title: string;
  description: string;
  /** Leaf name used in BreadcrumbList JSON-LD. */
  breadcrumb: string;
  absoluteTitle?: boolean;
}

export interface LandingModule {
  default: ComponentType;
  meta: LandingMeta;
  resolvedLocale?: string;
}

type Loader = () => Promise<LandingModule>;

// Long-form technical pages contain volatile Perry and competitor claims.
// Serve one reviewed English source with an explicit language notice instead
// of silently publishing old translated snapshots. Localized routes canonicalize
// to the English page until a translation is reviewed against the same sources.
const loaders: Record<string, Loader> = {
  "getting-started": () => import("./getting-started/en"),
  "compile-typescript-to-binary": () => import("./compile-typescript-to-binary/en"),
  "typescript-native-compiler": () => import("./typescript-native-compiler/en"),
  "typescript-llvm": () => import("./typescript-llvm/en"),
  "perry-vs-electron-alternatives": () => import("./perry-vs-electron-alternatives/en"),
};

export async function getLandingContent(
  slug: string,
  _locale: string,
): Promise<LandingModule> {
  const loader = loaders[slug];
  if (!loader) throw new Error(`Unknown landing content slug: ${slug}`);
  const module = await loader();
  return { ...module, resolvedLocale: "en" };
}
