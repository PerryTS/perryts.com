import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript บน LLVM: Monomorphization และการสร้างโค้ดเนทีฟ",
  description:
    "Perry ลดระดับ TypeScript ลงสู่ LLVM IR อย่างไร — typed HIR, monomorphization, NaN-boxing — และทำไม backend ถึงย้ายจาก Cranelift ไปเป็น LLVM เพื่อประสิทธิภาพ AOT",
  breadcrumb: "TypeScript บน LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript บน <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry ลดระดับภาษาที่ออกแบบมาสำหรับ JIT engine ให้เป็น LLVM IR ได้
            อย่างไร — monomorphization, NaN-boxing, inline lowering — และ
            ทำไมมันถึงทิ้ง Cranelift
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              โครงสร้างภายในคอมไพเลอร์
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              ดูบน GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">ทำไมต้อง LLVM สำหรับ TypeScript?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            คอมไพเลอร์แบบ ahead-of-time อยู่ในระบอบที่ต่างจาก JIT JIT คอมไพล์
            ในขณะที่ผู้ใช้รอ ดังนั้น latency ของการคอมไพล์จึงเป็นข้อจำกัด
            คอมไพเลอร์ AOT อย่าง Perry คอมไพล์เพียงครั้งเดียว — บนเครื่องของ
            นักพัฒนาหรือใน CI — แล้วไบนารีก็ถูกรันนับล้านครั้งหลังจากนั้น ความ
            ไม่สมมาตรนั้นเองคือจุดที่ optimizer ตัวหนักคุ้มค่าที่จะใช้
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM มาพร้อมงานด้าน middle-end กว่าสองทศวรรษ: loop vectorization,
            loop-invariant code motion, global value numbering, sparse
            conditional constant propagation, aggressive inlining, alias
            analysis หน้าที่ของ Perry คือส่งมอบ IR ที่เครื่องจักรนั้นปรับแต่ง
            ได้จริงให้มัน — ซึ่งเป็นจุดที่ข้อมูล type ของ TypeScript เข้ามามี
            บทบาท
          </p>

          <h2 className="text-2xl font-bold mb-6">ไปป์ไลน์การ lowering</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            ซอร์สถูก parse ด้วย SWC จากนั้นถูก lower ลงสู่ typed high-level IR
            (HIR) ที่ซึ่งการตัดสินใจที่น่าสนใจเกิดขึ้นก่อนที่ LLVM จะได้เห็น
            โค้ดด้วยซ้ำ:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorphization</strong>{" "}
              ฟังก์ชันและคลาส generic ถูกทำให้เฉพาะเจาะจงต่อ instantiation ที่
              เป็น concrete แต่ละตัว เป็นกลยุทธ์เดียวกับที่ Rust และ C++ ใช้{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> และ{" "}
              <code className="text-slate-300">{`Stack<string>`}</code>{" "}
              กลายเป็นฟังก์ชันอิสระสองตัวที่มี type เต็มรูปแบบ — ทำให้
              optimizer ทำงานกับ concrete type แทนที่จะเป็น generic dispatch
              blob และ generic ไม่มีต้นทุนตอนรันไทม์เลย
            </li>
            <li>
              <strong className="text-slate-300">Static dispatch</strong>{" "}
              เมื่อ type ของ receiver รู้แล้วตอนคอมไพล์ การเรียก method จะถูก
              คอมไพล์เป็นการเรียกโดยตรงที่ LLVM สามารถ inline ได้ ไม่ใช่การ
              ค้นหาแบบ hash-table
            </li>
            <li>
              <strong className="text-slate-300">Direct field access</strong>{" "}
              field ของ object ถูก resolve เป็น index ตอนคอมไพล์ ทำให้การอ่าน
              property เป็นการโหลดแบบ fixed-offset — ไม่ใช่การค้นหาแบบ
              dictionary
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing และ inline lowering
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            เมื่อค่าเป็นแบบ dynamic Perry ใช้ NaN-boxing: ทุกค่าเป็น word
            ขนาด 64 บิต ตัวเลข double ถูกเก็บโดยตรง; object, string, boolean,{" "}
            <code className="text-slate-300">null</code> และ{" "}
            <code className="text-slate-300">undefined</code> ถูกเข้ารหัสลง
            ในรูปแบบบิตที่ไม่ได้ใช้ของ quiet NaN ตามมาตรฐาน IEEE 754 ตัวเลข
            ไม่มีต้นทุนเลย — ไม่มีการ boxing ไม่มีการจัดสรรหน่วยความจำสำหรับ
            การคำนวณ
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            ข้อแม้คือการดำเนินการกับค่าที่ไม่ใช่ตัวเลขต้องใช้ลำดับบิตแบบ
            unpack-operate-repack ถ้าลำดับเหล่านั้นอยู่ในรูปแบบการเรียกเข้าไป
            ยัง runtime ที่คอมไพล์แยกต่างหาก LLVM จะเห็นมันเป็นกล่องดำทึบและ
            ไม่สามารถปรับแต่งข้ามมันได้ ดังนั้น Perry จึง emit การดำเนินการที่
            hot — การโหลด property, method dispatch, การจัดสรร object — เป็น
            LLVM IR แบบ inline ที่ optimizer สามารถรวมและลดรูปได้ ตัวอย่างเช่น
            การจัดสรร object ถูกคอมไพล์ลงไปเป็น inline thread-local bump
            allocation:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — inline bump allocation</span>
            </div>
            <pre className="text-sm text-slate-300 overflow-x-auto">
              <code>{`%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr        ; current bump offset
%new_off = add i64 %offset, 96           ; headers + 8 fields
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr         ; block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow`}</code>
            </pre>
          </div>

          <h2 className="text-2xl font-bold mb-6">ทำไมไม่ใช้ Cranelift?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            backend แรกของ Perry คือ Cranelift — codegen เบื้องหลัง wasmtime
            ที่สร้างมาเพื่อการคอมไพล์ที่เร็วและคาดเดาได้ มันเป็นจุดเริ่มต้นที่
            ถูกต้อง และยังคงเป็นตัวเลือกที่ยอดเยี่ยมสำหรับ JIT และรันไทม์แบบ
            sandbox สองสิ่งที่บังคับให้ต้องเปลี่ยน:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">เพดานของ optimizer</strong>{" "}
              Cranelift ถูกออกแบบให้เป็นคอมไพเลอร์แบบ single-tier ที่เร็วโดย
              เจตนา: &ldquo;สร้างโค้ดที่ใช้ได้เร็ว&rdquo; ซึ่งเป็นข้อแลกเปลี่ยน
              ที่ถูกต้องสำหรับ JIT แต่ผิดสำหรับคอมไพเลอร์ AOT ที่จุดขายคือ
              ประสิทธิภาพเนทีฟระดับสูงสุด
            </li>
            <li>
              <strong className="text-slate-300">arm64_32</strong> Apple
              Watch ใช้ ABI (คำสั่ง 64 บิต, pointer 32 บิต) ที่ Cranelift ไม่
              รองรับ เพื่อให้ watchOS มีอยู่เป็นเป้าหมายได้ ต้องใช้ LLVM —
              และการดูแล backend สองตัวหมายถึงชุดของ bug, test และ performance
              baseline ที่ต้องดูแลสองชุด
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            การย้ายครั้งนี้ไม่ได้มาฟรี ๆ: release แรกที่ใช้ LLVM อย่างเดียว
            ทำให้เบนช์มาร์กบางตัวถดถอยลงถึง 70 เท่า เพราะการดำเนินการที่ hot
            ในตอนแรกต้องผ่านการเรียก runtime helper ที่ทึบแสง การกู้คืน —
            inline lowering, bump allocator ด้านบน, ขอบเขตการ inline ที่ดีขึ้น
            — ทำให้ backend แซงตัวเลขของ Cranelift ได้ และเมื่อทุกอย่างลงตัว
            แล้ว Perry ก็เอาชนะ Node.js ได้ในทุกเบนช์มาร์กของชุดทดสอบ โดยเร็ว
            กว่า 1.7 ถึง 24.6 เท่า พร้อมกับเสมอกันสองรายการ (เมษายน 2026)
            โพสต์วิเคราะห์แบบเต็มน่าอ่าน:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              จาก Cranelift สู่ LLVM: Perry เร็วขึ้น 24 เท่าได้อย่างไร
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">เจาะลึกยิ่งขึ้น</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              หน้าโครงสร้างภายในคอมไพเลอร์
            </Link>{" "}
            ครอบคลุม NaN-boxing, monomorphization และ static dispatch อย่าง
            ละเอียดมากขึ้น บนบล็อก{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              ปรับแต่งทุกอย่าง: หนึ่งสัปดาห์, 68 รุ่น, และ JSON เร็วขึ้น 547
              เท่า
            </Link>{" "}
            พาไปดูงานปรับแต่งทีละ release และ{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Generational GC, Lazy JSON และเบนช์มาร์กที่ทนต่อการตรวจสอบ
            </Link>{" "}
            อธิบายว่าระเบียบวิธีเบนช์มาร์กทำงานอย่างไร (RUNS=11, ค่ากลาง +
            p95) สำหรับภาพรวมที่ใหญ่กว่านี้ เริ่มที่ภาพรวม{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              คอมไพเลอร์ TypeScript เนทีฟ
            </Link>
            .
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              ดูเอาต์พุตด้วยตัวเอง
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              โค้ดเครื่องเนทีฟ ไม่มี engine ติดมาด้วย
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                เริ่มต้น
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                ดูบน GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
