---
title: "Generational GC, Lazy JSON, and Benchmarks That Hold Up to Scrutiny"
excerpt: "Perry v0.5.174 → v0.5.306 in three days, plus the GC and JSON work that landed alongside. The generational GC ships as default. The Small String Optimization ships as default. The JSON pipeline gets a lazy tape that lands at 75 ms median on validate-and-roundtrip — best in the dynamic-typing pack. The benchmarks page is rewritten with RUNS=11 median + p95 + σ, simdjson and AssemblyScript+json-as added as peers, and every weakness Perry has surfaced honestly."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
The last post closed at **v0.5.174** with one headline: Perry was finally winning every benchmark in the in-tree suite against both Node and Bun. Three days of work and a backlog of GC + JSON commits later, Perry is on **v0.5.306** — that's **132 patch releases** — and the story is a different one. The headline isn't a 547x speedup or a fresh win column. It's the work that makes those wins defensible.

-   The **generational GC** ships as the default. Phase A through D landed across v0.5.217–v0.5.237.
-   The **Small String Optimization** ships as the default. Steps 1.5 → 2 landed in v0.5.213–v0.5.216.
-   The **JSON pipeline** got a tape-based parser, lazy parse, lazy stringify, and per-element sparse materialization. Default validate-and-roundtrip is now **75 ms median** — best in the dynamic-typing pack.
-   The **benchmarks page** is rewritten end-to-end with **RUNS=11 median + p95 + σ + min + max**, simdjson and AssemblyScript+json-as added as peers, optimization probes separated from real comparisons, and every weakness Perry has surfaced honestly.

The supporting cast is a steady run of correctness fixes: Promise microtask FIFO, NaN equality and ECMAScript number formatting, BigInt two's complement, AsyncLocalStorage end-to-end, decimal.js + ioredis + commander runtimes, and a JSON.stringify segfault on plain f64 that had been hiding under tape paths. Plus the Windows toolchain finally goes lightweight: LLVM + xwin, no Visual Studio install needed.

## 1\. Generational GC, on by default

The generational GC has been a staged roll-out for two months. The summary of the phases that closed in this window:

-   **v0.5.217–v0.5.221** — Phase A: shadow-stack runtime scaffolding, push/pop emission, slot-map threading, `Let`/`LocalSet` shadow mirroring, and the root scanner.
-   **v0.5.222** — Phase B: nursery + old-gen arena split.
-   **v0.5.223–v0.5.225** — Phase C1–C2: write-barrier runtime infrastructure, codegen emits the barrier, every heap store goes through it.
-   **v0.5.226–v0.5.228** — Phase C3a–C4: remembered-set roots flow into mark + clear; minor GC trace skips old-gen; non-moving tenuring.
-   **v0.5.229–v0.5.236** — Phase C4b α/β/γ/δ: forwarding-pointer infrastructure, pinning + evacuation pass, scanner + transitive pinning, reference rewriting, idle nursery blocks returned to the OS, GC trigger capped at the initial threshold.
-   **v0.5.237** — Phase D part 1: `PERRY_GEN_GC=1` by default.
-   **v0.5.238** — Phase D part 2: `PERRY_SHADOW_STACK=1` by default.
-   **v0.5.239–v0.5.240** — close-out docs: roadmap finalized, academic + industry lineage appendix (Bartlett 1988, Ungar 1984, Cheney 1970).

The measured win that mattered the most: `test_memory_json_churn` dropped from **115 MB → 91 MB** peak RSS the moment the gen-GC default flipped. The compute regressions were small and listed unapologetically — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` +1 ms each. The escape hatch (`PERRY_GEN_GC=0`) recovers the old numbers; the trade-off was deliberate, and the benchmarks page now lists both rows side by side so a reader can pick.

## 2\. Small String Optimization, on by default

SSO is a 22-byte inline-string representation that avoids heap allocation for short strings — typical JSON keys (2–8 bytes) and short values land in the inline form. The rollout was tiny on the surface and large under the hood:

-   **v0.5.213**: SSO infrastructure (representation + accessors).
-   **v0.5.214**: Step 1 consumer arms + `PERRY_SSO_FORCE` gate for testing.
-   **v0.5.215**: Step 1.5 codegen `PropertyGet` three-way branch — fast path for inline strings, fast path for heap strings, slow path for the residual.
-   **v0.5.216**: Step 2 flip — emit SSO by default.

The follow-ups in v0.5.279 closed the last property-read NaN bug that surfaced once SSO was hot, and the chained cross-module getter dispatch fix in v0.5.272 closed another one. Both were on the punch list before the default flipped; both shipped without a perf regression.

## 3\. JSON: tape-based parse, lazy by default

The JSON pipeline got the most invasive rewrite of the period. Old behavior: `JSON.parse` built a fully-materialized tree of NaN-boxed values. New behavior: `JSON.parse` builds a 12-byte-per-value tape and materializes lazily — only the values you actually read pay the materialization cost. Stringify on an unmutated parse is now a memcpy of the original input, the same fast-path trick simdjson uses with `raw_json()`.

-   **v0.5.200**: `JSON.parse<T>(blob)` schema-directed parse (Step 1). Compile-time-known shape lets the compiler emit pre-resolved key access.
-   **v0.5.203**: tape-based parse foundation — Step 2 Phase 1.
-   **v0.5.204**: lazy parse + lazy stringify — Step 2 Phases 2+4.
-   **v0.5.206**: lazy-safe indexed access + edge cases — Step 2 Phase 3.
-   **v0.5.208**: per-element sparse materialization — Step 2 Phase 5b.
-   **v0.5.209**: walk cursor + adaptive materialize threshold.
-   **v0.5.210**: flip lazy parse to default for blobs ≥1 KB.

The result on the workload the lazy tape was designed for (10k records, ~1 MB blob, parse → stringify with no intermediate iteration):

| Implementation | Median (ms) | p95 (ms) | σ | Peak RSS |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson) | 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + lazy tape) | 75 | 91 | 6.9 | 85 MB |
| rust serde\_json (LTO) | 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialization) | 473 | 533 | 21.4 | 606 MB |
| assemblyscript+json-as (wasmtime) | 598 | 621 | 10.5 | 58 MB |

Perry at **75 ms median** is the fastest dynamic-typing runtime in the comparison — beats Bun (259 ms), beats Node (394 ms), beats Kotlin's server JIT (453 ms). simdjson at 24 ms is the SIMD-accelerated C++ ceiling and lives on the page on purpose, not hidden behind a cherry-pick. Perry doesn't beat it. The point is to show the gap so closing it has a target — tracked in `docs/json-typed-parse-plan.md`.

The honest companion bench is **parse-and-iterate**: same blob, but every iteration sums every record's `nested.x`, which forces the lazy tape to materialize. There Perry lands at **466 ms** — slower than the mark-sweep escape hatch's 375 ms because the tape pays overhead it can't amortize. That row is in TL;DR §B. When you can't avoid the work, the lazy tape doesn't pretend to.

## 4\. The benchmarks page, rewritten

Three things changed about how Perry presents performance numbers.

**RUNS=11 median + p95 + σ + min + max, not best-of-N.** Best-of-N silently drops tail latency; on this hardware it was hiding 9.4-second Python `accumulate` outliers and Swift JSON's 5.3-second p95 spikes. Median puts the tails back on the page. The methodology change landed in v0.5.248; every cell in TL;DR §A and §B is RUNS=11 fresh as of **2026-04-25**.

**Optimization probes are separated from real runtime perf.** The five cells that show Perry at 12–34 ms vs Rust/C++ at 98 ms — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — measure compiler flag posture, not silicon. They're in their own subsection now, with a paragraph above them explaining that `clang++ -O3 -ffast-math` closes them to within a millisecond. The headline real-runtime kernel is `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry sits dead in the no-FMA-contract pack on a kernel where the compiler genuinely can't fold the work away. That's the honest comparison.

**Peers added.** simdjson (4.3.0) is now in both JSON tables — the C++ parse-throughput ceiling, on the page so a reader can see the gap. AssemblyScript with json-as (1.3.2) is the closest installable TS-to-native peer; porffor segfaulted on the workload at this size, Static Hermes wouldn't install on macOS arm64. Kotlin with kotlinx.serialization joined the JSON polyglot in v0.5.241–v0.5.242. Every row is real, every disclaimer is on the page.

## 5\. The polyglot compute table

The genuinely-non-foldable headline kernels, RUNS=11 median, refreshed 2026-04-25 at v0.5.249:

| Benchmark | Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci | 318 | 330 | 315 | 282 | 1022 | 589 |
| loop\_data\_dependent | 235 | 229 | 129 | 229 | 322 | 232 |
| object\_create | 1 | 0 | 0 | 5 | 11 | 6 |
| nested\_loops | 18 | 8 | 8 | 11 | 18 | 21 |

On `fibonacci`, Perry matches the compiled pack within 3–15 ms. Java's HotSpot JIT is ~11% faster from inlining the recursive call. On `loop_data_dependent`, the kernel splits into two FP-contract clusters: the FMA-contract pack at ~128 ms (Go default, `g++ -O3` on Apple Clang — both fuse `sum * a + b` into a single FMADDD) and the no-contract pack at 229–235 ms (Perry, Rust default, Swift, Java without `-XX:+UseFMA`, Bun) running scalar FMUL + FADD. LLVM matches the FMA pack with `-ffp-contract=fast`; Perry doesn't enable that by default. `nested_loops` is cache-bound, not compute-bound; everyone lands at 8–21 ms.

## 6\. Windows toolchain, lightweight

Windows users no longer need a Visual Studio install. **v0.5.199** closed [#176](https://github.com/PerryTS/perry/issues/176): `perry setup windows` + winget LLVM + xwin replaces the entire VS BuildTools tree. `v0.5.201` dropped the cfg gate on `find_lld_link` / `find_perry_windows_sdk` so the path discovery works on every platform that targets Windows, not just macOS hosts.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Runtime correctness pass

A theme of the period: silent runtime divergences from V8/JSC turned into either fixes or compile errors. The non-trivial ones:

-   **v0.5.255**: `BigInt.fromTwos`/`toTwos` two's complement.
-   **v0.5.263**: `Promise.all`/`race`/`any` non-promise type discrimination.
-   **v0.5.281**: `NaN==NaN` + ECMAScript number formatting (`3 → "3"`, not `"3.0"`; `-0 → "0"`; etc.).
-   **v0.5.280**: `NaN`/`Infinity` ToInt32 coercion in `(x) | 0`.
-   **v0.5.284**: Promise microtask FIFO + thrown-handler propagation.
-   **v0.5.286**: `JSON.stringify` of a plain f64 segfaulted under tape paths.
-   **v0.5.277**: `fs.readFileSync` returns Buffer when no encoding is passed (matches Node).
-   **v0.5.272**: chained cross-module getter dispatch returned `undefined`.

Stdlib follow-ups for issue [#187](https://github.com/PerryTS/perry/issues/187) filled in: AsyncLocalStorage end-to-end (v0.5.261), commander runtime + codegen actually invoking `.action()` (v0.5.250), decimal.js code (v0.5.259), Redis ioredis end-to-end (v0.5.270), pg + mongo async-factory pattern (v0.5.275), and the same async-factory bug on EE/LRU/WSS (v0.5.252).

On the `perry/ui` side: notification tap callback (#97) wired up across both Apple (v0.5.254) and Android (v0.5.258); schedule + cancel local notifications (#96, v0.5.244); FCM register + receive on Android (v0.5.262).

## 8\. Wrapping up

The pattern of this stretch isn't headline numbers. It's the work that makes existing wins survive scrutiny: a generational GC that catches sustained-allocation workloads, an SSO that closes the short-string cost gap, a JSON pipeline that exploits the “no modification” structure of the most common workload, and a benchmarks page that measures medians instead of best-of-N and shows simdjson's 24 ms parse ceiling on the same row as Perry's 75 ms. The reader gets to see the gap — and where Perry sits relative to the floor.

Try it:

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Benchmarks: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
