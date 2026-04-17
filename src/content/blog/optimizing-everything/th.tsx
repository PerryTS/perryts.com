export default function Content() {
  return (
    <>
      <p>
        บล็อกโพสต์ที่แล้วออกพร้อมกับ Perry เวอร์ชัน v0.5.12 วันนี้เราอยู่ที่ v0.5.80 นั่นคือ <strong>68 patch release ในเจ็ดวัน</strong> โดยเกือบทั้งหมดโฟกัสที่สิ่งเดียว: เปลี่ยน slow path ที่เหลือทุกอันให้เป็น fast path
      </p>
      <p>
        การ cutover ไปใช้ LLVM ใน v0.5.0 ฟื้นคืนมาเทียบเท่ากับ Cranelift ได้ภายใน v0.5.12 นั่นคือจุดจบของเรื่องหนึ่ง และจุดเริ่มต้นของอีกเรื่อง ตอนนี้ LLVM มองเห็นทุกอย่าง คำถามเปลี่ยนจาก &ldquo;ทำไมสิ่งนี้ถึงช้า?&rdquo; ไปเป็น &ldquo;ทำไมสิ่งนี้ถึงยังไม่เร็ว?&rdquo; &mdash; ซึ่งเป็นคำถามที่จัดการได้ง่ายกว่ามาก
      </p>
      <p>
        โพสต์นี้เป็นทัวร์ของสัปดาห์ที่ผ่านมา JSON ได้ speedup 547 เท่า mimalloc กลายเป็น global allocator Property access ได้ monomorphic inline cache Buffer ได้ typed pointer slot พร้อม metadata <code>noalias</code> เซิร์ฟเวอร์ Fastify และ WebSocket เลิกแครชหลังจากผ่านไปหนึ่งนาที และ benchmark ขยับอีกครั้ง
      </p>

      <h2>1. JSON: ปิดช่องว่าง 547 เท่า</h2>
      <p>
        ที่ v0.5.29 JSON.parse ของ Perry บน array ที่มี 20 เรกคอร์ด<strong>ช้ากว่า Node 547 เท่า</strong> พอถึง v0.5.46 เหลือแค่ 1.3 เท่า ตัวเลขนี้คือ delta ที่ใหญ่ที่สุดในสัปดาห์นี้ และควรค่าแก่การเดินผ่านทีละขั้น เพราะทุก optimization อื่นในโพสต์นี้เป็นเพียงวาเรียนต์ของธีมเดียวกัน: อย่าทำงานที่คุณไม่จำเป็นต้องทำ
      </p>
      <p>
        parser เดิมจัดสรร Vec หนึ่งตัวต่อหนึ่ง property, Vec หนึ่งตัวของคีย์ต่อหนึ่ง object และ thread-local หนึ่งตัวที่ป้องกันด้วย RefCell สำหรับ key cache มันคัดลอกทุกสตริง มัน re-hash ชื่อ field ทุกอัน มันสร้าง object shape ใหม่เอี่ยมสำหรับทุกเรกคอร์ด แม้ว่าทั้ง 20 เรกคอร์ดจะมี field ที่เหมือนกันทุกประการในลำดับเดียวกันทุกประการ parser ของ Node จัดการเรื่องนี้โดยสังเกตรูปแบบและแชร์ shape เดียวข้ามทุกเรกคอร์ด ของ Perry ไม่ได้ทำ
      </p>
      <p>การแก้ไขเข้ามาในสี่ขั้น:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Key interning ผ่าน thread-local <code>PARSE_KEY_CACHE</code></strong> (v0.5.45) เรกคอร์ดแรกจัดสรรสตริงคีย์ N ตัว เรกคอร์ดที่ 2 ถึง 20 จัดสรรศูนย์ คีย์ที่ซ้ำจะ resolve ไปที่ pointer เดียวกัน ซึ่งทำให้ใช้เป็นคีย์ lookup ของ shape cache ได้โดยไม่ต้อง strcmp</li>
        <li><strong>การแชร์ shape ผ่าน transition cache</strong> (v0.5.45) Object ที่สร้างโดย <code>js_object_set_field_by_name</code> จะเดินผ่าน transition graph เดียวกัน เมื่อ schema ซ้ำ pointer ของ <code>keys_array</code> จะถูกแชร์ และนั่นคือสิ่งที่ polymorphic inline cache ต้องการเพื่อจะ hit</li>
        <li><strong>Zero-copy string parsing + incremental object build</strong> (v0.5.46) <code>parse_string_bytes</code> ตอนนี้คืน <code>ParsedStr::Borrowed(&amp;[u8])</code> เมื่อไม่มี backslash escape &mdash; ซึ่งเป็นเคสทั่วไปสำหรับทุกคีย์และค่าส่วนใหญ่ <code>parse_object</code> เขียน field โดยตรงแทนที่จะรวบรวมลงใน Vec ก่อน</li>
        <li><strong>GC suppression ระหว่าง parse</strong> (v0.5.60, ปิด #59) การ parse array ขนาดใหญ่จัดสรร object เล็ก ๆ หลายพันตัวใน loop ที่แน่น แต่ละตัวไปแตะ threshold check ของ GC การตั้ง flag &ldquo;parsing in progress&rdquo; จะเลื่อนการ collect ไปจนกว่า parse จะคืน &mdash; ขนาด heap ที่มีผลเท่าเดิม แต่ branch ของการทำบัญชีน้อยลงมาก
      </li>
      </ol>
      <p>
        จากนั้นเป็น stringify JSON.stringify บน array ที่เหมือนกัน &mdash; shape เดียวกัน เป็นล้านครั้ง &mdash; กำลังทำ property iteration เต็มรูปแบบต่อ object ซึ่งสำหรับ array ที่ shape คงที่แล้ว เป็นการเสียเปล่าล้วน ๆ การแก้ไขห้าขั้นปิดช่องว่างนั้นไปส่วนใหญ่เช่นกัน:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: fast path ของ itoa / ryu สำหรับตัวเลข, circular-reference check แบบใช้ depth แทน HashSet</li>
        <li>v0.5.63: <code>toJSON</code> guard + persistent key cache + inline dispatch (สามต้นทุนต่อการเรียกที่รวมกันเยอะ)</li>
        <li>v0.5.65: template stringify สำหรับ shape ที่เหมือนกัน + ASCII escape fast path เมื่อทุก element มี shape เดียวกัน โครงคีย์/โคลอน/จุลภาคจะถูกคำนวณล่วงหน้าครั้งเดียว</li>
        <li>v0.5.70, v0.5.72, v0.5.75: per-call shape-template cache, ปิดช่องว่าง GC จากสิ่งที่เหลือจาก parse, กำจัด fixed per-call overhead ที่เหลือ</li>
        <li>v0.5.79: เส้นทางค่าเล็ก ตัวเลข, boolean และสตริงสั้น ผ่านเส้นทางตรงที่ไม่ได้ตั้งค่าเครื่องจักร object ใด ๆ</li>
      </ul>
      <p>
        ผลลัพธ์สะสม: pipeline JSON ที่เคย<strong>ห่างจาก Node 547 เท่า</strong>ในช่วงต้นสัปดาห์ ตอนนี้<strong>ห่างประมาณ 1.3 เท่าในการ parse และสู้ได้ในการ stringify</strong> บน workload ที่สมจริง
      </p>

      <h2>2. เรื่องของ allocator</h2>
      <p>
        Perry จัดสรรหน่วยความจำเยอะ ทุก object literal, ทุก array literal, ทุกการ concat สตริง, ทุก closure Allocator ร้อน และสำหรับ v0.5 ส่วนใหญ่ มันคือ system allocator เริ่มต้นของ Rust บวกกับ thread-local arena สำหรับค่าอายุสั้น
      </p>
      <p>
        v0.5.67 แทนที่ global allocator ด้วย <strong>mimalloc</strong> เป็นการเปลี่ยนแค่บรรทัดเดียวใน Cargo.toml ที่คืนทุนทันทีบน workload ใดก็ตามที่ทำการจัดสรรขนาดเล็กเยอะ ๆ &mdash; ซึ่งก็คือโปรแกรม TypeScript ทุกโปรแกรม v0.5.66 มาก่อนหน้านี้โดยรวม thread-local state ของ <code>gc_malloc</code> ทั้งหมดให้เหลือการเข้าถึง TLS ครั้งเดียวต่อการเรียก เพื่อให้เส้นทางเข้าสู่ mimalloc ถูกที่สุดเท่าที่จะเป็นไปได้
      </p>
      <p>
        v0.5.68 ต่อยอดด้วย <strong>สตริงที่จัดสรรใน arena</strong> สตริงอายุสั้น (ผลลัพธ์ concat กลาง, ชิ้นของ <code>split()</code>, scratch ของ parser) ข้าม global allocator ไปเลยและไปตกลงใน bump arena ต่อ thread ที่ reset ที่ขอบเขตธรรมชาติ สำหรับการ parse JSON นี่เองทำให้ชนะเป็นตัวเลขสองหลักเปอร์เซ็นต์
      </p>
      <p>
        และอีกสอง optimization ที่ไม่จัดสรรเลย:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Scalar replacement ของ object ที่ไม่ escape</strong> (v0.5.17 จากนั้น object literal ใน v0.5.76) ถ้า object ไม่เคยออกจากฟังก์ชันที่ครอบมัน มันก็ไม่จำเป็นต้องมีอยู่ field ของมันกลายเป็น local ธรรมดา LLVM จัดการเรื่องนี้ได้โดยอัตโนมัติเมื่อคุณเลิกซ่อน object ไว้หลังการเรียก allocator ทึบแสง</li>
        <li><strong>Scalar replacement ของ array ที่ไม่ escape</strong> (v0.5.73) แนวคิดเดียวกัน &mdash; ถ้า array ไม่ escape element ของมันกลายเป็นค่า SSA และการจัดสรรทั้งหมดหายไป</li>
      </ul>
      <p>
        สำหรับเส้นทาง array literal โดยเฉพาะ v0.5.69 เพิ่ม <strong>fast path สำหรับขนาดที่รู้แน่นอน</strong> (ข้ามเครื่องจักร capacity-growth เมื่อรู้ขนาดตอนคอมไพล์) และ v0.5.74 inline IR ของ bump allocator สำหรับ array literal ขนาดเล็ก เพื่อให้ LLVM มองเห็นการจัดสรร รวมมัน ยกมัน หรือกำจัดมันได้ Benchmark ที่ array เยอะขยับไปอีกก้าว
      </p>
      <p>
        ปิดท้ายด้วย v0.5.25 ที่แก้บั๊กเงียบ ๆ: <code>gc_malloc</code> ไม่ได้ trigger collection บนเส้นทางของตัวเอง ดังนั้น workload ที่ malloc เยอะสามารถทำให้ heap โตไม่จำกัดก่อนที่จะมีอะไรมาเช็ค v0.5.61 เพิ่ม adaptive step sizing ให้กับ threshold ซึ่งเป็นสิ่งที่คุณต้องการจริง ๆ: เช็คแบบถูกเมื่อ heap เล็ก น้อยลงเมื่อ heap ใหญ่
      </p>

      <h2>3. Property access ได้ inline cache จริง ๆ</h2>
      <p>
        JavaScript engine สมัยใหม่ทุกตัวมี polymorphic inline cache (PIC) บน property access สำหรับซีรีส์ v0.5 ส่วนใหญ่ของ Perry PropertyGet ผ่านการค้นหา shape-table ด้วย hash แบบ thread-local นั่นโอเคสำหรับโค้ดเย็น แต่ไม่โอเคเมื่อ 95% ของการอ่าน property ใน call site หนึ่ง ๆ เห็น shape เดียวกัน ซึ่งเกือบเสมอ
      </p>
      <p>
        v0.5.44 เข้ามาพร้อม <strong>monomorphic inline cache</strong> สำหรับ <code>PropertyGet</code> แต่ละ PropertyGet site ได้ cache entry ต่อ callsite: pointer ของ shape ที่คาดไว้และ offset ของ field Hit path คือ compare ครั้งเดียวบวกกับ load แบบ indexed Miss path จะ fall through ไปยัง slow helper ที่อัปเดต cache
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51 เพิ่ม <strong>content-hash shape-transition cache</strong> สำหรับการเขียน property แบบ dynamic object สองตัวที่โต field เดียวกันในลำดับเดียวกันจะ hash ไปที่ transition เดียวกัน ดังนั้นพวกมันจะจบลงโดยแชร์ shape เดียวกัน &mdash; และนั่นหมายความว่าฝั่งอ่านของ PIC จะ hit จริง ๆ
      </p>
      <p>
        v0.5.55 ลอกการเข้าถึง TLS สุดท้ายออกจาก transition cache v0.5.46 แก้บั๊กใน miss-handler ของ PIC ที่ object ที่มี &gt;8 field กำลังอ่านเลย inline slot ไปในหน่วยความจำที่ไม่ได้ initialize (ปิด #55) v0.5.78 เพิ่ม guard เพื่อหยุด PIC ของ PropertyGet ไม่ให้ index เข้าสู่ receiver ที่ไม่ใช่ pointer เช่นตัวเลขดิบ &mdash; ซึ่งอาจเกิดขึ้นเมื่อ type refinement มองโลกในแง่ดีเกินไป และเป็นหนึ่งในปัญหาเสถียรภาพสุดท้ายใน IC
      </p>
      <p>
        ผลสุทธิ: โค้ดที่ property เยอะ &mdash; ซึ่งในทางปฏิบัติหมายถึง TypeScript ส่วนใหญ่ &mdash; เร็วกว่าเมื่อสัปดาห์ที่แล้วประมาณ 2&ndash;3 เท่า จาก IC เพียงอย่างเดียว
      </p>

      <h2>4. Integer, bitwise และรูปแบบ <code>| 0</code></h2>
      <p>
        NaN-boxing ทำให้ตัวเลขทุกตัวเป็น f64 โปรแกรมเมอร์ TypeScript เขียน <code>x | 0</code> เพื่อบังคับ semantics แบบจำนวนเต็ม V8 ใช้เวลาสิบห้าปีทำให้สิ่งนั้นถูก Perry ใช้สัปดาห์นี้ไล่ตาม
      </p>
      <p>กองของการเปลี่ยนแปลงตามลำดับ:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>sdiv</code> สำหรับ <code>(int / const) | 0</code> LLVM fold เป็น <code>smulh + asr</code> ซึ่งใช้ ~2 cycle เทียบกับ ~10 สำหรับ <code>fdiv</code></li>
        <li><strong>v0.5.48</strong>: <code>@llvm.assume</code> บน bound ของ Uint8ArrayGet แทน branch+phi diamond ของ bounds check ด้วย basic block เดียวที่ vectorizer สามารถให้เหตุผลได้</li>
        <li><strong>v0.5.49</strong>: แก้ bitwise ops กับ NaN/Infinity ให้ผลิต 0 ตาม ToInt32 spec ความถูกต้องมาก่อน</li>
        <li><strong>v0.5.50</strong>: <code>toint32_fast</code> ที่ข้าม NaN/Inf guard 5 คำสั่งเมื่อค่าถูกรู้ว่า finite บวกกับ <code>alwaysinline</code> บน helper เล็ก ๆ และการตรวจจับ clamp</li>
        <li><strong>v0.5.52</strong>: target ฟังก์ชัน clamp โดยตรงด้วย intrinsic <code>smin</code>/<code>smax</code> Clamp เป็นรูปแบบจำนวนเต็มที่พบบ่อยที่สุดรองจาก increment</li>
        <li><strong>v0.5.53</strong>: <code>x | 0</code> และ <code>x &gt;&gt;&gt; 0</code> บนค่าที่ finite รู้แน่นอนกลายเป็น noop &mdash; แค่ <code>fptosi + sitofp</code> ไม่มี guard เลย</li>
        <li><strong>v0.5.56</strong>: bitwise ops แบบ i32 เนทีฟ; index และ value แบบ i32 ใน Uint8ArrayGet/Set</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> lower ไปเป็นการคูณ i32 เนทีฟแทนเส้นทาง polyfill การตรวจจับ polyfill จดจำ shim <code>Math.imul</code> ที่ผู้ใช้เขียนเองและแทนที่พวกมัน</li>
        <li><strong>v0.5.59</strong>: Inlining ของ init ของ pure function + integer-local seeding การวิเคราะห์จำนวนเต็มแบบ function-local ได้เห็นเลยขอบเขตการเรียกเมื่อ callee เล็กและ pure</li>
        <li><strong>v0.5.37&ndash;v0.5.40</strong>: Fast path ของ int-arithmetic แบบ accumulator pattern loop <code>for (...) acc += f(i)</code> แบบคลาสสิกอยู่ใน i32 ตลอดเส้นทางเมื่อ type เอื้ออำนวย</li>
      </ul>
      <p>
        v0.5.41 คืออันที่ subtle เมื่อ codegen เห็น <code>const K: number[][] = [[...], ...]</code> ระดับ module มัน lower ทั้งอันเป็น constant แบบ flat <code>[N x i32]</code> ใน <code>.rodata</code> <code>K[y][x]</code> กลายเป็น <code>getelementptr + load i32</code> ครั้งเดียว เมื่อรวมกับ bridge ของ int-analysis ใน v0.5.43 นี่คือสิ่งที่ทำให้ <code>image_conv</code> (Gaussian blur 5&times;5 บน 4K RGB frame) ได้ <strong>speedup 3 เท่าในรีลีสเดียว</strong>
      </p>

      <h2>5. Buffer และ Uint8Array</h2>
      <p>
        Workload ไบนารี &mdash; crypto, image processing, parsing, networking &mdash; อยู่ใน Buffer และ Uint8Array v0.5.64 ให้พวกมัน <strong>typed pointer slot พร้อม metadata <code>noalias</code></strong> จากที่ Buffer เคยเป็น NaN-boxed double ใน <code>alloca double</code> ตอนนี้เป็น pointer <code>i64</code> ดิบใน <code>alloca i64</code> พร้อม annotation ของ LLVM ที่บอก optimizer ว่า &ldquo;pointer นี้ไม่ alias กับ pointer อื่นใน scope&rdquo; นั่นปลดล็อก load/store reordering, vectorization และ register allocation ที่ optimizer จะไม่ยอมทำในกรณีอื่น
      </p>
      <p>
        v0.5.80 ปิดปัญหาความถูกต้องสุดท้ายที่นี่: ตัวนับ <code>alias-scope</code> ของ buffer ระดับ module ที่กำลังถูก reset ต่อฟังก์ชัน ซึ่งในบางกรณีหายากอาจปล่อยให้ LLVM ให้เหตุผลข้าม scope ที่ไม่ควรแชร์ scope ID เดียวกัน ตอนนี้ตัวนับเป็นระดับ module และเรื่อง <code>noalias</code> รัดกุม
      </p>
      <p>
        v0.5.53 ทำ <code>Uint8ArraySet</code> ให้เป็น branchless &mdash; masked store แทน if/else ที่เขียน 0 เมื่อ out-of-bounds v0.5.54 เพิ่ม <strong>Two-Way indexOf</strong> สำหรับ pattern ที่ยาวกว่าและ <code>split</code> ที่จัดสรรใน arena ซึ่งเมื่อรวมกันปิดช่องว่างส่วนใหญ่ของการ parse Buffer ที่สตริงเยอะ
      </p>

      <h2>6. Strings: ASCII คือ fast path</h2>
      <p>
        สตริง JavaScript เป็น UTF-16 แต่สตริงในโลกจริงส่วนใหญ่ (คีย์, identifier, HTTP header, โครง JSON) เป็น ASCII v0.5.71 เพิ่ม <strong><code>charCodeAt</code> และ <code>codePointAt</code> แบบ O(1) สำหรับสตริง ASCII</strong> &mdash; ไม่มีการ scan UTF-16 แค่ load byte v0.5.20 ทำให้ <code>indexOf</code>, <code>slice</code> และ <code>charAt</code> เลี่ยงการ scan UTF-16 บน ASCII แล้ว
      </p>
      <p>
        หมายเหตุความถูกต้องหนึ่งในรีลีสเดียวกัน: <code>String.length</code> ตอนนี้คืน code unit UTF-16 (ECMAScript spec) แทน byte count นั่นคือบั๊กที่ซ่อนอยู่ที่ <code>&quot;caf&eacute;&quot;.length</code> คืน 5 แทนที่จะเป็น 4
      </p>

      <h2>7. เซิร์ฟเวอร์อยู่ได้จริง ๆ แล้ว</h2>
      <p>
        งานที่ไม่หรูหราที่สุดของสัปดาห์ยังเป็นงานที่ผู้ใช้เห็นชัดที่สุด: ทำให้เซิร์ฟเวอร์สไตล์ Node ที่รันยาว ๆ &mdash; Fastify, ws, http, net &mdash; ไม่แครชหลังจากไม่กี่นาที
      </p>
      <p>
        การแครชทั้งหมดมีสาเหตุร่วม: GC ไม่รู้เกี่ยวกับ closure ของ listener เมื่อคุณเขียน <code>wss.on(&apos;message&apos;, handler)</code> closure จับตัวแปร ซึ่งอยู่เป็น field ภายใน cell ที่จัดสรรโดย GC ถ้า root scanner ของ GC ไม่รู้ที่จะเยี่ยม cell เหล่านั้น การจับของมันจะถูกเรียกคืน และ message event ถัดไปจะ dereference หน่วยความจำที่ถูก free ไปแล้ว
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: root-scan closure ของ event listener ของ <code>net.Socket</code> (ปิด #35)</li>
        <li><strong>v0.5.27</strong>: ขยายไปยัง <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code></li>
        <li><strong>v0.5.28</strong>: ลงทะเบียน global ระดับ module เป็น GC root (ปิด #36) บั๊ก lifetime ที่ layer ขึ้นไป</li>
        <li><strong>v0.5.21</strong>: ความปลอดภัยของ <code>gc()</code> ภายใน request handler ของ Fastify/WebSocket &mdash; การเรียก GC แบบ explicit กำลังรันอยู่ขณะ request handler ถือ pointer เข้าไปใน arena (ปิด #31)</li>
      </ul>
      <p>
        ควบคู่ไปกับงาน GC v0.5.20 ส่ง <strong>main event loop</strong> &mdash; ของจริง ไม่ใช่ placeholder &mdash; ที่ทำให้เซิร์ฟเวอร์ที่อิง WebSocket และ timer อยู่ได้แทนที่จะออกหลังจากการเรียก sync ครั้งสุดท้ายคืน (refs #28) นี่คือการแก้ไขที่ส่งผลมากที่สุดสำหรับใครก็ตามที่พยายามรัน Perry เป็นเซิร์ฟเวอร์ HTTP production Fastify ตอนนี้อยู่ได้ เซิร์ฟเวอร์ WebSocket ตอนนี้อยู่ได้
      </p>
      <p>
        v0.5.19 แก้ SysV AMD64 ABI mismatch สำหรับ args/returns ของ JSValue FFI &mdash; ปัญหาบน Linux ที่การเรียก FFI เนทีฟอาจ corrupt arguments อย่างเงียบ ๆ v0.5.18 เพิ่ม dispatch เนทีฟสำหรับ <code>axios</code> (get/post/put/delete/patch) รวมถึง <code>response.status</code> และ <code>response.data</code> v0.5.30 แก้ dispatch ของ <code>fastify request.header()</code> และ <code>request.headers[]</code> ที่เคยคืน undefined สำหรับ lookup ที่ไม่ case-sensitive
      </p>

      <h2>8. <code>@perry/postgres</code>: driver ที่ทำให้ทุกสิ่งนี้จำเป็น</h2>
      <p>
        งานส่วนใหญ่ของสัปดาห์นี้ถูกขับเคลื่อนโดย workload เดียว: การทำให้ <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">Postgres driver</a> ที่เข้ากันได้กับ Node เต็มรูปแบบทำงานบน Perry-native Driver รองรับ TLS มี codec registry ข้าม module รองรับ cancel/close/notify และตอนนี้ benchmark เทียบกับ <code>pg</code>, <code>postgres.js</code> และ <code>tokio-postgres</code>
      </p>
      <p>งาน perf ฝั่ง driver ขนานไปกับฝั่ง compiler:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hoist codec ต่อคอลัมน์</strong> และลดการคัดลอก Buffer ต่อเซลล์ BigInt(string) สำหรับ int8 เพื่อหลีกเลี่ยงการจัดสรรกลาง</li>
        <li><strong>Constructor ของ Row แบบ dynamic ต่อ shape</strong> สำหรับ row แบบ object ถ้า query ของคุณคืนคอลัมน์เดียวกันเสมอ driver สร้าง row constructor ที่ specialize ตาม shape ในครั้งแรกและใช้ซ้ำ &mdash; ซึ่งเมื่อรวมกับ PIC ของ compiler ทำให้การเข้าถึง field บน row เร็วเท่ากับการเข้าถึง field บน object อื่น ๆ</li>
        <li><strong>opt-out <code>parseTypes: &apos;minimal&apos;</code></strong> สำหรับ caller ที่ต้องการสตริงดิบสำหรับ int8/numeric/date</li>
      </ul>
      <p>
        นี่คือ positive feedback loop ที่ compiler ตั้งใจจะเปิดมาตลอด Driver จริง ๆ เปิดเผย bottleneck จริง ๆ Bottleneck ได้ reproducer หนึ่งบรรทัดยื่นเป็น GitHub issue หลังจากสัปดาห์หนึ่งของการแก้ไข compiler driver เร็วขึ้นและ compiler ก็เร็วขึ้นสำหรับคนอื่นทุกคนด้วย นั่นคือแผนทั้งหมด บีบอัดลงในเจ็ดวัน
      </p>

      <h2>9. การแก้ไขความถูกต้องที่ควรกล่าวถึง</h2>
      <p>
        งาน performance เปิดเผยปัญหาความถูกต้องแบบเดียวกับที่การขุดลอกแม่น้ำเปิดเผยรถเข็นของชำ นี่คือรายการบางส่วน:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> อ่าน <code>.value</code> เมื่อถูก reject แทน <code>.reason</code> ดังนั้น rejection ถูกกลืนอย่างเงียบ ๆ (v0.5.13&ndash;v0.5.14)</li>
        <li><strong>Promise.any</strong> ตอนนี้ throw <code>AggregateError</code> ที่ถูกต้องเมื่อ promise อินพุตทั้งหมด reject เพิ่ม <code>Promise.withResolvers</code> และแก้ลำดับของ <code>queueMicrotask</code></li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> ตอนนี้ผลิต character array แทน object ที่พัง (ปิด #16)</li>
        <li><strong>เลขคณิต BigInt และการ coerce <code>BigInt()</code></strong> (ปิด #33) Fast path ของ bigint แบบ i64 (v0.5.29) ทำให้เคสทั่วไปถูก</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> กับ argument byte ที่เป็นตัวเลขกำลังเปรียบเทียบกับ pointer ของ buffer แทนค่า byte (ปิด #56)</li>
        <li><strong>Bitwise ops กับ NaN/Infinity</strong> ผลิต 0 ตาม ToInt32 spec (ปิด #57)</li>
        <li><strong>Windows x86_64</strong>: การแก้ไขเฉพาะแพลตฟอร์มห้าจุด &mdash; <code>localtime</code>, การค้นหา <code>clang</code> และการปรับ codegen จำนวนหนึ่ง &mdash; ทำให้ Windows x86_64 กลับมาเขียวอีกครั้ง (v0.5.72)</li>
      </ul>

      <h2>10. ตัวเลข</h2>
      <p>
        headline benchmark จากโพสต์ที่แล้วคือ <code>factorial</code> ที่เร็วกว่า Node 24.6 เท่า ตัวเลขนั้นไม่เปลี่ยน สิ่งที่ขยับในสัปดาห์นี้คือทุกอย่างรอบ ๆ มัน:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (schema 20 เรกคอร์ด)</td><td className="text-right py-2 px-3">ช้ากว่า Node 547 เท่า</td><td className="text-right py-2 px-3">ช้ากว่า Node 1.3 เท่า</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420 เท่า</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (blur 4K 5&times;5)</td><td className="text-right py-2 px-3">1,980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4.3 เท่า</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">โค้ดที่ property เยอะ (PIC hit)</td><td className="text-right py-2 px-3">baseline</td><td className="text-right py-2 px-3">2&ndash;3 เท่า</td><td className="text-right py-2 px-3 text-green-400">2&ndash;3 เท่า</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1.3 เท่า</td></tr>
            <tr><td className="py-2 px-3">uptime ของ Fastify ภายใต้โหลด</td><td className="text-right py-2 px-3">~60 วินาทีก่อนแครช</td><td className="text-right py-2 px-3">ไม่จำกัด</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        ชุด benchmark 15 รายการเต็มเทียบกับ Node ยังคงเป็น 14 ชนะและ 1 เสมอ &mdash; ตารางเดียวกับโพสต์ที่แล้ว ด้วยตัวเลขที่ดีขึ้นเล็กน้อยในทุกรายการ การเคลื่อนไหวจริง ๆ ในสัปดาห์นี้อยู่ใน workload ที่ไม่อยู่ในชุดนั้น: JSON, image processing, เซิร์ฟเวอร์ที่รันยาว นั่นคือที่ที่ช่องว่างอยู่ และนั่นคือสิ่งที่ปิดไปแล้ว
      </p>

      <h2>11. ต่อไปคืออะไร</h2>
      <p>
        Benchmark หนึ่งเดียวที่เรายังไล่อยู่คือ <code>image_conv</code> เทียบกับ Zig Perry อยู่ที่ 457ms; Zig อยู่ที่ 246ms ช่องว่างนั้นเป็นระดับสถาปัตยกรรม ไม่ใช่ระดับ optimization pass และมันอยู่ในสามที่:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Typed buffer local</strong> งาน Buffer ส่วนใหญ่ลงจอดในสัปดาห์นี้ แต่ param ฟังก์ชันและ local ที่ type เป็น buffer ยัง unbox ทุกครั้งที่เข้าถึง วิธี slot <code>i64</code> ที่เราใช้สำหรับตัวนับ loop ต้องขยายไปยัง buffer</li>
        <li><strong>การแยก loop interior/border</strong> blur loop clamp ทุก pixel รวมถึง 99.9% ของ pixel ที่ไม่จำเป็นต้องทำ การแยกเป็น border region (clamp) และ interior (ไม่ clamp) ทำให้ LLVM vectorize interior ด้วย NEON <code>ld3</code>/<code>st3</code> ได้</li>
        <li><strong>FNV-1a hash แบบ Double-ABI</strong> helper ของ hash ถูกเรียกผ่าน NaN-box ABI การ specialize ให้เป็น i64 ดิบเข้า/ออกสำหรับ hot path เป็นงานไม่กี่ชั่วโมงที่จะคืนทุนข้าม workload ที่ hash เยอะทุกอัน</li>
      </ol>
      <p>
        พวกมันถูก track อยู่ใน <code>PERF_ROADMAP.md</code> คาดว่าจะได้เห็นในรอบถัดไป
      </p>

      <h2>ปิดท้าย</h2>
      <p>
        รูปแบบของสัปดาห์นี้ &mdash; 68 patch release เกือบทั้งหมดเป็น performance ช่องว่าง JSON หนึ่งจาก 547 เท่าเหลือ 1.3 เท่า &mdash; คือสิ่งที่เกิดขึ้นเมื่อคุณข้ามมาอยู่ฝั่งที่ดีของเนินการ cutover LLVM Optimizer ตอนนี้เป็นพันธมิตรแทนที่จะเป็นกำแพง และสิ่งที่เหลือส่วนใหญ่เป็นงานเล็ก ๆ เฉพาะเจาะจง วัดผลได้: หา slow path หาเหตุผลว่าทำไม optimizer จึงมองทะลุไม่ได้ เปิดเผยโครงสร้าง วัดอีกครั้ง ไม่มี commit ใดในนี้แปลกใหม่ พวกมันแค่ถูกนำไปใช้ในที่ที่ต้องการ
      </p>
      <p>
        ถ้าคุณอยากลอง:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        ซอร์ส: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        Issue, reproducer และ benchmark ที่ยังไม่เร็วพอ: ส่งมาเรื่อย ๆ จังหวะนี้ใช้ได้เพราะ bug report เฉพาะเจาะจงพอที่จะเปลี่ยนเป็น reproducer หนึ่งบรรทัด ทุก commit ในโพสต์นี้มี <code>#N</code> ผูกอยู่ด้วยเหตุผล
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
