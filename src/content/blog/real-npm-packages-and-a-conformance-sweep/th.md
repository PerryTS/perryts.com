---
title: "npm package จริงคอมไพล์ได้แล้ว: axios, zod, express — กับการกวาด conformance"
excerpt: "ราว 270 release จาก v0.5.875 ถึง v0.5.1146 ไม่ได้เกี่ยวกับ benchmark ตัวเดียว — แต่เกี่ยวกับการทำให้ npm package จริงคอมไพล์และรันได้ axios, zod v4, express, fastify และ hono ทำงานได้แล้ว ความเทียบเท่า test262 กระโดดขึ้น (String 60→79%, Array 61→72%) Windows กลายเป็น Fluent ด้วย Mica และ DatePicker + drag & drop ลงจอดบนทุกแพลตฟอร์ม"
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
โพสต์ที่แล้วจบลงที่ **v0.5.875** ด้วยเรื่อง GC — การปิด gap ที่ benchmark ของ aya\_koto เปิดเผยออกมา โพสต์นั้นว่าด้วยการชนะ benchmark ตัวเดียว โพสต์นี้ว่าด้วยงานคนละแบบ: ราว **270 release ระหว่าง v0.5.875 ถึง v0.5.1146** ที่ลงจอดภายในราวสี่สัปดาห์ แทบไม่มีตัวไหนเป็นพาดหัวด้าน benchmark เลย ธีมขยับจาก “วิ่งให้เร็วบน microbenchmark” ไปสู่ **“ทำให้ TypeScript ในโลกจริงและ npm package จริงคอมไพล์และรันได้จริง”** บวกกับการยกเครื่องด้านภาพของ Windows เต็มรูปแบบและ widget ใหม่อีกกองหนึ่งระหว่างทาง

นี่คือสิ่งที่ปล่อยออกมา จัดกลุ่มตามว่ามันมีไว้เพื่ออะไรจริง ๆ

## แพ็คเกจ npm จริงคอมไพล์ทันที

เส้นเรื่องเดี่ยวที่ใหญ่ที่สุดตลอดช่วงนี้คือการกวาดเพื่อทำให้ npm package ยอดนิยมคอมไพล์เป็น native binary และผ่านการทดสอบเชิงพฤติกรรม — ไม่ใช่แค่ “link โดยไม่มี error” แต่รันและให้ผลลัพธ์ที่ถูกต้อง รายการที่ตอนนี้ทำงานได้ผ่าน `perry.compilePackages` รวมถึง **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, และ Colyseus**

แต่ละตัวล้มด้วยเหตุผลของตัวเอง และการแก้แต่ละครั้งก็เป็นเรื่องราวเล็ก ๆ ของมันเอง:

-   **zod v4** crash ด้วย `Cannot read properties of undefined (reading 'onattach')` ต้นเหตุ (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `new F()` ที่ `F` เป็นฟังก์ชันที่ import มาจากอีกโมดูลให้ object ว่างเปล่าแบบเงียบ ๆ — body ของ constructor ไม่เคยรัน ดังนั้น check สไตล์ `$ZodCheckMinLength` ทุกตัวกลับมาโดยถูกถอด property `_zod` ออก
-   **axios + jose** ต้องการ crypto และ compression ที่ Perry ยังไม่มี: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` สำหรับ AES-GCM และ `randomFillSync` (v0.5.972–976)
-   **fastify** เกิด deadlock บน polling timeout หนึ่งวินาทีใน `wait_for_promise` เราแทนมันด้วยการรอแบบ condvar และทำให้ promise ที่ถูก reject ผุดขึ้นมาเป็น `HTTP 500` แทนที่จะค้าง (v0.5.912)
-   **@hono/node-server** อ่าน POST body ไม่ได้ — `c.req.text()` / `.json()` / `.formData()` คืนค่าว่างบน POST/PUT จนกระทั่งการแก้ parent-registration ใน v0.5.1142
-   **chalk, ms, debug, express** ชนรูปร่างเดียวกันทั้งหมด: *ค่าที่เรียกได้พร้อม property ติดมาด้วย* (`chalk.red`, `express()` บวก `express.Router`) รูปแบบนั้นสามแบบถูกแก้ตลอด v0.5.935 และการกวาด npm รอบ ๆ บวก `util.inherits` + โครง stream prototype เพื่อปลดล็อก express (v0.5.990)
-   **dayjs** ที่ปล่อยมาเป็น bundle แบบ minified ออกแรงกับ prototype-method dispatch สไตล์ JS-classic (`Class.prototype.m = fn`) ที่ Perry lower ผิด (v0.5.924/932)

ใต้ทั้งหมดนั้นคือส่วนที่ทำให้ package ที่ Perry *คอมไพล์ native ไม่ได้* ยังรันได้: **V8-fallback runtime** เป็นจริงเป็นจังขึ้นในช่วงนี้ ModuleLoader ของมันตอนนี้อ่านจาก embedded module map ดังนั้น binary แบบ fallback ก็ยัง **self-contained** — ไม่มี `node_modules` กระจัดกระจายตอน runtime (v0.5.994) `createServer` เชื่อมไปยัง hyper server จริง (v0.5.999) และ global ของ Web Fetch อย่าง `Response` / `Request` / `Headers` มีอยู่ใน path แบบ fallback (v0.5.1006) และ **`import()` แบบ dynamic ที่ compile-time** — `await import('./foo.ts')` แบบ string-literal ที่ resolve ตอน build — ในที่สุดก็ลงจอด (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100))

## A test262 การกวาดล้างความสอดคล้อง

อีกเส้นเรื่องที่โดดเด่นคือ conformance เรารัน pass แบบโฟกัสเทียบกับ radar ของ subset test262 และขยับเข็มบน built-in ที่ code จริงพิงหนักที่สุด:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

การกระโดดของ String มาจากการให้ทุกเมธอด `String.prototype` มี dispatch แบบ generic-`this` และแก้ index coercion ของ `slice`/`substring` การกระโดดของ Array คือ `thisArg` บน callback ของ dense-array (`forEach`/`map`/`filter`/…), `ToLength` แบบ array-like, การจัดลำดับ spec operation และการ validate กรณีไม่มี argument Destructuring เก็บ parameter-destructuring ข้ามทั้ง plain, generator, async-generator, static และ private class method

ควบคู่กับตัวเลขพาดหัว ความถูกต้องหางยาวก็ลงจอด: `JSON.parse` ตอนนี้โยน `SyntaxError` จริง (ไม่ใช่ `TypeError`) และปฏิเสธ token ที่ตามท้าย reviver ของมันเดินผ่านอัลกอริทึม `InternalizeJSONProperty` ตาม spec `Object.prototype.toString` brand ได้ถูกต้องสำหรับ typed array, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp `RegExp.prototype.toString` คืน `/source/flags` async generator ได้ semantics ของ `yield`\-awaits-operand ถูกต้อง เหล่านี้เป็น subset radar ไม่ใช่ suite เต็ม — Perry ยังไต่อยู่ — แต่การไต่ของเดือนนี้ชันมาก

## Windows ทำงานได้อย่างคล่องแคล่ว

Windows ได้รับการยกเครื่องด้านภาพ (ชุด [#4681](https://github.com/PerryTS/perry/issues/4681)) หน้าต่าง Perry ตอนนี้เลือกใช้ DWM chrome สมัยใหม่โดย default — **Mica backdrop**, มุมโค้งมน และ title bar ที่รับรู้ธีม — และ common control เรนเดอร์ผ่าน **comctl32 v6** แทน default ยุค Windows 95 window proc ตอนนี้จัดการ `WM_DPICHANGED` ดังนั้นหน้าต่างยังคมเมื่อคุณลากมันระหว่างจอที่มี scaling ผสมกัน แทนที่จะถูกยืด bitmap

ที่สำคัญ ไม่มีอะไรในนี้นำ regression [#1542](https://github.com/PerryTS/perry/issues/1542) เก่า “พื้นที่ดำหลัง resize” กลับมาอีก: client area ยังถูกวาดทึบแสง และ blur-through แบบ Mica/Acrylic เต็มเฟรมยังเป็น opt-in `app.setVibrancy(...)` แบบชัดเจน ยังมี backend scaffold `--target windows-winui` ตัวใหม่ (WinUI 3) สำหรับแอปที่อยากได้ stack สมัยใหม่เต็มตัว และการแก้เล็ก ๆ แต่เป็นเรื่องจริงที่ทำให้ `perry compile main.ts -o main` ผลิต `main.exe` บน Windows เพื่อให้ PowerShell launch มันได้จริง (v0.5.1146)

## วิดเจ็ตใหม่ ทุกแพลตฟอร์ม

widget สองตัวลงจอดในวันสุดท้ายพอดี และทั้งคู่ครอบทุกแพลตฟอร์ม UI ที่ Perry target:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — date control แบบ field กะทัดรัด: `NSDatePicker` บน macOS, `UIDatePicker` (.compact) บน iOS/visionOS, `SysDateTimePick32` บน Windows, `android.widget.DatePicker` บน Android, GTK4 บน Linux ผิว TS เดียวข้ามทั้งหมด
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — widget ใด ๆ เป็น drop destination และ drag source สำหรับ text/files/URLs ได้ แมปไปยัง `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit), และ `View.setOnDragListener` (Android)

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

ก่อนหน้านี้ในช่วงเดียวกัน ชั้นวาง widget ก็เต็มขึ้นทั้งบน desktop และ mobile ด้วย — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, และ ImageGallery แบบ swipe ได้ — แต่ละตัวหนุนด้วย native control จริงบนทุกแพลตฟอร์ม HarmonyOS (ArkTS) ได้ Chart และ TreeView (v0.5.893) สอง widget สุดท้ายที่มันต้องการเพื่อให้เทียบเท่ากับตัวอื่น

## GC ภายใน และความเสถียร

release 270 ตัวนั้นส่วนใหญ่ไม่ใช่พาดหัว — มันคือ bug fix และ internals และนั่นคือประเด็นของเฟสนี้ มีบางอย่างที่ควรกล่าวถึง:

-   **GC เดินหน้าต่อ** งาน conditional free-list จากโพสต์ GC ยังคงค่อย ๆ ลงตัว และ bug คลาสคม ๆ หนึ่งก็ถูกปิด: Promise ที่เชื่อม native ตอนนี้ **ถูกปักหมุดไว้ขณะ in flight บน tokio worker** เพื่อให้ GC ไม่สามารถ sweep มันก่อนที่การ resolve จะลงจอด (v0.5.923) ถ้าคุณรัน async fetch ภายใต้โหลดแล้วเห็นการ collect แบบผีหลอก นั่นคือเรื่องนี้
-   **memory model มีเอกสารแล้ว** ตอนนี้มี deep-dive `internals/memory-model.md` — NaN-boxing, generational GC, shadow stack และ write barrier — ต่อเข้ากับ docs site (v0.5.933)
-   **คลื่นการแก้ความเสถียรของ codegen** ที่การกวาด npm ทำให้ผุดขึ้นมา: arrow ที่เป็น `const` ระดับโมดูลที่เรียกข้างใน async step ที่ resume แล้วไม่ SIGSEGV อีก (v0.5.953), `try { await rejected } catch { return X }` ไม่ค้างชั่วนิรันดร์อีก (v0.5.870), และ crash แบบ `js_is_truthy` / raw-pointer-range อีกหยิบมือที่ bundle จริงสะดุด

## การดูแลทำความสะอาดของ Apple

เล็กกว่าแต่เป็นเรื่องจริง: `perry setup ios --development` ตอนนี้ provision สำหรับ development build (v0.5.1023) และ path build/link ของ Apple cross-library ถูก dedup และทำให้ portable ด้านความกว้างของ pointer (v0.5.1121/1125) — ซึ่งเป็นสิ่งที่ปลดล็อก matrix การ publish npm / Homebrew / APT / winget ที่เคยติดขัดอยู่

## สิ่งนี้จะทิ้งอะไรไว้ที่ไหน

เดิมพันเบื้องหลัง Perry มาตลอดคือ “native TypeScript” จะมีความหมายก็ต่อเมื่อ TypeScript *จริง* รันได้ — ไม่ใช่ subset ของเล่น แต่คือ package จริงที่คน `npm install` เดือนนี้ส่วนใหญ่คืองานนั้น: ไม่ใช่ตัวเลขเดียวไว้คุยโม้ แต่เป็นการดันอันยืดยาวไร้ความหรูหราเพื่อปิด gap ระหว่าง “คอมไพล์ได้” กับ “ทำงานได้” radar ของ conformance และ test ความเทียบเท่าของ npm คือ scoreboard ที่เราจับตาอยู่ตอนนี้ และเราจะโพสต์ตัวเลขต่อไป — ทั้งส่วนที่ดีและส่วนที่ยังไม่สมบูรณ์

แหล่งที่มา: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — ปัญหา: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
