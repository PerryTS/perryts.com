export interface RepoStats {
  stars: number;
  forks: number;
  contributors: number;
  mergedPrs: number;
  mergedLast30Days: number;
  createdAt: string;
}

const REPO = "PerryTS/perry";
const API = "https://api.github.com";

/** Last values read by hand (2026-10-26). Used when the API is unreachable or rate-limited. */
export const FALLBACK_STATS: RepoStats = {
  stars: 5047,
  forks: 182,
  contributors: 37,
  mergedPrs: 7173,
  mergedLast30Days: 1467,
  createdAt: "2026-01-19T07:42:31Z",
};

async function request(path: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return res;
}

async function searchCount(query: string): Promise<number> {
  const res = await request(`/search/issues?q=${encodeURIComponent(query)}&per_page=1`);
  return ((await res.json()) as { total_count: number }).total_count;
}

/** Counts list items through the `rel="last"` page number when asking for one item per page. */
async function countPaged(path: string): Promise<number> {
  const res = await request(`${path}${path.includes("?") ? "&" : "?"}per_page=1`);
  const last = res.headers.get("link")?.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (last) return Number(last[1]);
  return ((await res.json()) as unknown[]).length;
}

let cached: Promise<RepoStats> | undefined;

/** Read once per build. Each figure falls back on its own, so one failing call never blanks the band. */
export function getRepoStats(): Promise<RepoStats> {
  cached ??= (async () => {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const [repo, contributors, merged, recent] = await Promise.allSettled([
      request(`/repos/${REPO}`).then(
        (r) => r.json() as Promise<{ stargazers_count: number; forks_count: number; created_at: string }>,
      ),
      countPaged(`/repos/${REPO}/contributors?anon=1`),
      searchCount(`repo:${REPO} is:pr is:merged`),
      searchCount(`repo:${REPO} is:pr is:merged merged:>=${since}`),
    ]);
    const value = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
      r.status === "fulfilled" ? r.value : fallback;
    const repoData = value(repo, undefined);
    return {
      stars: repoData?.stargazers_count ?? FALLBACK_STATS.stars,
      forks: repoData?.forks_count ?? FALLBACK_STATS.forks,
      createdAt: repoData?.created_at ?? FALLBACK_STATS.createdAt,
      contributors: value(contributors, FALLBACK_STATS.contributors),
      mergedPrs: value(merged, FALLBACK_STATS.mergedPrs),
      mergedLast30Days: value(recent, FALLBACK_STATS.mergedLast30Days),
    };
  })();
  return cached;
}
