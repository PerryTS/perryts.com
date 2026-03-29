import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry v0.4.0 เป็นรีลีสที่ใหญ่ที่สุดตั้งแต่โปรเจกต์เริ่มต้น สามครั้งของการกระโดดเวอร์ชันในรอบเดียว — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — และตัวคอมไพเลอร์เองก็เป็นแบบขนานแล้ว นี่คือทุกอย่างที่ส่งมอบ
      </p>

      <h2>Multi-Threading ที่แท้จริง</h2>
      <p>
        Perry ตอนนี้มีการทำงานขนานแบบเธรดระบบปฏิบัติการจริง ไม่ใช่ web workers ที่มีค่าใช้จ่ายในการ serialization ไม่ใช่ <code>SharedArrayBuffer</code> กับ <code>Atomics</code> เธรดจริง — เธรดระบบปฏิบัติการน้ำหนักเบาพร้อม stack 8MB ที่ไม่แชร์อะไรเลยและไม่มีค่าใช้จ่ายเมื่อว่าง
      </p>
      <p>
        โมดูล <code>perry/thread</code> ใหม่เปิดเผย primitive สามตัว:
      </p>
      <pre><code>{`import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});`}</code></pre>
      <p>
        <code>parallelMap</code> และ <code>parallelFilter</code> ตรวจจับจำนวนแกน CPU โดยอัตโนมัติและแบ่งอาร์เรย์อินพุตข้ามแกนเหล่านั้น สำหรับอาร์เรย์ขนาดเล็ก จะข้ามการใช้เธรดและรันแบบ synchronous — ไม่มีค่าใช้จ่ายสำหรับงานเล็กน้อย
      </p>
      <p>
        <code>spawn</code> เปิดเธรดระบบปฏิบัติการในพื้นหลังและคืนค่า Promise ผลลัพธ์ไหลกลับผ่านคิวผลลัพธ์ที่รอดำเนินการซึ่งถูกระบายออกระหว่างการประมวลผล microtask ดังนั้นคุณ <code>await</code> มันเหมือนการดำเนินการ async อื่นๆ
      </p>

      <h3>ความปลอดภัยในเวลาคอมไพล์</h3>
      <p>
        ส่วนที่สำคัญที่สุดไม่ใช่ API — แต่เป็นสิ่งที่คอมไพเลอร์<em>ป้องกัน</em> Perry ปฏิเสธ closure ที่จับตัวแปรที่เปลี่ยนแปลงได้อย่างเป็นสถิต:
      </p>
      <pre><code>{`let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});`}</code></pre>
      <p>
        ไม่มีสถานะที่เปลี่ยนแปลงได้ร่วมกันหมายความว่าไม่มีการแข่งขันข้อมูล ไม่มี locks ไม่มี mutexes ไม่มี <code>Atomics</code> คอมไพเลอร์บังคับใช้ความปลอดภัยของเธรดก่อนที่โค้ดเครื่องแม้แต่บรรทัดเดียวจะถูกปล่อยออกมา
      </p>

      <h3>ภายใต้กลไก</h3>
      <p>
        เธรดทำงานแต่ละตัวได้รับ arena หน่วยความจำของตัวเองพร้อมการล้าง <code>Drop</code> — ไม่มีการประสานงาน GC ข้ามเธรด ค่าถูกถ่ายโอนผ่าน deep-copy <code>SerializedValue</code>: ไม่มีค่าใช้จ่ายสำหรับตัวเลข, O(n) สำหรับสตริง อาร์เรย์ และอ็อบเจกต์ การใช้งานอยู่ในไฟล์ Rust ไฟล์เดียว 1,120 บรรทัด (<code>perry-runtime/src/thread.rs</code>) และไม่ต้องเปลี่ยนแปลงตัวเก็บขยะ
      </p>
      <p>
        เปรียบเทียบกับ V8 isolates ซึ่งต้องการ heaps แยกต่อ worker พร้อมค่าใช้จ่าย ~2MB แต่ละตัว เธรดของ Perry เป็นเพียง pthreads พร้อม arenas
      </p>

      <h3>ไปป์ไลน์คอมไพเลอร์แบบขนาน</h3>
      <p>
        ตัวคอมไพเลอร์เองก็เป็นแบบขนานแล้วเช่นกัน การสร้างโค้ดโมดูล, transform passes (JS imports, native instances, monomorphization) และการสแกนสัญลักษณ์ <code>nm</code> ทั้งหมดรันข้ามแกน CPU ทั้งหมดผ่าน rayon ร่วมกับการอัปเกรด Cranelift 0.121 (จาก 0.113 — แปดเวอร์ชันย่อยของการจัดสรรรีจิสเตอร์และการปรับปรุง x64) การคอมไพล์เร็วขึ้นอย่างมีนัยสำคัญ
      </p>

      <h2>i18n ในเวลาคอมไพล์ (v0.3.0)</h2>
      <p>
        ระบบสากลภิวัตน์ของ Perry ไม่มีพิธีรีตอง ตัวอักษรสตริงในวิดเจ็ต UI จะถูกปฏิบัติโดยอัตโนมัติเป็นคีย์ที่แปลเป็นภาษาท้องถิ่นได้ ไฟล์แปลเป็น JSON แบบแบนในไดเรกทอรี <code>locales/</code> การตรวจสอบทั้งหมดเกิดขึ้นในเวลาคอมไพล์
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        คอมไพเลอร์ตรวจสอบทุกอย่าง: การแปลที่ขาดหายไป ความไม่ตรงกันของพารามิเตอร์ ข้อผิดพลาดของรูปแบบพหูพจน์ การแปลถูกฝังในไบนารีเป็นตารางสตริง 2D แบบฝังพร้อมการค้นหาที่เกือบเป็นศูนย์ในขณะรันไทม์ — ไม่มีการ parsing JSON เมื่อเริ่มต้น
      </p>

      <h3>สิ่งที่รวมอยู่</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>กฎพหูพจน์ CLDR</strong> สำหรับมากกว่า 30 locale พร้อมคำต่อท้าย <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code></li>
        <li><strong>Wrapper สำหรับรูปแบบ</strong>: <code>Currency</code>, <code>Percent</code>, <code>ShortDate</code>, <code>LongDate</code>, <code>FormatNumber</code>, <code>FormatTime</code>, <code>Raw</code></li>
        <li><strong>การตรวจจับ locale แบบเนทีฟ</strong>บนทุกแพลตฟอร์ม: <code>CFLocaleCopyCurrent</code> (macOS/iOS), <code>GetUserDefaultLocaleName</code> (Windows), <code>system_property_get</code> (Android), <code>LANG</code>/<code>LC_ALL</code> (Linux)</li>
        <li><strong><code>perry i18n extract</code></strong> CLI: สแกนไฟล์ TS/TSX สร้างและอัปเดต scaffold JSON ของ locale</li>
        <li><strong>การสร้างทรัพยากรเนทีฟของแพลตฟอร์ม</strong>: ไดเรกทอรี iOS <code>.lproj</code> และ Android <code>values-xx/</code></li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong> สำหรับการแปลสตริงที่ไม่ใช่ UI</li>
      </ul>
      <p>
        กำหนดค่าใน <code>perry.toml</code>:
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>แอปเนทีฟ watchOS (v0.3.2)</h2>
      <p>
        Perry ตอนนี้คอมไพล์ไปยัง watchOS — เป้าหมายการคอมไพล์ลำดับที่ 9 นี่ไม่ใช่ wrapper หรือแอปคู่กัน เป็นไบนารี watchOS แบบสแตนด์อโลนพร้อมอินเทอร์เฟซ SwiftUI เนทีฟ
      </p>
      <p>
        ตัวเรนเดอร์ watchOS ใช้<strong>แนวทางที่ขับเคลื่อนด้วยข้อมูล</strong>: Perry สร้างต้นไม้ UI ผ่านการเรียก FFI <code>perry_ui_*</code> และ <code>PerryWatchApp.swift</code> ที่ส่งมาจะสอบถามต้นไม้และเรนเดอร์มุมมอง SwiftUI แบบรีแอคทีฟ รองรับวิดเจ็ต 15 ประเภทพร้อม stub สำหรับประเภทที่ไม่รองรับ
      </p>
      <pre><code>{`# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos`}</code></pre>
      <p>
        ขั้นตอนทั้งหมดใช้งานได้: <code>perry setup watchos</code> แชร์ข้อมูลรับรอง App Store Connect กับ iOS, <code>perry run watchos</code> ตรวจจับ Apple Watch simulator อัตโนมัติ และ <code>perry publish watchos</code> ส่งไปยัง App Store
      </p>
      <p>
        สิ่งนี้ยังทำให้<strong>จำนวนเป้าหมายวิดเจ็ตรวมเป็นสี่</strong>: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) และ Wear OS (Tiles) แต่ละตัวมีเป้าหมายการคอมไพล์และ backend codegen ของตัวเอง
      </p>

      <h2>API เสียงและกล้อง</h2>
      <p>
        API ฮาร์ดแวร์ใหม่สองตัวในรีลีสนี้:
      </p>
      <h3>การจับเสียง (<code>perry/system</code>)</h3>
      <p>
        การจับเสียงข้ามแพลตฟอร์มพร้อมการวัด dB(A) แบบถ่วงน้ำหนัก A:
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();`}</code></pre>
      <p>
        Backend แพลตฟอร์ม: AVAudioEngine (macOS/iOS), AudioRecord ผ่าน JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web)
      </p>
      <h3>การจับภาพกล้อง (<code>perry/ui</code>)</h3>
      <p>
        การแสดงตัวอย่างกล้องเนทีฟพร้อมการสุ่มตัวอย่างสีระดับพิกเซล (iOS):
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging`}</code></pre>

      <h2>แพ็คเกจระบบนิเวศ</h2>
      <p>
        แพ็คเกจเนทีฟ first-party สองตัวเปิดตัว:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — Binding การแจ้งเตือนแบบพุชสำหรับ iOS/macOS: การขอสิทธิ์, การดึง APNs token, จำนวนตรา stub Android พร้อม FCM ที่วางแผนไว้</li>
        <li><strong>perry/storekit</strong> — Binding การซื้อในแอป StoreKit 2: การโหลดสินค้า, การซื้อพร้อมใบเสร็จ JWS, การตรวจสอบการสมัครสมาชิก, การกู้คืน และ listener ธุรกรรม</li>
      </ul>
      <p>
        ทั้งสองเป็นไปตามสถาปัตยกรรมเดียวกัน: การประกาศ TypeScript → FFI crate ของ Rust → สะพาน Swift ติดตั้งเป็น dependency นำเข้าฟังก์ชัน <code>await</code> ผลลัพธ์ คอมไพเลอร์จัดการการเชื่อมต่อเนทีฟทั้งหมด
      </p>

      <h2>โครงสร้างพื้นฐาน</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — แปดเวอร์ชันย่อยของการจัดสรรรีจิสเตอร์ การแก้ไข x64 และการปรับปรุงการจัดเรียง stack slot</li>
        <li><strong>การแบ่งฟังก์ชัน Windows</strong> — แบ่งฟังก์ชันที่มีมากกว่า 50 คำสั่งออกเป็น continuation อัตโนมัติเพื่อแก้ไขปัญหา codegen ของ Cranelift บน Windows</li>
        <li><strong>การโหลดตัวแปรโมดูลแบบเลือกสรร</strong> — โหลดเฉพาะตัวแปรระดับโมดูลที่ถูกอ้างอิงที่ทางเข้าฟังก์ชัน ลดขนาดไบนารี Windows ลง 26%</li>
        <li><strong>อัปเกรด Array.sort()</strong> — จากการเรียงลำดับแบบแทรก O(n&sup2;) เป็นแบบผสม TimSort O(n log n)</li>
        <li><strong>perry run android</strong> — ไปป์ไลน์สร้าง APK เต็มรูปแบบ: คอมไพล์ สร้างโปรเจกต์ Gradle, assembleDebug, ติดตั้ง, เปิดใช้งาน</li>
        <li><strong>รายการ Info.plist กำหนดเอง</strong> — <code>[ios.info_plist]</code> ใน perry.toml สำหรับคำอธิบายความเป็นส่วนตัว, URL schemes, โหมดพื้นหลัง</li>
      </ul>

      <h2>ในตัวเลข</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>เวอร์ชัน</strong>: 0.2.197 → 0.4.0 (สามเหตุการณ์สำคัญ)</li>
        <li><strong>เป้าหมายการคอมไพล์</strong>: 8 → 9 (เพิ่ม watchOS)</li>
        <li><strong>เป้าหมายวิดเจ็ต</strong>: 1 → 4 (iOS, Android, watchOS, Wear OS)</li>
        <li><strong>Crate ใหม่</strong>: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles</li>
        <li><strong>เอกสารใหม่</strong>: threading (4 หน้า), i18n (4 หน้า), watchOS, เอกสารวิดเจ็ตที่ขยาย (3 → 8 หน้า)</li>
        <li><strong>การใช้งาน perry/thread</strong>: 1,120 บรรทัดของ Rust ไม่มีการเปลี่ยนแปลง GC</li>
      </ul>

      <h2>ขั้นตอนถัดไป</h2>
      <p>
        รากฐาน threading เปิดโอกาสมากมาย: การประมวลผลคำขอ HTTP แบบขนาน การดำเนินการไฟล์พร้อมกัน และงานหนักด้านการคำนวณที่ก่อนหน้านี้ถูกบล็อกโดยการทำงานแบบ single-threaded ในด้านภาษา การรองรับ regex เต็มรูปแบบยังคงเป็นช่องว่างที่ใหญ่ที่สุด และการขยาย <code>perry/ui</code> (drag and drop, การเข้าถึง, DatePicker) ยังคงดำเนินต่อไป
      </p>
      <p>
        ติดตามความคืบหน้าบน{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, อ่านเอกสารที่{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, หรือดู{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">แผนงาน</Link>
        {" "}สำหรับภาพรวมทั้งหมด
      </p>
    </>
  );
}
