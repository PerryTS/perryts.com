import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "เริ่มต้นใช้งาน Perry — ติดตั้งและคอมไพล์ TypeScript เป็นเนทีฟ",
  description:
    "ติดตั้ง Perry ด้วย Homebrew, APT หรือ winget แล้วคอมไพล์ไฟล์ TypeScript แรกของคุณให้เป็นไฟล์ปฏิบัติการเนทีฟได้ในเวลาไม่ถึงนาที ไม่ต้องมี Node.js",
  breadcrumb: "เริ่มต้นใช้งาน",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            เริ่มต้นใช้งาน <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            จากศูนย์สู่ไฟล์ปฏิบัติการเนทีฟที่รันได้จริงในสามขั้นตอน ไม่ต้องมี
            Node.js ไม่ต้องมี bundler ไม่ต้องติดตั้งรันไทม์บนเครื่องปลายทาง
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            ไบนารีตัวแรกของคุณ ทีละขั้นตอน
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            เมื่อ Perry ติดตั้งเรียบร้อยแล้ว การคอมไพล์ TypeScript เป็นไฟล์
            ปฏิบัติการเนทีฟก็เป็นเพียงคำสั่งเดียว เขียนไฟล์:
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">hello.ts</span>
            </div>
            <pre className="text-sm text-slate-300">
              <code>{`const name = process.argv[2] ?? "World";
console.log(\`Hello, \${name}!\`);`}</code>
            </pre>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8">
            คอมไพล์แล้วรันผลลัพธ์ — เอาต์พุตที่ได้คือไบนารีโค้ดเครื่องแบบ
            self-contained ไม่ใช่สคริปต์ที่ถูก bundle:
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">terminal</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">$</span>{" "}
                <span className="text-cyan-400">perry</span> compile hello.ts
              </p>
              <p className="text-green-400">✓ Compiled executable: hello</p>
              <p>
                <span className="text-slate-500">$</span> ./hello Perry
              </p>
              <p className="text-slate-300">Hello, Perry!</p>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-12">
            ไบนารีนั้นเริ่มทำงานในเวลาประมาณหนึ่งมิลลิวินาทีและรันได้บนเครื่อง
            ใดก็ตามที่มี OS และสถาปัตยกรรมเดียวกัน — ไม่ต้องติดตั้งอะไรก่อนเลย
            อ่านเพิ่มเติมเกี่ยวกับ{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              วิธีที่ Perry คอมไพล์ TypeScript เป็นไบนารี
            </Link>{" "}
            หรือสิ่งที่เกิดขึ้นภายใน{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              คอมไพเลอร์ TypeScript เนทีฟ
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">ขั้นตอนถัดไป</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                เอกสาร
              </h3>
              <p className="text-slate-400 text-sm">
                คู่มือสำหรับ CLI, วิดเจ็ต perry/ui, threading, i18n และทุก
                เป้าหมายการคอมไพล์ — ที่ docs.perryts.com
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                แอปจริงที่คอมไพล์ด้วย Perry กำลังส่งมอบบน App Store และที่อื่น ๆ
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                เปรียบเทียบ
              </h3>
              <p className="text-slate-400 text-sm">
                Perry เทียบกับ Bun, Deno, Electron, Tauri, React Native และ
                Static Hermes อย่างไร
              </p>
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                GitHub
              </h3>
              <p className="text-slate-400 text-sm">
                ซอร์สโค้ด, issue และการพูดคุย — Perry เป็นโอเพนซอร์ส
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
