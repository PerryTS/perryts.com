export default function Content() {
  return (
    <>
      <p>
        ไม่กี่สัปดาห์ก่อน <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (@axt_ayakoto บน X) เผยแพร่ <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">benchmark ที่เทียบ Perry กับ Deno และ Bun</a> บนโจทย์ AtCoder ABC451D &ldquo;Concat Power of 2.&rdquo; ผลวัดของเขา: Perry รัน <strong>ช้ากว่า Bun 3.85×</strong> ข้อสรุปของเขาสุภาพแต่หนักแน่น — Perry ยังไม่พร้อมจะเป็น runtime สำหรับ competitive programming และอาจจะยังไม่พร้อมแม้เมื่อมันโตเต็มที่
      </p>
      <p>
        เราติดค้างเขาอยู่กับการตามผลให้ นี่คือจุดที่เรามาถึงบน benchmark ตัวเดียวกัน ด้วยคำสั่ง <code>hyperfine</code> ตัวเดียวกัน บนเครื่องระดับเดียวกัน:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        การปิด gap นั้นต้องอาศัยการสืบสวนที่เริ่มจากสมมติฐานที่ผิด ตามไปเจอ trade-off ด้านสถาปัตยกรรม GC ที่จงใจออกแบบไว้จริง ๆ และให้ผลลัพธ์ที่เราคิดว่าควรค่าแก่การเขียนถึง — ไม่ใช่เพราะเราตามทัน แต่เพราะรูปร่างของ trade-off นั้นตอนเอาไปส่อง profiler มันน่าสนใจในตัวมันเอง
      </p>

      <h2>The benchmark</h2>
      <p>
        <code>abc451d-perry.ts</code> ของ aya_koto ทำ depth-first search แบบเรียกตัวเองซ้ำบนการต่อสตริงของกำลังสอง โดย deduplicate ผ่าน <code>Set&lt;number&gt;</code> แล้ว sort ฟังก์ชันร้อนนั้นสั้น:
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
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
}`}</code></pre>
      <p>
        รูปร่างคือตัวเรื่องราว ทุกการเรียกจองพื้นที่ <code>string[]</code> ก้อนใหม่ การเรียกซ้ำมีความลึก — branching factor สูงถึงราว 30 ที่ชั้นบนสุด — และทุก frame ของ parent ก็คงอาเรย์ <code>answers</code> ของมันไว้ให้ live ขณะที่มันกำลังวนอาเรย์ของ child และ push ลงอาเรย์ของตัวเอง การจองที่มีอายุสั้น การเรียกซ้ำที่ลึก การอ้างอิงที่ยัง live กระจัดกระจายอยู่ทั่วทุก block ของ arena ที่ยังทำงาน นี่กลายเป็น workload ที่ GC ของ Perry <em>ไม่ได้</em> ถูกจูนมารองรับพอดี
      </p>

      <h2>The wrong hypothesis</h2>
      <p>
        ผู้อ่านคนหนึ่งทิ้ง footnote ไว้บนบทความของ aya_koto ชี้ว่า BigInt ของ Perry ภายในเป็นจำนวนเต็มความยาวคงที่ 1024 บิต และโปรแกรมที่ใช้ BigInt หนัก ๆ รันช้ากว่า Bun ราว 4× ABC451D เกี่ยวข้องกับกำลังสอง — ตัวเลขขนาดใหญ่จึงดูเป็นไปได้ — สัญชาตญาณแรกเลยคือ: BigInt คือต้นเหตุ แก้ path ของ BigInt แล้ว gap ก็จะปิด
      </p>
      <p>
        แต่มันไม่ใช่ <code>grep -i bigint abc451d-perry.ts</code> ไม่คืนอะไรเลย benchmark ใช้ <code>number</code> ตลอดทั้งโปรแกรม ทุกค่าพอดีอยู่ใต้ 2^53 สบาย ๆ footnote เรื่อง BigInt นั้นถูกต้อง เป็นเรื่องจริง และเป็นปัญหาที่ควรค่าแก่การแก้ — และเราก็แก้แล้วต่างหากใน v0.5.736 แต่มันไม่เกี่ยวอะไรกับ ABC451D เลย
      </p>
      <p>
        ค่าใช้จ่ายของการไล่ตามสมมติฐานผิดก่อนคือราวหนึ่งวัน บทเรียน — ซึ่งผมอยากอ้างว่าเรารู้อยู่แล้ว — คือ: profile ก่อนจะปักใจกับทฤษฎี แม้เมื่อทฤษฎีมาจากแหล่งที่น่าเชื่อถือและตรงกับความเชื่อเดิมของคุณ โดยเฉพาะตอนนั้นแหละ
      </p>

      <h2>Reproducing the bench</h2>
      <p>
        สิ่งแรกที่เราทำเมื่อหยุดไล่ตาม BigInt คือ reproduce ตัวเลขของ aya_koto ให้สะอาด เราคาดว่าจะลงใกล้ ๆ 1.219 s ของเขาบน Perry แต่เราลงที่ <strong>2.998 s</strong> บน Perry v0.5.729
      </p>
      <p>
        นั่นคือ regression 2.5× ระหว่างเวอร์ชันที่เขาทดสอบกับ main ปัจจุบันของเราตอนนั้น Deno และ Bun reproduce ได้อยู่ในช่วง 50% ของตัวเลขเขา (ฮาร์ดแวร์ต่างกัน เวอร์ชันคลาดเคลื่อนไป) gap ของ Perry โตจาก 3.85× เป็น 6.59× ระหว่างที่ไม่มีใครคอยจับตา
      </p>
      <p>
        เราไม่ได้ bisect ว่า commit ไหนทำให้เกิด regression — มันอยู่นอกขอบเขตของการสืบสวนครั้งนี้ แต่การที่ไม่มี CI guardrail ที่จะจับ drift นี้ได้ก็เป็นผลค้นพบในตัวมันเอง และเราจะกลับมาเรื่องนี้ตอนท้าย
      </p>

      <h2>Profile-driven diagnosis</h2>
      <p>
        คอมไพล์ด้วย <code>PERRY_DEBUG_SYMBOLS=1</code> และบันทึกด้วย <code>samply</code> ภาพของ self-time นั้นชัดไม่กำกวม:
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>76% ของ self time คือกลไกของ GC</strong> inclusive time ก็เห็นพ้อง: <code>gc_collect_minor</code> ที่ 80%, <code>Arena::alloc</code> ที่ 76%, <code>js_array_alloc</code> ที่ 45%, <code>js_array_push_f64</code> ที่ 22% <code>search()</code> ที่เรียกซ้ำนั้นร้อน แต่มันร้อนอยู่ใต้ mark phase ของ GC ทุกการเรียกกำลัง trigger การจองพื้นที่มากพอที่จะสะดุดให้เกิดการ collect
      </p>
      <p>
        microbenchmark แบบ negative-control ยืนยันว่าการช้าลงไม่ได้เกิดทั่ว ๆ ไป loop จำนวนเต็มแน่น ๆ <code>fib(80) × 100_000</code> ไม่มีการจองพื้นที่: Perry <strong>6.1 ms</strong> เทียบกับ Bun <strong>24.7 ms</strong> — Perry เร็วกว่า 4× codegen สำหรับ hot loop ที่ไม่จองพื้นที่นำหน้า Bun อยู่แล้ว gap ของ ABC451D กระจุกอยู่ใน code path เดียวเฉพาะ: throughput ของการจองพื้นที่บวกกับ GC mark-sweep บนรูปร่างการจองพื้นที่แบบนี้
      </p>

      <h2>The smoking gun</h2>
      <p>
        เรามี flag — <code>PERRY_GC_DIAG=1</code> — ที่พิมพ์สถิติ GC ต่อรอบ output นี้คือข้อสังเกตที่รับน้ำหนักของการสืบสวนทั้งหมด:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        ทุกรอบ รูปแบบเดียวกัน sweep ระบุได้อย่างถูกต้องว่า <strong>55–60% ของ object ที่จองไปแล้วตายแล้ว</strong> และ arena เรียกคืน <strong>ศูนย์ block</strong> heap โตขึ้นแบบ monotonic ตลอดการรัน ขณะที่ GC ยังจ่ายค่า mark-sweep บน working set ที่ใหญ่ขึ้นเรื่อย ๆ
      </p>
      <p>
        ทำไม <code>block_reclaim=0</code> ทั้งที่ object กว่าครึ่งตายแล้ว? เพราะ arena GC ของ Perry เรียกคืนที่ระดับ block block ขนาด 1 MB จะ reset ก็ต่อเมื่อทุก object ภายในมันตายหมด ใน ABC451D <code>search()</code> ที่เรียกซ้ำคงการอ้างอิงที่ยัง live ไว้ — อาเรย์ <code>answers</code> ของ frame ฝั่ง parent — กระจัดกระจายอยู่ทั่วทุก block ที่ยังทำงาน ไม่มี block ไหนตายหมดทั้ง block เลย mark-sweep ระบุ object ที่ตายได้อย่างถูกต้อง ไม่มี path เรียกคืนระดับ per-object และก็เลยไม่ทำอะไรกับมัน heap โต GC trigger ยิงรัวบนลู่วิ่ง และค่าของแต่ละรอบไต่ขึ้นเมื่อ working set ไต่ขึ้น
      </p>

      <h2>The deliberate trade-off</h2>
      <p>
        สิ่งที่ให้ข้อมูลมากที่สุดที่เราเจอไม่ได้อยู่ใน profile มันอยู่ใน sweep เอง ที่ <code>crates/perry-runtime/src/gc.rs:2733</code> ในรูปคอมเมนต์ที่อธิบายดีไซน์:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        We deliberately do NOT push dead objects onto the global ARENA_FREE_LIST. The inline bump allocator never reads the free list — it uses the per-block reset instead. Pushing dead objects to the free list would cost ~50ns per object × ~700k objects per GC × ~12 GC cycles per benchmark = 420ms of pure waste in <code>object_create</code>.
      </blockquote>
      <p>
        นี่ถูกต้องเป๊ะสำหรับ workload ที่มันถูกจูนมารองรับ <code>object_create</code> เป็น benchmark ที่เราใส่ใจ ซึ่งการจองพื้นที่ตายใน loop แน่น ๆ และทั้ง block ว่างจริงระหว่างรอบ การเพิ่ม pass แบบ per-object free-list จะเผา 420 ms ไปกับงานบัญชีที่ไร้ประโยชน์สำหรับ workload นั้น และ path แบบ block-reset ก็เก็บหน่วยความจำชุดเดียวกันได้ถูกกว่า
      </p>
      <p>
        มันเข้ากันไม่ดีกับรูปร่างของ ABC451D ที่การอ้างอิงที่ยัง live คงกระจัดกระจายอยู่และ block-reset ไม่เคยยิงเลย สถาปัตยกรรมมี trade-off ที่จงใจฝังไว้ในตัว และเราไม่เคย benchmark กรณีที่ trade-off นั้นพลิกไปในทางที่ผิด
      </p>
      <p>
        นั่นคือบทเรียนที่แท้จริง GC ไม่ได้พัง มันถูกจูนมาเพื่อการกระจายตัวของรูปแบบการจองพื้นที่ที่ต่างจากที่ bench ของ aya_koto เป็นตัวแทน และเราไม่ได้สังเกตว่าการกระจายตัวที่มันถูกจูนมานั้นกันเอา workload จริงทั้งคลาสออกไป — recursive search, tree walk, อะไรก็ตามที่คงสถานะที่ยัง live ไว้ในทุกชั้นของ stack ขณะที่ทำการจองพื้นที่ที่มีอายุสั้นอยู่ข้างใต้
      </p>

      <h2>Things that didn&apos;t work</h2>
      <p>
        ก่อนเราจะมาถึงการแก้ที่แท้จริง คันโยกที่ดูสมเหตุสมผลหลายตัวกลับกลายเป็นคันโยกที่ผิด ขอรายงานสิ่งเหล่านี้พร้อมตัวเลขเพราะมันเป็นครึ่งที่น่าสนใจกว่าของการสืบสวน:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry มี pass แบบ copying-evacuation แบบ opt-in อยู่แล้ว เปิดมันสำหรับ ABC451D: <strong>11.4 วินาที</strong> ช้ากว่า baseline สี่เท่า pass นั้นรันทุกรอบไม่ว่ามีประโยชน์หรือไม่ และค่า per-object copy บวก reference-rewrite ของมันหายนะเมื่อ live set เป็น object อายุสั้นชิ้นเล็ก ๆ ควรค่าแก่การเก็บไว้สำหรับ workload ที่ได้ประโยชน์ แต่ไม่ใช่คำตอบตรงนี้</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (full mark-sweep แทน generational) — 3.06 s แทบจะเหมือน baseline เป๊ะ การเลือกกลยุทธ์ไม่ใช่สิ่งที่ผูกมัด การไม่มี reclaim ระดับ per-object ต่างหากที่ใช่</li>
        <li><strong>การจัดโครงสร้าง <code>ValidPointerSet</code> ให้สะอาด (commit 0fa42e0b)</strong> รวมเวกเตอร์ที่ sort แล้วสองตัวที่แยกกัน (arena pointers และ malloc&apos;d pointers) เป็นตัวเดียว เพิ่ม prefilter ช่วง min/max และ inline การปฏิเสธ tag ของ <code>try_mark_value</code> ลดค่า per-call ของ <code>contains()</code> ลงครึ่งหนึ่ง — ซึ่งเป็น inner loop ร้อนที่ profile ชี้ออกมา bench ของ ABC451D ขยับจาก 3.07 s ไป 3.21 s เสมอตัว อยู่ในช่วง noise การเปลี่ยนแปลงนี้ยังให้คุณค่ากับ workload ที่ <code>contains()</code> เป็นข้อจำกัดที่ผูกมัดจริง ๆ (benchmark รูปร่าง ECS, chain ของ hono compose) แต่มันไม่ใช่ข้อจำกัดที่ผูกมัดตรงนี้ ปริมาณการเรียกในเชิงสัมบูรณ์ — ที่ขับเคลื่อนด้วยแรงดันการจองพื้นที่ที่ป้อน mark phase — ครอบงำแม้ที่ค่า per-call เป็นศูนย์</li>
      </ul>
      <p>
        รูปแบบที่ปรากฏในทั้งสามตัว: กลยุทธ์ GC และค่า inner-loop ระดับ per-call เป็นเรื่องอันดับสอง ข้อจำกัดที่ผูกมัดคือการขาด path เรียกคืนสำหรับ object ที่ตายใน block ที่ไม่ว่างหมดทั้ง block จนกว่าจะจัดการเรื่องนั้นได้ ไม่มีอะไรอื่นขยับเข็มได้เลย
      </p>

      <h2>Where we landed</h2>
      <p>
        ระหว่าง v0.5.737 ถึง v0.5.875 ตลอดราว 137 patch version gap ก็ปิด เราจงใจเขียนเรื่องนี้: เราไม่ได้ bisect ไปยัง hero commit ตัวเดียว การแก้ลงจอดผ่านชุดของการเปลี่ยนแปลงในระบบ GC ที่ทำให้ trade-off &ldquo;ไม่มี per-object free list&rdquo; ที่จงใจไว้กลายเป็นแบบมีเงื่อนไขแทนที่จะถาวร — เมื่อ <code>block_reclaim</code> ค้างอยู่ที่ศูนย์ตลอดหลายรอบติด ๆ กัน sweep จะเริ่มเติม free list ที่จัดกลุ่มตามขนาด และ bump allocator ได้ path สำรองมา ลำดับที่แน่นอนและ patch ไหนช่วยมากแค่ไหนต้องอาศัย bisect อย่างรอบคอบที่เราติดค้างไว้แต่ยังไม่ได้ทำ
      </p>
      <p>
        ผลลัพธ์ บน bench และคำสั่งเป๊ะ ๆ ของ aya_koto บน Apple M-series, macOS 26.4:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        ขอตั้งข้อความซื่อตรงสองข้อกับตารางนี้ ข้อแรก margin 1.01× ของ Perry เหนือ Bun อยู่ใน error bar — คำที่ถูกต้องคือ &ldquo;เสมอ&rdquo; ไม่ใช่ &ldquo;เร็วกว่า&rdquo; ข้อสอง variance บนทั้งสาม runtime มีนัยสำคัญ (max ของ Perry คือ 745 ms เทียบกับค่าเฉลี่ย 425 ms) และการรันครั้งเดียวใด ๆ อาจตกอยู่ที่หางฝั่งใดก็ได้ เราจึงแสดง min และ max ควบคู่กับค่าเฉลี่ยด้วยเหตุนั้น เราอยากให้คุณเห็นการกระจายตัว
      </p>

      <h2>What&apos;s still imperfect</h2>
      <p>
        มีอยู่ไม่กี่อย่างที่เราไม่ได้ปิดบัง:
      </p>
      <p>
        regression จาก 1.2 s เป็น 3.0 s ที่เกิดขึ้นระหว่างการวัดของ aya_koto กับจุดเริ่มต้นของการสืบสวนนี้บอกเราว่าเราไม่มี CI guardrail ที่คอยจับการช้าลงคลาสนี้ เรากำลังเพิ่ม <code>abc451d-perry.ts</code> และชุดทดสอบเล็ก ๆ รอบ ๆ เข้าใน CI ของ Perry เป็น gate กัน perf regression ก่อนโพสต์นี้จะขึ้น ถ้า bench นี้ค่อย ๆ เสื่อมเงียบ ๆ ใน release อนาคต มันควรทำให้ build พัง ไม่ใช่ทำให้ benchmark จากนักวิจารณ์คนหนึ่งสามเดือนข้างหน้าพัง
      </p>
      <p>
        การแก้ผ่อนคลาย trade-off ที่จงใจไว้ในทิศทางเฉพาะหนึ่ง เรากำลังจับตา benchmark <code>object_create</code> และพวกพ้อง — workload ที่การเลือก &ldquo;ไม่มี free list&rdquo; เดิมคอยปกป้องอยู่ — เพื่อให้แน่ใจว่า path free-list แบบมีเงื่อนไขไม่ทำให้พวกมัน regress ตัวเลขช่วงต้นอยู่ในช่วง noise แต่นี่เป็นเรื่องประเภทที่ความมั่นใจมาจากเวลา ไม่ใช่จากการรัน benchmark ครั้งเดียว
      </p>
      <p>
        เราไม่ได้ bisect ช่วง 137 เวอร์ชัน เราจะทำ มันสำคัญต่อเอกสาร และสำคัญต่อการเข้าใจว่ากลไก conditional-free-list ตัวไหนเป็นตัวที่ทำงาน
      </p>

      <h2>Credit</h2>
      <p>
        บทความของ aya_koto เป็นประเภทของ writeup ที่โปรเจกต์โอเพนซอร์สต้องการพอดีและแทบไม่เคยได้ เขาวัดอย่างรอบคอบ เผยแพร่ repo ทดสอบของเขา ชี้แรงเสียดทานเฉพาะจุดใน path การติดตั้ง และมาถึงข้อสรุปอย่างซื่อตรงว่า Perry ยังไม่พร้อมสำหรับ use case ที่เขากำลังประเมิน ข้อสรุปนั้นถูกต้องเมื่อเขาเขียนมัน และมันคงจะถูกต้องนานกว่านี้ถ้าเขาไม่ได้เขียนถึงมัน
      </p>
      <p>
        repo ทดสอบของเขาอยู่ที่ <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a> บทความของเขาอยู่ที่ <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a> ทั้งคู่ควรค่าแก่การอ่านแม้หลังการตามผลครั้งนี้ — โดยเฉพาะบทความ เพราะมันบันทึกการประเมินอย่างซื่อตรงของ compiler ระยะเริ่มต้นจากคนที่ไม่มีแรงจูงใจให้ต้องสุภาพ
      </p>
      <p>
        สองสิ่งเฉพาะในบทความของเขาที่เราควรกล่าวถึง แรงเสียดทานของ path การติดตั้งที่เขาชี้ — ที่ส่วนบนของ perryts.com ชี้ไปวิธีหนึ่งขณะที่ docs แนะนำอีกวิธี — ได้ถูกแก้แล้ว path ของ npm ตอนนี้เป็นตัวเลือกที่เด่นบนหน้า landing ตรงกับ docs ความหงุดหงิดเรื่อง &ldquo;สิ่งที่อยู่นอกเอกสาร limitations แล้วคอมไพล์ไม่ได้&rdquo; ที่เขาชี้ — เราเดินไล่ทุกไฟล์ <code>.ts</code> ใน repo ทดสอบของเขาเทียบกับ Perry ปัจจุบัน ช่องว่างจริง ๆ ถูกตั้ง issue และ limitations ที่มีเอกสารก็ถูกขยายให้ครอบคลุมขึ้น
      </p>
      <p>
        footnote เรื่อง BigInt บนบทความของเขานั้น ตามที่กล่าวไว้ข้างต้น ไม่เกี่ยวกับ ABC451D แต่เป็นเรื่องจริงในตัวมันเอง — implementation ของ BigInt ใน Perry เป็นจำนวนเต็มความกว้างคงที่ 1024 บิตอยู่ใต้ฝากระโปรงจริง ๆ และโปรแกรมที่ใช้ BigInt หนัก ๆ ก็จ่ายค่ามันไป นั่นถูกแก้แล้วใน v0.5.736 ด้วย path แบบ inline สำหรับค่าเล็ก และ <code>num-bigint</code> เป็น fallback สำหรับความแม่นยำแบบ arbitrary เครดิตตรงนั้นเป็นของผู้อ่านที่ทิ้ง footnote ไว้บนบทความของ aya_koto เราไม่รู้ว่าพวกเขาเป็นใคร แต่ถ้าคุณกำลังอ่านสิ่งนี้อยู่: ขอบคุณ
      </p>

      <h2>Reproduction</h2>
      <p>
        ถ้าคุณอยาก reproduce ตัวเลขเหล่านี้ด้วยตัวเอง:
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        ตัวเลขของคุณจะต่างไปตามฮาร์ดแวร์และเวอร์ชันของ runtime ถ้ามันต่างไปในแบบที่ดูผิดปกติ <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">เปิด issue</a> ได้เลย — เราอยากได้ยินเรื่องนั้น
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
