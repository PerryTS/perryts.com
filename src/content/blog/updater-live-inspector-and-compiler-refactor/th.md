---
title: "อัปเดตอัตโนมัติ, inspector แบบ live และคอมไพเลอร์ที่ลดตัวเองลงครึ่งหนึ่ง"
excerpt: "Perry v0.5.306 → v0.5.359 ใน 4 วัน — 53 patch release ปิด issue ราว 30 รายการ และของใหญ่ 3 อย่างลงจอด: perry/updater สำหรับ auto-update บน desktop, inspector แบบ live ที่ localhost:7676 และการ refactor คอมไพเลอร์ที่ลดไฟล์ใหญ่ที่สุด 4 ไฟล์ลง 33–91%"
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
โพสต์ที่แล้วปิดท้ายที่ **v0.5.306** ด้วยเรื่อง gen-GC + JSON + benchmark สี่วันต่อมา Perry มาถึง **v0.5.359** — นั่นคือ **53 patch release** — และเรื่องราวก็ต่างออกไปอีกครั้ง ไม่มี release ไหนเป็นพาดหัวด้วยตัวเลข benchmark เลย เกือบทั้งหมดคือ **การปิด issue จากตัว tracker**

-   **`perry/updater`** มาแล้ว — auto-update สไตล์ Sparkle/Tauri สำหรับแอป desktop (Ed25519 บน digest SHA-256, sentinel-rollback, relaunch แบบแยกกระบวนการ) PR จากชุมชนโดย **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224))
-   **Geisterhand เฟส D** — inspector แบบ live ที่ `http://localhost:7676` มี widget tree, รายละเอียดต่อ widget, dispatch คลิก และแก้ style แบบ live ผ่าน `POST /style/:h`
-   **การ refactor compiler** ตลอดช่วง v0.5.329 → v0.5.343 ไฟล์ที่ถูกอ้างถึงมากที่สุด 4 ไฟล์ถูกผ่าออก: `lower::lower_expr` 6,687 → 624 LOC (−91%), `compile.rs` 9,391 → 3,783 LOC (−60%), `lower.rs` 13,591 → 7,554 LOC (−44%), `lower_call.rs` 7,000+ → 4,681 LOC (−33%) `walker.rs` ตัวใหม่เปลี่ยน bug class แบบ catch-all `_ =>` ให้กลายเป็น compile error
-   **UI styling เฟส C ปิดงาน** — props inline `style: { ... }` บนทุก widget ใน Apple, Android, GTK4, Windows และ Web Windows ต่อสตับครบ 4 จาก 5 (decoration / opacity / borders) เหลือแค่ `widget.shadow` (follow-up ด้วย DirectComposition)
-   **Bucket Scoop** สำหรับ Windows: `scoop install perry-ts/perry` พร้อม sidecar SHA-256 ใน workflow release
-   **คลื่นการแก้ issue จากชุมชน** — ปิด issue ราว 30 รายการกระจายในด้าน runtime, codegen, fetch, GTK4, Windows linker, async และ stdlib

## 1\. perry/updater — auto-update สำหรับแอป desktop

ก่อนหน้านี้ Perry ไม่มีเส้นทางอัปเดต แอปออก แล้วก็ออก แค่นั้น **TheHypnoo** เปิด [#224](https://github.com/PerryTS/perry/pull/224) พร้อมเรื่องราวทั้งชุด:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback ถ้าการเปิดครั้งก่อน crash

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // เรียกหลัง build ใหม่บูตขึ้นมาเรียบร้อย
```

โมเดลความน่าเชื่อถือ: **Ed25519 ลงนามบน digest SHA-256 ของไฟล์** (ไม่ใช่บน byte ของไฟล์ — ทำให้การยืนยันถูกแม้กับ binary ขนาดใหญ่) Manifest เป็น JSON มี schema versioning หนึ่งรายการต่อ triple `<os>-<arch>` ติดตั้งแบบ atomic พร้อม backup `<exe>.prev`, relaunch แบบแยกกระบวนการ (Unix ใช้ `setsid`, Windows ใช้ `DETACHED_PROCESS`) มือถือถูกตัดออกตามดีไซน์ — App Store / Play Store เป็นเจ้าของไปป์ไลน์การติดตั้งในระดับ OS อยู่แล้ว

ตอนเขียน smoke test มีลูกเล่นของ Perry runtime สองอย่างโผล่ขึ้นมา และได้ถูกแก้ไปด้วย:

-   **`response.arrayBuffer()` คืนค่ามาเป็นแค่สตับ metadata** แก้ใน [#232](https://github.com/PerryTS/perry/pull/232) (TheHypnoo เช่นกัน) — `js_response_array_buffer` ตอนนี้จองพื้นที่ `BufferHeader` จริงและ `memcpy` `resp.body` เข้าไป
-   **`fs.appendFileSync` เขียน 0 ไบต์** แก้ใน [#226](https://github.com/PerryTS/perry/issues/226) — เส้นทาง lowering แบบ namespace-import (`import * as fs from "fs"`) ไม่มี arm สำหรับ `appendFileSync` และฝั่ง LLVM codegen ก็ไม่มี arm สำหรับตัวแปร HIR เช่นกัน ตอนนี้ต่อให้แล้วทั้งคู่

เอกสารอยู่ที่ `docs/src/updater/overview.md`

## 2\. Geisterhand: inspector แบบ live ที่ localhost:7676

Geisterhand เป็นชุดทดสอบ UI แบบ in-process ของ Perry — HTTP API บนพอร์ต 7676 เพื่อ snapshot สถานะ widget และ dispatch คลิก เฟส D เปลี่ยนมันให้กลายเป็น inspector สไตล์ devtools ที่เปิดได้จากเบราว์เซอร์ใดก็ได้

-   **ขั้น 1 (v0.5.349)** — `GET /` เสิร์ฟ UI แบบ vanilla-JS หน้าเดียว มี widget tree, รายละเอียดต่อ widget (frame, value, raw JSON), auto-refresh 1.5 วินาที พร้อม pause/resume และปุ่ม «ยิง onClick» codegen ปักหมุด `INSPECTOR_HTML` ไว้ตรงกับ lazy-load `-dead_strip` ของ macOS เพื่อให้รอด release build
-   **ขั้น 2 (v0.5.350)** — `POST /style/:h` รับชุด props JSON แล้วใช้แบบ live 9 props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) ไหลจาก HTTP thread → main thread ผ่าน pump-queue เดิม JSON ผิด → 400; handle ผิด → 400; props ที่ไม่รู้จักจะถูกกรองที่ฝั่งเซิร์ฟเวอร์ และ response ระบุว่าตัวไหนผ่านไปได้

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

Dispatcher ฝั่ง macOS ต่อแล้ว ส่วน Linux / Windows / iOS / tvOS / visionOS / Android ใช้รูปแบบเดียวกันและจะตามมาเป็นถัดไป

## 3\. การ refactor compiler — ผ่าไฟล์ใหญ่สุด 4 ไฟล์

issue 5 รายการใน tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214) และอีกหางยาว) มีรูปแบบเดียวกัน: มีการเพิ่ม `Expr` ตัวใหม่เข้าใน `ir.rs` แต่ ad-hoc walker หนึ่งใน 4 ตัวใน `lower.rs` มี `_ =>` เป็น catch-all แล้ว compile ผิดเงียบ ๆ การจับเรื่องนี้ตอน runtime แพง — บางทีมองไม่เห็น บางทีก็ SIGSEGV ใต้ SSO

**v0.5.329** เปิดตัว `crates/perry-hir/src/walker.rs` พร้อม `walk_expr_children` / `walk_expr_children_mut` — match แบบ exhaustive บน `Expr` ครบทั้ง 178 ตัวแปร **ไม่มี catch-all** การเพิ่มตัวแปรใหม่โดยไม่ลงทะเบียนที่นี่ ตอนนี้กลายเป็น compile error ผู้ใช้ทั้ง 4 ราย (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) จึงยุบลง:

| ฟังก์ชัน | ก่อน | หลัง | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75% |
| `substitute_locals` | 553 | 80 | −86% |
| `collect_local_refs_expr` | 720 | 70 | −90% |
| `remap_local_ids_in_expr` | 542 | 85 | −84% |

รวม: **−1,830 บรรทัด descent ที่ซ้ำซ้อน** ถูกแทนด้วย **+1,840 บรรทัดของ walker รวมศูนย์** — net เกือบเท่าเดิม แต่ bug class หายไปแล้ว

นั่นปลดล็อกที่เหลือ **v0.5.331 → v0.5.343** ตัดผ่ามอนอลิธทั้ง 4 ใน 14 commit ตัวเลขพาดหัว:

| ไฟล์ | ก่อน | หลัง | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6,687 | 624 | −91% |
| `compile.rs` | 9,391 | 3,783 | −60% |
| `lower.rs` | 13,591 | 7,554 | −44% |
| `lower_call.rs` | 7,000+ | 4,681 | −33% |

การแยกตัวลงจอดในรูปของ 19 sub-module ที่โฟกัสเฉพาะ: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs` บวกกับ crate ใหม่ `crates/perry-dispatch` ที่กลายเป็นแหล่งความจริงเดียวสำหรับตารางเมธอด UI / system / i18n (fan-out `_ => "perry_ui_unknown"` ที่ทำให้เกิดเซอร์ไพรส์ «คอมไพล์ผ่านบน macOS แต่พังบน web» ใน issue [#191](https://github.com/PerryTS/perry/issues/191) ตอนนี้กลายเป็นการ lookup ครั้งเดียว)

**กำไรด้านเพอร์ฟอร์แมนซ์ Tier 4** ไปด้วยกัน (v0.5.335–v0.5.336):

-   รวม 2 พาสใน `inline_functions` และ 3 พาส rayon ใน `compile.rs` — ประหยัดการสแกนโมดูล 5 รอบ + การวนกลับของ scheduler 3 รอบต่อการ compile
-   จำกัด parse cache ของ `perry dev` ที่ 500 entry, eviction แบบ FIFO ก่อนแก้ เซสชันที่ไล่ `node_modules` สามารถถือครอง SWC AST 100+ MB
-   ทำขั้นเขียน `.ll` หลัง codegen ให้ขนานกัน — wall-time เร็วขึ้น 2–4 เท่าบน SSD ที่มี 50+ โมดูล
-   ใช้ `Arc<I18nTable>` แทนการ clone ตาราง locale ต่อ worker

การทดสอบ workspace อยู่ที่ **434 passed / 0 failed / 5 ignored** ทุก commit; gap test อยู่ที่ baseline 25/28; doc-test อยู่ที่ baseline 80/82

## 4\. UI styling เฟส C เสร็จ

เฟส C คือการ rollout `style: { ... }` แบบ inline ขั้น 1–7 ปิดในหน้าต่างนี้:

-   **v0.5.305 → v0.5.306** — type surface `StyleProps` + `style:` inline บน Button
-   **v0.5.307 → v0.5.309** — destructure inline สำหรับ color/padding/shadow บนทุก widget ตาราง แล้วต่อด้วย VStack / HStack
-   **v0.5.310 → v0.5.311** — string hex + gradient + `parseColor` ตอน runtime สำหรับค่าที่เป็นแบบ dynamic
-   **v0.5.312** — เอกสาร styling + issue tracking ฝั่ง Windows

จากนั้นกวาด cross-platform:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — ต่อ FFI styling 4 ตัว บวก 7 FFI ที่ขาดและขวาง doc-tests ฝั่ง Linux (v0.5.322)
-   **macOS** (v0.5.324) — เดินท่อ shadow บน `CALayer` ให้ `widget.shadow` + โครงสร้าง visual\_test รวมถึง class-probe สำหรับ `set_color` ของ widget ที่ไม่ใช่ `NSTextField`
-   **iOS / tvOS / visionOS** (v0.5.346) — Button ที่มี `color: ...` เคยเรียก `setTextColor:` บน `UIButton` ซึ่งไม่ได้ implement selector ดังกล่าว; panic ของ `objc2` จึงข้ามขอบ `extern "C"` และโปรเซสถูก abort แก้ด้วย pattern class-probe เดียวกับ macOS — UIButton ตอนนี้วิ่งผ่าน `setTitleColor:forState:UIControlStateNormal`
-   **Windows** (v0.5.347) — ต่อ stub styling 4 จาก 5 (`text.decoration` ผ่าน `LOGFONT` round-trip, `widget.opacity` ผ่าน `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, borders ผ่าน `SetWindowSubclass` + `WM_PAINT`) เหลือแค่ `widget.shadow` (ต้องการ DirectComposition)

ตาราง styling ใน `docs/src/ui/styling-matrix.md` ปิดหน้าต่างด้วย **Web ที่ 43/43 Wired**, **Windows ที่ 42/43 Wired** ส่วนที่เหลือคลุมเต็ม

## 5\. รอบความถูกต้องของ runtime — ทีละ issue

ธีมของช่วงนี้คือ ทุก miscompile ที่เข้ามาผ่าน tracker กลายเป็นการแก้หรือกลายเป็น compile-time error ไฮไลต์:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — class method ภายใน `fn` ไม่สามารถ capture local ของ fn รอบ ๆ ได้ การ repro แบบหลายโมดูลตอนนี้ตรงกับ Node ระดับไบต์ต่อไบต์
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — การ unbox string-handle แบบ SSO-safe ใน 7 จุดที่ใช้ string เป็น operand: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, input ของ crypto digest ก่อนแก้ ทุกอันคืนขยะเงียบ ๆ หรือไม่ก็ SIGSEGV เมื่อเจอ operand แบบ inline-string
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — array `const` ระดับโมดูลที่ว่างทำให้ writes `arr[i]=` จากข้างในฟังก์ชันหายไป ปรากฏตอน `discoverLevels()` ของ Bloom-Engine/jump เติม `LEVEL_FILES` ที่ระดับโมดูลด้วย index-assign แล้วจอเลือกด่านขึ้นว่างเปล่า
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` จากภายในฟังก์ชัน async ถูกจำกัดเงียบ ๆ ที่ 16 องค์ประกอบเมื่ออาเรย์ถูกส่งเข้ามาทางพารามิเตอร์ ฟังก์ชัน async ไม่ถูก inline; การ realloc คืนพอยน์เตอร์ใหม่ที่ผู้เรียกไม่เห็น แก้: ติด forwarding pointer ที่ตำแหน่งเดิมทุกครั้งที่ขยาย โดยใช้กลไก `GC_FLAG_FORWARDED` เดิมของ GC
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — dispatch ของ default param ของ method ส่งขยะเมื่อผู้เรียกข้าม arg ท้าย ๆ ส่วนหลักที่ทำให้เกิดปัญหา 2 ส่วน: declare ของ method แบบ cross-module ฮาร์ดโค้ด 6 double แทนที่จะเป็น `arity + 1` และ `lower_class_method` ก็ไม่ได้เรียก `build_default_param_stmts` เลย ปรากฏใน `findOne(filter, options = {})` ของ mongodb ที่ค้างเงียบ ๆ; การแก้ครอบทั้ง dispatch ภายในและ cross-module อย่างเป็นเอกภาพ
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — bug fetch + promise สามตัวแยกอิสระจาก repro เดียว: api.github.com 403 ให้คำขอแบบไม่ระบุตัว (ตอนนี้ตั้ง User-Agent default), `.then(console.log)` ค้างไม่จบ (callback null ไม่ push entry เข้า TASK\_QUEUE), การ reject ของ fetch ทุกครั้งพิมพ์ `Uncaught exception: [object Object]` (`*StringHeader` เปล่าถูก NaN-box แทนที่จะเป็น `ErrorHeader` จริง)
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — `Blob` จริงพร้อม method instance `arrayBuffer` / `text` / `bytes` / `slice` ก่อนแก้ `await response.blob()` คืนสตับ metadata `{size, type}` การแก้สามส่วนลงสู่ runtime + HIR + codegen

บวกการตามเก็บเล็ก ๆ:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup ตัด monomorphization แบบ generic บน Linux มากเกินไป + silent-fallback ของ link GTK4 แก้: เปลี่ยนจากการกรองด้วย name pattern เป็นการเปรียบเทียบ **เซตของซิมโบล** ผ่าน `llvm-nm` สมาชิกที่มีซิมโบลเฉพาะแม้แค่ตัวเดียวจะถูกเก็บไว้ ตัด `libperry_ui_macos.a` จาก 196 → 35 object โดยไม่มี link error
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — เพิ่ม `secur32.lib` ในบรรทัด link ของ Windows
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` ทำ FP round-trip ผ่าน Ryū
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — ต่อ codegen dispatch สำหรับ wrapper format ของ `perry/i18n`
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — codegen dispatch ของ `perry/plugin`
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — Canvas widget ผ่าน LLVM codegen
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView ผ่าน codegen
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — Table widget ผ่าน codegen
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (บางส่วน) — 11 arm dispatch ของ stdlib helper
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — รับ notification เบื้องหลังบน iOS + Android (warm-path)
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — fallback แบบอ่อนสำหรับ FFI hook ของ game-loop บน watchOS
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — hook dispose ของ `using` / `await using`
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — ยก alloca ของ args ของ `js_native_call_method` ขึ้นบล็อก entry
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — arm Uint8Array ของ `substitute_locals`
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — ต่อ `fs.appendFileSync` end-to-end (PR ชุมชน)

## 6\. Windows + Scoop

เรื่อง toolchain ของ Windows ทำตัวง่ายขึ้นเรื่อย ๆ **v0.5.353** ปักหมุด `clang -target` บน build ของ host — clang ที่ไม่ใช่ MSVC ใน PATH (MinGW / MSYS2 / Anaconda / bundle GNU ของ Rust) แอบเขียน IR ของ Perry จาก `x86_64-pc-windows-msvc` เป็น `windows-gnu` และ lld-link ไม่สามารถ resolve อ้างอิง `__main` ที่ emitter mingw32 ของ LLVM ใส่เข้าไป `probe_clang_default_triple` ตัวใหม่รัน `clang --version` ครั้งเดียวต่อโปรเซส และพิมพ์โน้ตข้อมูลบรรทัดเดียวเมื่อ default ของ host เป็น GNU แต่เรา target MSVC ปิดได้ด้วย `PERRY_NO_CLANG_PROBE=1`

**v0.5.345** ปรับ ABI ของ `perry-ui` บน Win64 ให้ตรงกับ `perry-dispatch` — ลายเซ็น extern ของ runtime สามตัวเขยิบไปแล้ว (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`) บน ABI ของ Win64 อาร์กิวเมนต์เชิงตำแหน่งของ integer และ float ใช้ index slot ร่วมกัน ดังนั้น mismatch จึงอ่านขยะจาก register ที่ยังไม่ initialize SysV (macOS / Linux) ใช้ pool register int/float แยกกัน และบังเอิญตกอยู่ที่ bit ที่ใช้งานได้ — crash เฉพาะ Windows เท่านั้น และแก้ทั่วทั้ง 8 crate ของแพลตฟอร์ม perry-ui-\*

จากนั้น: **`scoop install perry-ts/perry`** manifest ปักหมุดที่ v0.5.345 (ใช้ `depends: main/llvm` เพื่อดึง LLVM ทางการแบบ default-MSVC อัตโนมัติ) workflow release ตอนนี้ปล่อย sidecar `<artifact>.sha256` ข้างทุก archive ในรูปแบบที่เข้ากันได้กับ `sha256sum` สำหรับ bumper ของ package manager ปลายทางอะไรก็ได้

```
# host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. ปิดท้าย

แพตเทิร์นของช่วงนี้คือ การมีส่วนร่วมของชุมชนบวกกับสุขอนามัยภายใน **TheHypnoo** ส่ง PR สำคัญ 3 ตัว ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) ต่อ `fs.appendFileSync`, [#232](https://github.com/PerryTS/perry/pull/232) byte ของ body ใน `response.arrayBuffer`) tracker ลดลงราว 30 issue compiler เล็กลง 60% บนไฟล์ที่ใหญ่ที่สุด และมี exhaustive walker ที่เปลี่ยน «ลืมอัปเดต ad-hoc walker ตัวหนึ่งใน 4 ตัว» จาก miscompile runtime ให้กลายเป็น `cargo build` error UI styling ถึงระดับเทียบเท่ากันบนทุกแพลตฟอร์ม desktop ยกเว้นเงาบน Windows Geisterhand ขยายไปสู่หน้า devtools บนเบราว์เซอร์ เส้นทางติดตั้งบน Windows สั้นลงไป 1 คำสั่ง

ลอง:

```
# npm (ทุกแพลตฟอร์ม)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update สำหรับแอป desktop
npm install @perry/updater

# inspector แบบ live
perry compile main.ts -o app --enable-geisterhand
./app &  # แล้วเปิด http://localhost:7676
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
