import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "ทางเลือกแทน Electron สำหรับ TypeScript: Perry vs Tauri vs Bun",
  description:
    "กำลังมองหาทางเลือกแทน Electron ใน TypeScript อยู่ใช่ไหม? เปรียบเทียบ Electron, Tauri, แนวทางที่อิง Bun และ Perry ในเรื่องขนาดไบนารี หน่วยความจำ UI stack และภาษา",
  breadcrumb: "ทางเลือกแทน Electron สำหรับ TypeScript",
};

export default function Content() {
  return (
    <>
            <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            กลับไปยังการเปรียบเทียบ
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              ทางเลือกแทน Electron สำหรับนักพัฒนา TypeScript
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron ทำให้แอปเดสก์ท็อปเข้าถึงได้ง่ายสำหรับนักพัฒนาเว็บ และ
            ต้นทุนด้านขนาดกับหน่วยความจำของมันทำให้ &ldquo;ทางเลือกแทน
            Electron&rdquo; กลายเป็นคำค้นหาที่ไม่เคยหายไป ถ้า TypeScript คือ
            ภาษาของคุณ มีสี่เส้นทางที่ใช้งานได้จริงในปี 2026: อยู่กับ Electron
            ต่อไป, ย้ายไป Tauri, สร้างไบนารีแบบฝังรันไทม์ด้วย Bun หรือคอมไพล์
            เป็นเนทีฟด้วย Perry แต่ละทางมีข้อแลกเปลี่ยนที่แตกต่างกันมาก
          </p>

          <h2 className="text-2xl font-bold mb-6">สี่แนวทาง</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — เส้นฐาน
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                ส่งมอบ Chromium และ Node.js ไปกับทุกแอป ข้อดีคือความสมบูรณ์ใน
                โปรดักชันมากกว่าทศวรรษ และ UI stack (HTML/CSS/JS) ที่ทีมของ
                คุณรู้จักอยู่แล้ว — VS Code, Slack และ Discord ส่งมอบบนมัน
                ข้อเสียคือต้นทุนพื้นฐาน: ตัวติดตั้ง hello-world ประมาณ
                80–150 MB, หลายโพรเซส Chromium และ RAM หลายร้อย MB ตอน idle
                เดสก์ท็อปเท่านั้น{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  การเปรียบเทียบ Perry vs Electron แบบเต็ม
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — web UI ใน webview ของระบบ, backend เป็น Rust
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri คง frontend แบบเว็บไว้แต่ตัด Chromium ที่ bundle มาออก:
                UI เรนเดอร์ใน webview ของ OS (WKWebView, WebView2, WebKitGTK)
                ทำให้ตัวติดตั้งอยู่ในระดับเลขหลักเดียว MB มันเสถียร มีเอกสาร
                ครบ และ Tauri 2 เพิ่มการรองรับ iOS/Android แล้ว ข้อแลกเปลี่ยน:
                backend เป็น Rust ไม่ใช่ TypeScript — app logic นอกเหนือจาก
                UI หมายถึงต้องเขียน Rust และข้ามสะพาน IPC — และการเรนเดอร์
                แตกต่างกันเล็กน้อยในแต่ละแพลตฟอร์มเพราะแต่ละ OS มาพร้อม
                webview คนละตัว{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  การเปรียบเทียบ Perry vs Tauri แบบเต็ม
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — ไบนารีไฟล์เดียว ไม่มีเลเยอร์ GUI
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                คนที่ค้นหา &ldquo;bun electron&rdquo; มักต้องการความสะดวกของ
                Electron โดยไม่มีน้ำหนักของมัน{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                สร้างไฟล์ปฏิบัติการเดียวโดยฝังรันไทม์ Bun เข้ากับ TypeScript
                ที่ bundle ของคุณ — ยอดเยี่ยมสำหรับ CLI และ server พร้อมความ
                เข้ากันได้กับ npm เต็มรูปแบบเพราะมันคือรันไทม์นั้นจริง ๆ แต่
                ไบนารีมีขนาดประมาณ 60 MB (macOS arm64) ถึง 100+ MB
                (Linux/Windows) โค้ดยังคงถูกรันแบบ JIT อยู่ และ Bun ไม่มี UI
                framework — แอปเดสก์ท็อปยังคงต้องใช้ Electron, Tauri หรือ
                webview library ทับอีกชั้น{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  การเปรียบเทียบ Perry vs Bun แบบเต็ม
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript ที่คอมไพล์เป็นวิดเจ็ตเนทีฟ
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry คอมไพล์ TypeScript ล่วงหน้าเป็นโค้ดเครื่องและเรนเดอร์ UI
                ผ่านวิดเจ็ตแพลตฟอร์มจริง — AppKit, UIKit, GTK4, Win32, Android
                ผ่าน JNI — โดยไม่มี webview และไม่มีสะพาน IPC ภาษาเดียวสำหรับ
                UI และ logic, hello world ขนาด ~330 KB, ไบนารีทั่วไป 2–5 MB,
                เริ่มทำงานใน ~1 ms และสิบเป้าหมายรวมถึงมือถือ, watch และ TV
                ข้อควรระวังตามตรง: Perry อยู่ในขั้น pre-1.0, UI API ของมันเป็น
                ของตัวเอง (declarative สไตล์ SwiftUI — ไม่ใช่ HTML/CSS) และ
                ระบบนิเวศยังเยาว์วัยเมื่อเทียบกับของ Electron
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">เทียบเคียงกัน</h2>
          <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Electron</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Tauri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Bun (--compile)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">ภาษา</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript ทุกที่</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">frontend เป็น JS/TS, backend เป็น Rust</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">แนวทาง UI</td>
                  <td className="px-4 py-3 text-slate-400">วิดเจ็ตแพลตฟอร์มเนทีฟ</td>
                  <td className="px-4 py-3 text-slate-400">Chromium ที่ bundle มา</td>
                  <td className="px-4 py-3 text-slate-400">webview ของระบบ</td>
                  <td className="px-4 py-3 text-slate-400">ไม่มี (CLI/server)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">ขนาด hello-world</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB ขึ้นอยู่กับแพลตฟอร์ม</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">การรัน</td>
                  <td className="px-4 py-3 text-slate-400">โค้ดเครื่องแบบ AOT</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JS engine ของ webview) + Rust เนทีฟ</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">หน่วยความจำตอน idle</td>
                  <td className="px-4 py-3 text-slate-400">หลักสิบ MB (โพรเซสเนทีฟเดียว)</td>
                  <td className="px-4 py-3 text-slate-400">หลักร้อย MB (Chromium หลายโพรเซส)</td>
                  <td className="px-4 py-3 text-slate-400">ต่ำกว่า Electron (webview ของ OS)</td>
                  <td className="px-4 py-3 text-slate-400">ตามปกติของรันไทม์</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">มือถือ / watch / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">ไม่มี</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">ไม่มี</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">ความสมบูรณ์</td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">ในโปรดักชันมากกว่าทศวรรษ</td>
                  <td className="px-4 py-3 text-slate-400">เสถียร (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">เสถียร</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            แล้ว React Native หรือ Flutter ล่ะ?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            มันมักถูกพูดถึงในทุกกระทู้เกี่ยวกับ Electron แต่มันตอบคำถามที่
            ต่างออกไป React Native เป็นแบบ mobile-first: JavaScript ของคุณรัน
            ใน Hermes engine และขับ native view ผ่านสะพาน และการรองรับ
            เดสก์ท็อปมีอยู่แค่ผ่าน fork ของชุมชน/Microsoft แยกต่างหาก —
            มันไม่ใช่ตัวแทน Electron ที่ใช้แทนกันได้ทันที (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ) Flutter ครอบคลุมทั้งเดสก์ท็อปและมือถือ แต่หมายถึงการทิ้ง
            TypeScript ไปใช้ Dart และมันวาดวิดเจ็ตของตัวเองแทนที่จะใช้ของ
            แพลตฟอร์ม ถ้าการอยู่กับ TypeScript คือข้อจำกัดของคุณ shortlist
            ของตัวเลือกเดสก์ท็อปที่ใช้งานได้จริงก็ยังคงเป็นสี่ตัวเลือกด้านบน
          </p>

          <h2 className="text-2xl font-bold mb-6">คุณควรเลือกตัวไหน?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                อยู่กับ web stack ต่อไป
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                ถ้า UI ของคุณสร้างด้วย React/Vue/Svelte อยู่แล้วและคุณต้องการ
                การกระจายแอปเดสก์ท็อปที่ผ่านการพิสูจน์มาแล้ววันนี้ Electron
                ยังคงเป็นตัวเลือกที่มีความเสี่ยงต่ำที่สุด — คุณจ่ายด้วยขนาด
                และหน่วยความจำ ถ้าต้นทุนนั้นเป็นปัญหาสำหรับคุณและคุณสบายใจที่
                จะเขียน backend ด้วย Rust Tauri ให้ประสบการณ์ web-stack ส่วน
                ใหญ่แก่คุณด้วยรอยเท้าที่เล็กกว่ามาก
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                ทิ้ง webview ไว้เบื้องหลัง
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                ถ้าสิ่งที่คุณต้องการจริง ๆ คือใส่ TypeScript เข้าไป แล้วได้แอป
                เนทีฟออกมา — ภาษาเดียว, วิดเจ็ตแพลตฟอร์มจริง, ไบนารีขนาดเล็ก
                และมือถือ/watch/TV จากโค้ดเบสเดียวกัน — นั่นคือช่องว่างที่
                Perry มีอยู่เพื่ออุดพอดี โดยมีความสมบูรณ์ระดับ pre-1.0 เป็น
                ราคาที่ต้องจ่าย และถ้าคุณต้องการแค่ CLI หรือ server เป็นไฟล์
                เดียวโดยไม่มีความเสี่ยงด้านความเข้ากันได้เลย{" "}
                <code className="text-slate-300">--compile</code> ของ Bun
                คือตัวเลือกที่เข้าท่าที่สุด
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              ดูด้วยตัวเอง
            </h2>
            <p className="text-slate-400 mb-6">
              ติดตั้ง Perry แล้วส่งมอบแอปเนทีฟจาก TypeScript
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
      </article>
    </>
  );
}
