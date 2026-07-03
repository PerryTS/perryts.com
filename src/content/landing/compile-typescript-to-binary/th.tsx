import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "คอมไพล์ TypeScript เป็นไบนารี (ไฟล์ปฏิบัติการแบบ Standalone)",
  description:
    "คอมไพล์ TypeScript เป็นไบนารี: ไฟล์ปฏิบัติการเนทีฟแบบ standalone ขนาด 2–5 MB ไม่ต้องมี Node.js Perry เทียบกับ bun build --compile และ Node SEA อย่างไร",
  breadcrumb: "คอมไพล์ TypeScript เป็นไบนารี",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            คอมไพล์ TypeScript <span className="gradient-text">เป็นไบนารี</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            คำสั่งเดียวเปลี่ยน <code className="text-slate-300">main.ts</code>{" "}
            ให้เป็นไฟล์ปฏิบัติการเนทีฟแบบ standalone ไม่ต้องมี Node.js บนเครื่อง
            ปลายทาง ไม่ต้องมีรันไทม์ที่ bundle มา ไม่ต้องมีขั้นตอนติดตั้งสำหรับ
            ผู้ใช้ของคุณ
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              ติดตั้ง Perry
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

          <div className="max-w-2xl mx-auto text-left">
            <div className="code-block glow">
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs">terminal</span>
              </div>
              <div className="space-y-2">
                <p>
                  <span className="text-slate-500">$</span>{" "}
                  <span className="text-cyan-400">perry</span> compile main.ts
                </p>
                <p className="text-green-400">
                  ✓ Compiled executable: main (2.3 MB)
                </p>
                <p className="mt-4">
                  <span className="text-slate-500">$</span> ./main
                </p>
                <p className="text-slate-300">Hello, World!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            สามสิ่งที่คนเรียกว่า &ldquo;การคอมไพล์ TypeScript&rdquo;
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            เมื่อนักพัฒนาค้นหาวิธีคอมไพล์ TypeScript เป็นไบนารี พวกเขามักจะเจอ
            เทคนิคที่แตกต่างกันมากสามแบบซึ่งใช้คำเดียวกัน:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">ทรานสไพล์</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC และ esbuild
              แปลง TypeScript เป็น JavaScript เอาต์พุตยังคงต้องมี Node.js, Bun
              หรือเบราว์เซอร์ในการรัน ไม่มีไบนารีเกี่ยวข้องเลย
            </li>
            <li>
              <strong className="text-slate-300">
                การฝังรันไทม์
              </strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code> และ Node.js
              Single Executable Applications (SEA) นำ JavaScript ที่ bundle
              ของคุณมาต่อรวมกับสำเนาเต็มของรันไทม์ คุณจะได้ไฟล์เดียว แต่ engine
              ก็ติดมาด้วยข้างในนั้น และโค้ดของคุณก็ยังคงถูก parse และคอมไพล์
              แบบ JIT ทุกครั้งที่โพรเซสเริ่มทำงาน
            </li>
            <li>
              <strong className="text-slate-300">
                คอมไพล์เนทีฟแบบ Ahead-of-time
              </strong>{" "}
              นี่คือสิ่งที่ Perry ทำ TypeScript ถูก parse ด้วย SWC, resolve
              type, ทำ monomorphization กับ generic และ LLVM สร้างโค้ดเครื่อง
              linker ผลิตไฟล์ปฏิบัติการธรรมดา — อาร์ติแฟกต์ประเภทเดียวกับที่
              toolchain ของ Rust, Go หรือ C++ ผลิตออกมา ไม่มี JavaScript engine
              อยู่ในไบนารีเลย
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            เพราะไม่มี engine ต้อง boot และไม่มีอะไรต้อง parse ตอนเริ่มทำงาน
            ไบนารีของ Perry จึงเริ่มทำงานในเวลาประมาณหนึ่งมิลลิวินาที ไปป์ไลน์
            นี้อธิบายไว้อย่างละเอียดมากขึ้นในหน้า{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              คอมไพเลอร์ TypeScript เนทีฟ
            </Link>{" "}
            และใน{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              โครงสร้างภายในคอมไพเลอร์
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">ไบนารีมีขนาดใหญ่แค่ไหน?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            ขนาดขึ้นอยู่กับสิ่งที่คุณดึงเข้ามาใช้ เพราะมีเพียงโค้ดที่คุณใช้
            จริงเท่านั้นที่ถูกคอมไพล์และ link:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              hello world มีขนาดประมาณ{" "}
              <strong className="text-slate-300">330 KB</strong>
            </li>
            <li>
              เครื่องมือ CLI ทั่วไปอยู่ที่{" "}
              <strong className="text-slate-300">2–5 MB</strong>
            </li>
            <li>
              แอปพลิเคชันเต็มรูปแบบที่ link เฟรมเวิร์กขนาดใหญ่ (Fastify, mysql2
              และเพื่อน ๆ) มีขนาดประมาณ{" "}
              <strong className="text-slate-300">48 MB</strong>
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            เพื่อเปรียบเทียบ: ไฟล์ปฏิบัติการ Node SEA คือสำเนาของไบนารี{" "}
            <code className="text-slate-300">node</code> เอง จึงเริ่มต้นที่
            ประมาณ 88–118 MB ขึ้นอยู่กับแพลตฟอร์มก่อนที่จะเพิ่มโค้ดของคุณเข้าไป
            ส่วน hello world ที่คอมไพล์ด้วย Bun มีขนาดประมาณ 60 MB บน macOS
            arm64 และประมาณ 100 MB บน Linux x64 เพราะรันไทม์ Bun ทั้งหมดถูก
            ฝังเข้าไปด้วย
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            ทั้งสามตัวให้ไฟล์เดียวที่คุณส่งต่อให้ใครก็ได้ นอกเหนือจากนั้นแล้ว
            มันเป็นเครื่องมือที่แตกต่างกันมาก และแต่ละตัวก็เป็นคำตอบที่ถูกต้อง
            สำหรับใครสักคน:
          </p>
          <div className="overflow-x-auto mb-8 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">
                    Perry
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    bun build --compile
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    Node SEA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    สิ่งที่ได้
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    โค้ดเครื่องที่คอมไพล์แบบ AOT (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JS ที่ bundle มา + รันไทม์ Bun ที่ฝังตัว
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    สำเนาของไบนารี node ที่ฝังสคริปต์ที่ bundle ของคุณเข้าไป
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    โมเดลการรัน
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    โค้ดเนทีฟ ไม่มี JS engine
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) ตอนรันไทม์
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) ตอนรันไทม์
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    ขนาด hello-world
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) ถึง ~100+ MB (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (ขนาดของไบนารี node)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    เวลาเริ่มต้น
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    การครอสคอมไพล์
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 เป้าหมาย รวมถึง Windows/macOS/iOS จาก Linux
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ได้ — Linux, Windows, macOS ผ่าน --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ไม่ได้ — ใช้สำเนาไบนารี node ต่อแพลตฟอร์มแทน
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    ความเข้ากันได้กับ JS/npm
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    กำลังเติบโต: axios, zod v4, express, fastify, hono คอมไพล์
                    แบบเนทีฟได้แล้ว; ส่วนที่เหลือมี V8 fallback แบบเสริม
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    เต็มรูปแบบ — เพราะมันคือรันไทม์ Bun เอง
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    semantics ของ Node เต็มรูปแบบ; ต้อง pre-bundle ก่อน,
                    รองรับเฉพาะ CommonJS บน Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    สถานะ
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">เสถียร</td>
                  <td className="px-4 py-3 text-slate-400">
                    เสถียรภาพระดับ &ldquo;Active development&rdquo; ใน Node 24
                    LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            พูดกันตรง ๆ: ถ้าแอปของคุณพึ่งพาระบบนิเวศ npm เต็มรูปแบบและต้องการ
            ความเสี่ยงด้านความเข้ากันได้เป็นศูนย์ Bun และ Node SEA รัน
            semantics ของ engine แบบเดียวกับที่คุณพัฒนาอยู่แล้วเป๊ะ ๆ — นั่นคือ
            จุดแข็งของมัน และต้นทุนด้านขนาดอาจไม่สำคัญสำหรับการ deploy ของคุณ
            Perry เป็นข้อแลกเปลี่ยนที่ต่างออกไป คุณได้การคอมไพล์แบบ
            ahead-of-time ที่แท้จริง ไบนารีขนาดเล็ก และเวลาเริ่มต้นระดับ
            มิลลิวินาที; แลกกับการยอมรับคอมไพเลอร์ pre-1.0 ที่ความสอดคล้องกับ
            JavaScript ถูกวัดผลและเผยแพร่ (test262: String 79%, Array 72% ณ
            v0.5.1146) แทนที่จะสืบทอดมาจาก V8
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            การเปรียบเทียบแบบตัวต่อตัวโดยละเอียด:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            และ{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . สำหรับวิธีที่แพ็กเกจ npm คอมไพล์ ดู{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              npm package จริงคอมไพล์ได้แล้ว: axios, zod, express — กับการกวาด
              conformance
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Benchmark table (shared section) */}
      <Performance />

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              คอมไพล์ไบนารีตัวแรกของคุณวันนี้
            </h2>
            <p className="text-slate-400 mb-6">
              ติดตั้งด้วย Homebrew, APT หรือ winget — แล้ว{" "}
              <code className="text-slate-300">perry compile main.ts</code>
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
