---
title: "Pipeline ครบวงจร: เอกสาร, การกระจาย และ WidgetKit"
excerpt: "82 commit ในหนึ่งสัปดาห์: เว็บไซต์เอกสาร 49 หน้า, การเผยแพร่อัตโนมัติบน App Store และ Play Store, แพ็กเกจ Homebrew และ APT, ส่วนขยาย WidgetKit เนทีฟจาก TypeScript, วิดเจ็ตใหม่, โมดูล http/https และคอมไพเลอร์ LLVM แบบ self-hosting"
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 คอมมิตใน 7 วัน เว็บไซต์เอกสาร 49 หน้า การเผยแพร่ App Store และ Play Store อัตโนมัติ แพ็กเกจ Homebrew และ APT ส่วนขยาย WidgetKit เนทีฟที่คอมไพล์จาก TypeScript คอมไพเลอร์ LLVM แบบ self-hosting และการแก้ไขบั๊กหลายสิบรายการในทุกแพลตฟอร์ม

โพสต์นี้ครอบคลุมทุกอย่างที่เปิดตัวใน Perry ระหว่างวันที่ 6 ถึง 13 มีนาคม 2026 ธีมคือ การทำให้สมบูรณ์ — เติมเต็มช่องว่างระหว่าง "ฉันเขียน TypeScript" กับ "แอปของฉัน อยู่บน App Store"

## docs.perryts.com

Perry ตอนนี้มีเว็บไซต์เอกสารจริงๆ แล้ว 49 หน้าสร้างด้วย mdBook ครอบคลุมทุกอย่างตั้งแต่ เริ่มต้นใช้งานจนถึงอ้างอิง CLI เอกสารจัดเป็นหมวดหมู่:

-   **เริ่มต้นใช้งาน** — การติดตั้ง โปรเจกต์แรก โครงสร้างโปรเจกต์
-   **ฟีเจอร์ภาษา** — ทุกอย่างที่ Perry รองรับจาก TypeScript
-   **UI เนทีฟ** — 12 หน้าครอบคลุมวิดเจ็ตทุกประเภท เลย์เอาต์ การจัดการสถานะ และพฤติกรรมเฉพาะแพลตฟอร์ม
-   **แพลตฟอร์ม** — หน้าเฉพาะสำหรับแต่ละใน 6 แพลตฟอร์มเป้าหมาย
-   **ไลบรารีมาตรฐาน** — เอกสารการใช้งานแพ็กเกจเนทีฟกว่า 50 ตัว
-   **API ระบบ** — ไดอะล็อกไฟล์ keychain การแจ้งเตือน หลายหน้าต่าง
-   **WidgetKit** — โมดูลส่วนขยายวิดเจ็ตใหม่
-   **ปลั๊กอิน** — สถาปัตยกรรมปลั๊กอินแบบคอมไพล์ไทม์
-   **อ้างอิง CLI** — ทุกคำสั่งและ flag

เว็บไซต์ยังรวมไฟล์ `llms.txt` สำหรับ การค้นหาโดย AI และ deploy ผ่าน GitHub Pages พร้อมโดเมนที่กำหนดเองที่ [docs.perryts.com](https://docs.perryts.com)

## ติดตั้ง Perry ด้วยคำสั่งเดียว

Perry ตอนนี้แจกจ่ายผ่าน Homebrew และ APT นอกเหนือจากการบิลด์จากซอร์ส ไปป์ไลน์รีลีส GitHub Actions ใหม่บิลด์ไบนารีสำหรับ macOS (arm64 และ x86\_64) และ Linux (x86\_64 และ arm64) แล้วอัปเดต Homebrew tap และ APT repository โดยอัตโนมัติ

```text
# macOS
brew tap PerryTS/perry
brew install perry
# Debian/Ubuntu
sudo apt update && sudo apt install perry
```

ไม่ต้องโคลน repo และบิลด์ด้วย Cargo อีกต่อไป ติดตั้ง Perry เหมือนกับที่คุณติดตั้ง เครื่องมืออื่นๆ

## การเผยแพร่ App Store อัตโนมัติ

นี่คือการเปลี่ยนแปลงที่ลดขั้นตอนแบบ manual มากที่สุด การรัน `perry publish ios` ตอนนี้จัดการไปป์ไลน์การแจกจ่าย iOS ทั้งหมด โดยอัตโนมัติ:

1.  สร้างคีย์ RSA และ CSR ผ่าน App Store Connect API
2.  สร้างใบรับรองการแจกจ่ายและรวมเป็น `.p12`
3.  ลงทะเบียน bundle ID
4.  สร้างและดาวน์โหลด provisioning profile
5.  สร้างเรคอร์ดแอปบน App Store Connect
6.  บิลด์ ลงนาม และอัปโหลดไปยัง TestFlight หรือ App Store

ไม่ต้องใช้ Xcode ไม่ต้องเข้าพอร์ทัลด้วยตัวเอง ไม่ต้องดาวน์โหลดใบรับรองจากเบราว์เซอร์ วิซาร์ดการตั้งค่า รันอัตโนมัติในครั้งแรกที่คุณเผยแพร่ นำทางผ่านการกำหนดค่า API key และบันทึกข้อมูลรับรองใน `perry.toml`

การแจกจ่าย macOS ก็อัตโนมัติเช่นกัน Perry รองรับ 3 โหมด: TestFlight, DMG ที่ผ่านการรับรอง และโหมด **"ทั้งสอง"** ใหม่ที่เผยแพร่ไปยัง App Store และสร้าง DMG ที่ผ่านการรับรองพร้อมกัน ใบรับรอง 3 ประเภทถูกสร้างอัตโนมัติ: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION` และ `DEVELOPER_ID_APPLICATION`

การเผยแพร่ Android ก็ได้รับวิซาร์ดการตั้งค่าอัตโนมัติเช่นกัน ทั้ง 3 แพลตฟอร์มตอนนี้ทำตาม รูปแบบเดียวกัน: การรันครั้งแรกจะทริกเกอร์การตั้งค่า ข้อมูลรับรองจะถูกบันทึกไว้ในโปรเจกต์ การรัน ครั้งต่อไปไม่ต้องกำหนดค่าเลย

การตรวจสอบก่อนบินจับปัญหาก่อนที่บิลด์จะเริ่ม — bundle ID ของ provisioning profile ไม่ตรง ใบรับรองหมดอายุ ไม่มีไอคอนแอป รูปแบบเวอร์ชันไม่ถูกต้อง team ID ผิด และ `encryption_exempt` ใน `perry.toml [ios]` ตั้งค่าคีย์ `ITSAppUsesNonExemptEncryption` ใน Info.plist อัตโนมัติ ข้าม พรอมต์การปฏิบัติตามการส่งออกแบบ manual ใน App Store Connect

## perry/widget: WidgetKit จาก TypeScript

Perry ตอนนี้สามารถคอมไพล์ TypeScript เป็นส่วนขยาย WidgetKit SwiftUI เนทีฟได้ นี่ไม่ใช่ wrapper หรือ bridge — คอมไพเลอร์เดินผ่านต้นไม้เรนเดอร์ที่ระดับ HIR และปล่อยซอร์สโค้ด SwiftUI โดยตรง ผลลัพธ์เป็นบันเดิลส่วนขยาย WidgetKit สมบูรณ์ที่ Xcode (หรือไปป์ไลน์บิลด์ของ Perry) สามารถฝังในแอปของคุณ

```text
perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/
```

แนวทางนี้แตกต่างอย่างพื้นฐานจากการคอมไพล์อื่นๆ ของ Perry โค้ด Perry ปกติ ผ่าน Cranelift ไปยังโค้ดเครื่องเนทีฟ โค้ดวิดเจ็ตผ่าน HIR ไปยังผลลัพธ์ข้อความ SwiftUI เพราะ WidgetKit ต้องการ SwiftUI — ไม่มีทางที่จะสร้างส่วนขยายวิดเจ็ตด้วยโค้ด UIKit หรือ AppKit แบบ imperative Perry แก้ปัญหานี้โดยปฏิบัติต่อต้นไม้เรนเดอร์ของวิดเจ็ตเป็น เทมเพลตเวลาคอมไพล์ ไม่ใช่โค้ดรันไทม์

## วิดเจ็ตใหม่และการปรับปรุงแพลตฟอร์ม

วิดเจ็ตใหม่ 4 ประเภทมาถึงสัปดาห์นี้:

-   **TextArea** — การแก้ไขข้อความหลายบรรทัดบน macOS, iOS และ Android
-   **SecureField** — ช่องป้อนรหัสผ่านบน iOS และ macOS
-   **QR Code** — การสร้าง QR code เนทีฟบน iOS, macOS และ Android
-   **Splash Screen** — สตอรี่บอร์ด LaunchScreen ที่สร้างอัตโนมัติ (iOS) และธีม splash (Android)

### iPad เป็นเนทีฟ

Perry ตอนนี้สร้างแอป iPad เนทีฟเต็มรูปแบบ: `UIDeviceFamily [1,2]`, รองรับการหมุนหน้าจอ, `UIRequiresFullScreen` และสตอรี่บอร์ด LaunchScreen ที่คอมไพล์ผ่าน ibtool ฟังก์ชัน `getDeviceIdiom()` ใหม่ตรวจจับโทรศัพท์ vs. iPad ขณะรันไทม์ และ `PerryFrameSplit` ให้คอนเทนเนอร์แยกแนวนอนแบบเฟรมสำหรับเลย์เอาต์ iPad

### Windows

Windows ได้รับการรองรับ timer (ติ๊ก `WM_TIMER` 50ms), ปุ่ม owner-drawn พร้อมพื้นหลังธีมมืด และการแก้ไขบั๊ก use-after-free ใน `to_wide().as_ptr()` ในไฟล์วิดเจ็ต 18 ไฟล์ V8 runtime ตอนนี้ทำงานบน Windows โดยมีไลบรารีระบบที่จำเป็นลิงก์แล้ว

### GTK4 (ลินุกซ์)

แบ็กเอนด์ GTK4 ได้รับการปรับปรุงภาพเพื่อให้ตรงกับ macOS: CSS padding สำหรับ edge insets, สไตล์ปุ่ม Adwaita, การแก้ไขมาร์จิน VStack และนโยบายแนวนอน ScrollView

## http/https และ better-sqlite3

เพิ่มเติม stdlib ที่สำคัญ 2 รายการ:

โมดูลเนทีฟ `http` และ `https` ใหม่ให้ HTTP ฝั่งไคลเอนต์ โดยใช้ reqwest ภายใน API ตรงกับ Node.js: `request()`, `get()`, `ClientRequest` พร้อม write/end/on และ `IncomingMessage` พร้อม statusCode และ event handler

`better-sqlite3` ตอนนี้รองรับเต็มที่: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — พร้อม NaN-boxing ที่เหมาะสมและอ็อบเจ็กต์แถว พร้อมการเข้าถึง property ที่ตั้งชื่อ

การปรับปรุง stdlib อื่นๆ: `crypto.randomBytes()` ตอนนี้ ส่งคืน Buffer (ตรงกับ Node.js), MongoDB ได้รับ `listDatabases` และ `listCollections` พร้อมการแก้ไข thread-safety และ INSERT/UPDATE/DELETE ของ mysql2 ตอนนี้ส่งคืน `ResultSetHeader` พร้อม `insertId`

## การแก้ไข GC และความถูกต้อง

การแก้ไข garbage collector และความถูกต้องของ runtime ที่สำคัญหลายรายการเปิดตัวสัปดาห์นี้:

-   **ตัวป้องกันการเข้าซ้ำ GC** — ป้องกันการเก็บขยะระหว่างการจัดสรร แก้ไข panic ของ RefCell double-borrow
-   **การติดตาม Map ของ GC** — Map ถูกติดตามอย่างเหมาะสมระหว่างเฟส mark ป้องกันการเก็บคีย์สตริง
-   **การแก้ไข aliasing สตริง** — string append ตอนนี้จัดสรรสตริงใหม่เสมอ แก้ไขการเสียหายจาก aliasing การคัดลอกพอยน์เตอร์
-   **เลขคณิต BigInt** — right-shift ใช้ arithmetic shift สำหรับจำนวนลบ การดำเนินการ bitwise ใช้ wrapping semantics แบบ ToInt32
-   **Map.get() undefined** — ส่งคืน `TAG_UNDEFINED` ที่ถูกต้องสำหรับคีย์ที่หายไปแทนแท็ก NaN ที่ผิด
-   **รากฐาน GC ของฟิลด์สแตติก** — ค่า BigInt ในฟิลด์สแตติกของคลาสลงทะเบียนเป็นราก GC

สิ่งเหล่านี้ไม่ใช่การแก้ไขเล็กน้อย การแก้ไขการเข้าซ้ำ GC เพียงอย่างเดียวแก้ไขคลาสทั้งหมดของ crash แบบสุ่ม การแก้ไข aliasing สตริงมีผลกระทบต่อโปรแกรมใดก็ตามที่กำหนดตัวแปรสตริงหนึ่ง ไปยังอีกตัวแล้วแก้ไขตัวใดตัวหนึ่ง เหล่านี้เป็นประเภทของบั๊กที่ปรากฏเฉพาะภายใต้ ภาระงานจริง และการแก้ไขพวกเขาคือสิ่งที่ทำให้คอมไพเลอร์พร้อมสำหรับโปรดักชัน

## perry-verify: เสริมความแข็งแกร่ง

`perry-verify` บริการตรวจสอบแอปอัตโนมัติ ได้รับการเสริมความปลอดภัย: การทำงานแบบ sandbox ผ่าน `bwrap` บน Linux และ `sandbox-exec` บน macOS, โทเค็นยืนยันตัวตนบน WebSocket handshake และการดาวน์โหลดไบนารี, จำกัดอัตราต่อ IP, job ID แบบ UUID เต็มเพื่อป้องกันการนับ และจำกัดขนาด body ที่ลดลง

## perrysdad: คอมไพเลอร์ Self-Hosting

ในความพยายามคู่ขนาน `perrysdad` — คอมไพเลอร์ LLVM IR แบบ self-hosting ที่เขียนด้วย TypeScript — ไปจากศูนย์ถึงการคอมไพล์ตัวเองใน 5 เฟสตลอดสัปดาห์:

1.  **เฟส 0-1** — โครงร่าง end-to-end: HIR เป็นข้อความ LLVM IR เป็น clang, ลิงก์กับ `libperry_runtime.a` ของ Perry
2.  **เฟส 2** — พาร์เซอร์ recursive descent เขียนด้วยมือพร้อม Pratt expression parsing สำหรับไฟล์ `.ts` จริง
3.  **เฟส 3** — อาร์เรย์ อ็อบเจ็กต์ และ map พร้อม runtime FFI รวมถึงการแก้ไข ABI mismatch ที่สำคัญ (JSValue ประกาศเป็น double ใน LLVM IR แทนที่จะเป็น i64)
4.  **เฟส 4** — คลาส enum closure การคอมไพล์หลายไฟล์พร้อมการค้นหาโมดูลและการเรียงลำดับแบบ topological

จุดสำคัญ: ไบนารี `anvil` ที่คอมไพล์ตัวเองตอนนี้สามารถ คอมไพล์โปรแกรมทดสอบและสร้างผลลัพธ์ที่ถูกต้องตรงกับเวอร์ชันที่คอมไพล์ด้วย node คอมไพเลอร์ TypeScript ที่คอมไพล์โดย Perry เป็นโค้ดเนทีฟ คอมไพล์ TypeScript เพิ่มเติมเป็นโค้ดเนทีฟ เต่าซ้อนเต่า จนถึงก้นบึ้ง

## ตัวเลข

-   **82 คอมมิต**ไปยังคอมไพเลอร์ Perry หลัก
-   **1 รีลีส**: v0.2.173 (8 มีนาคม)
-   **49 หน้าเอกสาร**ที่ docs.perryts.com
-   **4 วิดเจ็ตใหม่**: TextArea, SecureField, QR Code, Splash Screen
-   **3 ช่องทางการแจกจ่าย**: Homebrew, APT, ซอร์ส
-   **3 ไปป์ไลน์สโตร์อัตโนมัติ**: App Store, TestFlight, Google Play
-   **ทั้ง 6 แพลตฟอร์ม**ได้รับการปรับปรุงสัปดาห์นี้

## ขั้นตอนถัดไป

ไปป์ไลน์กำลังเติมเต็ม คุณสามารถเขียน TypeScript คอมไพล์เป็น 6 แพลตฟอร์ม แจกจ่ายผ่าน Homebrew หรือ APT เผยแพร่ไปยัง App Store และ Play Store เพิ่มวิดเจ็ตหน้าจอหลัก และอ่าน เอกสารครบถ้วน — ทั้งหมดโดยไม่ต้องออกจาก toolchain ของ Perry สิ่งที่เหลือ:

-   **รองรับ regex เต็มรูปแบบ** — ช่องว่างภาษาสำคัญสุดท้าย
-   **การขยาย perry/ui** — ลากและวาง ป้ายกำกับการเข้าถึง DatePicker
-   **การเติบโตของ perrysdad** — ขยายคอมไพเลอร์ self-hosting ไปสู่ความเท่าเทียมกับ Perry เต็มรูปแบบ
-   **Hub เบต้าสาธารณะ** — เปิดบิลด์แบบกระจายให้ผู้ใช้ภายนอก

ติดตามความคืบหน้าบน [GitHub](https://github.com/PerryTS/perry) อ่านเอกสารใหม่ที่ [docs.perryts.com](https://docs.perryts.com) หรือดู [แผนงาน](/th/roadmap/) สำหรับภาพรวมทั้งหมด
