---
title: "ปรับแต่งทุกอย่าง: หนึ่งสัปดาห์, 68 รุ่น, และ JSON เร็วขึ้น 547 เท่า"
excerpt: "Perry v0.5.13 → v0.5.80 ภายในเจ็ดวัน JSON.parse ปิดช่องว่าง 547 เท่ากับ Node mimalloc มาเป็น allocator หลัก มี inline cache, shape transition, typed Buffer slot, i32-native bitwise ops, scalar replacement และ native event loop ที่ทำให้เซิร์ฟเวอร์ Fastify และ WebSocket ทำงานต่อเนื่อง"
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
บล็อกโพสต์ที่แล้วออกพร้อมกับ Perry เวอร์ชัน v0.5.12 วันนี้เราอยู่ที่ v0.5.80 นั่นคือ **68 patch release ในเจ็ดวัน** โดยเกือบทั้งหมดโฟกัสที่สิ่งเดียว: เปลี่ยน slow path ที่เหลือทุกอันให้เป็น fast path

การ cutover ไปใช้ LLVM ใน v0.5.0 ฟื้นคืนมาเทียบเท่ากับ Cranelift ได้ภายใน v0.5.12 นั่นคือจุดจบของเรื่องหนึ่ง และจุดเริ่มต้นของอีกเรื่อง ตอนนี้ LLVM มองเห็นทุกอย่าง คำถามเปลี่ยนจาก “ทำไมสิ่งนี้ถึงช้า?” ไปเป็น “ทำไมสิ่งนี้ถึงยังไม่เร็ว?” — ซึ่งเป็นคำถามที่จัดการได้ง่ายกว่ามาก

โพสต์นี้เป็นทัวร์ของสัปดาห์ที่ผ่านมา JSON ได้ speedup 547 เท่า mimalloc กลายเป็น global allocator Property access ได้ monomorphic inline cache Buffer ได้ typed pointer slot พร้อม metadata `noalias` เซิร์ฟเวอร์ Fastify และ WebSocket เลิกแครชหลังจากผ่านไปหนึ่งนาที และ benchmark ขยับอีกครั้ง

## 1\. JSON: ปิดช่องว่าง 547 เท่า

ที่ v0.5.29 JSON.parse ของ Perry บน array ที่มี 20 เรกคอร์ด**ช้ากว่า Node 547 เท่า** พอถึง v0.5.46 เหลือแค่ 1.3 เท่า ตัวเลขนี้คือ delta ที่ใหญ่ที่สุดในสัปดาห์นี้ และควรค่าแก่การเดินผ่านทีละขั้น เพราะทุก optimization อื่นในโพสต์นี้เป็นเพียงวาเรียนต์ของธีมเดียวกัน: อย่าทำงานที่คุณไม่จำเป็นต้องทำ

parser เดิมจัดสรร Vec หนึ่งตัวต่อหนึ่ง property, Vec หนึ่งตัวของคีย์ต่อหนึ่ง object และ thread-local หนึ่งตัวที่ป้องกันด้วย RefCell สำหรับ key cache มันคัดลอกทุกสตริง มัน re-hash ชื่อ field ทุกอัน มันสร้าง object shape ใหม่เอี่ยมสำหรับทุกเรกคอร์ด แม้ว่าทั้ง 20 เรกคอร์ดจะมี field ที่เหมือนกันทุกประการในลำดับเดียวกันทุกประการ parser ของ Node จัดการเรื่องนี้โดยสังเกตรูปแบบและแชร์ shape เดียวข้ามทุกเรกคอร์ด ของ Perry ไม่ได้ทำ

การแก้ไขเข้ามาในสี่ขั้น:

1.  **Key interning ผ่าน thread-local `PARSE_KEY_CACHE`** (v0.5.45) เรกคอร์ดแรกจัดสรรสตริงคีย์ N ตัว เรกคอร์ดที่ 2 ถึง 20 จัดสรรศูนย์ คีย์ที่ซ้ำจะ resolve ไปที่ pointer เดียวกัน ซึ่งทำให้ใช้เป็นคีย์ lookup ของ shape cache ได้โดยไม่ต้อง strcmp
2.  **การแชร์ shape ผ่าน transition cache** (v0.5.45) Object ที่สร้างโดย `js_object_set_field_by_name` จะเดินผ่าน transition graph เดียวกัน เมื่อ schema ซ้ำ pointer ของ `keys_array` จะถูกแชร์ และนั่นคือสิ่งที่ polymorphic inline cache ต้องการเพื่อจะ hit
3.  **Zero-copy string parsing + incremental object build** (v0.5.46) `parse_string_bytes` ตอนนี้คืน `ParsedStr::Borrowed(&[u8])` เมื่อไม่มี backslash escape — ซึ่งเป็นเคสทั่วไปสำหรับทุกคีย์และค่าส่วนใหญ่ `parse_object` เขียน field โดยตรงแทนที่จะรวบรวมลงใน Vec ก่อน
4.  **GC suppression ระหว่าง parse** (v0.5.60, ปิด #59) การ parse array ขนาดใหญ่จัดสรร object เล็ก ๆ หลายพันตัวใน loop ที่แน่น แต่ละตัวไปแตะ threshold check ของ GC การตั้ง flag “parsing in progress” จะเลื่อนการ collect ไปจนกว่า parse จะคืน — ขนาด heap ที่มีผลเท่าเดิม แต่ branch ของการทำบัญชีน้อยลงมาก

จากนั้นเป็น stringify JSON.stringify บน array ที่เหมือนกัน — shape เดียวกัน เป็นล้านครั้ง — กำลังทำ property iteration เต็มรูปแบบต่อ object ซึ่งสำหรับ array ที่ shape คงที่แล้ว เป็นการเสียเปล่าล้วน ๆ การแก้ไขห้าขั้นปิดช่องว่างนั้นไปส่วนใหญ่เช่นกัน:

-   v0.5.62: fast path ของ itoa / ryu สำหรับตัวเลข, circular-reference check แบบใช้ depth แทน HashSet
-   v0.5.63: `toJSON` guard + persistent key cache + inline dispatch (สามต้นทุนต่อการเรียกที่รวมกันเยอะ)
-   v0.5.65: template stringify สำหรับ shape ที่เหมือนกัน + ASCII escape fast path เมื่อทุก element มี shape เดียวกัน โครงคีย์/โคลอน/จุลภาคจะถูกคำนวณล่วงหน้าครั้งเดียว
-   v0.5.70, v0.5.72, v0.5.75: per-call shape-template cache, ปิดช่องว่าง GC จากสิ่งที่เหลือจาก parse, กำจัด fixed per-call overhead ที่เหลือ
-   v0.5.79: เส้นทางค่าเล็ก ตัวเลข, boolean และสตริงสั้น ผ่านเส้นทางตรงที่ไม่ได้ตั้งค่าเครื่องจักร object ใด ๆ

ผลลัพธ์สะสม: pipeline JSON ที่เคย**ห่างจาก Node 547 เท่า**ในช่วงต้นสัปดาห์ ตอนนี้**ห่างประมาณ 1.3 เท่าในการ parse และสู้ได้ในการ stringify** บน workload ที่สมจริง

## 2\. เรื่องของ allocator

Perry จัดสรรหน่วยความจำเยอะ ทุก object literal, ทุก array literal, ทุกการ concat สตริง, ทุก closure Allocator ร้อน และสำหรับ v0.5 ส่วนใหญ่ มันคือ system allocator เริ่มต้นของ Rust บวกกับ thread-local arena สำหรับค่าอายุสั้น

v0.5.67 แทนที่ global allocator ด้วย **mimalloc** เป็นการเปลี่ยนแค่บรรทัดเดียวใน Cargo.toml ที่คืนทุนทันทีบน workload ใดก็ตามที่ทำการจัดสรรขนาดเล็กเยอะ ๆ — ซึ่งก็คือโปรแกรม TypeScript ทุกโปรแกรม v0.5.66 มาก่อนหน้านี้โดยรวม thread-local state ของ `gc_malloc` ทั้งหมดให้เหลือการเข้าถึง TLS ครั้งเดียวต่อการเรียก เพื่อให้เส้นทางเข้าสู่ mimalloc ถูกที่สุดเท่าที่จะเป็นไปได้

v0.5.68 ต่อยอดด้วย **สตริงที่จัดสรรใน arena** สตริงอายุสั้น (ผลลัพธ์ concat กลาง, ชิ้นของ `split()`, scratch ของ parser) ข้าม global allocator ไปเลยและไปตกลงใน bump arena ต่อ thread ที่ reset ที่ขอบเขตธรรมชาติ สำหรับการ parse JSON นี่เองทำให้ชนะเป็นตัวเลขสองหลักเปอร์เซ็นต์

และอีกสอง optimization ที่ไม่จัดสรรเลย:

-   **Scalar replacement ของ object ที่ไม่ escape** (v0.5.17 จากนั้น object literal ใน v0.5.76) ถ้า object ไม่เคยออกจากฟังก์ชันที่ครอบมัน มันก็ไม่จำเป็นต้องมีอยู่ field ของมันกลายเป็น local ธรรมดา LLVM จัดการเรื่องนี้ได้โดยอัตโนมัติเมื่อคุณเลิกซ่อน object ไว้หลังการเรียก allocator ทึบแสง
-   **Scalar replacement ของ array ที่ไม่ escape** (v0.5.73) แนวคิดเดียวกัน — ถ้า array ไม่ escape element ของมันกลายเป็นค่า SSA และการจัดสรรทั้งหมดหายไป

สำหรับเส้นทาง array literal โดยเฉพาะ v0.5.69 เพิ่ม **fast path สำหรับขนาดที่รู้แน่นอน** (ข้ามเครื่องจักร capacity-growth เมื่อรู้ขนาดตอนคอมไพล์) และ v0.5.74 inline IR ของ bump allocator สำหรับ array literal ขนาดเล็ก เพื่อให้ LLVM มองเห็นการจัดสรร รวมมัน ยกมัน หรือกำจัดมันได้ Benchmark ที่ array เยอะขยับไปอีกก้าว

ปิดท้ายด้วย v0.5.25 ที่แก้บั๊กเงียบ ๆ: `gc_malloc` ไม่ได้ trigger collection บนเส้นทางของตัวเอง ดังนั้น workload ที่ malloc เยอะสามารถทำให้ heap โตไม่จำกัดก่อนที่จะมีอะไรมาเช็ค v0.5.61 เพิ่ม adaptive step sizing ให้กับ threshold ซึ่งเป็นสิ่งที่คุณต้องการจริง ๆ: เช็คแบบถูกเมื่อ heap เล็ก น้อยลงเมื่อ heap ใหญ่

## 3\. Property access ได้ inline cache จริง ๆ

JavaScript engine สมัยใหม่ทุกตัวมี polymorphic inline cache (PIC) บน property access สำหรับซีรีส์ v0.5 ส่วนใหญ่ของ Perry PropertyGet ผ่านการค้นหา shape-table ด้วย hash แบบ thread-local นั่นโอเคสำหรับโค้ดเย็น แต่ไม่โอเคเมื่อ 95% ของการอ่าน property ใน call site หนึ่ง ๆ เห็น shape เดียวกัน ซึ่งเกือบเสมอ

v0.5.44 เข้ามาพร้อม **monomorphic inline cache** สำหรับ `PropertyGet` แต่ละ PropertyGet site ได้ cache entry ต่อ callsite: pointer ของ shape ที่คาดไว้และ offset ของ field Hit path คือ compare ครั้งเดียวบวกกับ load แบบ indexed Miss path จะ fall through ไปยัง slow helper ที่อัปเดต cache

```
; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont
```

v0.5.51 เพิ่ม **content-hash shape-transition cache** สำหรับการเขียน property แบบ dynamic object สองตัวที่โต field เดียวกันในลำดับเดียวกันจะ hash ไปที่ transition เดียวกัน ดังนั้นพวกมันจะจบลงโดยแชร์ shape เดียวกัน — และนั่นหมายความว่าฝั่งอ่านของ PIC จะ hit จริง ๆ

v0.5.55 ลอกการเข้าถึง TLS สุดท้ายออกจาก transition cache v0.5.46 แก้บั๊กใน miss-handler ของ PIC ที่ object ที่มี >8 field กำลังอ่านเลย inline slot ไปในหน่วยความจำที่ไม่ได้ initialize (ปิด #55) v0.5.78 เพิ่ม guard เพื่อหยุด PIC ของ PropertyGet ไม่ให้ index เข้าสู่ receiver ที่ไม่ใช่ pointer เช่นตัวเลขดิบ — ซึ่งอาจเกิดขึ้นเมื่อ type refinement มองโลกในแง่ดีเกินไป และเป็นหนึ่งในปัญหาเสถียรภาพสุดท้ายใน IC

ผลสุทธิ: โค้ดที่ property เยอะ — ซึ่งในทางปฏิบัติหมายถึง TypeScript ส่วนใหญ่ — เร็วกว่าเมื่อสัปดาห์ที่แล้วประมาณ 2–3 เท่า จาก IC เพียงอย่างเดียว

## 4\. Integer, bitwise และรูปแบบ `| 0`

NaN-boxing ทำให้ตัวเลขทุกตัวเป็น f64 โปรแกรมเมอร์ TypeScript เขียน `x | 0` เพื่อบังคับ semantics แบบจำนวนเต็ม V8 ใช้เวลาสิบห้าปีทำให้สิ่งนั้นถูก Perry ใช้สัปดาห์นี้ไล่ตาม

กองของการเปลี่ยนแปลงตามลำดับ:

-   **v0.5.48**: `sdiv` สำหรับ `(int / const) | 0` LLVM fold เป็น `smulh + asr` ซึ่งใช้ ~2 cycle เทียบกับ ~10 สำหรับ `fdiv`
-   **v0.5.48**: `@llvm.assume` บน bound ของ Uint8ArrayGet แทน branch+phi diamond ของ bounds check ด้วย basic block เดียวที่ vectorizer สามารถให้เหตุผลได้
-   **v0.5.49**: แก้ bitwise ops กับ NaN/Infinity ให้ผลิต 0 ตาม ToInt32 spec ความถูกต้องมาก่อน
-   **v0.5.50**: `toint32_fast` ที่ข้าม NaN/Inf guard 5 คำสั่งเมื่อค่าถูกรู้ว่า finite บวกกับ `alwaysinline` บน helper เล็ก ๆ และการตรวจจับ clamp
-   **v0.5.52**: target ฟังก์ชัน clamp โดยตรงด้วย intrinsic `smin`/`smax` Clamp เป็นรูปแบบจำนวนเต็มที่พบบ่อยที่สุดรองจาก increment
-   **v0.5.53**: `x | 0` และ `x >>> 0` บนค่าที่ finite รู้แน่นอนกลายเป็น noop — แค่ `fptosi + sitofp` ไม่มี guard เลย
-   **v0.5.56**: bitwise ops แบบ i32 เนทีฟ; index และ value แบบ i32 ใน Uint8ArrayGet/Set
-   **v0.5.58, v0.5.60**: `Math.imul` lower ไปเป็นการคูณ i32 เนทีฟแทนเส้นทาง polyfill การตรวจจับ polyfill จดจำ shim `Math.imul` ที่ผู้ใช้เขียนเองและแทนที่พวกมัน
-   **v0.5.59**: Inlining ของ init ของ pure function + integer-local seeding การวิเคราะห์จำนวนเต็มแบบ function-local ได้เห็นเลยขอบเขตการเรียกเมื่อ callee เล็กและ pure
-   **v0.5.37–v0.5.40**: Fast path ของ int-arithmetic แบบ accumulator pattern loop `for (...) acc += f(i)` แบบคลาสสิกอยู่ใน i32 ตลอดเส้นทางเมื่อ type เอื้ออำนวย

v0.5.41 คืออันที่ subtle เมื่อ codegen เห็น `const K: number[][] = [[...], ...]` ระดับ module มัน lower ทั้งอันเป็น constant แบบ flat `[N x i32]` ใน `.rodata` `K[y][x]` กลายเป็น `getelementptr + load i32` ครั้งเดียว เมื่อรวมกับ bridge ของ int-analysis ใน v0.5.43 นี่คือสิ่งที่ทำให้ `image_conv` (Gaussian blur 5×5 บน 4K RGB frame) ได้ **speedup 3 เท่าในรีลีสเดียว**

## 5\. Buffer และ Uint8Array

Workload ไบนารี — crypto, image processing, parsing, networking — อยู่ใน Buffer และ Uint8Array v0.5.64 ให้พวกมัน **typed pointer slot พร้อม metadata `noalias`** จากที่ Buffer เคยเป็น NaN-boxed double ใน `alloca double` ตอนนี้เป็น pointer `i64` ดิบใน `alloca i64` พร้อม annotation ของ LLVM ที่บอก optimizer ว่า “pointer นี้ไม่ alias กับ pointer อื่นใน scope” นั่นปลดล็อก load/store reordering, vectorization และ register allocation ที่ optimizer จะไม่ยอมทำในกรณีอื่น

v0.5.80 ปิดปัญหาความถูกต้องสุดท้ายที่นี่: ตัวนับ `alias-scope` ของ buffer ระดับ module ที่กำลังถูก reset ต่อฟังก์ชัน ซึ่งในบางกรณีหายากอาจปล่อยให้ LLVM ให้เหตุผลข้าม scope ที่ไม่ควรแชร์ scope ID เดียวกัน ตอนนี้ตัวนับเป็นระดับ module และเรื่อง `noalias` รัดกุม

v0.5.53 ทำ `Uint8ArraySet` ให้เป็น branchless — masked store แทน if/else ที่เขียน 0 เมื่อ out-of-bounds v0.5.54 เพิ่ม **Two-Way indexOf** สำหรับ pattern ที่ยาวกว่าและ `split` ที่จัดสรรใน arena ซึ่งเมื่อรวมกันปิดช่องว่างส่วนใหญ่ของการ parse Buffer ที่สตริงเยอะ

## 6\. Strings: ASCII คือ fast path

สตริง JavaScript เป็น UTF-16 แต่สตริงในโลกจริงส่วนใหญ่ (คีย์, identifier, HTTP header, โครง JSON) เป็น ASCII v0.5.71 เพิ่ม **`charCodeAt` และ `codePointAt` แบบ O(1) สำหรับสตริง ASCII** — ไม่มีการ scan UTF-16 แค่ load byte v0.5.20 ทำให้ `indexOf`, `slice` และ `charAt` เลี่ยงการ scan UTF-16 บน ASCII แล้ว

หมายเหตุความถูกต้องหนึ่งในรีลีสเดียวกัน: `String.length` ตอนนี้คืน code unit UTF-16 (ECMAScript spec) แทน byte count นั่นคือบั๊กที่ซ่อนอยู่ที่ `"café".length` คืน 5 แทนที่จะเป็น 4

## 7\. เซิร์ฟเวอร์อยู่ได้จริง ๆ แล้ว

งานที่ไม่หรูหราที่สุดของสัปดาห์ยังเป็นงานที่ผู้ใช้เห็นชัดที่สุด: ทำให้เซิร์ฟเวอร์สไตล์ Node ที่รันยาว ๆ — Fastify, ws, http, net — ไม่แครชหลังจากไม่กี่นาที

การแครชทั้งหมดมีสาเหตุร่วม: GC ไม่รู้เกี่ยวกับ closure ของ listener เมื่อคุณเขียน `wss.on('message', handler)` closure จับตัวแปร ซึ่งอยู่เป็น field ภายใน cell ที่จัดสรรโดย GC ถ้า root scanner ของ GC ไม่รู้ที่จะเยี่ยม cell เหล่านั้น การจับของมันจะถูกเรียกคืน และ message event ถัดไปจะ dereference หน่วยความจำที่ถูก free ไปแล้ว

-   **v0.5.26**: root-scan closure ของ event listener ของ `net.Socket` (ปิด #35)
-   **v0.5.27**: ขยายไปยัง `ws`, `http`, `events`, `fastify`
-   **v0.5.28**: ลงทะเบียน global ระดับ module เป็น GC root (ปิด #36) บั๊ก lifetime ที่ layer ขึ้นไป
-   **v0.5.21**: ความปลอดภัยของ `gc()` ภายใน request handler ของ Fastify/WebSocket — การเรียก GC แบบ explicit กำลังรันอยู่ขณะ request handler ถือ pointer เข้าไปใน arena (ปิด #31)

ควบคู่ไปกับงาน GC v0.5.20 ส่ง **main event loop** — ของจริง ไม่ใช่ placeholder — ที่ทำให้เซิร์ฟเวอร์ที่อิง WebSocket และ timer อยู่ได้แทนที่จะออกหลังจากการเรียก sync ครั้งสุดท้ายคืน (refs #28) นี่คือการแก้ไขที่ส่งผลมากที่สุดสำหรับใครก็ตามที่พยายามรัน Perry เป็นเซิร์ฟเวอร์ HTTP production Fastify ตอนนี้อยู่ได้ เซิร์ฟเวอร์ WebSocket ตอนนี้อยู่ได้

v0.5.19 แก้ SysV AMD64 ABI mismatch สำหรับ args/returns ของ JSValue FFI — ปัญหาบน Linux ที่การเรียก FFI เนทีฟอาจ corrupt arguments อย่างเงียบ ๆ v0.5.18 เพิ่ม dispatch เนทีฟสำหรับ `axios` (get/post/put/delete/patch) รวมถึง `response.status` และ `response.data` v0.5.30 แก้ dispatch ของ `fastify request.header()` และ `request.headers[]` ที่เคยคืน undefined สำหรับ lookup ที่ไม่ case-sensitive

## 8\. `@perry/postgres`: driver ที่ทำให้ทุกสิ่งนี้จำเป็น

งานส่วนใหญ่ของสัปดาห์นี้ถูกขับเคลื่อนโดย workload เดียว: การทำให้ [Postgres driver](https://github.com/PerryTS/postgres) ที่เข้ากันได้กับ Node เต็มรูปแบบทำงานบน Perry-native Driver รองรับ TLS มี codec registry ข้าม module รองรับ cancel/close/notify และตอนนี้ benchmark เทียบกับ `pg`, `postgres.js` และ `tokio-postgres`

งาน perf ฝั่ง driver ขนานไปกับฝั่ง compiler:

-   **Hoist codec ต่อคอลัมน์** และลดการคัดลอก Buffer ต่อเซลล์ BigInt(string) สำหรับ int8 เพื่อหลีกเลี่ยงการจัดสรรกลาง
-   **Constructor ของ Row แบบ dynamic ต่อ shape** สำหรับ row แบบ object ถ้า query ของคุณคืนคอลัมน์เดียวกันเสมอ driver สร้าง row constructor ที่ specialize ตาม shape ในครั้งแรกและใช้ซ้ำ — ซึ่งเมื่อรวมกับ PIC ของ compiler ทำให้การเข้าถึง field บน row เร็วเท่ากับการเข้าถึง field บน object อื่น ๆ
-   **opt-out `parseTypes: 'minimal'`** สำหรับ caller ที่ต้องการสตริงดิบสำหรับ int8/numeric/date

นี่คือ positive feedback loop ที่ compiler ตั้งใจจะเปิดมาตลอด Driver จริง ๆ เปิดเผย bottleneck จริง ๆ Bottleneck ได้ reproducer หนึ่งบรรทัดยื่นเป็น GitHub issue หลังจากสัปดาห์หนึ่งของการแก้ไข compiler driver เร็วขึ้นและ compiler ก็เร็วขึ้นสำหรับคนอื่นทุกคนด้วย นั่นคือแผนทั้งหมด บีบอัดลงในเจ็ดวัน

## 9\. การแก้ไขความถูกต้องที่ควรกล่าวถึง

งาน performance เปิดเผยปัญหาความถูกต้องแบบเดียวกับที่การขุดลอกแม่น้ำเปิดเผยรถเข็นของชำ นี่คือรายการบางส่วน:

-   **Promise.race** อ่าน `.value` เมื่อถูก reject แทน `.reason` ดังนั้น rejection ถูกกลืนอย่างเงียบ ๆ (v0.5.13–v0.5.14)
-   **Promise.any** ตอนนี้ throw `AggregateError` ที่ถูกต้องเมื่อ promise อินพุตทั้งหมด reject เพิ่ม `Promise.withResolvers` และแก้ลำดับของ `queueMicrotask`
-   **`[..."hello"]`** ตอนนี้ผลิต character array แทน object ที่พัง (ปิด #16)
-   **เลขคณิต BigInt และการ coerce `BigInt()`** (ปิด #33) Fast path ของ bigint แบบ i64 (v0.5.29) ทำให้เคสทั่วไปถูก
-   **Buffer.indexOf / Buffer.includes** กับ argument byte ที่เป็นตัวเลขกำลังเปรียบเทียบกับ pointer ของ buffer แทนค่า byte (ปิด #56)
-   **Bitwise ops กับ NaN/Infinity** ผลิต 0 ตาม ToInt32 spec (ปิด #57)
-   **Windows x86\_64**: การแก้ไขเฉพาะแพลตฟอร์มห้าจุด — `localtime`, การค้นหา `clang` และการปรับ codegen จำนวนหนึ่ง — ทำให้ Windows x86\_64 กลับมาเขียวอีกครั้ง (v0.5.72)

## 10\. ตัวเลข

headline benchmark จากโพสต์ที่แล้วคือ `factorial` ที่เร็วกว่า Node 24.6 เท่า ตัวเลขนั้นไม่เปลี่ยน สิ่งที่ขยับในสัปดาห์นี้คือทุกอย่างรอบ ๆ มัน:

| ปริมาณงาน| v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (schema 20 เรกคอร์ด) | ช้ากว่า Node 547 เท่า | ช้ากว่า Node 1.3 เท่า | ~420 เท่า |
| image\_conv (blur 4K 5×5) | 1,980ms | 457ms | 4.3 เท่า |
| โค้ดที่ property เยอะ (PIC hit) | พื้นฐาน| 2–3 เท่า | 2–3 เท่า |
| ฟีโบนัชชี(40)| 401ms | 309ms | 1.3 เท่า |
| uptime ของ Fastify ภายใต้โหลด | ~60 วินาทีก่อนแครช | ไม่จำกัด | ∞ |

ชุด benchmark 15 รายการเต็มเทียบกับ Node ยังคงเป็น 14 ชนะและ 1 เสมอ — ตารางเดียวกับโพสต์ที่แล้ว ด้วยตัวเลขที่ดีขึ้นเล็กน้อยในทุกรายการ การเคลื่อนไหวจริง ๆ ในสัปดาห์นี้อยู่ใน workload ที่ไม่อยู่ในชุดนั้น: JSON, image processing, เซิร์ฟเวอร์ที่รันยาว นั่นคือที่ที่ช่องว่างอยู่ และนั่นคือสิ่งที่ปิดไปแล้ว

## 11\. ต่อไปคืออะไร

Benchmark หนึ่งเดียวที่เรายังไล่อยู่คือ `image_conv` เทียบกับ Zig Perry อยู่ที่ 457ms; Zig อยู่ที่ 246ms ช่องว่างนั้นเป็นระดับสถาปัตยกรรม ไม่ใช่ระดับ optimization pass และมันอยู่ในสามที่:

1.  **Typed buffer local** งาน Buffer ส่วนใหญ่ลงจอดในสัปดาห์นี้ แต่ param ฟังก์ชันและ local ที่ type เป็น buffer ยัง unbox ทุกครั้งที่เข้าถึง วิธี slot `i64` ที่เราใช้สำหรับตัวนับ loop ต้องขยายไปยัง buffer
2.  **การแยก loop interior/border** blur loop clamp ทุก pixel รวมถึง 99.9% ของ pixel ที่ไม่จำเป็นต้องทำ การแยกเป็น border region (clamp) และ interior (ไม่ clamp) ทำให้ LLVM vectorize interior ด้วย NEON `ld3`/`st3` ได้
3.  **FNV-1a hash แบบ Double-ABI** helper ของ hash ถูกเรียกผ่าน NaN-box ABI การ specialize ให้เป็น i64 ดิบเข้า/ออกสำหรับ hot path เป็นงานไม่กี่ชั่วโมงที่จะคืนทุนข้าม workload ที่ hash เยอะทุกอัน

พวกมันถูก track อยู่ใน `PERF_ROADMAP.md` คาดว่าจะได้เห็นในรอบถัดไป

## ปิดท้าย

รูปแบบของสัปดาห์นี้ — 68 patch release เกือบทั้งหมดเป็น performance ช่องว่าง JSON หนึ่งจาก 547 เท่าเหลือ 1.3 เท่า — คือสิ่งที่เกิดขึ้นเมื่อคุณข้ามมาอยู่ฝั่งที่ดีของเนินการ cutover LLVM Optimizer ตอนนี้เป็นพันธมิตรแทนที่จะเป็นกำแพง และสิ่งที่เหลือส่วนใหญ่เป็นงานเล็ก ๆ เฉพาะเจาะจง วัดผลได้: หา slow path หาเหตุผลว่าทำไม optimizer จึงมองทะลุไม่ได้ เปิดเผยโครงสร้าง วัดอีกครั้ง ไม่มี commit ใดในนี้แปลกใหม่ พวกมันแค่ถูกนำไปใช้ในที่ที่ต้องการ

ถ้าคุณอยากลอง:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

ซอร์ส: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Issue, reproducer และ benchmark ที่ยังไม่เร็วพอ: ส่งมาเรื่อย ๆ จังหวะนี้ใช้ได้เพราะ bug report เฉพาะเจาะจงพอที่จะเปลี่ยนเป็น reproducer หนึ่งบรรทัด ทุก commit ในโพสต์นี้มี `#N` ผูกอยู่ด้วยเหตุผล

— Ralph
