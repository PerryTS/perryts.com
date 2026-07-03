import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "คอมไพเลอร์ TypeScript เนทีฟ: Perry คอมไพล์ TS เป็นโค้ดเครื่องได้อย่างไร",
  description:
    "Perry เป็นคอมไพเลอร์ TypeScript เนทีฟที่เขียนด้วย Rust: parse ด้วย SWC, typed HIR, monomorphization, สร้างโค้ดด้วย LLVM ไบนารีเนทีฟสำหรับ 10 แพลตฟอร์ม ไม่มี VM",
  breadcrumb: "คอมไพเลอร์ TypeScript เนทีฟ",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            คอมไพเลอร์ TypeScript เนทีฟ ที่{" "}
            <span className="gradient-text">สร้างด้วย Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry คอมไพล์ TypeScript ที่คุณเขียนอยู่แล้วให้เป็นโค้ดเครื่อง —
            แบบเดียวกับที่ toolchain ของ Rust หรือ Go คอมไพล์ภาษาของมัน ไม่มี
            JavaScript ที่ทรานสไพล์มา ไม่มี virtual machine ไม่มีรันไทม์บน
            ระบบปลายทาง
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            ไม่ใช่ทรานสไพเลอร์ ไม่ใช่รันไทม์
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            เครื่องมือ TypeScript ส่วนใหญ่แบ่งเป็นสองตระกูล ทรานสไพเลอร์ —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild —
            ตรวจสอบและตัด type ออก แล้วสร้าง JavaScript ให้ engine รันในภายหลัง
            รันไทม์ — Node.js, Bun, Deno — คือ engine เหล่านั้น: มันจะ parse,
            interpret และคอมไพล์ JavaScript แบบ JIT ทุกครั้งที่โปรแกรมของคุณ
            เริ่มทำงาน
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            คอมไพเลอร์เนทีฟคือตระกูลที่สาม และสำหรับ TypeScript มันแทบจะว่างเปล่า
            มาตลอด Perry ปฏิบัติต่อ type annotation ไม่ใช่ในฐานะเอกสารที่ต้อง
            ถูกตัดทิ้ง แต่เป็นอินพุตที่ขับเคลื่อนการสร้างโค้ด ผลลัพธ์ของ{" "}
            <code className="text-slate-300">perry compile main.ts</code> คือ
            ไฟล์ปฏิบัติการแบบ standalone ที่มีโค้ดเครื่องอยู่ในนั้น — โดยทั่วไป
            มีขนาด{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB เริ่มทำงานในเวลาประมาณหนึ่งมิลลิวินาที
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">ไปป์ไลน์ ทีละขั้นตอน</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Parse (SWC)</strong> ไฟล์
              ซอร์สถูก parse ด้วย SWC ตัว parser TypeScript แบบเนทีฟที่เขียนด้วย
              Rust ทำให้แม้แต่โปรเจกต์ขนาดใหญ่ก็ parse เสร็จในหลักมิลลิวินาที
              การสร้างโค้ดโมดูล, transform pass และการสแกนสัญลักษณ์รันแบบขนาน
              ข้ามทุกแกน CPU
            </li>
            <li>
              <strong className="text-slate-300">การ resolve type</strong>{" "}
              คอมไพเลอร์ resolve type ที่ประกาศไว้และอนุมานส่วนที่เหลือ ทำให้
              ทุก expression มี concrete type ก่อนที่การสร้างโค้ดจะเริ่มต้น
            </li>
            <li>
              <strong className="text-slate-300">
                Typed HIR และ monomorphization
              </strong>{" "}
              AST ถูก lower ลงสู่ typed high-level IR ฟังก์ชันและคลาส generic
              ถูกทำ monomorphization — แต่ละ instantiation อย่าง{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> ถูก
              คอมไพล์แยกกันด้วย concrete type ของมัน ทำให้ generic ไม่มีต้นทุน
              ตอนรันไทม์เลย เมื่อรู้ type แล้ว การเรียก method จะกลายเป็น
              static dispatch และ field ของ object จะกลายเป็นการโหลดแบบ
              fixed-offset โดยตรง
            </li>
            <li>
              <strong className="text-slate-300">Codegen (LLVM)</strong> HIR
              ถูก lower ลงสู่ LLVM IR และรันผ่าน pipeline การปรับแต่งของ LLVM
              — inlining, การปรับแต่ง loop, vectorization — แล้วจึง emit เป็น
              โค้ดเครื่องสำหรับเป้าหมายนั้น
            </li>
            <li>
              <strong className="text-slate-300">Link</strong> เอาต์พุตคือ
              ไฟล์ปฏิบัติการแพลตฟอร์มปกติ: Mach-O บน macOS, ELF บน Linux, PE บน
              Windows — รวมถึงเป้าหมายมือถือ, watch, TV และ WebAssembly
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            ฝั่ง LLVM ของเรื่องนี้ — เหตุผลที่เลือก LLVM แทน Cranelift, วิธีที่
            NaN-boxing แทนค่า dynamic, สิ่งที่ optimizer ทำกับ typed IR — มีการ
            เจาะลึกของตัวเอง:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript บน LLVM
            </Link>
            . รายละเอียดการ implement อย่าง NaN-boxing, static dispatch และ
            zero-cost abstraction ถูกอธิบายไว้ใน{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              โครงสร้างภายในคอมไพเลอร์
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            แล้วโค้ดแบบ dynamic กับ npm ล่ะ?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript ก็ยังคงเป็น JavaScript อยู่ข้างใต้ และคอมไพเลอร์
            TypeScript เนทีฟก็ต้องซื่อสัตย์กับเรื่องนั้น ความสอดคล้องของ Perry
            กับชุดทดสอบ test262 อย่างเป็นทางการถูกวัดผลและเผยแพร่ — ณ v0.5.1146
            semantics ของ String อยู่ที่ 79% และ Array อยู่ที่ 72% ซึ่งทั้งคู่
            เพิ่มขึ้นทุก release แพ็กเกจ npm ที่เป็น TypeScript/JavaScript ล้วน
            คอมไพล์แบบเนทีฟได้ผ่าน{" "}
            <code className="text-slate-300">perry.compilePackages</code>:
            axios, zod v4, express, fastify และ hono คอมไพล์และรันได้แล้วใน
            วันนี้ โค้ดที่ต้องการ semantics ของ engine เต็มรูปแบบสามารถเลือก
            ใช้ V8 fallback แบบฝังตัวด้วย{" "}
            <code className="text-slate-300">--enable-js-runtime</code>
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            เรื่องราวแบบเต็มอยู่ใน{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              npm package จริงคอมไพล์ได้แล้ว: axios, zod, express — กับการกวาด
              conformance
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry เกี่ยวข้องกับความพยายาม &ldquo;native TypeScript&rdquo;
            อื่น ๆ อย่างไร
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry ไม่ใช่โปรเจกต์เดียวที่มองเห็นโอกาสในการคอมไพล์จาก type
            annotation ของ TypeScript — แต่แนวทางนั้นแตกต่างกันอย่างชัดเจน
            AssemblyScript คอมไพล์ภาษาที่เข้มงวดคล้าย TypeScript ไปเป็น
            WebAssembly เท่านั้น: มันจงใจไม่เข้ากันได้กับ JavaScript และไม่
            ผลิตไฟล์ปฏิบัติการของ OS หรือ UI เนทีฟ Static Hermes ของ Meta
            คอมไพล์ JavaScript subset ที่มี type แบบ ahead-of-time ภายใน
            Hermes engine โดยมุ่งเป้าหลักไปที่ React Native — ณ กลางปี 2026
            มันยังคงเป็นโครงการวิจัยที่ต้อง build จาก source เอง และ Hermes V1
            engine ที่ส่งมอบจริงใน React Native ก็ไม่มีฟีเจอร์แบบ static
            รวมอยู่ด้วย (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              เปรียบเทียบแบบเต็ม
            </Link>
            )
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            การเดิมพันของ Perry แตกต่างกันในทั้งสองแกน: TypeScript มาตรฐานเป็น
            ภาษาอินพุต และไฟล์ปฏิบัติการแพลตฟอร์มธรรมดา — CLI, server และ GUI —
            เป็นเอาต์พุต ที่ติดตั้งได้วันนี้ผ่าน Homebrew, APT, winget หรือ npm
          </p>

          <h2 className="text-2xl font-bold mb-6">คอมไพเลอร์เดียว สิบเป้าหมาย</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            เพราะการสร้างโค้ดผ่าน LLVM โค้ดเบสเดียวจึงคอมไพล์เป็น macOS, iOS,
            iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly และ
            Web/JS ธรรมดา — รวมถึงการครอสคอมไพล์ไบนารี Windows, macOS และ iOS
            จากเครื่อง Linux แอป GUI ใช้{" "}
            <code className="text-slate-300">perry/ui</code> ซึ่งเป็น API
            แบบ declarative เหนือวิดเจ็ตแพลตฟอร์มจริง (AppKit, UIKit, GTK4,
            Win32, Android ผ่าน JNI) — ไม่มี webview เข้ามาเกี่ยวข้องเลย
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            เทียบกับแนวทางอื่นแล้วเป็นอย่างไร:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry เทียบกับ Bun, Deno, Electron, Tauri, React Native และ
              Static Hermes
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
              ลองใช้คอมไพเลอร์
            </h2>
            <p className="text-slate-400 mb-6">
              ติดตั้ง Perry แล้วคอมไพล์ไบนารีเนทีฟตัวแรกของคุณได้ในเวลาไม่ถึง
              นาที
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                เริ่มต้น
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                อ่านเอกสาร
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
