---
title: "การกระจายผ่าน npm, perry dev, และชนะทุกเบนช์มาร์ก"
excerpt: "Perry v0.5.80 → v0.5.174 ภายในหกวัน @perryts/perry ส่งขึ้น npm สำหรับทั้งเจ็ดแพลตฟอร์มที่รองรับ perry dev เพิ่ม watch-mode auto-recompile บนโครง in-memory AST cache และ on-disk per-module object cache json_roundtrip ปิดช่องว่างสุดท้าย — Perry ตอนนี้ชนะทุกเบนช์มาร์กเทียบกับทั้ง Node.js และ Bun"
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
โพสต์ที่แล้วปิดท้ายด้วย Perry ที่ v0.5.80 และความพ่ายแพ้ดื้อ ๆ หนึ่งรายการบนตารางเบนช์มาร์ก: `JSON.parse`/`stringify` roundtrip ยังช้ากว่า Node 1.6 เท่า หกวันต่อมา Perry อยู่ที่ **v0.5.174** นั่นคือ **94 patch release** และมีสามสิ่งที่เปลี่ยนไปซึ่งคุ้มค่าที่จะกล่าวถึงก่อนสิ่งอื่นใด:

-   `@perryts/perry` ส่งขึ้น **npm** แล้ว คำสั่งเดียวติดตั้ง Perry บนทุกแพลตฟอร์มที่รองรับ
-   **`perry dev`** เพิ่ม watch-mode auto-recompile บนโครง in-memory AST cache ใหม่และ on-disk per-module object cache
-   ความพ่ายแพ้ใน `json_roundtrip` ปิดลงแล้ว Perry ตอนนี้ **ชนะ Node และ Bun ในทุกเบนช์มาร์ก**ในชุดหลัก (15/15 เทียบกับทั้งคู่)

ส่วนที่เหลือของโพสต์เป็นตัวประกอบ: การแก้ไข WebAssembly, watchOS ที่ในที่สุดก็คอมไพล์ครบ end-to-end, primitive ของ `perry/thread` ที่เชื่อมต่อจนจบ และชุดของชัยชนะด้าน compile-time strictness ที่เปลี่ยนการตกหล่นเงียบ ๆ ให้เป็น error จริง ๆ

## 1\. `@perryts/perry` บน npm

Perry ติดตั้งผ่าน Homebrew บน macOS และ APT บน Debian/Ubuntu มาตลอด ครอบคลุมดีสำหรับนักพัฒนาบนแพลตฟอร์มเหล่านั้น ไม่มีอะไรเลยสำหรับผู้ใช้ Windows เว้นแต่จะ build จาก source และไม่มีอะไรที่เป็นมาตรฐานเดียวกันข้ามทีมที่ผสม Mac, Linux และ Windows v0.5.107 ทำให้ปัญหานั้นหายไป

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

package เป็น launcher บาง ๆ ที่ขึ้นกับ optional package เจ็ดตัวต่อแพลตฟอร์ม — macOS arm64/x64, Linux x64/arm64 ทั้ง glibc และ musl, Windows x64 — และ npm ติดตั้งเฉพาะตัวที่ตรงกับเครื่องของคุณ ขนาด binary ต่อแพลตฟอร์มอยู่ในหลักเมกะไบต์ตัวเลขหลักเดียว การติดตั้งเองใช้เวลาเป็นวินาที มีเส้นทางการติดตั้งแบบ global ด้วย (`npm install -g @perryts/perry`) ถ้าคุณชอบแบบนั้น แต่การติดตั้งแบบ project-local จะตรึงเวอร์ชันของ compiler ไว้ข้าง dependency ของคุณ ซึ่งเป็นค่าเริ่มต้นที่ถูกต้อง

การ publish ผ่าน OIDC Trusted Publisher เพื่อให้ทุก release มี provenance และผูกกลับไปที่ CI job ที่ build มัน นั่นคือหนึ่งวันของงาน CI ในตัวมันเอง — commit CI `v0.5.107` หลายอันไล่หาคอมบิเนชันของ `--provenance` / npm version / workflow path ที่ถูกต้อง — แต่มันลงจอด และทุก release ตั้งแต่นั้นก็สะอาด ผู้ใช้ Windows เป็นพลเมืองชั้นหนึ่งแล้ว และแรงเสียดทานข้ามทีมของ “ติดตั้งตามที่ OS ของคุณชอบ” หายไป

## 2. `perry dev` — โหมดสมาร์ทวอทช์

v0.5.143 เพิ่ม CLI subcommand ใหม่:

```
perry dev
```

แค่นั้น มันเฝ้าดูโปรเจกต์ของคุณ คอมไพล์ใหม่เมื่อ save และ relaunch binary ของคุณ แรงบันดาลใจคือ Vite และ `nodemon`; ประเด็นคือหยุดแสร้งว่า workflow แบบ compiler-to-binary ต้องรู้สึกช้ากว่า runtime สำหรับโปรเจกต์ส่วนใหญ่ `perry dev` rebuild ภายในไม่ถึงวินาทีบน cache ที่อุ่นแล้ว

ส่วน “cache ที่อุ่นแล้ว” สำคัญ มี cache ใหม่สองตัวลงจอดควบคู่ไปกับ `perry dev`:

-   **In-memory AST cache** (v0.5.156) ข้าม rebuild ภายในเซสชัน `perry dev` เดียว Perry เก็บ AST ที่ parse แล้วไว้สำหรับทุก module ที่ไม่ได้เปลี่ยนบน disk การแก้ไฟล์หนึ่งไฟล์ทำการ re-parse หนึ่งไฟล์ ไม่ใช่ module graph ทั้งหมด
-   **On-disk per-module object cache (V2.2)** แต่ละ module คอมไพล์เป็นไฟล์ `.o` ของตัวเองและถูก hash; module ที่ไม่เปลี่ยนจะข้าม codegen ไปโดยสิ้นเชิงและ linker จะหยิบ object ที่ cache ไว้ verbose output ของ cache ตรงกับ spec ใน [#131](https://github.com/PerryTS/perry/issues/131) และรอบของการ audit hardening ใน v0.5.160 ปิด edge case ที่ cache entry เก่า ๆ อาจรอดจากการเปลี่ยนแปลง header ได้

cache ทั้งสองซ้อนทับกัน การแก้ไขครั้งแรกของเซสชันคือการคอมไพล์เต็ม; ทุกอย่างหลังจากนั้นทำงานเฉพาะสัดส่วนของสิ่งที่คุณเปลี่ยนจริง ๆ นี่คือการเปลี่ยนแปลง DX ที่ใหญ่ที่สุดของสัปดาห์

## 3\. เอาชนะ Bun บนทุกเบนช์มาร์ก

ที่ v0.5.166 README มีข้อแม้ตามตรงหนึ่งอัน: Perry ช้ากว่า Node 1.6 เท่าใน `json_roundtrip` (50x `JSON.parse` + `JSON.stringify` บน blob ขนาด 1MB 10K รายการ) และช้ากว่า Bun 2.4 เท่า Issue [#149](https://github.com/PerryTS/perry/issues/149) ติดตามการ follow-up พอถึง v0.5.173 — เจ็ดวันต่อมา — ช่องว่างนั้นก็ปิด

| ปริมาณงาน| Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry ตอนนี้ชนะทุก workload ในชุดเบนช์มาร์กหลัก — **15/15 เทียบกับ Node, 15/15 เทียบกับ Bun** best of 5 run บน macOS ARM64 Bun 1.3 ยังนำหน้าใน peak RSS (84MB เทียบกับ 310MB ของ Perry ใน `json_roundtrip`) ดังนั้นแรงกดดันของ allocator เป็นสิ่งต่อไปที่จะปิด แต่ latency ดิบเป็นของ Perry

การปิดช่องว่าง JSON ไม่ใช่การเปลี่ยนแปลงเดียว — มันเป็นการสะสมของงาน object-layout parity ที่รันผ่านสัปดาห์นี้: Phase 1 object-literal shape inference (v0.5.167), Phase 4 body-based return-type inference สำหรับ free function, class method, getter และ arrow (v0.5.169) และ Phase 4.1 method-call return-type inference (v0.5.170) ธีมเหมือนกับโพสต์ที่แล้ว: ให้ LLVM มีโครงสร้างแบบ static ที่มากพอที่จะมองทะลุได้ แล้ว optimizer จะจัดการส่วนที่เหลือเอง

v0.5.164 ยังฟื้นฟู `<2 x double>` parallel-accumulator autovectorization บน pure-fadd reduction loop ซึ่งถอยหลังเงียบ ๆ ไปในบางจุดของช่วง v0.5.9x→v0.5.16x นั่นคือสิ่งที่ทำให้ `math_intensive` และ `accumulate` กลับมานำ Rust/C++/Go/Swift 3-4 เท่าเหมือนเดิม — LLVM เดียวกัน flag `reassoc contract` หนึ่งอัน body ของ loop ที่ vectorize แล้วหนึ่งอัน

## 4\. `perry/ui` และ doc-test

ช่องว่างที่เหลือสี่อันใน perry/ui ปิดใน v0.5.151 ควบคู่กับนั้น v0.5.119 พลิกการใช้ API ของ perry/ui ผิดแบบเงียบ ๆ จาก “คอมไพล์ผ่านและไม่ทำอะไรเลย” เป็น compile error แบบแข็ง — ตรรกะเดียวกับ v0.5.165 ที่ใช้กับ decorator (ดูด้านล่าง) การใช้ผิดที่ surface ตอน compile time ดีกว่าตอน runtime เสมอ

v0.5.123 ส่ง **doc-examples test harness** และ widget gallery ทุกตัวอย่าง TypeScript ในเอกสารตอนนี้ถูกคอมไพล์ทุก CI run และ widget gallery เปรียบเทียบ screenshot กับ baseline ที่ได้รับการรับรอง v0.5.125 ขยายสิ่งนั้นเป็น cross-compile matrix: ทุกตัวอย่างใน doc ถูก build สำหรับ iOS, tvOS, Android, WASM และ Web รวมถึงแพลตฟอร์ม host ดังนั้น API drift ข้าม target จะถูกจับบน PR ที่นำมันเข้ามา ไม่ใช่รอบ release ที่ส่งมัน

ชัยชนะคุณภาพชีวิตเล็ก ๆ: `perry check` ตอนนี้ส่งออก `file:line:column` สำหรับ HIR lowering error ([#129](https://github.com/PerryTS/perry/issues/129)) ซึ่งหมายความว่าการ jump-to-error ของ editor ทำงาน แทนที่จะแสดงข้อความทั่วไปโดยไม่มีตำแหน่ง

## 5\. watchOS คอมไพล์ครบ end-to-end

watchOS ส่งเป็นเป้าหมายการคอมไพล์เมื่อเดือนที่แล้ว แต่ build end-to-end ที่สะอาดยังมีขอบที่หยาบ งาน watchOS ของสัปดาห์นี้:

-   **v0.5.113**: `--target watchos` และ `--target watchos-simulator` ตอนนี้คอมไพล์ครบ end-to-end โดยไม่ต้องมี workaround ที่สะสมไว้
-   **v0.5.114**: `--features watchos-game-loop` สำหรับ app ที่ใช้ Metal surface
-   **v0.5.122**: `--features watchos-swift-app` สำหรับการ render ที่โฮสต์ด้วย SwiftUI — เมื่อคุณต้องการให้ SwiftUI เป็นเจ้าของ lifecycle ของ app และ Perry ประกอบ UI ภายในมัน
-   **v0.5.135**: `PERRY_UI_TEST_MODE` ถูกเชื่อมเข้ากับ perry-ui-ios และ perry-ui-tvos ดังนั้นการทดสอบ UI ของ Geisterhand รันในแบบเดียวกันบนทั้งสองเป้าหมายเหมือนที่มันทำบน macOS และ Linux

## 6\. `perry/thread` primitive เชื่อมต่อครบ

v0.5.174 (วันนี้) ปิด [#146](https://github.com/PerryTS/perry/issues/146): `parallelMap`, `parallelFilter` และ `spawn` ถูกเชื่อมต่อครบผ่านเส้นทาง codegen พร้อมการบังคับใช้ความปลอดภัยตอน compile time การจับตัวแปรแบบ mutable ถูกปฏิเสธตอน compile time — ท่าทาง compile-time-correctness แบบเดียวกับที่ perry/ui และ decorator มีตอนนี้ Thread primitive ที่เชื่อมต่อบางส่วนตั้งแต่การประกาศ v0.4.0 ตอนนี้เสร็จสมบูรณ์ครบ end-to-end

## 7\. WebAssembly และเป้าหมาย web

การแก้ไข WASM สองอันที่ควรกล่าวถึง:

-   **v0.5.158**: บั๊กที่ทับซ้อนกันห้าอันใน `--target web` (เส้นทาง output ของ WASM) ที่ปิดบังกันและกัน แก้เป็นชุดเดียวเพื่อให้เป้าหมาย web ตอนนี้ทนทานภายใต้ surface เต็มของ `perry/ui` ([#133](https://github.com/PerryTS/perry/issues/133))
-   **v0.5.161**: `break`/`continue` ภายใน `if` ภายใน loop กำลังค้างบน WASM — บั๊ก codegen ที่ไม่ reproduce บนเป้าหมายเนทีฟ แก้แล้ว ([#135](https://github.com/PerryTS/perry/issues/135))

ทางฝั่งความถูกต้องด้วย: v0.5.157 แก้ `obj.field` ที่คืน `NaN` บน Android ([#128](https://github.com/PerryTS/perry/issues/128)) และ v0.5.162 แก้บั๊ก ws ที่ต้องสาปซึ่ง `sendToClient` และ `closeClient` กำลังคอมไพล์เป็น no-op เงียบ ๆ ([#136](https://github.com/PerryTS/perry/issues/136))

## 8\. ชัยชนะของ compile-time strictness

ธีมของสัปดาห์นี้: อะไรก็ตามที่เคยเป็น failure เงียบ ๆ ตอนนี้เป็น compile error

-   **v0.5.165**: decorator ของ TypeScript ถูก parse เข้า HIR แล้วตกหล่นไปเงียบ ๆ ตอนนี้พวกมัน error ที่จุด decoration พร้อมข้อความที่ชัดเจน ([#144](https://github.com/PerryTS/perry/issues/144)) เหตุผล warn→bail แบบเดียวกับ v0.5.119 ที่ใช้กับ perry/ui
-   **v0.5.119**: การใช้ API ของ perry/ui ผิดถูกปฏิเสธตอน compile time แทนที่จะผลิต binary แบบ no-op
-   **v0.5.172**: `console.trace()` ตอนนี้ส่ง backtrace เนทีฟจริง ๆ ไปยัง stderr แทนที่จะ echo ข้อความเท่านั้น ([#20](https://github.com/PerryTS/perry/issues/20)) frame ที่ symbolicate ต้องการ `PERRY_DEBUG_SYMBOLS=1`; ถ้าไม่มีคุณจะได้ address ซึ่งยังมากกว่าพฤติกรรม message-echo ที่มันแทนที่

## 9\. ปิดท้าย

รูปแบบของสัปดาห์: **การกระจาย** (npm), **ประสบการณ์ของนักพัฒนา** (`perry dev`, cache แบบเพิ่มทีละส่วน) และ **ความพ่ายแพ้เบนช์มาร์กสุดท้ายที่เหลืออยู่ถูกปิด** บวกกับชุดของ compile-time strictness ที่เปลี่ยนการตกหล่นเงียบ ๆ ให้เป็น error จริง ๆ หกวัน 94 patch release การเปลี่ยนแปลง DX ใหญ่หนึ่งครั้ง

ลองดู:

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev
```

ซอร์ส: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
