import benchmarksSnapshot from "../data/snapshots/benchmarks-snapshot.json";
import paritySnapshot from "../data/snapshots/node-parity-snapshot.json";

/**
 * Figures published in the Perry repository, read once per build. If GitHub is unreachable the
 * committed snapshots in src/data are used, so the site always builds with real (if older) data.
 */
const RAW = "https://raw.githubusercontent.com/PerryTS/perry/main";
const BENCHMARKS_URL = `${RAW}/benchmarks/results/public-node-bun-v1.json`;
const PARITY_URL = `${RAW}/test-parity/node_suite_baseline.json`;

type Median = { median?: number };
type RawBenchmark = { runtimes?: Record<string, { wall_ms?: Median } | undefined> };
type RawBenchmarks = {
  perry_version?: string;
  generated_at?: string;
  host?: { cpu?: string; ram_gb?: number };
  runtimes?: { node?: { version?: string }; bun?: { version?: string } };
  components?: Record<string, { benchmarks?: Record<string, RawBenchmark> }>;
};
type RawParity = { modules?: Record<string, { pass: number; total: number }> };

export type Tone = "win" | "loss" | "even";
export interface Result {
  id: string;
  perry: number;
  node: number;
  /** Always >= 1: how many times faster the winner is. */
  ratio: number;
  tone: Tone;
  /** Bun median when the run includes it. */
  bun?: number;
}

/** Against both Node and Bun: the same outcome against both, otherwise "mixed". */
export function resultVsBoth(r: Result): "win" | "even" | "mixed" | "loss" {
  const vsBun = r.bun === undefined ? r.tone : comparePerryToNode(r.perry, r.bun).tone;
  return r.tone === vsBun ? r.tone : "mixed";
}

/** Within 10% either way counts as even. */
export function comparePerryToNode(perry: number, node: number): { ratio: number; tone: Tone } {
  const ratio = perry <= node ? node / perry : perry / node;
  return { ratio, tone: ratio < 1.1 ? "even" : perry < node ? "win" : "loss" };
}

// Components that hold distinct workloads (polyglot / json_polyglot repeat the suite).
const COMPONENTS = ["suite", "app_patterns", "honest_bench"];

export function summarizeBenchmarks(raw: RawBenchmarks, headlineCount = 4) {
  const byId = new Map<string, Result>();
  for (const name of COMPONENTS) {
    for (const [id, b] of Object.entries(raw.components?.[name]?.benchmarks ?? {})) {
      const perry = b.runtimes?.perry?.wall_ms?.median;
      const node = b.runtimes?.node?.wall_ms?.median;
      if (!perry || !node) continue;
      const bun = b.runtimes?.bun?.wall_ms?.median;
      byId.set(id, { id, perry, node, ...comparePerryToNode(perry, node), ...(bun ? { bun } : {}) });
    }
  }
  const headlines = [...byId.values()]
    .filter((r) => r.tone === "win")
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, headlineCount);
  return {
    perryVersion: (raw.perry_version ?? "").replace(/^perry\s+/, ""),
    nodeVersion: raw.runtimes?.node?.version ?? "",
    bunVersion: raw.runtimes?.bun?.version ?? "",
    cpu: raw.host?.cpu ?? "",
    ramGb: raw.host?.ram_gb,
    date: (raw.generated_at ?? "").slice(0, 10),
    count: byId.size,
    byId,
    headlines,
  };
}

export function summarizeParity(raw: RawParity) {
  const modules = Object.values(raw.modules ?? {});
  const pass = modules.reduce((sum, m) => sum + m.pass, 0);
  const total = modules.reduce((sum, m) => sum + m.total, 0);
  return { pass, total, modules: modules.length, percent: total ? Math.round((pass / total) * 1000) / 10 : 0 };
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

let benchmarks: ReturnType<typeof loadBenchmarks> | undefined;
let parity: ReturnType<typeof loadParity> | undefined;

async function loadBenchmarks() {
  return summarizeBenchmarks(await fetchJson<RawBenchmarks>(BENCHMARKS_URL, benchmarksSnapshot as RawBenchmarks));
}
async function loadParity() {
  return summarizeParity(await fetchJson<RawParity>(PARITY_URL, paritySnapshot as RawParity));
}

export const getBenchmarks = () => (benchmarks ??= loadBenchmarks());
export const getParity = () => (parity ??= loadParity());

/** Readable names for benchmark ids (shown as-is in every locale: they are test names). */
export function benchmarkLabel(id: string): string {
  const custom: Record<string, string> = {
    batch: "batch processing",
    date_format_parse: "date format + parse",
    object_deep_clone: "object deep clone",
    string_concat_csv: "CSV string building",
    string_split_map_join: "split / map / join",
    string_template_interp: "template strings",
    json_parse_1mb: "JSON.parse, 1 MB",
    json_stringify_1mb: "JSON.stringify, 1 MB",
    map_1m: "Map, 1M entries",
    json_pipeline_small: "small JSON pipeline",
    json_pipeline_full: "full JSON pipeline",
    image_convolution: "image convolution",
    bench_json_roundtrip: "JSON round-trip",
  };
  return custom[id] ?? id.replace(/^\d+_|^bench_/, "").replace(/_/g, " ");
}
