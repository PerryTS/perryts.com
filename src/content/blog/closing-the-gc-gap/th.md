---
title: "สิ่งที่ benchmark ของ aya_koto สอนเราเกี่ยวกับ GC ของ Perry"
excerpt: "ผู้อ่านคนหนึ่ง benchmark Perry บน AtCoder ABC451D และวัดได้ว่าช้ากว่า Bun 3.85× ในระหว่างนั้น regression แบบเงียบได้ขยายช่องว่างขึ้นเป็น 6.59× การแก้ไม่ได้อยู่ในจุดที่เราคาด trade-off ของ GC ที่จงใจไว้ซึ่งมันเปิดเผยออกมานั้นเป็นเรื่องจริง และ Perry v0.5.875 ตอนนี้เสมอกับ Bun บน bench เดียวกัน: 425 ms vs 431 ms"
date: 2026-05-12
tags: ["GC", "performance", "benchmarks", "community"]
---
ไม่กี่สัปดาห์ก่อน [Ayasaka-Koto](https://zenn.dev/aya_koto) (@axt\_ayakoto บน X) เผยแพร่ [benchmark ที่เทียบ Perry กับ Deno และ Bun](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4) บนโจทย์ AtCoder ABC451D “Concat Power of 2.” ผลวัดของเขา: Perry รัน **ช้ากว่า Bun 3.85×** ข้อสรุปของเขาสุภาพแต่หนักแน่น — Perry ยังไม่พร้อมจะเป็น runtime สำหรับ competitive programming และอาจจะยังไม่พร้อมแม้เมื่อมันโตเต็มที่

เราติดค้างเขาอยู่กับการตามผลให้ นี่คือจุดที่เรามาถึงบน benchmark ตัวเดียวกัน ด้วยคำสั่ง `hyperfine` ตัวเดียวกัน บนเครื่องระดับเดียวกัน:

```
Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster
```

การปิด gap นั้นต้องอาศัยการสืบสวนที่เริ่มจากสมมติฐานที่ผิด ตามไปเจอ trade-off ด้านสถาปัตยกรรม GC ที่จงใจออกแบบไว้จริง ๆ และให้ผลลัพธ์ที่เราคิดว่าควรค่าแก่การเขียนถึง — ไม่ใช่เพราะเราตามทัน แต่เพราะรูปร่างของ trade-off นั้นตอนเอาไปส่อง profiler มันน่าสนใจในตัวมันเอง

## เกณฑ์มาตรฐาน

`abc451d-perry.ts` ของ aya\_koto ทำ depth-first search แบบเรียกตัวเองซ้ำบนการต่อสตริงของกำลังสอง โดย deduplicate ผ่าน `Set<number>` แล้ว sort ฟังก์ชันร้อนนั้นสั้น:

```
function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}
```

รูปร่างคือตัวเรื่องราว ทุกการเรียกจองพื้นที่ `string[]` ก้อนใหม่ การเรียกซ้ำมีความลึก — branching factor สูงถึงราว 30 ที่ชั้นบนสุด — และทุก frame ของ parent ก็คงอาเรย์ `answers` ของมันไว้ให้ live ขณะที่มันกำลังวนอาเรย์ของ child และ push ลงอาเรย์ของตัวเอง การจองที่มีอายุสั้น การเรียกซ้ำที่ลึก การอ้างอิงที่ยัง live กระจัดกระจายอยู่ทั่วทุก block ของ arena ที่ยังทำงาน นี่กลายเป็น workload ที่ GC ของ Perry *ไม่ได้* ถูกจูนมารองรับพอดี

## สมมติฐานที่ผิด

ผู้อ่านคนหนึ่งทิ้ง footnote ไว้บนบทความของ aya\_koto ชี้ว่า BigInt ของ Perry ภายในเป็นจำนวนเต็มความยาวคงที่ 1024 บิต และโปรแกรมที่ใช้ BigInt หนัก ๆ รันช้ากว่า Bun ราว 4× ABC451D เกี่ยวข้องกับกำลังสอง — ตัวเลขขนาดใหญ่จึงดูเป็นไปได้ — สัญชาตญาณแรกเลยคือ: BigInt คือต้นเหตุ แก้ path ของ BigInt แล้ว gap ก็จะปิด

แต่มันไม่ใช่ `grep -i bigint abc451d-perry.ts` ไม่คืนอะไรเลย benchmark ใช้ `number` ตลอดทั้งโปรแกรม ทุกค่าพอดีอยู่ใต้ 2^53 สบาย ๆ footnote เรื่อง BigInt นั้นถูกต้อง เป็นเรื่องจริง และเป็นปัญหาที่ควรค่าแก่การแก้ — และเราก็แก้แล้วต่างหากใน v0.5.736 แต่มันไม่เกี่ยวอะไรกับ ABC451D เลย

ค่าใช้จ่ายของการไล่ตามสมมติฐานผิดก่อนคือราวหนึ่งวัน บทเรียน — ซึ่งผมอยากอ้างว่าเรารู้อยู่แล้ว — คือ: profile ก่อนจะปักใจกับทฤษฎี แม้เมื่อทฤษฎีมาจากแหล่งที่น่าเชื่อถือและตรงกับความเชื่อเดิมของคุณ โดยเฉพาะตอนนั้นแหละ

## สร้างบัลลังก์ขึ้นมาใหม่

สิ่งแรกที่เราทำเมื่อหยุดไล่ตาม BigInt คือ reproduce ตัวเลขของ aya\_koto ให้สะอาด เราคาดว่าจะลงใกล้ ๆ 1.219 s ของเขาบน Perry แต่เราลงที่ **2.998 s** บน Perry v0.5.729

นั่นคือ regression 2.5× ระหว่างเวอร์ชันที่เขาทดสอบกับ main ปัจจุบันของเราตอนนั้น Deno และ Bun reproduce ได้อยู่ในช่วง 50% ของตัวเลขเขา (ฮาร์ดแวร์ต่างกัน เวอร์ชันคลาดเคลื่อนไป) gap ของ Perry โตจาก 3.85× เป็น 6.59× ระหว่างที่ไม่มีใครคอยจับตา

เราไม่ได้ bisect ว่า commit ไหนทำให้เกิด regression — มันอยู่นอกขอบเขตของการสืบสวนครั้งนี้ แต่การที่ไม่มี CI guardrail ที่จะจับ drift นี้ได้ก็เป็นผลค้นพบในตัวมันเอง และเราจะกลับมาเรื่องนี้ตอนท้าย

## การวิเคราะห์ที่ขับเคลื่อนด้วยโปรไฟล์

คอมไพล์ด้วย `PERRY_DEBUG_SYMBOLS=1` และบันทึกด้วย `samply` ภาพของ self-time นั้นชัดไม่กำกวม:

```
% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator
```

**76% ของ self time คือกลไกของ GC** inclusive time ก็เห็นพ้อง: `gc_collect_minor` ที่ 80%, `Arena::alloc` ที่ 76%, `js_array_alloc` ที่ 45%, `js_array_push_f64` ที่ 22% `search()` ที่เรียกซ้ำนั้นร้อน แต่มันร้อนอยู่ใต้ mark phase ของ GC ทุกการเรียกกำลัง trigger การจองพื้นที่มากพอที่จะสะดุดให้เกิดการ collect

microbenchmark แบบ negative-control ยืนยันว่าการช้าลงไม่ได้เกิดทั่ว ๆ ไป loop จำนวนเต็มแน่น ๆ `fib(80) × 100_000` ไม่มีการจองพื้นที่: Perry **6.1 ms** เทียบกับ Bun **24.7 ms** — Perry เร็วกว่า 4× codegen สำหรับ hot loop ที่ไม่จองพื้นที่นำหน้า Bun อยู่แล้ว gap ของ ABC451D กระจุกอยู่ใน code path เดียวเฉพาะ: throughput ของการจองพื้นที่บวกกับ GC mark-sweep บนรูปร่างการจองพื้นที่แบบนี้

## ปืนสูบบุหรี่

เรามี flag — `PERRY_GC_DIAG=1` — ที่พิมพ์สถิติ GC ต่อรอบ output นี้คือข้อสังเกตที่รับน้ำหนักของการสืบสวนทั้งหมด:

```
[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+
```

ทุกรอบ รูปแบบเดียวกัน sweep ระบุได้อย่างถูกต้องว่า **55–60% ของ object ที่จองไปแล้วตายแล้ว** และ arena เรียกคืน **ศูนย์ block** heap โตขึ้นแบบ monotonic ตลอดการรัน ขณะที่ GC ยังจ่ายค่า mark-sweep บน working set ที่ใหญ่ขึ้นเรื่อย ๆ

ทำไม `block_reclaim=0` ทั้งที่ object กว่าครึ่งตายแล้ว? เพราะ arena GC ของ Perry เรียกคืนที่ระดับ block block ขนาด 1 MB จะ reset ก็ต่อเมื่อทุก object ภายในมันตายหมด ใน ABC451D `search()` ที่เรียกซ้ำคงการอ้างอิงที่ยัง live ไว้ — อาเรย์ `answers` ของ frame ฝั่ง parent — กระจัดกระจายอยู่ทั่วทุก block ที่ยังทำงาน ไม่มี block ไหนตายหมดทั้ง block เลย mark-sweep ระบุ object ที่ตายได้อย่างถูกต้อง ไม่มี path เรียกคืนระดับ per-object และก็เลยไม่ทำอะไรกับมัน heap โต GC trigger ยิงรัวบนลู่วิ่ง และค่าของแต่ละรอบไต่ขึ้นเมื่อ working set ไต่ขึ้น

## การแลกเปลี่ยนโดยเจตนา

สิ่งที่ให้ข้อมูลมากที่สุดที่เราเจอไม่ได้อยู่ใน profile มันอยู่ใน sweep เอง ที่ `crates/perry-runtime/src/gc.rs:2733` ในรูปคอมเมนต์ที่อธิบายดีไซน์:

> เราจงใจไม่ผลักวัตถุที่ตายแล้วไปยัง ARENA_FREE_LIST ทั่วโลก ตัวจัดสรร Bump แบบอินไลน์จะไม่อ่านรายการว่าง — แต่ใช้การรีเซ็ตต่อบล็อกแทน การผลักอ็อบเจ็กต์ที่เสียไปยังรายการว่างจะมีราคา ~50ns ต่ออ็อบเจ็กต์ × ~700k อ็อบเจ็กต์ต่อ GC × ~12 GC รอบต่อการวัดประสิทธิภาพ = 420 มิลลิวินาทีของขยะบริสุทธิ์ใน `object_create`

นี่ถูกต้องเป๊ะสำหรับ workload ที่มันถูกจูนมารองรับ `object_create` เป็น benchmark ที่เราใส่ใจ ซึ่งการจองพื้นที่ตายใน loop แน่น ๆ และทั้ง block ว่างจริงระหว่างรอบ การเพิ่ม pass แบบ per-object free-list จะเผา 420 ms ไปกับงานบัญชีที่ไร้ประโยชน์สำหรับ workload นั้น และ path แบบ block-reset ก็เก็บหน่วยความจำชุดเดียวกันได้ถูกกว่า

มันเข้ากันไม่ดีกับรูปร่างของ ABC451D ที่การอ้างอิงที่ยัง live คงกระจัดกระจายอยู่และ block-reset ไม่เคยยิงเลย สถาปัตยกรรมมี trade-off ที่จงใจฝังไว้ในตัว และเราไม่เคย benchmark กรณีที่ trade-off นั้นพลิกไปในทางที่ผิด

นั่นคือบทเรียนที่แท้จริง GC ไม่ได้พัง มันถูกจูนมาเพื่อการกระจายตัวของรูปแบบการจองพื้นที่ที่ต่างจากที่ bench ของ aya\_koto เป็นตัวแทน และเราไม่ได้สังเกตว่าการกระจายตัวที่มันถูกจูนมานั้นกันเอา workload จริงทั้งคลาสออกไป — recursive search, tree walk, อะไรก็ตามที่คงสถานะที่ยัง live ไว้ในทุกชั้นของ stack ขณะที่ทำการจองพื้นที่ที่มีอายุสั้นอยู่ข้างใต้

## สิ่งที่ใช้งานไม่ได้

ก่อนเราจะมาถึงการแก้ที่แท้จริง คันโยกที่ดูสมเหตุสมผลหลายตัวกลับกลายเป็นคันโยกที่ผิด ขอรายงานสิ่งเหล่านี้พร้อมตัวเลขเพราะมันเป็นครึ่งที่น่าสนใจกว่าของการสืบสวน:

-   **`PERRY_GEN_GC_EVACUATE=1`** — Perry มี pass แบบ copying-evacuation แบบ opt-in อยู่แล้ว เปิดมันสำหรับ ABC451D: **11.4 วินาที** ช้ากว่า baseline สี่เท่า pass นั้นรันทุกรอบไม่ว่ามีประโยชน์หรือไม่ และค่า per-object copy บวก reference-rewrite ของมันหายนะเมื่อ live set เป็น object อายุสั้นชิ้นเล็ก ๆ ควรค่าแก่การเก็บไว้สำหรับ workload ที่ได้ประโยชน์ แต่ไม่ใช่คำตอบตรงนี้
-   **`PERRY_GEN_GC=0`** (full mark-sweep แทน generational) — 3.06 s แทบจะเหมือน baseline เป๊ะ การเลือกกลยุทธ์ไม่ใช่สิ่งที่ผูกมัด การไม่มี reclaim ระดับ per-object ต่างหากที่ใช่
-   **การจัดโครงสร้าง `ValidPointerSet` ให้สะอาด (commit 0fa42e0b)** รวมเวกเตอร์ที่ sort แล้วสองตัวที่แยกกัน (arena pointers และ malloc'd pointers) เป็นตัวเดียว เพิ่ม prefilter ช่วง min/max และ inline การปฏิเสธ tag ของ `try_mark_value` ลดค่า per-call ของ `contains()` ลงครึ่งหนึ่ง — ซึ่งเป็น inner loop ร้อนที่ profile ชี้ออกมา bench ของ ABC451D ขยับจาก 3.07 s ไป 3.21 s เสมอตัว อยู่ในช่วง noise การเปลี่ยนแปลงนี้ยังให้คุณค่ากับ workload ที่ `contains()` เป็นข้อจำกัดที่ผูกมัดจริง ๆ (benchmark รูปร่าง ECS, chain ของ hono compose) แต่มันไม่ใช่ข้อจำกัดที่ผูกมัดตรงนี้ ปริมาณการเรียกในเชิงสัมบูรณ์ — ที่ขับเคลื่อนด้วยแรงดันการจองพื้นที่ที่ป้อน mark phase — ครอบงำแม้ที่ค่า per-call เป็นศูนย์

รูปแบบที่ปรากฏในทั้งสามตัว: กลยุทธ์ GC และค่า inner-loop ระดับ per-call เป็นเรื่องอันดับสอง ข้อจำกัดที่ผูกมัดคือการขาด path เรียกคืนสำหรับ object ที่ตายใน block ที่ไม่ว่างหมดทั้ง block จนกว่าจะจัดการเรื่องนั้นได้ ไม่มีอะไรอื่นขยับเข็มได้เลย

## จุดที่เราไปถึง

ระหว่าง v0.5.737 ถึง v0.5.875 ตลอดราว 137 patch version gap ก็ปิด เราจงใจเขียนเรื่องนี้: เราไม่ได้ bisect ไปยัง hero commit ตัวเดียว การแก้ลงจอดผ่านชุดของการเปลี่ยนแปลงในระบบ GC ที่ทำให้ trade-off “ไม่มี per-object free list” ที่จงใจไว้กลายเป็นแบบมีเงื่อนไขแทนที่จะถาวร — เมื่อ `block_reclaim` ค้างอยู่ที่ศูนย์ตลอดหลายรอบติด ๆ กัน sweep จะเริ่มเติม free list ที่จัดกลุ่มตามขนาด และ bump allocator ได้ path สำรองมา ลำดับที่แน่นอนและ patch ไหนช่วยมากแค่ไหนต้องอาศัย bisect อย่างรอบคอบที่เราติดค้างไว้แต่ยังไม่ได้ทำ

ผลลัพธ์ บน bench และคำสั่งเป๊ะ ๆ ของ aya\_koto บน Apple M-series, macOS 26.4:

```
Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)
```

ขอตั้งข้อความซื่อตรงสองข้อกับตารางนี้ ข้อแรก margin 1.01× ของ Perry เหนือ Bun อยู่ใน error bar — คำที่ถูกต้องคือ “เสมอ” ไม่ใช่ “เร็วกว่า” ข้อสอง variance บนทั้งสาม runtime มีนัยสำคัญ (max ของ Perry คือ 745 ms เทียบกับค่าเฉลี่ย 425 ms) และการรันครั้งเดียวใด ๆ อาจตกอยู่ที่หางฝั่งใดก็ได้ เราจึงแสดง min และ max ควบคู่กับค่าเฉลี่ยด้วยเหตุนั้น เราอยากให้คุณเห็นการกระจายตัว

## สิ่งที่ยังคงไม่สมบูรณ์

มีอยู่ไม่กี่อย่างที่เราไม่ได้ปิดบัง:

regression จาก 1.2 s เป็น 3.0 s ที่เกิดขึ้นระหว่างการวัดของ aya\_koto กับจุดเริ่มต้นของการสืบสวนนี้บอกเราว่าเราไม่มี CI guardrail ที่คอยจับการช้าลงคลาสนี้ เรากำลังเพิ่ม `abc451d-perry.ts` และชุดทดสอบเล็ก ๆ รอบ ๆ เข้าใน CI ของ Perry เป็น gate กัน perf regression ก่อนโพสต์นี้จะขึ้น ถ้า bench นี้ค่อย ๆ เสื่อมเงียบ ๆ ใน release อนาคต มันควรทำให้ build พัง ไม่ใช่ทำให้ benchmark จากนักวิจารณ์คนหนึ่งสามเดือนข้างหน้าพัง

การแก้ผ่อนคลาย trade-off ที่จงใจไว้ในทิศทางเฉพาะหนึ่ง เรากำลังจับตา benchmark `object_create` และพวกพ้อง — workload ที่การเลือก “ไม่มี free list” เดิมคอยปกป้องอยู่ — เพื่อให้แน่ใจว่า path free-list แบบมีเงื่อนไขไม่ทำให้พวกมัน regress ตัวเลขช่วงต้นอยู่ในช่วง noise แต่นี่เป็นเรื่องประเภทที่ความมั่นใจมาจากเวลา ไม่ใช่จากการรัน benchmark ครั้งเดียว

เราไม่ได้ bisect ช่วง 137 เวอร์ชัน เราจะทำ มันสำคัญต่อเอกสาร และสำคัญต่อการเข้าใจว่ากลไก conditional-free-list ตัวไหนเป็นตัวที่ทำงาน

## Credit

บทความของ aya\_koto เป็นประเภทของ writeup ที่โปรเจกต์โอเพนซอร์สต้องการพอดีและแทบไม่เคยได้ เขาวัดอย่างรอบคอบ เผยแพร่ repo ทดสอบของเขา ชี้แรงเสียดทานเฉพาะจุดใน path การติดตั้ง และมาถึงข้อสรุปอย่างซื่อตรงว่า Perry ยังไม่พร้อมสำหรับ use case ที่เขากำลังประเมิน ข้อสรุปนั้นถูกต้องเมื่อเขาเขียนมัน และมันคงจะถูกต้องนานกว่านี้ถ้าเขาไม่ได้เขียนถึงมัน

repo ทดสอบของเขาอยู่ที่ [github.com/AXT-AyaKoto/perry-ts-test-2026-0421](https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421) บทความของเขาอยู่ที่ [zenn.dev/aya\_koto/articles/553ce04b1d5ac4](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4) ทั้งคู่ควรค่าแก่การอ่านแม้หลังการตามผลครั้งนี้ — โดยเฉพาะบทความ เพราะมันบันทึกการประเมินอย่างซื่อตรงของ compiler ระยะเริ่มต้นจากคนที่ไม่มีแรงจูงใจให้ต้องสุภาพ

สองสิ่งเฉพาะในบทความของเขาที่เราควรกล่าวถึง แรงเสียดทานของ path การติดตั้งที่เขาชี้ — ที่ส่วนบนของ perryts.com ชี้ไปวิธีหนึ่งขณะที่ docs แนะนำอีกวิธี — ได้ถูกแก้แล้ว path ของ npm ตอนนี้เป็นตัวเลือกที่เด่นบนหน้า landing ตรงกับ docs ความหงุดหงิดเรื่อง “สิ่งที่อยู่นอกเอกสาร limitations แล้วคอมไพล์ไม่ได้” ที่เขาชี้ — เราเดินไล่ทุกไฟล์ `.ts` ใน repo ทดสอบของเขาเทียบกับ Perry ปัจจุบัน ช่องว่างจริง ๆ ถูกตั้ง issue และ limitations ที่มีเอกสารก็ถูกขยายให้ครอบคลุมขึ้น

footnote เรื่อง BigInt บนบทความของเขานั้น ตามที่กล่าวไว้ข้างต้น ไม่เกี่ยวกับ ABC451D แต่เป็นเรื่องจริงในตัวมันเอง — implementation ของ BigInt ใน Perry เป็นจำนวนเต็มความกว้างคงที่ 1024 บิตอยู่ใต้ฝากระโปรงจริง ๆ และโปรแกรมที่ใช้ BigInt หนัก ๆ ก็จ่ายค่ามันไป นั่นถูกแก้แล้วใน v0.5.736 ด้วย path แบบ inline สำหรับค่าเล็ก และ `num-bigint` เป็น fallback สำหรับความแม่นยำแบบ arbitrary เครดิตตรงนั้นเป็นของผู้อ่านที่ทิ้ง footnote ไว้บนบทความของ aya\_koto เราไม่รู้ว่าพวกเขาเป็นใคร แต่ถ้าคุณกำลังอ่านสิ่งนี้อยู่: ขอบคุณ

## การสืบพันธุ์

ถ้าคุณอยาก reproduce ตัวเลขเหล่านี้ด้วยตัวเอง:

```
git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \
  './abc451d-perry < abc451d-input.txt' \
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \
  'bun run abc451d-bun.ts < abc451d-input.txt'
```

ตัวเลขของคุณจะต่างไปตามฮาร์ดแวร์และเวอร์ชันของ runtime ถ้ามันต่างไปในแบบที่ดูผิดปกติ [เปิด issue](https://github.com/PerryTS/perry/issues) ได้เลย — เราอยากได้ยินเรื่องนั้น

แหล่งที่มา: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — ปัญหา: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
