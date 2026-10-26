---
title: "Multi-Threading แท้จริง, i18n ตอนคอมไพล์ และ watchOS"
excerpt: "Perry v0.4.0: เธรด OS จริงพร้อมความปลอดภัยตอนคอมไพล์, ระบบ i18n แบบไม่ยุ่งยากสำหรับกว่า 30 ภาษา, watchOS เป็นเป้าหมายการคอมไพล์ลำดับที่ 9, API เสียงและกล้อง และ pipeline คอมไพล์แบบขนาน"
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 เป็นรีลีสที่ใหญ่ที่สุดตั้งแต่โปรเจกต์เริ่มต้น สามครั้งของการกระโดดเวอร์ชันในรอบเดียว — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — และตัวคอมไพเลอร์เองก็เป็นแบบขนานแล้ว นี่คือทุกอย่างที่ส่งมอบ

## Multi-Threading ที่แท้จริง

Perry ตอนนี้มีการทำงานขนานแบบเธรดระบบปฏิบัติการจริง ไม่ใช่ web workers ที่มีค่าใช้จ่ายในการ serialization ไม่ใช่ `SharedArrayBuffer` กับ `Atomics` เธรดจริง — เธรดระบบปฏิบัติการน้ำหนักเบาพร้อม stack 8MB ที่ไม่แชร์อะไรเลยและไม่มีค่าใช้จ่ายเมื่อว่าง

โมดูล `perry/thread` ใหม่เปิดเผย primitive สามตัว:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap` และ `parallelFilter` ตรวจจับจำนวนแกน CPU โดยอัตโนมัติและแบ่งอาร์เรย์อินพุตข้ามแกนเหล่านั้น สำหรับอาร์เรย์ขนาดเล็ก จะข้ามการใช้เธรดและรันแบบ synchronous — ไม่มีค่าใช้จ่ายสำหรับงานเล็กน้อย

`spawn` เปิดเธรดระบบปฏิบัติการในพื้นหลังและคืนค่า Promise ผลลัพธ์ไหลกลับผ่านคิวผลลัพธ์ที่รอดำเนินการซึ่งถูกระบายออกระหว่างการประมวลผล microtask ดังนั้นคุณ `await` มันเหมือนการดำเนินการ async อื่นๆ

### ความปลอดภัยในเวลาคอมไพล์

ส่วนที่สำคัญที่สุดไม่ใช่ API — แต่เป็นสิ่งที่คอมไพเลอร์*ป้องกัน* Perry ปฏิเสธ closure ที่จับตัวแปรที่เปลี่ยนแปลงได้อย่างเป็นสถิต:

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

ไม่มีสถานะที่เปลี่ยนแปลงได้ร่วมกันหมายความว่าไม่มีการแข่งขันข้อมูล ไม่มี locks ไม่มี mutexes ไม่มี `Atomics` คอมไพเลอร์บังคับใช้ความปลอดภัยของเธรดก่อนที่โค้ดเครื่องแม้แต่บรรทัดเดียวจะถูกปล่อยออกมา

### ภายใต้กลไก

เธรดทำงานแต่ละตัวได้รับ arena หน่วยความจำของตัวเองพร้อมการล้าง `Drop` — ไม่มีการประสานงาน GC ข้ามเธรด ค่าถูกถ่ายโอนผ่าน deep-copy `SerializedValue`: ไม่มีค่าใช้จ่ายสำหรับตัวเลข, O(n) สำหรับสตริง อาร์เรย์ และอ็อบเจกต์ การใช้งานอยู่ในไฟล์ Rust ไฟล์เดียว 1,120 บรรทัด (`perry-runtime/src/thread.rs`) และไม่ต้องเปลี่ยนแปลงตัวเก็บขยะ

เปรียบเทียบกับ V8 isolates ซึ่งต้องการ heaps แยกต่อ worker พร้อมค่าใช้จ่าย ~2MB แต่ละตัว เธรดของ Perry เป็นเพียง pthreads พร้อม arenas

### ไปป์ไลน์คอมไพเลอร์แบบขนาน

ตัวคอมไพเลอร์เองก็เป็นแบบขนานแล้วเช่นกัน การสร้างโค้ดโมดูล, transform passes (JS imports, native instances, monomorphization) และการสแกนสัญลักษณ์ `nm` ทั้งหมดรันข้ามแกน CPU ทั้งหมดผ่าน rayon ร่วมกับการอัปเกรด Cranelift 0.121 (จาก 0.113 — แปดเวอร์ชันย่อยของการจัดสรรรีจิสเตอร์และการปรับปรุง x64) การคอมไพล์เร็วขึ้นอย่างมีนัยสำคัญ

## i18n ในเวลาคอมไพล์ (v0.3.0)

ระบบสากลภิวัตน์ของ Perry ไม่มีพิธีรีตอง ตัวอักษรสตริงในวิดเจ็ต UI จะถูกปฏิบัติโดยอัตโนมัติเป็นคีย์ที่แปลเป็นภาษาท้องถิ่นได้ ไฟล์แปลเป็น JSON แบบแบนในไดเรกทอรี `locales/` การตรวจสอบทั้งหมดเกิดขึ้นในเวลาคอมไพล์

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

คอมไพเลอร์ตรวจสอบทุกอย่าง: การแปลที่ขาดหายไป ความไม่ตรงกันของพารามิเตอร์ ข้อผิดพลาดของรูปแบบพหูพจน์ การแปลถูกฝังในไบนารีเป็นตารางสตริง 2D แบบฝังพร้อมการค้นหาที่เกือบเป็นศูนย์ในขณะรันไทม์ — ไม่มีการ parsing JSON เมื่อเริ่มต้น

### สิ่งที่รวมอยู่

-   **กฎพหูพจน์ CLDR** สำหรับมากกว่า 30 locale พร้อมคำต่อท้าย `.one`/`.other`/`.few`/`.many`/`.zero`/`.two`
-   **Wrapper สำหรับรูปแบบ**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **การตรวจจับ locale แบบเนทีฟ**บนทุกแพลตฟอร์ม: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: สแกนไฟล์ TS/TSX สร้างและอัปเดต scaffold JSON ของ locale
-   **การสร้างทรัพยากรเนทีฟของแพลตฟอร์ม**: ไดเรกทอรี iOS `.lproj` และ Android `values-xx/`
-   **`import { t } from "perry/i18n"`** สำหรับการแปลสตริงที่ไม่ใช่ UI

กำหนดค่าใน `perry.toml`:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## แอปเนทีฟ watchOS (v0.3.2)

Perry ตอนนี้คอมไพล์ไปยัง watchOS — เป้าหมายการคอมไพล์ลำดับที่ 9 นี่ไม่ใช่ wrapper หรือแอปคู่กัน เป็นไบนารี watchOS แบบสแตนด์อโลนพร้อมอินเทอร์เฟซ SwiftUI เนทีฟ

ตัวเรนเดอร์ watchOS ใช้**แนวทางที่ขับเคลื่อนด้วยข้อมูล**: Perry สร้างต้นไม้ UI ผ่านการเรียก FFI `perry_ui_*` และ `PerryWatchApp.swift` ที่ส่งมาจะสอบถามต้นไม้และเรนเดอร์มุมมอง SwiftUI แบบรีแอคทีฟ รองรับวิดเจ็ต 15 ประเภทพร้อม stub สำหรับประเภทที่ไม่รองรับ

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

ขั้นตอนทั้งหมดใช้งานได้: `perry setup watchos` แชร์ข้อมูลรับรอง App Store Connect กับ iOS, `perry run watchos` ตรวจจับ Apple Watch simulator อัตโนมัติ และ `perry publish watchos` ส่งไปยัง App Store

สิ่งนี้ยังทำให้**จำนวนเป้าหมายวิดเจ็ตรวมเป็นสี่**: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) และ Wear OS (Tiles) แต่ละตัวมีเป้าหมายการคอมไพล์และ backend codegen ของตัวเอง

## API เสียงและกล้อง

API ฮาร์ดแวร์ใหม่สองตัวในรีลีสนี้:

### การจับเสียง (`perry/system`)

การจับเสียงข้ามแพลตฟอร์มพร้อมการวัด dB(A) แบบถ่วงน้ำหนัก A:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

Backend แพลตฟอร์ม: AVAudioEngine (macOS/iOS), AudioRecord ผ่าน JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web)

### การจับภาพกล้อง (`perry/ui`)

การแสดงตัวอย่างกล้องเนทีฟพร้อมการสุ่มตัวอย่างสีระดับพิกเซล (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## แพ็คเกจระบบนิเวศ

แพ็คเกจเนทีฟ first-party สองตัวเปิดตัว:

-   **perry/push** — Binding การแจ้งเตือนแบบพุชสำหรับ iOS/macOS: การขอสิทธิ์, การดึง APNs token, จำนวนตรา stub Android พร้อม FCM ที่วางแผนไว้
-   **perry/storekit** — Binding การซื้อในแอป StoreKit 2: การโหลดสินค้า, การซื้อพร้อมใบเสร็จ JWS, การตรวจสอบการสมัครสมาชิก, การกู้คืน และ listener ธุรกรรม

ทั้งสองเป็นไปตามสถาปัตยกรรมเดียวกัน: การประกาศ TypeScript → FFI crate ของ Rust → สะพาน Swift ติดตั้งเป็น dependency นำเข้าฟังก์ชัน `await` ผลลัพธ์ คอมไพเลอร์จัดการการเชื่อมต่อเนทีฟทั้งหมด

## โครงสร้างพื้นฐาน

-   **Cranelift 0.113 → 0.121** — แปดเวอร์ชันย่อยของการจัดสรรรีจิสเตอร์ การแก้ไข x64 และการปรับปรุงการจัดเรียง stack slot
-   **การแบ่งฟังก์ชัน Windows** — แบ่งฟังก์ชันที่มีมากกว่า 50 คำสั่งออกเป็น continuation อัตโนมัติเพื่อแก้ไขปัญหา codegen ของ Cranelift บน Windows
-   **การโหลดตัวแปรโมดูลแบบเลือกสรร** — โหลดเฉพาะตัวแปรระดับโมดูลที่ถูกอ้างอิงที่ทางเข้าฟังก์ชัน ลดขนาดไบนารี Windows ลง 26%
-   **อัปเกรด Array.sort()** — จากการเรียงลำดับแบบแทรก O(n²) เป็นแบบผสม TimSort O(n log n)
-   **perry run android** — ไปป์ไลน์สร้าง APK เต็มรูปแบบ: คอมไพล์ สร้างโปรเจกต์ Gradle, assembleDebug, ติดตั้ง, เปิดใช้งาน
-   **รายการ Info.plist กำหนดเอง** — `[ios.info_plist]` ใน perry.toml สำหรับคำอธิบายความเป็นส่วนตัว, URL schemes, โหมดพื้นหลัง

## ในตัวเลข

-   **เวอร์ชัน**: 0.2.197 → 0.4.0 (สามเหตุการณ์สำคัญ)
-   **เป้าหมายการคอมไพล์**: 8 → 9 (เพิ่ม watchOS)
-   **เป้าหมายวิดเจ็ต**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Crate ใหม่**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **เอกสารใหม่**: threading (4 หน้า), i18n (4 หน้า), watchOS, เอกสารวิดเจ็ตที่ขยาย (3 → 8 หน้า)
-   **การใช้งาน perry/thread**: 1,120 บรรทัดของ Rust ไม่มีการเปลี่ยนแปลง GC

## ขั้นตอนถัดไป

รากฐาน threading เปิดโอกาสมากมาย: การประมวลผลคำขอ HTTP แบบขนาน การดำเนินการไฟล์พร้อมกัน และงานหนักด้านการคำนวณที่ก่อนหน้านี้ถูกบล็อกโดยการทำงานแบบ single-threaded ในด้านภาษา การรองรับ regex เต็มรูปแบบยังคงเป็นช่องว่างที่ใหญ่ที่สุด และการขยาย `perry/ui` (drag and drop, การเข้าถึง, DatePicker) ยังคงดำเนินต่อไป

ติดตามความคืบหน้าบน [GitHub](https://github.com/PerryTS/perry), อ่านเอกสารที่ [docs.perryts.com](https://docs.perryts.com), หรือดู [แผนงาน](/th/roadmap/) สำหรับภาพรวมทั้งหมด
