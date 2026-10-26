---
title: "Generational GC, Lazy JSON และเบนช์มาร์กที่ทนต่อการตรวจสอบ"
excerpt: "Perry v0.5.174 → v0.5.306 ภายในสามวัน พร้อมงาน GC และ JSON ที่ลงควบคู่กัน Generational GC กลายเป็นค่าเริ่มต้น Small String Optimization กลายเป็นค่าเริ่มต้น JSON pipeline ได้ lazy tape ที่ลงตัวที่ค่ากลาง 75 ms บน validate-and-roundtrip — ดีที่สุดในกลุ่ม dynamic typing หน้าเบนช์มาร์กเขียนใหม่ด้วยค่ากลาง RUNS=11 + p95 + σ เพิ่ม simdjson และ AssemblyScript+json-as เป็นเพียร์ และทุกจุดอ่อนของ Perry ถูกเปิดเผยอย่างตรงไปตรงมา"
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
โพสต์ที่แล้วปิดท้ายที่ **v0.5.174** ด้วยพาดหัวเดียว: ในที่สุด Perry ก็ชนะทุกเบนช์มาร์กในชุดหลักทั้งเทียบกับ Node และ Bun สามวันของงานและกอง commit ด้าน GC + JSON ที่ค้างอยู่ผ่านไป Perry ก็ขึ้นมาที่ **v0.5.306** นั่นคือ **132 patch release** และเรื่องราวก็เป็นคนละเรื่องกัน พาดหัวไม่ใช่การเร่งความเร็ว 547 เท่าหรือคอลัมน์ชัยชนะใหม่ ๆ มันคืองานที่ทำให้ชัยชนะเหล่านั้นยืนหยัดต่อการตรวจสอบได้

-   **Generational GC** ส่งเป็นค่าเริ่มต้นแล้ว Phase A ถึง D ลงจอดข้าม v0.5.217–v0.5.237
-   **Small String Optimization** ส่งเป็นค่าเริ่มต้นแล้ว Step 1.5 → 2 ลงจอดใน v0.5.213–v0.5.216
-   **JSON pipeline** ได้ tape-based parser, lazy parse, lazy stringify และ per-element sparse materialization ค่าเริ่มต้น validate-and-roundtrip ตอนนี้อยู่ที่ **75 ms median** ดีที่สุดในกลุ่ม dynamic-typing
-   **หน้าเบนช์มาร์ก** ถูกเขียนใหม่หมดด้วย **RUNS=11 median + p95 + σ + min + max** เพิ่ม simdjson และ AssemblyScript+json-as เป็น peer แยก optimization probe ออกจากการเปรียบเทียบจริง และทุกจุดอ่อนของ Perry ถูกนำเสนออย่างซื่อสัตย์

ทีมสนับสนุนคือชุดของการแก้ไขความถูกต้องที่สม่ำเสมอ: Promise microtask FIFO, NaN equality และ ECMAScript number formatting, BigInt two's complement, AsyncLocalStorage end-to-end, runtime ของ decimal.js + ioredis + commander และ JSON.stringify segfault บน plain f64 ที่ซ่อนอยู่ภายใต้ tape path บวกกับ Windows toolchain ที่ในที่สุดก็เบาขึ้น: LLVM + xwin ไม่ต้องติดตั้ง Visual Studio

## 1\. Generational GC เปิดเป็นค่าเริ่มต้น

Generational GC เป็นการ roll-out แบบเป็นขั้นตอนมาสองเดือน สรุป phase ที่ปิดในช่วงนี้:

-   **v0.5.217–v0.5.221** — Phase A: shadow-stack runtime scaffolding, push/pop emission, slot-map threading, `Let`/`LocalSet` shadow mirroring และ root scanner
-   **v0.5.222** — Phase B: nursery + old-gen arena split
-   **v0.5.223–v0.5.225** — Phase C1–C2: write-barrier runtime infrastructure, codegen ส่ง barrier ออกมา ทุก heap store ผ่านมัน
-   **v0.5.226–v0.5.228** — Phase C3a–C4: remembered-set root ไหลเข้าสู่ mark + clear; minor GC trace ข้าม old-gen; non-moving tenuring
-   **v0.5.229–v0.5.236** — Phase C4b α/β/γ/δ: forwarding-pointer infrastructure, pinning + evacuation pass, scanner + transitive pinning, reference rewriting, idle nursery block ถูกคืนให้ OS, GC trigger ถูก cap ที่ initial threshold
-   **v0.5.237** — Phase D part 1: `PERRY_GEN_GC=1` เป็นค่าเริ่มต้น
-   **v0.5.238** — Phase D part 2: `PERRY_SHADOW_STACK=1` เป็นค่าเริ่มต้น
-   **v0.5.239–v0.5.240** — ปิดท้าย doc: roadmap finalized, ภาคผนวก lineage ทางวิชาการ + อุตสาหกรรม (Bartlett 1988, Ungar 1984, Cheney 1970)

ชัยชนะที่วัดได้ที่สำคัญที่สุด: `test_memory_json_churn` peak RSS ลดจาก **115 MB → 91 MB** ทันทีที่ค่าเริ่มต้นของ gen-GC ถูกพลิก การถดถอยด้านการคำนวณมีเล็กน้อยและลิสต์อย่างไม่ขอโทษ — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` เพิ่มอย่างละ 1 ms ทางออก (`PERRY_GEN_GC=0`) คืนตัวเลขเดิม trade-off นั้นจงใจ และหน้าเบนช์มาร์กตอนนี้แสดงทั้งสองแถวคู่กันเพื่อให้ผู้อ่านเลือกเองได้

## 2\. Small String Optimization เปิดเป็นค่าเริ่มต้น

SSO คือ representation แบบ inline-string ขนาด 22-byte ที่หลีกเลี่ยงการ allocate บน heap สำหรับ string สั้น ๆ — JSON key ทั่วไป (2–8 byte) และ value สั้น ๆ ลงจอดในรูปแบบ inline การ rollout ดูเล็กที่ผิว แต่ใหญ่อยู่ใต้ฝา:

-   **v0.5.213**: SSO infrastructure (representation + accessor)
-   **v0.5.214**: Step 1 consumer arms + `PERRY_SSO_FORCE` gate สำหรับการทดสอบ
-   **v0.5.215**: Step 1.5 codegen `PropertyGet` three-way branch — fast path สำหรับ inline string, fast path สำหรับ heap string, slow path สำหรับส่วนที่เหลือ
-   **v0.5.216**: Step 2 พลิก — emit SSO เป็นค่าเริ่มต้น

การ follow-up ใน v0.5.279 ปิดบั๊ก property-read NaN ตัวสุดท้ายที่โผล่หลังจาก SSO ร้อน และการแก้ไข chained cross-module getter dispatch ใน v0.5.272 ปิดอีกหนึ่งบั๊ก ทั้งคู่อยู่ใน punch list ก่อนที่ค่าเริ่มต้นจะพลิก ทั้งคู่ส่งโดยไม่มีการถดถอยด้าน perf

## 3\. JSON: tape-based parse, lazy เป็นค่าเริ่มต้น

JSON pipeline ได้รับการเขียนใหม่ที่ลึกที่สุดในช่วงนี้ พฤติกรรมเก่า: `JSON.parse` สร้าง tree ของ NaN-boxed value ที่ materialize เต็มรูปแบบ พฤติกรรมใหม่: `JSON.parse` สร้าง tape ขนาด 12-byte ต่อ value และ materialize แบบ lazy — เฉพาะ value ที่คุณอ่านจริง ๆ เท่านั้นที่จ่ายค่า materialization Stringify บน parse ที่ไม่ถูกแก้ไขตอนนี้คือ memcpy ของ input ต้นฉบับ ซึ่งเป็น fast-path trick เดียวกับที่ simdjson ใช้กับ `raw_json()`

-   **v0.5.200**: `JSON.parse<T>(blob)` schema-directed parse (Step 1) shape ที่รู้ตอน compile-time ทำให้ compiler ส่ง pre-resolved key access ออกมาได้
-   **v0.5.203**: รากฐาน tape-based parse — Step 2 Phase 1
-   **v0.5.204**: lazy parse + lazy stringify — Step 2 Phase 2+4
-   **v0.5.206**: lazy-safe indexed access + edge case — Step 2 Phase 3
-   **v0.5.208**: per-element sparse materialization — Step 2 Phase 5b
-   **v0.5.209**: walk cursor + adaptive materialize threshold
-   **v0.5.210**: พลิก lazy parse เป็นค่าเริ่มต้นสำหรับ blob ≥1 KB

ผลลัพธ์บน workload ที่ lazy tape ถูกออกแบบมาเพื่อ (10k record, blob ~1 MB, parse → stringify โดยไม่มีการ iterate ระหว่างทาง):

| Implementation | Median (ms) | p95 (ms) | σ | Peak RSS |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson) | 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + lazy tape) | 75 | 91 | 6.9 | 85 MB |
| rust serde\_json (LTO) | 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialization) | 473 | 533 | 21.4 | 606 MB |
| assemblyscript+json-as (wasmtime) | 598 | 621 | 10.5 | 58 MB |

Perry ที่ **75 ms median** เป็น runtime แบบ dynamic-typing ที่เร็วที่สุดในการเปรียบเทียบ — ชนะ Bun (259 ms), ชนะ Node (394 ms), ชนะ JIT บน server ของ Kotlin (453 ms) simdjson ที่ 24 ms คือเพดาน C++ ที่เร่งด้วย SIMD และอยู่บนหน้านี้โดยตั้งใจ ไม่ใช่ซ่อนหลังการเลือกเฉพาะ Perry ไม่ได้ชนะมัน ประเด็นคือแสดงช่องว่างเพื่อให้การปิดมันมีเป้าหมาย — ติดตามใน `docs/json-typed-parse-plan.md`

เบนช์ที่ตรงไปตรงมาคู่กันคือ **parse-and-iterate**: blob เดียวกัน แต่ทุก iteration รวม `nested.x` ของทุก record ซึ่งบังคับให้ lazy tape ต้อง materialize ที่นั่น Perry ลงจอดที่ **466 ms** — ช้ากว่าทางออก mark-sweep ที่ 375 ms เพราะ tape จ่ายค่า overhead ที่มัน amortize ไม่ได้ แถวนั้นอยู่ใน TL;DR §B เมื่อคุณหลีกเลี่ยงงานไม่ได้ lazy tape ก็ไม่แสร้งว่าทำได้

## 4\. หน้าเบนช์มาร์กที่เขียนใหม่

สามอย่างที่เปลี่ยนไปเกี่ยวกับวิธีที่ Perry นำเสนอตัวเลข performance

**RUNS=11 median + p95 + σ + min + max ไม่ใช่ best-of-N** Best-of-N ตัด tail latency ออกแบบเงียบ ๆ; บน hardware นี้มันซ่อน outlier ของ Python `accumulate` ที่ 9.4 วินาที และ p95 spike ของ Swift JSON ที่ 5.3 วินาที Median ใส่ tail กลับมาบนหน้านี้ การเปลี่ยนแปลง methodology ลงจอดใน v0.5.248; ทุก cell ใน TL;DR §A และ §B เป็น RUNS=11 ใหม่สด ณ วันที่ **2026-04-25**

**Optimization probe ถูกแยกออกจาก runtime perf จริง** ห้า cell ที่แสดง Perry ที่ 12–34 ms เทียบกับ Rust/C++ ที่ 98 ms — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — วัด compiler flag posture ไม่ใช่ silicon ตอนนี้พวกมันอยู่ในหัวข้อย่อยของตัวเอง พร้อมย่อหน้าเหนือพวกมันที่อธิบายว่า `clang++ -O3 -ffast-math` ปิดช่องว่างให้เหลือภายใน 1 มิลลิวินาที headline kernel ของ runtime จริงคือ `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry นั่งอยู่กลางกลุ่ม no-FMA-contract บน kernel ที่ compiler พับงานทิ้งไม่ได้จริง ๆ นั่นคือการเปรียบเทียบที่ซื่อสัตย์

**เพิ่ม peer** simdjson (4.3.0) ตอนนี้อยู่ในตาราง JSON ทั้งสอง — เพดาน parse-throughput ของ C++ บนหน้านี้เพื่อให้ผู้อ่านเห็นช่องว่าง AssemblyScript กับ json-as (1.3.2) เป็น peer แบบ TS-to-native ที่ติดตั้งได้ใกล้ที่สุด; porffor segfault บน workload ที่ขนาดนี้, Static Hermes ติดตั้งบน macOS arm64 ไม่ได้ Kotlin กับ kotlinx.serialization เข้าร่วม polyglot JSON ใน v0.5.241–v0.5.242 ทุกแถวเป็นของจริง ทุก disclaimer อยู่บนหน้านี้

## 5\. ตาราง compute แบบ polyglot

Headline kernel ที่ fold ไม่ได้จริง ๆ, RUNS=11 median, refresh 2026-04-25 ที่ v0.5.249:

| Benchmark | Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci | 318 | 330 | 315 | 282 | 1022 | 589 |
| loop\_data\_dependent | 235 | 229 | 129 | 229 | 322 | 232 |
| object\_create | 1 | 0 | 0 | 5 | 11 | 6 |
| nested\_loops | 18 | 8 | 8 | 11 | 18 | 21 |

ใน `fibonacci` Perry เทียบเคียงกลุ่ม compiled ภายใน 3–15 ms HotSpot JIT ของ Java เร็วกว่า ~11% จากการ inline recursive call ใน `loop_data_dependent` kernel แยกเป็นสอง cluster ของ FP-contract: กลุ่ม FMA-contract ที่ ~128 ms (Go default, `g++ -O3` บน Apple Clang — ทั้งคู่ fuse `sum * a + b` เป็น FMADDD ตัวเดียว) และกลุ่ม no-contract ที่ 229–235 ms (Perry, Rust default, Swift, Java โดยไม่มี `-XX:+UseFMA`, Bun) ที่รัน scalar FMUL + FADD LLVM เทียบเคียงกลุ่ม FMA ด้วย `-ffp-contract=fast`; Perry ไม่เปิดสิ่งนั้นเป็นค่าเริ่มต้น `nested_loops` ถูก bound ด้วย cache ไม่ใช่ compute; ทุกคนลงจอดที่ 8–21 ms

## 6\. Windows toolchain เบาขึ้น

ผู้ใช้ Windows ไม่ต้องติดตั้ง Visual Studio อีกต่อไป **v0.5.199** ปิด [#176](https://github.com/PerryTS/perry/issues/176): `perry setup windows` + winget LLVM + xwin แทนที่ tree ของ VS BuildTools ทั้งหมด `v0.5.201` ตัด cfg gate บน `find_lld_link` / `find_perry_windows_sdk` ดังนั้นการค้นหา path ทำงานบนทุกแพลตฟอร์มที่ target Windows ไม่ใช่แค่ host macOS

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. รอบของการแก้ความถูกต้องของ runtime

ธีมของช่วงเวลานี้: การเบี่ยงเบนของ runtime แบบเงียบ ๆ จาก V8/JSC กลายเป็นการแก้ไขหรือ compile error ตัวที่ไม่ trivial:

-   **v0.5.255**: `BigInt.fromTwos`/`toTwos` two's complement
-   **v0.5.263**: `Promise.all`/`race`/`any` non-promise type discrimination
-   **v0.5.281**: `NaN==NaN` + ECMAScript number formatting (`3 → "3"`, ไม่ใช่ `"3.0"`; `-0 → "0"`; ฯลฯ)
-   **v0.5.280**: `NaN`/`Infinity` ToInt32 coercion ใน `(x) | 0`
-   **v0.5.284**: Promise microtask FIFO + thrown-handler propagation
-   **v0.5.286**: `JSON.stringify` ของ plain f64 segfault ภายใต้ tape path
-   **v0.5.277**: `fs.readFileSync` คืน Buffer เมื่อไม่มีการส่ง encoding (ตรงกับ Node)
-   **v0.5.272**: chained cross-module getter dispatch คืน `undefined`

การ follow-up ของ stdlib สำหรับ issue [#187](https://github.com/PerryTS/perry/issues/187) ถูกเติมเต็ม: AsyncLocalStorage end-to-end (v0.5.261), commander runtime + codegen ที่เรียก `.action()` จริง ๆ (v0.5.250), code ของ decimal.js (v0.5.259), Redis ioredis end-to-end (v0.5.270), pg + mongo async-factory pattern (v0.5.275) และบั๊ก async-factory เดียวกันบน EE/LRU/WSS (v0.5.252)

ทางฝั่ง `perry/ui`: notification tap callback (#97) เชื่อมต่อข้ามทั้ง Apple (v0.5.254) และ Android (v0.5.258); schedule + cancel local notification (#96, v0.5.244); FCM register + receive บน Android (v0.5.262)

## 8\. ปิดท้าย

รูปแบบของช่วงนี้ไม่ใช่ตัวเลขพาดหัว มันคืองานที่ทำให้ชัยชนะที่มีอยู่รอดจากการตรวจสอบได้: generational GC ที่จับ workload allocation ที่ต่อเนื่อง, SSO ที่ปิดช่องว่างต้นทุนของ string สั้น, JSON pipeline ที่ใช้ประโยชน์จากโครงสร้าง “ไม่มีการแก้ไข” ของ workload ที่พบมากที่สุด และหน้าเบนช์มาร์กที่วัด median แทน best-of-N และแสดงเพดาน parse 24 ms ของ simdjson บนแถวเดียวกับ 75 ms ของ Perry ผู้อ่านได้เห็นช่องว่าง — และตำแหน่งที่ Perry นั่งอยู่เทียบกับพื้น

ลองดู:

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

ซอร์ส: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Benchmarks: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
