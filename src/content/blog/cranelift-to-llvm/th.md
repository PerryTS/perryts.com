---
title: "จาก Cranelift สู่ LLVM: อะไรพัง และเราแก้อย่างไร"
excerpt: "การย้าย backend ของ Perry จาก Cranelift ไปยัง LLVM เสร็จสมบูรณ์แล้ว การเปลี่ยนครั้งแรกทำให้เบนช์มาร์กช้าลง 70 เท่า — นี่คือสิ่งที่พัง และการปรับแต่ง 6 รายการที่แก้ไขมัน"
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **แก้ไข (กันยายน 2026):** เบนช์มาร์กด้านล่างที่เรียกว่า “factorial” ตั้งชื่อผิด: มันเพียงรวมค่า `i % 1000` ในลูปและไม่ได้คำนวณแฟกทอเรียล ตัวเลข 24.6 เท่ามาจากการรัน Node.js รุ่นเก่าที่ไม่สามารถทำซ้ำได้ บน harness ที่เราเผยแพร่ปัจจุบันผลออกมาเสมอกับ Node.js (93 ms เทียบกับ 95 ms) นี่เป็นไมโครเบนช์มาร์กของ fast path สำหรับการหารเอาเศษจำนวนเต็ม ไม่ใช่ตัวชี้วัดประสิทธิภาพ TypeScript ทั่วไป ผลลัพธ์ด้านล่างเก็บไว้เป็นบันทึกทางประวัติศาสตร์ ตัวเลขปัจจุบัน รวมถึงเบนช์มาร์กที่ Perry แพ้ อยู่ใน [Perry README](https://github.com/PerryTS/perry#performance)

การย้าย backend ของ Perry จาก Cranelift ไปยัง LLVM เสร็จสมบูรณ์แล้ว ตั้งแต่ v0.5.12 เป็นต้นไป LLVM เป็น backend สำหรับ code generation เพียงตัวเดียว และตอนนี้ Perry เอาชนะ Node.js ได้ในทุก benchmark — ด้วยมาร์จินตั้งแต่ 1.7x ถึง 24.6x (มีสองรายการเสมอกัน)

การมาถึงจุดนี้ไม่ได้ราบรื่น การเปลี่ยนครั้งแรกใน v0.5.0 ทำให้หลาย benchmark **ช้าลง 70 เท่า**เมื่อเทียบกับเวอร์ชัน Cranelift ที่มันมาแทนที่ บทความนี้เป็นเวอร์ชันฉบับเต็มของสิ่งที่เกิดขึ้น เหตุผลที่เราตัดสินใจเปลี่ยนอยู่ดี อะไรพัง อะไรแก้ไขมัน และตัวเลขเป็นอย่างไรหลังจากผ่านมาได้

ถ้าคุณกำลังสร้าง compiler กำลังประเมิน codegen backend หรือแค่อยากรู้ว่าทำไม “เปลี่ยนไปใช้ LLVM” ถึงไม่ค่อยง่ายอย่างที่ฟังดู บทความนี้สำหรับคุณ

## ส่วนที่ 1: ทำไมถึงต้องเปลี่ยน?

Perry คอมไพล์ TypeScript ตรงไปเป็นโค้ดเครื่องแบบเนทีฟ ไม่มี Node ไม่มี V8 ไม่มี Electron ไม่มี WebView ข้อเสนอคือ “เขียน TypeScript ส่งออกเป็นไบนารีเนทีฟ” และคุณค่าทั้งหมดจะพังทลายถ้าไบนารีนั้นไม่ได้เร็วจริง

ในช่วงเวอร์ชันแรก ๆ ของ Perry backend สำหรับ codegen คือ [Cranelift](https://cranelift.dev/) Cranelift ยอดเยี่ยม — เป็น codegen เบื้องหลัง wasmtime ถูกใช้โดย baseline JIT ของ SpiderMonkey และเป็นเครื่องมือที่เหมาะสมเมื่อคุณต้องการคอมไพล์ที่เร็วและคาดเดาได้พร้อมการ embed ที่สะอาด สำหรับโปรเจกต์ที่กำลัง bootstrap ภาษาใหม่ มันเป็นจุดเริ่มต้นที่ถูกต้อง

แต่มีสองสิ่งที่ทำให้เราต้องเปลี่ยน

### 1\. เพดานของ optimizer

Cranelift ถูกออกแบบให้เป็น compiler ที่ปรับแต่งเร็วแบบ single-tier โดยเจตนา หน้าที่ของมันคือ “สร้างโค้ดที่ใช้ได้เร็ว” ไม่ใช่ “สร้างโค้ดที่ดีที่สุดเท่าที่จะเป็นไปได้โดยไม่จำกัดเวลา” นั่นเป็น tradeoff ที่ถูกต้องสำหรับ JIT แต่เป็น tradeoff ที่ผิดสำหรับ AOT compiler ที่จุดขายทั้งหมดคือประสิทธิภาพเนทีฟ

LLVM มีการพัฒนามากกว่าสองทศวรรษที่เทลงไปใน middle-end Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis — ไม่มีโลกที่เป็นจริงที่โปรเจกต์เล็กกว่าจะตามทัน ถ้า Perry จะอ้างว่า “เร็วกว่า Node” เราต้องการเครื่องจักรเหล่านั้น

### 2\. ปัญหา arm64\_32

ปัจจัยบังคับโดยตรงคือ Apple Watch `arm64_32` เป็น ABI ที่ Apple เปิดตัวสำหรับ Series 4 เป็นต้นไป — คำสั่ง 64-bit พอยน์เตอร์ 32-bit Cranelift ไม่รองรับ และไม่มีเส้นทางที่เป็นจริงที่จะรองรับได้ เพื่อให้ Perry อ้างได้อย่างน่าเชื่อถือว่า “9 แพลตฟอร์มจาก codebase เดียว” watchOS ขาดไม่ได้ LLVM รองรับ `arm64_32` ได้ทันที

เมื่อเรายอมรับว่า*บาง*เป้าหมายจะต้องใช้ LLVM การดูแลสอง backend ก็เป็นไปไม่ได้ สอง backend หมายถึงสอง set ของ bug สอง set ของ optimization pass สองเมทริกซ์การทดสอบ สอง baseline ด้านประสิทธิภาพ คำตอบที่ตรงไปตรงมาคือ: เลือกตัวเดียว

เราเลือก LLVM

## ส่วนที่ 2: ว่าด้วย Cranelift

ก่อนไปต่อ: บทความนี้ไม่ใช่การวิจารณ์ Cranelift Cranelift เป็นผลงานวิศวกรรมที่ยอดเยี่ยม และถ้าคุณกำลังสร้าง JIT, sandbox runtime หรืออะไรก็ตามที่เวลาคอมไพล์สำคัญกว่า throughput สูงสุด มันควรอยู่บนสุดของรายการคุณ wasmtime ใช้มันด้วยเหตุผลที่ดี Bytecode Alliance ทำงานได้อย่างน่ายกย่อง

ความต้องการของ Perry แตกต่าง เราคอมไพล์ล่วงหน้า เราส่งไบนารีครั้งเดียว และผู้ใช้รันมันนับล้านครั้ง ความไม่สมมาตรนั้น — คอมไพล์นาน ๆ ที รันตลอดเวลา — เป็นระบอบที่ optimizer ที่หนักกว่าของ LLVM คุ้มค่า เครื่องมือต่างกันสำหรับงานที่ต่างกัน

## ส่วนที่ 3: หายนะของการเปลี่ยน

v0.5.0 เป็นรีลีสแรกที่ใช้ LLVM เป็น backend เดียว เราคาดหวังว่าเวลาคอมไพล์จะถดถอยเล็กน้อยและประสิทธิภาพ runtime จะดีขึ้นอย่างมีนัยสำคัญ เราได้ตรงข้ามกับข้อที่สอง

นี่คือตารางที่ตอนนั้นผมไม่อยากโพสต์:

| เกณฑ์มาตรฐาน| Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| method_calls| 16ms | 1,084ms | ช้าลง 68 เท่า |
| object_create| 5ms | 318ms | ช้าลง 64 เท่า |
| matrix_multiply| 61ms | 184ms | ช้าลง 3 เท่า |
| คณิตศาสตร์เข้มข้น| 370ms | 131ms | เร็วขึ้น 2.8 เท่า |
| Nested_loops| 32ms | 57ms | ช้าลง 1.8 เท่า |
| ฟีโบนัชชี(40)| 505ms | 1,156ms | ช้าลง 2.3 เท่า |

บาง workload เร็วขึ้น ส่วนใหญ่แย่ลงอย่างมาก `method_calls` — หนึ่งใน benchmark ที่สำคัญที่สุดเพราะเป็นตัวแทนของการใช้ class ใน TypeScript แบบ idiomatic — แย่ลงเกือบ 70 เท่าจากที่เราเคยส่งออกไปสองรีลีสก่อนหน้า

### สิ่งที่ผิดพลาดจริง ๆ

Perry ใช้ **NaN-boxing** สำหรับการแทนค่า ค่า TypeScript แต่ละตัวเป็น word 64-bit ตัวเลข f64 ถูกเก็บโดยตรง ส่วนอย่างอื่น (object, string, boolean, undefined, null) ถูกเข้ารหัสลงในบิตที่ไม่ได้ใช้ของ quiet NaN ตามมาตรฐาน IEEE 754

ข้อดี: ตัวเลขไม่มีค่าใช้จ่าย ไม่มี boxing ไม่มี tagging ไม่มีการจัดสรรหน่วยความจำสำหรับเลขคณิต

ข้อเสีย: ทุกการดำเนินการกับค่าที่ไม่ใช่ตัวเลขต้องมีการจัดการบิตเพื่อแกะ ดำเนินการ และห่อกลับ ถ้าลำดับเหล่านี้อยู่เป็น IR inline ใน codegen ของคุณ optimizer สามารถรวมและทำให้ง่ายขึ้นได้ ถ้ามันอยู่เป็น**การเรียกฟังก์ชัน helper ของ runtime** optimizer จะเห็นการเรียกที่ทึบแสงและยอมแพ้

backend Cranelift ของเราได้พัฒนา inline lowering จำนวนมากสำหรับการดำเนินการที่ร้อนแรง — การโหลด property, dispatch ของ method, การจัดสรร object, เลขคณิตจำนวนเต็มบนค่าที่ tag เป็น f64 การเปลี่ยนไป LLVM เพื่อให้ได้โค้ดที่*ถูกต้อง*ก่อน ได้ส่งเกือบทุกอย่างผ่าน helper ของ runtime ใน `perry-runtime` แต่ละ helper เป็นคำสั่ง `call` ใน LLVM IR

LLVM ยอดเยี่ยม แต่มันไม่สามารถ inline ฟังก์ชันที่ไม่เคยเห็น body ได้ `perry-runtime` ถูกคอมไพล์แยก เชื่อมต่อในตอนท้าย และจากมุมมองของ optimizer ทุกการเรียก helper เป็นกล่องดำ ผลลัพธ์คือ loop ที่ร้อนแรงซึ่ง backend Cranelift เคยคอมไพล์เป็น ~5 คำสั่งเลขคณิต inline ตอนนี้ถูกคอมไพล์เป็นการเรียกฟังก์ชัน — บันทึก register, ตั้งค่า stack frame, ทุกอย่าง — ทำซ้ำหลายล้านครั้ง

นั่นคือที่มาของ 70x ไม่ใช่ codegen ที่แย่ แต่เป็น**ขอบเขต inlining** ที่แย่

## ส่วนที่ 4: การแก้ไข

งานเพื่อกู้คืนและเกินตัวเลขของ Cranelift แบ่งออกเป็นประมาณหกหมวดหมู่ ไม่มีอะไรแปลกใหม่ ส่วนใหญ่เป็นการปรับแต่ง compiler แบบตำราเรียนที่แค่ต้องนำไปใช้ในจุดที่ถูกต้อง

### 1\. Inline bump allocator สำหรับการจัดสรร object

`object_create` เป็นการถดถอยที่เลวร้ายที่สุดรองจาก `method_calls` เส้นทางเดิมเรียก `js_object_alloc_class_with_keys` สำหรับทุก `new Point()` — การเรียกฟังก์ชัน, การเข้าถึง arena แบบ thread-local, การค้นหา shape-cache และการเขียน header GC + header ของ object

การแก้ไข: emit bump allocation **inline** ใน LLVM IR ทุกฟังก์ชันที่จัดสรร object จะได้รับ pointer ที่แคชไว้ไปยัง struct `InlineArenaState` แบบ thread-local การจัดสรรจะกลายเป็น:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

fast path คือ ~13 คำสั่ง IR inline ที่ LLVM สามารถเห็น จัดลำดับ และยกออกจาก loop ได้ `object_create` ลดจาก 318ms เหลือ 9ms

### 2\. ตัวนับ loop แบบ i32

NaN-boxing หมายความว่าตัวเลข TypeScript ทุกตัวเป็น f64 ซึ่งรวมถึงตัวนับ loop ด้วย loop `for (let i = 0; i < 100_000_000; i++)` ที่มีตัวแปร induction เป็น f64 เป็นหายนะ: increment f64, เปรียบเทียบ f64, แปลง f64-เป็น-i64 ทุกครั้งที่เข้าถึง array

codegen ตรวจจับ for-loop ที่ตัวแปร induction พิสูจน์ได้ว่าเป็นจำนวนเต็มและจัดสรร **slot stack i32 คู่ขนาน** เงื่อนไข loop เปลี่ยนจาก `fcmp` เป็น `icmp slt i32` กำจัดตัวนับ f64 ทั้งหมด

สิ่งนี้ทำให้ `array_write` ลดจาก 11ms เหลือ 3ms, `nested_loops` จาก 18ms เหลือ 9ms และ `array_read` จาก 11ms เหลือ 4ms

### 3\. Flag fast-math

เราเพิ่ม flag `reassoc contract` ให้กับคำสั่งเลขคณิต f64 ทุกตัว `reassoc` อนุญาตให้ LLVM แตกห่วงโซ่ accumulator แบบ serial เป็นแบบ parallel และ `contract` อนุญาตให้ใช้ fused multiply-add เราปิด `nnan` และ `ninf` ไว้เพราะ Perry ใช้บิต NaN เป็น tag ของค่า

ด้วย flag เหล่านี้ loop vectorizer ของ LLVM เริ่มทำงานกับ `math_intensive` ซึ่งลดจาก 131ms เหลือ 14ms — เอาชนะ Node ได้ 3.5x

### 4\. Fast path สำหรับ modulo จำนวนเต็ม

`%` บน f64 ใน JavaScript คือ `fmod` ซึ่งเป็นการเรียก libm บน ARM แต่สำหรับ operand f64 ที่มีค่าเป็นจำนวนเต็ม เราสามารถทำ `fptosi → srem → sitofp` และข้ามการเดินทางไปกลับ libm ได้เลย codegen ใช้การวิเคราะห์แบบ static เพื่อตรวจจับ operand ที่มีค่าเป็นจำนวนเต็ม — ไม่ต้องตรวจสอบตอน runtime

นี่คือเหตุผลเดียวที่ `factorial` ลดจาก 1,553ms เหลือ 24ms — และจาก 591ms ของ Node เหลือ 24ms **เร็วกว่า Node 24.6 เท่า**

### 5\. LICM สำหรับ loop ซ้อน

LLVM ทำ loop-invariant code motion เป็นค่าเริ่มต้น แต่ NaN-boxing ซ่อนโครงสร้าง `arr.length` ถูก lower เป็นการโหลดผ่าน pointer ที่ NaN-boxed พร้อมการตรวจสอบ tag — ไม่ชัดเจนว่าเป็น invariant

codegen ตรวจจับรูปแบบ `for (...; i < arr.length; ...)` และโหลดความยาวลงใน slot stack ก่อน loop โดยมี walker แบบ static ตรวจสอบว่า body ของ loop ไม่สามารถเปลี่ยนความยาวของ array ได้ เมื่อตัวนับถูกจำกัดด้วยความยาวที่ยกขึ้นมานี้ IndexGet/IndexSet จะข้ามการตรวจสอบขอบเขตทั้งหมด

### 6\. Object ที่มี shape-cache

เมื่อ codegen รู้ class ของ object มันจะคำนวณ offset ของ field ตอนคอมไพล์และ emit **การโหลดแบบ indexed ตรง ๆ** — ไม่มี dispatch ตอน runtime สำหรับ dispatch ของ method, `obj.method(args)` จะกลายเป็นการเรียก `call @perry_method_Class_name(this, args)` โดยตรง — ไม่มี vtable ไม่มี inline cache ไม่มี hash lookup

การเปลี่ยนไป LLVM ได้ทำให้ส่วนนี้ถดถอยกลับไปเป็น slow path แบบ universal การคืนค่า static dispatch ทำให้เราได้ `method_calls` กลับคืนมา — จาก 1,084ms กลับลงเหลือ 1ms **เร็วกว่า Node 11 เท่า**

## ส่วนที่ 5: ตัวเลขในวันนี้

ค่ามัธยฐานจาก 3 ครั้ง, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| เกณฑ์มาตรฐาน| Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| แฟกทอเรียล| 24ms | 591ms | 24.6x |
| method_calls| 1ms | 11ms | 11x |
| loop_overhead| 12ms | 53ms | 4.4x |
| คณิตศาสตร์เข้มข้น| 14ms | 49ms | 3.5x |
| array_read| 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array_write| 3ms | 8ms | 2.6x |
| string_concat| 1ms | 2ms | 2x |
| Nested_loops| 9ms | 16ms | 1.7x |
| prime_sieve| 4ms | 7ms | 1.7x |
| matrix_multiply| 21ms | 34ms | 1.6x |
| ฟีโบนัชชี(40)| 401ms | 991ms | 2.5x |
| binary_trees| 9ms | 9ms | เสมอ |
| แมนเดลโบรต| 24ms | 24ms | เสมอ |
| object_create| 9ms | 8ms | 0.9x |

ทุก benchmark เป็นชัยชนะหรือเสมอ ที่ใกล้เคียงที่สุดคือ `object_create` (9ms vs 8ms) ที่ allocator ของ V8 ดีจริง ๆ

## ส่วนที่ 6: คำถามเรื่องเวลาคอมไพล์

เหตุผลอันดับหนึ่งที่คนเลือก Cranelift แทน LLVM คือความเร็วในการคอมไพล์ มาพูดถึงเรื่องนี้กัน

LLVM เพิ่มเวลาคอมไพล์ต่อไฟล์ของ Perry **20-50ms** หรือประมาณ **8-19%** ไม่ใช่ 5x ไม่ใช่ 2x เปอร์เซ็นต์หลักเดียวถึงสองหลักต่ำ ๆ

เหตุผลคือ codegen ไม่ใช่คอขวดใน pipeline ของ Perry สัดส่วนสำหรับไฟล์ทั่วไป:

-   Parsing SWC: ~30%
-   Lowering HIR (AST → IR, การอนุมานชนิด): ~25%
-   Pass การแปลง IR (การแปลง closure, lowering async, inlining): ~15%
-   **Codegen (การ emit ข้อความ LLVM IR + `clang -c -O3`): ~20%**
-   Linking (`cc` + ไลบรารี runtime): ~10%

Codegen เป็นหนึ่งในห้าส่วน แม้จะเพิ่มส่วนนั้นเป็นสองเท่า ก็ขยับผลรวมแค่ 5-10% ถ้าคุณกำลังสร้าง AOT compiler ที่ผู้ใช้พิมพ์ `perry compile` ครั้งเดียวแล้วรันไบนารีตลอดไป การคำนวณคือ: ใช้เวลาคอมไพล์เพิ่ม 25ms ประหยัดได้ถึง 24x ในทุกการรัน

## ส่วนที่ 7: สิ่งที่ผมจะทำต่างออกไป

ถ้าผมเริ่มต้น Perry วันนี้และสามารถข้ามไปใช้ LLVM เลย ผมจะไม่ทำ ช่วง Cranelift มีคุณค่าจริง ๆ มันช่วยให้เราพัฒนา frontend ซ้ำ ๆ ได้โดยไม่มีภาระความซับซ้อนของ LLVM ให้ baseline ที่ใช้งานได้สำหรับเปรียบเทียบ และบังคับให้เรารักษา HIR ให้สะอาดพอที่จะพกพาข้าม backend ได้

สิ่งที่ผมจะทำต่างออกไปคือการเปลี่ยนเอง เราปล่อย v0.5.0 โดยที่การดำเนินการส่วนใหญ่ผ่านการเรียก helper ของ runtime โดยตั้งใจจะทำ inline ทีหลัง นั่นผิด ลำดับที่ถูกต้องควรเป็น: ระบุ hot path ก่อน lower แบบ inline ก่อนการเปลี่ยน และปล่อยเมื่อ backend LLVM อย่างน้อยเทียบเท่าแล้วเท่านั้น

บทเรียนเป็นเรื่องธรรมดา: ขอบเขตของการปรับแต่งสำคัญกว่าคุณภาพของ optimizer LLVM เป็นซอฟต์แวร์ที่น่าทึ่ง แต่มันช่วยคุณกับโค้ดที่มันมองไม่เห็นไม่ได้ ถ้า codegen ของคุณส่งทุกอย่างผ่านการเรียก runtime ที่ทึบแสง คุณได้สร้างกำแพงระหว่างโปรแกรมต้นทางของคุณกับทุก optimization pass ที่มีอยู่

## สรุป

Perry ตอนนี้ใช้ LLVM อย่างเดียว เร็วกว่า Node ในทุก benchmark และพร้อมใช้งาน การย้ายใช้เวลานานกว่าที่วางแผนไว้ เจ็บปวดกว่าที่คาดไว้ตรงกลาง และเป็นการตัดสินใจที่ถูกต้องอย่างปฏิเสธไม่ได้เมื่อมองย้อนกลับ Cranelift พาเราไปถึง v0.5 LLVM กำลังพาเราไปตลอดทาง

ถ้าคุณอยากลอง Perry:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

ซอร์สโค้ด: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — รัน benchmark ด้วยตัวเอง: `cd benchmarks/suite && ./run_benchmarks.sh`

ถ้ามีคำถาม พบบั๊ก หรืออยากถกเถียงเรื่อง codegen backend GitHub issue เปิดอยู่ ผมอ่านทุกอัน

— Ralph
