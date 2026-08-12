import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = String.raw`**สรุปย่อ.** Perry คอมไพล์ TypeScript เป็นไบนารีเนทีฟ และใช้ tracing collector แบบ generational ที่ย้ายออบเจ็กต์ได้และมี precise roots — ไม่ใช่ reference counting หลังจากหนึ่งเดือนที่งาน GC แทบทั้งหมดคือการ *ค้นให้พบว่าตัว collector กำลังทำอะไรจริง ๆ* ตอนนี้ Perry ชนะ Node ใน benchmark ที่เน้น GC 9 จาก 19 รายการ (เดิม 3 รายการ) ชนะคู่แข่ง AOT ที่ใช้ reference counting 14 จาก 19 รายการ และอยู่ภายใน 1.3× ของ Node ใน 15 จาก 19 รายการ ระหว่างทางเราเจอบั๊กชนิดที่ไม่ทิ้งหลักฐานทางนิติวิทยาศาสตร์ ตัวแปรสภาพแวดล้อมที่ไม่ได้ควบคุมอะไรเลย CI gate ที่ไม่มีทางล้มเหลวโดยโครงสร้าง doc comment ที่ทำให้เราเผลอส่ง collector อีกแบบหนึ่ง และการวัดรอบสุดท้ายที่ชี้ว่าช่องว่างที่เหลืออยู่ใน *layout* ของออบเจ็กต์ ไม่ใช่การเก็บขยะ กฎเก้าข้อที่เราได้อยู่ท้ายบทความ และส่วนใหญ่ไม่ได้เกี่ยวกับ GC

Perry คอมไพล์ TypeScript ตรงไปเป็น executable เนทีฟ: SWC ทำ parsing, เรา lower ลง HIR, LLVM สร้าง machine code และ ¤cc¤ ทำ linking ไม่มี interpreter หรือ bytecode แต่ภาษายังมี closure ที่หนีออกจาก scope, ออบเจ็กต์ที่มีอายุยืนกว่า scope และวงจรอ้างอิง ดังนั้นเบื้องหลังไบนารีเนทีฟนั้นจึงต้องมี garbage collector จริง ๆ

บทความนี้เล่าการตัดสินใจตอนสร้างมัน สิ่งที่ทำให้เราประหลาดใจ — เกือบทั้งหมดในทางไม่ดี — และตัวเลขในวันนี้ หลายเดือนมานี้ collector เป็นส่วนที่มีการเปลี่ยนแปลงมากที่สุดใน codebase: **ตั้งแต่ 1 กรกฎาคม 2026 มี 201 commit แตะ ¤crates/perry-runtime/src/{gc,arena}¤ และ 110 commit เกิดขึ้นในสิบสองวันล่าสุด** ครอบคลุม 127 ไฟล์และราว 75,000 บรรทัด จาก changelog fragment ที่ยังไม่เผยแพร่ 572 รายการ มี 135 รายการที่ชื่อเกี่ยวกับ GC

แทบไม่มีส่วนไหนเป็น “การ implement collector” งานจริงคือค้นให้พบว่า collector ของเราทำอะไรอยู่กันแน่

---

## ส่วนที่ 1 — สิ่งที่เราเลือก

### ไม่ใช้ reference counting

คำถามแรกมักเป็นว่า compiler แบบ AOT ไม่ควรใช้ reference counting ไปเลยหรือ ดูเหมือนเข้ากันพอดี: ไม่มีปัญหาค้นหา root, ไม่ต้องมี safepoint และไม่ต้องร่วมมือกับ optimizer คู่แข่ง AOT TypeScript ที่เราใช้เปรียบเทียบก็เลือกทางนี้

แต่เราเลือก tracing collector เพราะ reference counting ทำให้กรณีปกติจ่ายค่ากรณีหายาก: pointer store ทุกครั้งต้องอัปเดต counter, วงจรยังต้องมี tracer สำรอง และ JS สร้างออบเจ็กต์จำนวนมหาศาลที่ตายทันที — กรณีที่ nursery จัดการได้แทบฟรี วันนี้การตัดสินใจนี้ดูถูกต้องใน benchmark GC 14 จาก 19 รายการ และผิดใน 5 รายการ เราจะกลับมาดูมันตอนท้าย

### Value ใช้ NaN-boxing — และเรากำลังย้อนบางส่วนออก

ทุกค่า JS ใช้หนึ่ง word ขนาด 64 บิต เราใช้ pattern NaN ที่ว่างอยู่ราว 2⁵² แบบของ IEEE 754 เพื่อ tag pointer, integer ขนาดเล็ก และ singleton ส่วนที่เหลือเป็น ¤f64¤ ปกติ:

¤¤¤
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
¤¤¤

สำหรับ collector นี่เป็นข้อตกลงที่ยอดเยี่ยม: “word นี้เป็น pointer หรือไม่” ตอบได้ด้วย mask และ compare โดยไม่ต้อง lookup type ต่อค่าระหว่าง tracing และตัวเลขที่พักอยู่ก็มีบิต IEEE ของมันอยู่แล้ว field ตัวเลขจึงไม่เสียค่า box หรือ header

แต่สำหรับ *mutator* นี่คือกำแพงเดี่ยวที่ใหญ่ที่สุดระหว่างเรากับ V8 และเรากำลังรื้อออก ปัญหาไม่ใช่แค่ NaN-boxed ¤double¤ เป็น representation *หนึ่งแบบ* แต่เป็น representation **มาตรฐาน** Native machine type มีได้เพียงเป็น overlay เฉพาะ region ขณะที่ตระกูล ¤materialize_*_to_js_value¤ box กลับทุก boundary ที่ JS มองเห็น ใน IR ที่ปล่อยออกมา loop accumulator ซึ่งพิสูจน์ได้ว่าเป็น ¤i32¤ กลับอยู่ใน ¤alloca double¤, รอด ¤-O3¤ เป็น ¤phi double¤ ข้าม back-edge และจ่าย ¤fptosi¤ + ¤sitofp¤ **ทุกรอบ** Parameter ทุกตัวเป็น ¤double %argN¤ จึง unbox ซ้ำเป็นล้านครั้ง และก่อนหน้านี้แม้แต่ local ตัวเลขก็ถูกลงทะเบียนเป็น GC root ทั้งที่ตัวเลขไม่มีวันเป็น pointer

การวัดที่ชี้ขาดคือ ¤_encipher¤ ของ bcryptjs ที่ unroll อย่างตรงไปตรงมาใช้ 834 ms เทียบกับ Node 184 ms — และ *การเพิ่ม type annotation ทำให้แย่ลง* จาก 834 เป็น 2732 ms เพราะ guard ราว 80 ตัวต่อการอ่านและ rematerialization ที่ boundary ครองเวลา Fast path ระดับ expression แก้ปัญหา representation ไม่ได้ มันเป็นเพียง overlay อีกชั้นบน canonical แบบ boxed และในโค้ด unrolled ผลกลับตรงข้าม

ทิศทางใน ¤docs/representation-selection-rfc.md¤ และแคมเปญ unbox-by-default คือทำให้รูป native แบบ unboxed เป็น canonical สำหรับค่าที่พิสูจน์ type แบบ static ได้ทั้งหมด — scalar, string, object, typed array และ closure — ตั้งแต่ local, parameter, return ไปจนถึง typed heap slot และจำกัด NaN-boxing ไว้สำหรับค่าที่พิสูจน์ว่า polymorphic เท่านั้น มันยังเป็น representation *เริ่มต้น* แต่ไม่ใช่ representation *เดียว* Phase 1, 2, 3a, 3b, 4a และ 4b merge แล้ว Static Hermes คือหลักฐานว่าทำได้ ข้อแลกเปลี่ยนของ AOT คือเราต้อง *พิสูจน์* type ในจุดที่ JIT เดาได้ แต่นั่นก็เป็นข้อดี: kernel ที่พิสูจน์แล้วไม่ต้อง warmup และ deopt ไม่ได้

เรื่องนี้กระทบ GC สองทาง Unboxing ลด roots ที่ collector ต้อง scan — scalar ที่พิสูจน์แล้วไม่ใช่ root — แต่เพิ่มภาระใหม่: เมื่อ heap slot เก็บสิ่งที่ไม่ใช่ NaN-boxed word, collector อนุมานจากค่าไม่ได้ว่าเป็น pointer และต้องดู layout mask ตาม shape กลไก ¤pointer_mask¤, ¤raw_f64_mask¤ และ layout note เหล่านี้เป็นต้นกำเนิดของบั๊กหลายตัวด้านล่าง

### หนึ่ง heap ต่อ thread และไม่แชร์กัน

Perry เป็น single-threaded โดย default; ¤perry/thread¤ มี ¤spawn¤ และ ¤parallelMap¤ และค่าข้าม thread ด้วย deep copy (¤SerializedValue¤) ไม่ใช่ sharing ต้นทุนด้าน ergonomics มีจริง แต่ collector ได้ข้อดีใหญ่: **ไม่ต้อง synchronize กับ thread อื่นเลย** ไม่มี global safepoint protocol, handshake หรือ read barrier เพื่อรักษา invariant ข้าม thread ทุก arena, root scanner และ remembered set เป็น thread-local

### ใช้ generational เพราะ distribution ของ allocation บอกเช่นนั้น

แต่ละ thread มีสอง region: nursery (¤ARENA¤, block 1 MB) และ old generation (¤OLD_ARENA¤), มี ¤GcHeader¤ 8 ไบต์ต่อ allocation, aging bit สองตัว (¤HAS_SURVIVED¤ และ ¤TENURED¤) แทน counter และ ¤PROMOTION_AGE = 2¤ แผนเดิมที่เขียนเมื่อ 24 เมษายน 2026 ก่อนมีโค้ดสรุปเหตุผลไว้ว่า allocation ของ JS มากกว่า 90% ตายใน scope ที่สร้างมัน ดังนั้น flat arena จึงใช้ชีวิต mark ออบเจ็กต์ที่เห็นชัดว่าตายแล้วซ้ำ ๆ

แผนยังระบุ prerequisite ที่ทุกอย่างต่อจากนี้พึ่งพาได้ถูกต้อง:

> **Generational GC ต้องมี precise roots**

Conservative scanner ใช้ได้กับ collector ที่ไม่ย้าย: false positive เพียงเก็บออบเจ็กต์ตายไว้อีก cycle แต่ collector แบบ *moving* ทำเช่นนั้นไม่ได้ ถ้า enumerate roots อย่างแม่นยำไม่ได้ ก็ rewrite ไม่ได้ และถ้า rewrite ไม่ได้ ก็ย้ายอะไรไม่ได้

### Roots: analysis หนึ่งชุด, lowering สองแบบ และใช้ LLVM statepoints เป็น default

LLVM เก็บค่าไว้ใน register, rematerialize และ spill ที่ใดก็ได้ collector มองสิ่งเหล่านี้ไม่ได้ คำตอบของ Perry มีสองชั้น และเราใช้เวลานานเกินไปกว่าจะแยกมันออกจากกัน

**Analysis** — local ใดมี GC pointer และแต่ละตัวต้อง live ถึงที่ใด — ไม่ขึ้นกับ backend ส่วน **lowering** คำตอบนั้นลงโค้ดมีสองทาง:

- *Shadow stack.* เรียก ¤js_shadow_frame_push(n)¤ ตอนเข้า, ¤js_shadow_slot_bind¤ หนึ่งครั้งต่อ JS-level local และ ¤js_shadow_frame_pop¤ ตอนออก collector เดิน frame ที่เก็บบน heap
- *Native stack map ผ่าน RS4GC.* Root alloca กลายเป็น ¤ptr addrspace(1)¤, function ได้ ¤gc "statepoint-example"¤ และแต่ละ module ผ่าน ¤opt -passes='function(mem2reg),rewrite-statepoints-for-gc'¤ LLVM ใส่ statepoint, relocation และ rewrite การใช้งานภายหลังเอง ระหว่าง collection เราอ่าน roots จาก section ¤__perry_gcmap¤ ที่กะทัดรัด

**ตั้งแต่ #7370 statepoint lowering เป็น default** ไม่ต้องตั้ง ¤PERRY_RS4GC=1¤ อีก; ¤PERRY_RS4GC=0¤ กลับไป shadow stack เพื่อ bisection การเลือกขึ้นกับ target เพราะ ¤gc_map¤ ปฏิเสธสร้าง map ให้ target ที่ runtime แก้ frame base ไม่ได้ — map ที่ไม่มีใครอ่านทำ roots หายเงียบ ๆ กฎคือใช้ native roots เมื่อ runtime เดินได้ และ shadow stack เมื่อเดินไม่ได้ aarch64/arm64 กับ x86-64 ใช้ statepoints; watchOS ¤arm64_32¤ และ Windows ARM64 ใช้ shadow frame Fallback ไม่ได้แปลว่า “ไม่มี roots” แต่เป็น lowering อีกแบบของ analysis เดียวกัน

หลักฐานสำหรับการสลับโดยไม่ตั้ง env: gap suite 479 tests ผ่านด้วย **0 regression และ 0 compile failure**; tests ที่มี ¤try¤ ทั้ง **128 รายการ** compile ได้ ซึ่งเป็น class ที่ bridge statepoint เขียนมือแบบเก่าจัดการไม่ได้; GC ratchet probes 10 ตัวให้ output byte-identical กับ Node; runtime −1–2% เร็วขึ้นเล็กน้อย; binary +1.86% ใน 81 modules ของ zod

ข้อดีจริงเหนือ “เรา emit shadow stack” ไม่ใช่ 1–2% Statepoint มี **relocation semantics ที่ optimizer ต้องเคารพ** ส่วน shadow stack ถูกต้องก็ต่อเมื่อ optimizer ไม่ฉลาดกับค่าที่เราลืม spill หลักฐานอยู่ในส่วนที่ 3

นอกจากนี้มี **runtime root scanner ที่ลงทะเบียน 79 ตัว** สำหรับ state ใน runtime ไม่ใช่ user code: pending promises, timer callbacks, exception state, async-context stacks, shape caches, string intern table และ JSON scratch table

ยังมี conservative native-stack scanner เอกสารสถาปัตยกรรมบอกว่าเป็นหนึ่งในสามกลไกที่เทียบเท่ากัน แต่ข้อความนั้นล้าสมัย และการค้นพบขณะเขียนบทความก็น่าคิด ใน production ¤conservative_stack_scan_decision()¤ คืน ¤SkipDisabled¤: liveness พึ่ง precise map ทั้งหมด — statepoints หรือ shadow frame บน fallback target — พร้อม ¤RuntimeHandleScope¤ ใน runtime helper Conservative path เหลือไว้สำหรับบาง mode โดยเฉพาะ collection ที่ allocation point ไม่ใช่ safety net ใต้ precise path

### Write barrier ที่ arm แบบ lazy

อันตรายของ generational คือ pointer old→young: minor GC ที่ trace แค่ nursery ต้องรู้จักมัน Codegen emit ¤js_write_barrier¤ ที่ pointer store และ runtime รักษา remembered set

Invariant การ arm จาก #7250 เป็นชิ้นส่วนที่นำกลับใช้ได้ดีที่สุดชิ้นหนึ่ง:

> ขณะ disarmed, barrier ไม่บันทึกอะไร แลกกับการที่การ *อ่าน* remembered set ครั้งแรกใน thread จะไม่เชื่อ log แต่สร้างชุด edge old→young ที่สมบูรณ์ใหม่จาก heap และ arm barrier ระหว่างเดิน

นี่ถูกบังคับด้วยโครงสร้าง: ¤remembered_dirty_snapshot()¤ เป็น ¤pub(super)¤ มีเจ็ด call site และทั้งหมดอยู่ใน ¤gc/¤

*(หมายเหตุสำหรับคนอ่าน source: Perry มีสองสิ่งที่ไม่เกี่ยวกันซึ่งเรียกว่า “barrier” — GC write barrier และ compile-time promotion barrier ของ ¤Ptr<Shape>¤ ใน representation-selection pass มีสาม issue เสียเวลาเพราะสับสนกัน กรุณาระบุไฟล์เสมอ)*

---

## ส่วนที่ 2 — เรื่องเหนือความคาดหมาย

### 1. บั๊กชนิดที่ไม่ทิ้งหลักฐาน

Rooting invariant สรุปได้ประโยคเดียว:

> ค่าใดที่ GC จัดการและยัง live ข้าม collection point ต้องเข้าถึงได้จาก root ก่อน point นั้น ค่าที่อ่านจาก root แล้วเก็บใน SSA register ระหว่าง call **ไม่ได้ rooted**: มันเป็นสำเนา และ collector มองไม่เห็นสำเนา

การละเมิดนี้ให้ประสบการณ์ debugging ที่แย่ที่สุดในโปรเจกต์ ตอน collection ไม่มี *อะไรให้พบ*: ไม่มี dangling reference, slot ที่ไม่ forward หรือความผิดปกติ ต่อมา nursery recycle address; stale pointer อ่านออบเจ็กต์อื่นที่ถูกต้อง และโปรแกรมตายในอีกหนึ่ง cycle หรือมากกว่านั้น ในอีก function ด้วย ¤TypeError: value is not a function¤

Runtime GC probe ทั้งหมดมองไม่เห็น From-space scan และ verify pass สะอาด ¤PERRY_GC_VERIFY_EVACUATION¤ ตรวจได้ว่า reachable slots ถูก forward แต่ตรวจ register ที่มันไม่รู้ว่ามีอยู่ไม่ได้

เราจัดหมวดไว้ห้ารูปแบบที่เคยถูกส่งออกไปแล้ว:

| # | รูปแบบ | เหตุผลที่รอด review |
|---|---|---|
| #7184 | Emit root store ด้วย index นอก frame ที่ push | ¤js_shadow_slot_bind¤ bounds-check แล้ว no-op เงียบ ๆ; IR *บอก* ว่า rooted |
| #7192 | Emit root store *หลัง* call ที่ allocate | slot ลงเอยทั้ง rooted **และ** dangling; ผ่านคำถาม “rooted หรือยัง” ทุกข้อ |
| #7206 | Load method receiver แล้ว lower arguments ซึ่งแต่ละตัว allocate ได้ก่อนใช้ | เมื่อดู load เดี่ยว ๆ มันดูถูกต้องชัดเจน |
| #7206 | ¤base[key]¤: materialize base, lower key expression แล้วใช้ stale base | สอง operand; ตัวหนึ่งประเมินก่อนแต่ใช้ทีหลัง |
| #7226/#7239 | Thread-local หรือ static cell เก็บ heap pointer ที่ scanner ไม่ rewrite | มองไม่เห็นใน IR |

สี่รูปแบบถูก **ส่งในวันเดียว** Fix แต่ละตัวมีเพียงไม่กี่บรรทัด; ต้นทุนอยู่ที่ detection lag มีเพียงรูปแรกที่เฉพาะกับ shadow stack ที่เหลือไม่ขึ้นกับ lowering และรอดการย้ายไป statepoints เพราะความผิดอยู่ที่ *lowering emit root เมื่อใด* ไม่ใช่อะไรคือ root

Heuristic ที่มีประโยชน์จริง: **บั๊ก GC ที่ reproduce ได้สมบูรณ์หมายถึง table ไม่ใช่ register** Unrooted register เสียเฉพาะเมื่อ collection ตกใน window จึง intermittent; unrooted cache เสียตั้งแต่ collection #0 และเสียต่อไป มีข้อยกเว้นเดียว: ¤&str¤ หรือ ¤&[u8]¤ ที่ borrow จาก heap ¤StringHeader¤ แล้วถือข้าม allocating call Rooting rewrite *slot* แต่ borrow ไม่ใช่ slot วิธีแก้ที่ sound คือ copy bytes ออกจาก heap ก่อน allocation แรก

### 2. เราหยุดตรวจด้วยตา แล้วเริ่มสร้างเครื่องมือ

จุดเปลี่ยนใน #7154 ไม่ใช่ fix แต่คือการเลิก inspection หลัง investigation สิบรอบ และสร้างเครื่องมือที่เปลี่ยนบั๊กให้เป็น fault ทันที

**From-space quarantine.** หลัง evacuating minor เราไม่ recycle from-space แต่ถอด block เก่าใส่วงแหวนจำกัดขนาด เติม poison word ที่ไบต์แรกดูเป็น ¤obj_type¤ ผิดกฎหมาย (¤0xDE¤) และใช้ ¤mprotect(PROT_NONE)¤ กับด้านในที่ align ตาม page Stale dereference จึง SIGSEGV *ที่ instruction ต้นเหตุ* ขณะ holder ยังอยู่บน stack Reporter บอก address, minor ใด retire page และออบเจ็กต์เดิมคืออะไร จากนั้นคืน ¤SIG_DFL¤ แล้ว fault ซ้ำให้ debugger เห็นจุดจริง

**GC zeal.** บังคับ evacuating minor ทุก safepoint เพื่อให้ unrooted value ย้ายทันทีเมื่อเปิดเผย ไม่ต้องรอ allocation burst ที่ไม่เกี่ยวกันมาบังเอิญตรง window ได้แรงบันดาลใจจาก ¤--stress-scavenge¤ ของ V8 และ ¤gcZeal¤ ของ SpiderMonkey

**Depth knob ที่ไม่มีใครคิดว่าต้องใช้.** Quarantine เป็น ring ของ retired page-set จำนวน *N*, default 4 Reproducer ¤new C(…)¤ ของ #7154 ไม่ fault ที่ 4, 8 หรือ 100 เพราะ constructor ข้าม back-edge poll ราว 600 จุด เมื่อ return override เผย stale register ของ caller, page นั้นเก่าไป 600 retirements แล้ว ที่ ¤PERRY_GC_PROTECT_FROMSPACE_DEPTH=800¤ มัน fault ในการใช้ครั้งแรก “เพิ่ม depth” จึงเป็นคำแนะนำแรกเมื่อบั๊กต้องสงสัยไม่ reproduce

เครื่องมือถูก **ทดสอบด้วย sabotage** ไม่ใช่แค่รัน: ¤quarantine_catches_a_planted_stale_from_space_deref¤ ปลูก pattern #7184/#7192 และบังคับให้ instrument เห็น poison ในจุดที่ control ที่ไม่มี instrument อ่าน recycled object ที่ถูกต้องสมบูรณ์ Control นั้นพิสูจน์ว่าบั๊กมองไม่เห็นจริงหากไม่มีเครื่องมือ

ยังมี static instrument: ¤scripts/gc_root_dominance_check.py¤ อ่าน LLVM IR แล้วตรวจว่า root stores dominate จุดที่ collect ได้ทั้งหมด Gate CI มี allowlist **ว่าง**; hit ใหม่ทำ build แดง แต่โดยโครงสร้างมันมองไม่เห็น runtime tables, unrooted locals ใน runtime Rust และ symbol ที่ไม่รู้จัก เราระบุข้อจำกัดนี้ชัดเจนเพราะรายงานสะอาดเคยถูกใช้เป็นหลักฐานของสิ่งที่มันตรวจไม่ได้ถึงสองครั้ง

### 3. Knob ครึ่งหนึ่งไม่ได้ควบคุมอะไร

เรื่องนี้เปลี่ยนนโยบายวิศวกรรมมากกว่าโค้ด

เป็นเวลาหลายเดือน ¤PERRY_GEN_GC_EVACUATE¤ คือ knob ที่ใช้พิสูจน์ว่าการเปลี่ยนแปลงปลอดภัยภายใต้ evacuation เมื่อวัดอย่างถูกต้อง — binary เดียวกัน, host เดียวกัน, diff ทีละ cell ของ 12 ratchet probes × 8 counters — มันขยับ **0 จาก 96 cells** median เหมือนกันทุกบิต วิธีเดียวกันกับ ¤PERRY_GEN_GC=0¤ ขยับ 79 cells แสดงว่า harness ไวพอ แต่ knob นั้นไม่ใช่ มัน gate fallback path ที่ counters ไม่เคยมาจาก

ผลจริงเพียงอย่างเดียวเป็นกับดัก: มัน veto forced evacuation ดังนั้น ¤PERRY_GEN_GC_EVACUATE=0¤ ที่ค้างใน environment จะ disarm ¤PERRY_GC_ZEAL¤ เงียบ ๆ และ zeal run รายงาน “clean” ทั้งที่ไม่ย้ายอะไร

มันไม่ได้อยู่ลำพัง:

- ¤PERRY_GC_FORCE_EVACUATE¤ ถูกอ่าน **เฉพาะ minor path** แต่ทุก test ที่ใช้เรียก ¤gc()¤ ซึ่งทำ full mark-sweep หลัง forced conservative scan หลายเดือนของ “ผ่าน forced evacuation” จึงไม่มีความหมาย
- Knob ¤--pressure¤ ใน stress matrix ปิด path ที่กำลังวัด: defer hard cap กับ arena trigger ceiling ใช้สูตรเดียวกันและยุบพร้อมกัน; arm ¤default¤ ทำ copying minor เป็นศูนย์ทั้ง 22 แถว
- ¤PERRY_GC_FROMSPACE_SCAN_ABORT=1¤ ไม่ทำอะไรเมื่ออยู่ลำพัง: scan ไม่รัน จึงไม่มีอะไร abort และ run รายงานสำเร็จ
- Doc comment ของ ¤gc_incremental_enabled¤ บอก “EXPERIMENTAL — default OFF” เหนือ body comment “DEFAULT ON” แปดบรรทัด การตัดสินใจ merge ใช้อันผิด

นโยบายที่ตามมาถูกบังคับใน ¤CLAUDE.md¤:

> **GC env knob ทุกตัวต้องมี CI arm บังคับที่ exercise สถานะ OFF หรือถูกลบหลัง soak หนึ่ง release** ในเวลาเดียวกันมี diagnostic-only knob ได้ไม่เกินหนึ่งตัวและต้องติดป้ายว่า untested
>
> **Mode ที่ยังมีอยู่คือการตัดสินใจที่ยังไม่ได้ทำ**

¤PERRY_GEN_GC_EVACUATE¤ ถูกลบ ไม่ใช่ซ่อม ทุกตำแหน่งเก็บ tombstone comment อธิบายว่าเคยมีอะไรและทำไมจึงหายไป — ห้าจุดตรงตำแหน่งที่คนจะใส่ conjunction กลับ CI audit สร้างรายชื่อ knob ที่รับจาก production parser ที่ไม่ถูก comment และล้มเหลวเมื่อพบ claim ที่ยัง live ของ knob ที่ลบแล้ว Self-test ปลูก knob ที่ลบไว้หลัง parser ที่ comment และพิสูจน์ว่าไม่มีอันไหนผ่านได้

### 4. Gate ที่ไม่มีทางล้มเหลว

¤CLAUDE.md¤ ระบุสี่ทางที่ CI gate ไม่มีทางทำ merge ให้แดงได้โดยโครงสร้าง ทั้งสี่เคยเกิดกับ repo นี้ และสามข้อเกิดในสัปดาห์เดียว:

1. ¤continue-on-error: true¤ — ¤gc-stress¤ มีมันหลายเดือนทั้งที่เป็น job เดียวที่ครอบคลุมความถูกต้องของ GC
2. ไม่อยู่ใน required contexts ของ branch protection — job ที่รายงาน failure แต่ไม่ block เป็น documentation ไม่ใช่ gate
3. ¤concurrency¤ พร้อม ¤cancel-in-progress¤ แบบไม่มีเงื่อนไข — บน runner queue ช้า merge ใหม่ยกเลิก run ก่อนหน้าก่อนถึง runner; ¤gc-ratchet¤ ถูกยกเลิกบน ¤main¤ สามครั้งติดและรันจริงศูนย์ครั้ง
4. **Gate รัน แต่ subject ไม่เคยรัน** — อันตรายที่สุดเพราะ job เป็นสีเขียวจริง

แล้วพบอีกสองข้อ ¤gc-stress¤ *ไม่เคยรันบน ¤main¤ เลย*: trigger ¤push:¤ เป็น tags-only และเงื่อนไข ¤if:¤ ไม่รวม ¤schedule¤ ทำให้ nightly 12 จาก 12 รายการรายงาน ¤skipped¤ ส่วน ¤lint¤ ซึ่งเป็น required context แดงมาสาม nightly ขึ้นไปเพราะ 16 ไฟล์เกินเพดาน 2000 บรรทัด นั่นแปลว่าทุก merge เข้า repo ผ่าน admin bypass Branch protection เป็นเพียงฉาก และ gate ใหม่ที่ต่อผ่าน ¤lint¤ อย่างถูกต้องก็จะไร้ผลตั้งแต่วันแรก

ข้อสรุปที่เราต้องเรียนซ้ำ: **gate ต้อง assert ว่า subject ของมัน live ไม่ใช่แค่ไม่มีอะไร throw** Zeal run จึงพิมพ์ ¤forced_collections=… copying_minors=… moved_objects=… loop_polls=…¤ ตอนจบและ **exit 70 ถ้าค่าใดเป็นศูนย์** run ที่ไม่ได้ exercise อะไรต้องแดง ไม่ใช่เขียว

### 5. Collector คอย schedule collection ที่ช่วยอะไรไม่ได้

บั๊กโครงสร้างที่เกิดซ้ำสามครั้งโดยอิสระมีรูปเดียวกัน: *predicate schedule collection ที่เปลี่ยนค่าซึ่ง predicate อ่านไม่ได้*

**Survivor-promotion handoff (#7592).** Predicate แทน minor ด้วย full mark-sweep เพื่อเปิดที่ใน old-gen ให้ survivor ที่กำลังจะ promote แต่ full mark-sweep เป็น non-moving — ไม่ promote อะไร — จึงลด pressure ที่ทำให้มันถูก schedule ไม่ได้ และเป็นจริงอีกใน minor ถัดไป บน JSON pipeline 200k records: **19 จาก 22 collections เป็น full เหล่านี้ แต่ละตัวคืน 0.0 MB ที่ราว 400 ms** รวม 7.6 s ของ phase 8.6 s ส่วน copying minor ที่จะทำ promotion จริงไม่เคยรัน

**Nursery cap (#7690).** Cap อิง from-space occupancy แต่ใช้กับ minor แบบ *non-moving* ที่ sweep อยู่กับที่และปล่อย from-space ให้ยังเต็ม เมื่อ capped trigger เรียก non-moving minor มันจึงถึงกำหนดอีกใน block ถัดไป: whole-arena collection หนึ่งครั้งต่อ allocation 1 MB และต้นทุนเป็น quadratic ตาม live set

**Live-proportional cap ที่กลายเป็น fixed point.** ความพยายามให้ cap โตตาม live set ใช้ ¤max(base, arena_in_use)¤ แต่ due test เปรียบเทียบ *from-space occupancy* กับ cap และ workload นั้นมี from-space ≈ live ดังนั้น from-space ไม่มีทางข้าม cap ของตัวเอง Scavenging หยุดทั้งหมดและดูเร็วขึ้น 5.9× เพราะไม่ได้ทำงาน

กฎสองข้อที่รองรับ pacing code จึงเป็น:

> **อย่า pace collection ด้วย quantity ที่ collection นั้นขยับไม่ได้**
>
> **อย่าใช้ constant band pace collector ที่ต้นทุนต่อ cycle เป็น O(live)** งานรวมจะเป็น quadratic ตาม live set และ constant ที่ใหญ่ขึ้นเพียงเลื่อนหน้าผา

การแก้ family นี้ทำให้ JSON workload หนึ่งลดจาก **60.4 s เหลือ 3.86 s** และ per-record cost แบนอยู่ภายในราว 30% ตลอดช่วงขนาด 20× ซึ่งเดิมโต 70×

### 6. ครั้งหนึ่ง collector บันทึกการเปลี่ยนแปลงที่ไม่เคยทำ

บรรทัดที่แพงที่สุดของเรื่องนี้คือ doc comment

#7690 เขียนเหตุผลครบถ้วนสำหรับเปิด moving-loop back-edge polls โดย default ไว้ใน doc comment สองจุด — runtime และ codegen — แต่ **ไม่ได้เปลี่ยน body ทั้งคู่** ทั้งสองยัง match เพียง ¤1|on|true¤ ซึ่งหมายถึง default OFF และไม่มี test pin default Runtime comment ยังบอกว่า “mirror ใน codegen ต้องตรงกัน” ซึ่งก็ตรงกันจริง แต่ตรงกับค่าที่เอกสารบอกว่าเลิกใช้แล้ว

นี่ไม่ใช่แค่ configuration ช้ากว่า แต่มันคือ collector คนละแบบ Nursery pressure มี precise collection point เพียงสองจุด: loop back-edge poll กับ outermost microtask-pump boundary เมื่อไม่มี poll โปรแกรม compute-only จะไม่ถึงทั้งคู่ Nursery collection ทุกครั้งจึงตกที่ allocation point ซึ่ง fix ก่อนหน้าทำให้ collection ถูกต้องแบบ non-moving **Collector ที่ส่งจริงไม่มี nursery evacuation เลย** และถอยไปใช้ whole-arena full collections

| bench | ¤main¤ ที่ส่ง | เปิด polls จริง |
|---|--:|--:|
| tree | 5.10 s | **1.63 s** |
| tree_wide | 7.26 s | **2.12 s** |
| retain | 2.33 s | **1.32 s** |
| churn | 1.00 s | **0.46 s** |
| cycles | 0.29 s | **0.19 s** |

Benchmark หนึ่งทำ **whole-arena full 13 ครั้ง (pause 0.477 s)** ในจุดที่โปรแกรมเดียวกันก่อนหน้านั้นทำ **copying minor 105 ครั้ง (0.016 s)** Pause GC รวมของ ¤tree¤ ลด 4.107 s → 0.550 s และ max pause 266 ms → 16 ms สิ่งที่ค้นพบปัญหาไม่ใช่ wall time แต่คือ *ชนิด* cycle ใน ¤PERRY_GC_TRACE=1¤: ¤{'full': 13}¤ แทน ¤{'minor': 105}¤

ตอนนี้ test สามตัว pin default รวมถึง unrecognised-value arm และอีกตัว pin ว่าสอง crate เห็นตรงกัน เพราะหากไม่ตรงจะเงียบทั้งสองทาง — poll ที่ไม่มีใคร consume หรือ deferral ที่ไม่มีใคร drain — จึงต้องมี assertion ไม่ใช่ doc comment สองชุดที่อ้างว่าตรงกัน

Class นี้ยังไม่ปิด Profiling รอบล่าสุดพบรูปเดียวกันใน write barrier: **codegen emit ¤seq_cst¤ load ของ barrier-active counter — เป็น ¤ldar¤ บน aarch64 และ ¤evalNode¤ มี 42 จุด — ขณะที่ runtime อ่าน global เดียวกันแบบ ¤Relaxed¤ เพื่อการตัดสินใจเดียวกัน** ส่วน doc comment ของ codegen บอกว่าเป็น “one relaxed load of a ¤static¤” Reader สองตัวของ global เดียวกันไม่เห็นพ้องเรื่อง ordering และเอกสารเข้าข้างโค้ดคนละฝั่ง อย่างมากมีเพียงตัวเดียวที่ถูก หาก runtime ผิด ความเสียหายร้ายแรงกว่า ¤ldar¤ มาก เราจึง file ไว้แทนการเดา เพราะ missed insertion barrier จะเงียบในเวลา collection แล้วโผล่อีกหลาย cycle ต่อมาเป็น ¤TypeError: value is not a function¤

### 7. งาน GC ที่เร็วที่สุดคืองานที่ลบทิ้ง

เมื่อ pacing bugs หายไป ต้นทุนที่เหลือซ้ำแล้วซ้ำอีกคืองานที่ไม่ควรมี

**Heap ที่ไม่มีอะไรตายถูก mark ซ้ำ ๆ.** ¤retain.ts¤ สร้าง array 3M elements ของ records และไม่ทิ้งเลย Perry ใช้ **1.26 s จาก run 1.31 s ใน collector** — 96% — ขณะที่ Node ใช้ 0.13 s Full mark-sweep สองครั้งคืนรวม 4 MB และครั้งหนึ่งเปลี่ยน arena occupancy เป็นศูนย์พอดี เพราะ escalation predicate อิง growth และ live set ที่โตจะข้าม threshold ทุกครั้งที่เพิ่มเท่าตัว Fix คือคิดราคาของ full จากสิ่งที่ reclaim ได้ และเลื่อน threshold ออกไปเมื่อ full พิสูจน์ว่าไม่คุ้ม

**ทุกออบเจ็กต์ที่ evacuate ล็อก mutex ระดับ process เพื่อ hash map ว่าง.** Move hook ทำ SipHash ¤remove¤ ใน registry ที่เหลือจาก ¤Object.setPrototypeOf¤ ซึ่งว่างในโปรแกรมที่ไม่ re-prototype มี latch บอกอยู่แล้ว แต่ hook เป็น reader เดียวที่ไม่ใช้มัน Promotion ของ 3M records จ่าย mutex acquisition จริงแต่ไร้ประโยชน์ 2.5M ครั้ง

**จากนั้นเราหยุดย้ายออบเจ็กต์เลย.** เมื่อ nursery ของ copying minor แทบทั้งหมด live, การ evacuate ทีละออบเจ็กต์เป็น overhead ล้วน: old-gen allocation ใหม่, ¤memcpy¤, layout transfer, accounting, move hook, forwarding stub และ rewrite ทุก slot เพื่อย้ายสิ่งที่ไม่มีเหตุผลต้องย้าย Whole-block in-place promotion — V8 เรียก page promotion — เพียงเปลี่ยน generation label ไม่มีอะไรย้ายจึงไม่ต้อง rewrite:

| workload | ก่อน | หลัง |
|---|--:|--:|
| retain | 0.81 s | **0.53 s** |
| retain_wide | 1.33 s | **1.07 s** |
| deeplist | 0.30 s | **0.24 s** |
| promotion cost/object | 243 ns | **105 ns** |

**แล้วเราก็หยุด trace มันด้วย.** แม้หลังจากนั้นสาม pass ยังเดินทุก survivor — remembered-set dirty scan mark, drain แตะซ้ำ และ ¤clear_marks¤ แตะครั้งที่สาม ใน cycle ที่ไม่มีอะไรย้ายหรือถูก free, trace ใช้ราว 55–67 ns ต่อ object ขณะที่ walk ที่ promote จริงใช้ราว 9 ns ตอนนี้ promoting cycle ข้าม trace เมื่อ young-survival ratio ล่าสุดอยู่ในช่วง fully-live และปฏิเสธชัดเจนเมื่อ assumption ใดมีต้นทุน: weak-target holder ที่ลงทะเบียน, malloc registry ไม่ว่าง, incremental mark กำลังทำงาน หรือ verify instrument สามตัวใด arm อยู่ เพราะแต่ละตัวใช้ trace เป็น subject และ cycle ที่ไม่สร้าง mark จะทำให้ทุกตัวรายงานสำเร็จทั้งที่ไม่ตรวจอะไร ผลคือ ¤retain¤ −33.6%, ¤deeplist¤ −43% และ cycle จาก 243 ns ต่อ object เหลือ **8.9 ns**

นโยบายเบื้องหลังเป็น *measurement* ไม่ใช่การเดา Liveness ของ block รู้ไม่ได้ก่อน trace ดังนั้นตัดสินใจแต่ละ cycle จาก young-survival ratio ที่วัดรอบก่อน ประชากรกลับเป็น bimodal ต่างกันสามลำดับขั้น:

| กลุ่ม workload | copying minors | young-survival ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0.999 – 1.000 |
| churn, churn_alloc, push_cls | 105 | 0.000 – 0.004 |
| push_num, cycles | 16–18 | 0.000 |
| tree, tree_wide, churn_read | 0 | *ไม่มี copying minor รันเลย* |

Cycle ที่ทำนายผิดเก็บไว้ได้มากสุดเพียงไม่กี่เปอร์เซ็นต์ของ nursery หนึ่งชุด, promoting cycle ยัง trace บ่อยพอจะวัดตัวเอง และ running cap บน promoted dead bytes จำกัด steady state

ควรพูดตรง ๆ ว่า **เรื่องเล่า “กลไกเดียว” มักผิด และ profile ของคุณเปลี่ยนใต้เท้า** Pause fraction วันนี้ซึ่งวัดจาก commit เดียวกับตารางอันดับท้ายบทความ:

| program | wall | GC pause | pause fraction | cycles |
|---|--:|--:|--:|--:|
| retain | 159.5 ms | 52.0 ms | 33% | 5 |
| retain1 | 71.4 ms | 38.7 ms | 54% | 3 |
| retain_wide | 206.2 ms | 75.4 ms | 37% | 8 |
| shapes | 64.8 ms | 4.6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

สองค่าเคยเป็น 93% และ 62% หนึ่งสัปดาห์ก่อน งานใน section นี้ทำให้มันหาย ¤shapes¤ ที่ 7% ไม่ใช่ benchmark GC อีกแล้ว — ก่อนบั๊กใน §8 มี GC 94 ms จากโปรแกรม 139 ms และเราเคยจัดเป็น “high-survival GC” จาก ratio นั้น GC lever ขยับมันไม่ได้แล้ว Ratio ที่ดูสม่ำเสมอข้าม benchmark เป็นเพียงความบังเอิญทางเลข ไม่ใช่สาเหตุร่วม

### 7b. “ศูนย์ cycle” ไม่ได้แปลว่า “ไม่มีต้นทุน GC” — counter ที่เราอ่านเป็นข้อสรุป

แถว ¤asyncpipe¤ บอก pause 0 ms ใน 0 cycles และเราเขียนภายในว่า “pure mutator; ทุก GC lever ไม่เกี่ยวข้อง” Profiling ที่รับ premise นี้กลับมาหักล้างมัน

¤asyncpipe¤ ไม่พิมพ์ ¤[gc]¤ เลย แต่ **ราว 33% ของ leaf profile ยังเป็น machinery ของ collector**: write barriers, per-object side tables และ rooting ด้วย ¤RuntimeHandleScope¤ การปิด moving-loop back-edge polls วัดได้ **−14.1% ทั้งที่โปรแกรมยังทำ GC cycle เป็นศูนย์** Old-generation incremental mark/sweep เดินหน้าที่ polls เหล่านั้นแต่ไม่จบ cycle จึงไม่ report นี่เป็น lever ใหญ่ที่สุดของรอบ และ premise ชี้ profiler ไปทางตรงข้าม (¤PERRY_WRITE_BARRIERS=0¤ ให้ +0.9% จึงพ้นข้อสงสัย codegen barriers; ปัญหาคือ incremental drive)

> **Cycle counter วัด collections ไม่ได้วัดต้นทุนของ collector**

Barrier, side-table maintenance, rooting และ incremental slices อยู่ฝั่ง mutator จึงมองไม่เห็นใน per-cycle trace โดยโครงสร้าง ¤0 cycles¤ ดูเหมือนข้อสรุปแต่เห็นเพียงกลไกเดียว

กับดักที่เกี่ยวกันคือ ¤asyncpipe_big.ts¤ **ไม่ใช่ scaled version ที่ใช้ได้** ที่ 120 batches มี 0 cycle, 240 มี copying minor 2 ครั้ง และ 1200 มี GC ครองเวลา การ scale เพื่อหนี timing noise เปลี่ยนมันเป็น benchmark คนละตัวเงียบ ๆ เหมือน realistic variants ว่างใน §9; เราจับได้เพราะตรวจว่าคุณสมบัติที่ศึกษายังคงอยู่หลัง scale

### 8. เหนือเส้นไปสิบหกไบต์

บั๊กเดี่ยวที่ดีที่สุดของแคมเปญ ¤shapes¤ ใช้ 94 ms จาก run 139 ms ใน minor collections สองครั้ง และรายงาน survival ratio 739‰ กับ 925‰ ทั้งที่ live set จริงมีราว 3200 objects

¤arena_alloc_gc¤ สร้างสิ่งใดที่ใหญ่กว่า ¤LARGE_OBJECT_THRESHOLD_BYTES¤ — 16 KB — ตรงใน old-gen และ mark ¤TENURED¤ Backing store ของ ¤Node2D[]¤ 2000 elements มี 16,400 bytes **เกินไปสิบหกไบต์**

ทุก array จึง live ถาวร — minor ไม่ sweep old-gen —, write barrier บันทึก edge old→young ทุก store อย่างซื่อสัตย์ และ minor ถัดไป remark ทั้ง 2000 ตัว: 94,000 แล้ว 118,006 slots

Fix น่าสนใจเพราะ “เพิ่ม threshold” จะผิด การข้ามเส้นแลก *copying cost* กับ *retention cost* สำหรับ object ไม่มี pointer ทั้งคู่จำกัดด้วยขนาด จึงคง 16 KB แต่สำหรับ object มี pointer retention เป็น transitive และไร้ขอบเขต; arrays, objects และ closures ได้ 128 KB — ¤kMaxRegularHeapObjectSize¤ ของ V8 ขีดเส้นเดียวกันด้วยเหตุผลเดียวกัน การเลือกอ่าน flag ¤pointer_free¤ ที่มีอยู่ ไม่ hard-code รายชื่อ type; unknown type ใช้ค่าระวัง

¤shapes¤ ลด 0.139 s → 0.061 s ในรอบนั้น — 0.058 s และเร็วกว่า Node **1.39×** ใน sweep สุดท้าย —, peak RSS 71.4 MB → 32.3 MB อีก 18 โปรแกรมอยู่ภายใน ±1.3%

### 9. การวัดยากกว่าการแก้

รายการบางส่วนของสิ่งที่ให้ข้อสรุปผิดอย่างมั่นใจ:

- **Benchmark เทียบกับ ¤main¤ ที่พัง.** หลายวันโปรแกรม allocation-heavy ช้าราว 20× จาก surprise #6 ทำให้ A/B ไร้ค่า Signature ที่ไม่ขึ้นกับ load คือ collections 105 → 1304 แต่ไม่มีใครดูเพราะตัวเลขแค่ *แย่* ไม่ได้ดูเป็นไปไม่ได้
- **Auto-optimize relink สร้าง runtime ด้วย ¤--no-default-features¤**, ถอด ¤diagnostics¤ เงียบ ๆ ¤PERRY_GC_TRACE¤ ไม่พิมพ์และ cycle ดูเป็น **0** Investigation หนึ่งสรุป “ไม่มี collection” ในสาม arms
- **Ratchet baseline ที่ pin คนละ host และเก่ากว่าสามสิบ revision** รายงาน “regression” 29 ตัวซึ่งเป็น drift วัดสอง arms ต่อกันบนเครื่องเดียวเสมอ
- **ผล pretenuring 108 MB → 0 เป็น confound**: baseline arm อยู่ก่อนการเปลี่ยนแปลงกลางทาง กลไกถูกแต่ target ผิด — parse tree ที่ runtime allocate ไม่ใช่ literal ที่ codegen เห็น — และเพดานจริงราว 1 MB
- **เราจับเวลาโปรแกรมที่ crash อยู่หลายสัปดาห์.** Binary คู่แข่งพิมพ์คำตอบถูกใน ¤deeplist¤ แล้ว exit −11 (SIGSEGV) ตอน recursive refcount drop เราบันทึกเป็นความพ่ายแพ้ ตอนนี้ทุก harness เก็บ exit code ต่อ cell
- **¤grep -c¤ exit 1 เมื่อ match เป็นศูนย์**, ทำให้ chain ¤&&¤ ถูกตัด และ pipe ของ ¤PERRY_GC_TRACE¤ เคยเจอ SIGPIPE กับ exit 141

กฎที่รอดคืออ้าง census counter ไม่ใช่นาฬิกา — มันไม่ขึ้นกับ load —; เปรียบเทียบ *binary* ก่อน timing; assert ว่าการเปรียบเทียบได้เปรียบเทียบอะไรจริง; และตรวจว่า arm ที่กล่าวถึง live จริง

---

## ส่วนที่ 3 — ถนนยาวสองสาย

### Statepoints: เส้นทางที่เลือก หลังสี่เดือนและ enabler สามตัว

ตั้งแต่ prototype แรก ¤gc.statepoint¤ ของ LLVM เห็นได้ชัดว่าเหนือกว่าด้าน correctness มันมี **relocation semantics ที่ optimizer ต้องเคารพ** ขณะที่ shadow stack ถูกต้องก็ต่อเมื่อ optimizer ไม่ฉลาดกับค่าที่เราลืม spill สิ่งน่าสนใจคือทุกอย่างระหว่าง “ดีกว่าอย่างชัดเจน” กับ “ส่งเป็น default” เพราะความล่าช้าไม่เกี่ยวกับ performance เลย

**มันติดสิ่งที่ไม่ใช่ GC.** Exception ถูก lower เป็น ¤setjmp¤/¤longjmp¤ และ ¤longjmp¤ กระโดด *ข้าม* ¤gc.relocate¤ ได้ ทำให้ pointer ที่ relocate ไม่ถูกเขียนกลับ ภายใต้ RS4GC แย่กว่าเพราะ ¤mem2reg¤ ไม่ promote volatile allocas ที่ setjmp ต้องใช้เพื่อ correctness ดังนั้น roots ใน try-region ไม่เข้า SSA และไม่ถูก relocate ¤gc.statepoint¤ มี invoke form เพื่อเรื่องนี้พอดี ถนนสู่ statepoints จึงผ่านการลบ setjmp exception lowering ของ Perry ทั้งหมดและแทนด้วย invoke/landingpad (#7302/#7305) รวมถึงย้าย LLVM มา in-process (#7301) เพื่อควบคุม pass pipeline ไม่มีอันไหนเป็น ticket GC

**ทางประนีประนอมที่น่าดึงดูดคือกับดัก.** “เก็บ shadow stack ไว้สำหรับ function ที่มี ¤try¤” จะตรึง root mechanism สองชุดไว้ตลอดไป ส่วน “ลบ shadow stack แล้วเก็บ statepoints” ก็ *แสดงออกไม่ได้* เพราะ statepoints เป็น lowering อีกแบบของ root-set analysis จาก shadow stack ไม่ใช่กลไกอิสระ การแยก predicate (#7340) ทำให้ default ตาม target และการลบในอนาคตเป็นไปได้ ก่อนหน้านั้น ¤PERRY_SHADOW_STACK=0¤ พร้อม statepoints สร้าง binary ที่ **ไม่มี precise roots เลย**, ไม่มี ¤__perry_gcmap¤, ให้ output ถูก และแยกจาก build ดีไม่ได้จน collection free ของที่ยัง live

**หนึ่งในสอง backend ต้องตาย.** เราเคยถือ bridge statepoint ที่เขียนมือคู่กับ RS4GC แต่ไม่เคยเท่าเทียม: bridge root ¤invoke¤ ไม่ได้จึงปฏิเสธ function ที่มี try และยังเป็น silent fallback ของ RS4GC ซึ่งเป็นรูป configuration ไม่ได้ทดสอบที่ knob kill-policy ป้องกัน ก่อนลบเราวัดว่า **1,574 functions จากแอป Drizzle จริงและ ratchet probes ทั้งหมด lower ด้วย RS4GC ไม่มี fallback** Bridge, CFG liveness analysis, call parser, emitter, enum ¤PreciseRootBackend¤ และ knob ¤PERRY_STATEPOINTS¤ ถูกลบทั้งหมด ตอนนี้ bail เป็น hard failure ที่บอกชื่อ function ไม่ใช่ downgrade

**แล้ว default ถูกส่งโดยไม่มี coverage.** Native roots เป็น default บน walkable target หลายเดือน ขณะที่ **root-lowering mechanics เก้ารายการไม่มี assertion ต่อ lowering ที่ Perry emit จริง** และ tests สามตัวที่ดูเหมือน coverage ไม่วัดอะไร: assert ว่า ¤js_shadow_slot_bind¤ *ไม่มี* ซึ่งภายใต้ native default จริงกับทุกโปรแกรมไม่ว่าจะ rooted หรือไม่ Hazard 4 กลับมาในระบบที่มีหน้าที่ไม่ทำ roots หายเงียบ ๆ #7653 แก้ด้วยสามมุมมอง — IR ก่อน ¤opt¤, bundle ¤"gc-live"¤ หลัง RS4GC และ blob ¤__perry_gcmap¤ ที่ decode — เพราะแต่ละมุมตาบอดต่อสิ่งที่มุมถัดไปจับ Root-dominance checker ก็ anchor ที่ ¤@js_shadow_slot_bind¤ จึง compile corpus ด้วย ¤PERRY_RS4GC=0¤ และตรวจ lowering ที่เราไม่ส่ง จน #7663 สอนมันเรื่อง statepoints

กฎ design หนึ่งเกิดจากผลลบที่วัดได้: **root metadata ที่ไม่มี relocation semantics ไม่ sound ภายใต้ optimizing compiler** Scheme metadata ต่อ function ที่กะทัดรัดให้ map เล็กลง 10–13× แต่ทำ churn loop 10 บรรทัดเสียอย่าง deterministic ไม่ใช่เพราะ map ผิด แต่ mutator อ่าน from-space ผ่าน heap-derived SSA value ที่มีเพียง relocation แก้ได้ Barrier จำกัด memory ordering ไม่ได้จำกัด dataflow

### Unboxing: กำลังดำเนิน และตอนนี้คือเรื่องหลัก

ถนนยาวอีกสายมาจากส่วนที่ 1: ทำ unboxed native representation ให้ canonical และลด NaN-boxing เป็น polymorphic fallback Phase 1 (scalar locals), 2 (specialised ABI), 3a/3b (strings และ ¤Ptr<Shape>¤ pointer locals) และ 4a/4b (typed heap: numeric arrays ตามด้วย bookkeeping ที่ boxed layout จ่ายเกินจำเป็น) merge แล้ว

มีสองเรื่องที่ควรรายงานอย่างตรงไปตรงมา

**Sub-phase หนึ่งถูกประเมินและปฏิเสธ และเหตุผลนั้นเป็นคำชม NaN-boxing.** Unboxed *object fields* — headline เดิมของ Phase 4b — ถูก scope out หลัง recon แทนการสร้าง Slot field ¤number¤ มี raw IEEE bits อยู่แล้วเพราะ NaN-boxing จองเพียง ¤0x7FF9..=0x7FFF¤ ดังนั้น ¤raw_f64_mask¤ เป็น *proof bit* ไม่ใช่การเปลี่ยน storage และ read guard หายไปแล้ว Raw string handle ที่พักอยู่จะทำลาย small-string optimisation ด้วยการ heap-materialize short strings โดยไร้เหตุผล ส่วน raw ¤i1¤/¤i32¤ slots ต้องมี mask ที่สามและ layout probe ใน direct slot-read sites ราว 25 จุด รวม ¤JSON.stringify¤, ¤util.inspect¤ และ ¤v8¤ serde — ล้วนเป็น hot path สิ่งที่ส่งแทนคือ elision: field store บน proven receiver เลิก layout note เมื่อค่าเป็น non-pointer โดย construction และเลิก string addref เมื่อค่าเป็น heap string ไม่ได้

**และ GC ส่ง target ถัดไปให้แคมเปญ.** การวัดปิดท้ายในส่วนที่ 4 บอกว่า collector ไม่ใช่ binding constraint ของ cluster ที่ยากที่สุดอีกต่อไป แต่เป็น mutator โดยเฉพาะว่า **object literal สอง field ใช้ 72 bytes** นี่คือ representation problem ตาม RFC โดยตรง และเป็นเป้าหมายถัดไปของ “actual objects”

### ถนนที่ไม่ได้เลือก

**Concurrency.** คำสั่งจากเจ้าของเมื่อตั้งคำถามตรง ๆ:

> “ผมไม่ต้องการไล่ตาม parallelism/concurrency เพียงเพื่อให้มีมัน ควรเป็นทางเลือกภายหลังสำหรับงานที่จำเป็น แต่ต้องไม่แลกกับ hot path”

ข้อจำกัดนี้ *ตัดสิน* design ไม่ได้เพียงเลื่อนไป สาม family ต่างกันตรงที่คิดค่า mutator: parallel stop-the-world ไม่คิดอะไร — GC threads มีชีวิตเฉพาะใน pause —; concurrent marking คิด store barrier ทุก pointer write; concurrent compaction คิด **load barrier** ทุก pointer read และ loads มากกว่า stores มาก จึงเป็นคำปฏิเสธที่แรงที่สุด Parallel STW เป็น design เดียวที่รับได้ และอยู่อันดับสามหลัง (1) ลบ per-object work ที่ไม่ควรมี และ (2) pretenure immortal cohort การ parallelize 2.1M object visits ที่ไม่ควรเกิดคือใช้สี่ core ทำงานผิดให้เร็วขึ้น

Measurement เห็นตรงกันและแรงกว่า directive หลังงานใน §7, per-object visits ใน promotion case ที่แย่ที่สุดแบ่งครึ่งเป็นงานที่ลบทิ้งกับ **9.6 ms ของโปรแกรม 159 ms** เวลา collector เหลือไม่พอให้ parallelize คุ้ม — GC เร็วขึ้น 2× ทำให้โปรแกรมเร็วขึ้นเพียง 3% Parallel GC ไม่ใช่แผนที่เลื่อนไว้ แต่เป็น non-lever ที่วัดแล้วใน workload ชุดนี้

ยังมี correctness argument ที่เราให้ความสำคัญมากกว่า performance: วันนี้ “บั๊ก GC ที่ reproduce ได้สมบูรณ์หมายถึง table ไม่ใช่ register” เป็น diagnostic จริง Parallel collector ทำลายมัน และทำ root scanner 79 ตัวกับทุก ¤thread_local!¤ cache ให้เป็น data race ที่เป็นไปได้

**Old-page defragmentation — เปิดเป็น default แล้ว revert วันเดียวกัน.** การ compact old pages ที่ live บางส่วนถูกปิดตั้งแต่บั๊ก 2026-07 reproduce stale non-heap reference ไปยัง old object ที่ย้าย (corruption 6/6 เมื่อเปิด) การเปิดใหม่ถูกติดตามเป็น *rewrite-contract project* ไม่ใช่ env flip โดย acceptance bar คือ enumerate ทุก metadata/IC/cache path ที่เก็บ movable old address ได้ และ **“เปิด defrag อีกครั้งต่อเมื่อ reproducer และ dependency-scale stress corpus สะอาด”**

Contract work เข้าและ audit ดี: static root-dominance allowlist ยังว่าง จึงแก้ hit ที่เคย exempt ราว 40 ตัวจริง ไม่ suppress ใหม่; runtime holder policy ถูก *เข้มขึ้น* ให้ verdict ¤open_gap¤ และ ¤unverified¤ fail; cache สองตัวที่ความปลอดภัยอิงคำว่า “มีเพียง old-gen defrag ที่ย้ายมันได้” ถูกแก้แทน exempt และยังทำตาม tripwire ¤becomes_real_when¤ ที่ระบุ trigger นี้ตรง ๆ

แต่ **default flip** มากับงานโดยไม่มีหลักฐาน เพราะ suite ไม่มีทางให้ได้โดยโครงสร้าง Selection ต้องมี ¤dead_bytes >= live_bytes¤ ใน old page หรือ promote-then-die ใน scale Family ¤retain¤ รอด 999–1000‰ และ ¤churn¤ แทบไม่ promote ดังนั้น **ไม่มี benchmark ใดสร้าง candidate page ได้** Suite ให้ทั้ง benefit signal และ regression signal ไม่ได้ แต่รับ rewrite surface ของ old address เต็ม ๆ และ GC gate ทุกตัวยัง queued ไม่ได้รันตอน merge

เราจึงเก็บ correctness work ทั้งหมดและ revert default เป็น opt-in จนมี fragmentation workload ที่ exercise มันจริง จากนั้นจะลบ arm ที่แพ้ กฎใหม่คือ:

> **Feature ที่ benchmark suite trigger ไม่ได้ คือ feature ที่ suite ปกป้องไม่ได้** ส่งโดย default OFF จนมี workload ทำได้ หรือยอมรับว่าทั้งสอง arm ไม่ถูกทดสอบ

**Pretenuring.** สร้างสองครั้ง, วัด, หักล้าง และพักไว้พร้อมเงื่อนไข reopen ที่เขียนชัด สิ่งที่ถูกตามสถาปัตยกรรม — วาง long-lived objects ใน old-gen ตั้งแต่เกิด — แพ้สิ่งที่เพียงพอโดย emergent behavior — seed promote-on-first-copy ที่จำกัด cohort ให้ย้ายครั้งเดียว ทุก load ที่สร้างได้แยกสอง arm ไม่ออก Meta-lesson เข้าสู่ practice โดยตรง: **ทดสอบ discriminating shape ก่อนสร้าง invariant**

---

## ส่วนที่ 4 — ตอนนี้เป็นอย่างไร

Closing sweep วันที่ 2026-08-12 บน M1 mini ที่นิ่งและ pin, best-of-5, ตรวจ exit code, ตรวจ output ทีละ byte กับ ¤node --experimental-strip-types¤ ก่อนจับเวลา Benchmark ที่มีรูปแบบ GC 19 รายการ เทียบ Node 26.5.1 และคู่แข่ง AOT แบบ reference counting

**Perry ชนะ Node 9 จาก 19 รายการ** (เดิม 3), **ชนะ compiler แบบ reference counting 14 จาก 19** และ **อยู่ภายใน 1.3× ของ Node ใน 15 จาก 19**

| bench | perry | node | P/node | Δ รอบนี้ |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

สิ่งที่เหลือคือสอง cluster ที่ **แยกจากกัน** และการมองเป็นกลไกเดียวคือความผิดที่เราเคยทำ:

1. **เทียบ Node — dispatch และ mutator, ส่วนใหญ่ไม่ใช่ GC.** ¤iso_miss¤, ¤interp¤, ¤pipeline¤, ¤asyncpipe¤ ส่วนใหญ่คือ polymorphic property dispatch, inline cache และ representation selection — เป็นอีกแคมเปญ แต่อ่านคำแก้ด้านล่างก่อนตีความ 0% ของ ¤asyncpipe¤ ว่า “ไม่มี GC”
2. **เทียบ compiler แบบ reference counting — family ¤retain¤.** ¤retain1¤ 1.80×, ¤retain_wide1¤ 1.67×, ¤retain_wide¤ 1.65× ทั้งหมดชนะ Node แล้ว นี่คือแถวที่ไม่มีอะไรตาย ซึ่งตรงกับจุดที่เราคาด tracing collector จะแย่ที่สุด — และความคาดนั้นผิดในทางที่น่าสนใจ

ข้อค้นพบจาก closing sweep ที่เปลี่ยนกรอบทั้งแคมเปญคือ **ใน cluster ที่สอง collector ไม่ใช่ binding constraint อีกต่อไป — mutator ต่างหาก** ลบ *GC pause ทั้งหมด* ออก ¤retain_wide¤ (pure mutator 130.8 ms) และ ¤shapes¤ (60.2 ms) ยังแพ้ ¤retain¤ ต้องมี GC เป็นศูนย์พอดีจึงเสมอ ต้นทุนจริงคือ **object literal สอง field ใช้ 72 bytes** ทำให้ ¤retain¤ เขียน **หน่วยความจำ 216 MB เพื่อเก็บตัวเลข 48 MB** — write amplification 4.5× Edge ของคู่แข่งไม่เคยมาจาก refcount แต่มาจาก compactness ตอนนี้เป็น representation problem (#7916) ไม่ใช่ collector problem — แคมเปญ unbox-by-default จากส่วนที่ 1 ที่มุ่ง object layout แทน scalar

มี defect คู่กันในอีก cluster: ¤asyncpipe¤ collect ที่ 1,200–1,650 ns ต่อ object รวม **minor collection 122 ms ที่จัดการศูนย์ object** — ยาวกว่าโปรแกรมทั้งตัว Cost ต่อ cycle ที่ไม่ขึ้นกับ object count คือ fixed overhead และเป็นชิ้นสุดท้ายของ collector ที่ยังเห็นได้บน critical path (#7915)

สิ่งหนึ่งที่ลองและบันทึกเป็นผลลบเพราะดูเป็นก้าวถัดไปชัดเจนแต่ผิดคือ **อย่าลด nursery แรก** Cycle 0 เป็น 58–81% ของ GC pause ใน retain family จึงดูเหมือน cap ได้ฟรี ที่ 2 MB pause ของ ¤retain¤ ลด 52 → 31 ms แต่ ¤asyncpipe¤ จาก 0 collections เป็น 4 ใช้ 385 ms บนโปรแกรม 127 ms และ promotion ที่เร็วขึ้นเลื่อน old-gen trigger ไปเป็น full mark-sweep เพิ่ม (¤retain_wide1¤ +182%)

เพื่อเห็น scale จากจุดเริ่ม: JSON pipeline ที่เปิดแคมเปญลด 60.4 s → 3.86 s Family ¤retain¤ ขยับ 36–46% ในรอบเดียวของงานด้านบน และ collector ทั้งหมดยังมี kill switch ไป full mark-sweep (¤PERRY_GEN_GC=0¤) ที่เรา exercise อยู่ เพราะวันที่ bisect กับมันไม่ได้คือวันที่เชื่อตัวเลขเหล่านี้ไม่ได้อีก

---

## กฎที่เราใช้ทำงานในตอนนี้

สิ่งที่เรียนรู้ส่วนใหญ่ใช้ได้ไกลกว่า garbage collection:

1. **Mode ที่ยังมีอยู่คือการตัดสินใจที่ยังไม่ได้ทำ** ลบ branch ที่แพ้ หรือเก็บ arm ที่ exercise มัน ทิ้ง tombstone comment ในจุดที่ลบ
2. **Gate ต้อง assert ว่า subject live** ไม่ใช่เพียงไม่มีอะไร throw “เขียวเพราะไม่ได้รันอะไร” แย่กว่าแดง
3. **อย่า pace feedback loop ด้วย quantity ที่มันขยับไม่ได้** สาม livelock อิสระ รูปเดียวกัน
4. **อย่าใช้ constant band pace process แบบ O(live)** Constant ใหญ่ขึ้นเพียงเลื่อนหน้าผา
5. **เมื่อ bug class ไม่ทิ้งหลักฐาน ให้หยุดสืบและสร้าง instrument** จากนั้น sabotage-test รวมถึง uninstrumented control ที่พิสูจน์ว่าบั๊กมองไม่เห็น
6. **Doc comment ไม่ใช่การเปลี่ยนแปลง** Pin defaults ด้วย tests รวม unrecognised-value case และ pin ความเห็นพ้องของ components ที่ต้องตรงกัน
7. **วัดสอง arms บน host เดียว จาก tree เดียว และตรวจ exit code**
8. **ทดสอบ discriminating shape ก่อนสร้าง invariant**
9. **ปฏิเสธ permanent hybrid** “เก็บกลไกเก่าไว้สำหรับกรณียาก” คือวิธีที่ migration กลายเป็นสองกลไกตลอดไป ทำกรณียากให้สำเร็จ หรืออย่า migrate

Collector ยังไม่เสร็จ แต่เป็นครั้งแรกที่มัน *อ่านออก*: ทุก knob gate อะไรสักอย่าง, ทุก gate ล้มเหลวได้, ทุก default ถูก pin ด้วย test และทุกตัวเลขเผยแพร่วัดบนเครื่องที่นิ่งหลัง verify output แล้ว ความอ่านออกนี้ใช้แรงมากกว่าตัว collector และเป็นเหตุผลเดียวที่ตัวเลขเดือนล่าสุดขยับได้
`.replaceAll("¤", "`");

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
