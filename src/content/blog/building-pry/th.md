---
title: "สร้าง Pry: โปรแกรมดู JSON เนทีฟใน TypeScript"
excerpt: "บทสรุปของการสร้าง Pry ซึ่งเป็นโปรแกรมดู JSON แบบเนทีฟที่คอมไพล์จาก TypeScript ไปจนถึงโค้ดเครื่องที่มีรันไทม์ Perry และ GC ลิงก์เข้าและไม่มี webview"
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry เป็นตัวดู JSON เนทีฟที่สร้างขึ้นทั้งหมดด้วย TypeScript และคอมไพล์ด้วย Perry ไม่ใช่ การสาธิตเทคโนโลยี — มันเป็นเครื่องมือจริงที่เราใช้ทุกวันเพื่อตรวจสอบการตอบกลับ API ไฟล์ คอนฟิก และดัมพ์ข้อมูล โพสต์นี้อธิบายวิธีการสร้าง วิธีการคอมไพล์ และประสบการณ์ ของนักพัฒนาเป็นอย่างไรเมื่อ TypeScript ของคุณคอมไพล์เป็นแอปเนทีฟ

## Pry ทำอะไร

Pry อ่านไฟล์ JSON (หรือรับ JSON จาก stdin) และเรนเดอร์เป็นต้นไม้แบบโต้ตอบที่ สามารถนำทางได้ในหน้าต่างเนทีฟ ถ้าคุณเคยใช้ Quick Look ในตัวของ macOS สำหรับ JSON ลองจินตนาการแบบนั้น — แต่เร็วกว่า ค้นหาได้ และมีการนำทางด้วยคีย์บอร์ด

ชุดฟีเจอร์:

-   **มุมมองต้นไม้** — โหนดที่ยุบได้สำหรับออบเจ็กต์และอาร์เรย์ พร้อมตัวบ่งชี้ความลึกและขยาย/ยุบทั้งหมด
-   **ค้นหา** — ค้นหาข้อความเต็มรูปแบบในคีย์และค่าพร้อมการไฮไลท์แบบเรียลไทม์และการนำทางผลลัพธ์
-   **ปุ่มลัด** — ปุ่มลูกศรเพื่อนำทาง Enter เพื่อขยาย/ยุบ สแลชเพื่อค้นหา `⌘C` เพื่อคัดลอก
-   **คลิปบอร์ด** — คัดลอกโหนดหรือต้นไม้ย่อยเป็น JSON ที่จัดรูปแบบแล้ว
-   **การระบายสี syntax** — สตริงเป็นสีเขียว ตัวเลขเป็นสีส้ม บูลีนเป็นสีม่วง null เป็นสีแดง
-   **แถบสถานะ** — แสดงจำนวนโหนดทั้งหมด ความลึกปัจจุบัน ขนาดไฟล์ และเวลาในการแยกวิเคราะห์

## ซอร์สโค้ด

Pry เขียนด้วย TypeScript มาตรฐาน ไม่มีไวยากรณ์พิเศษ ไม่มีมาโคร ไม่มี การสร้างโค้ดในเวลา build ใช้ API UI ของ Perry ซึ่งจัดเตรียมวิดเจ็ตเนทีฟ ที่คอมไพล์เป็นโค้ดเฉพาะแพลตฟอร์ม

นี่คือจุดเริ่มต้น (ทำให้เรียบง่ายเพื่อความชัดเจน):

**pry.ts**

```typescript
import { App, VStack, TreeView, SearchBar, StatusBar, State }
from "perry/ui";
import { readFile, readStdin } from "perry/fs";
// Read input from file arg or stdin
const input = process.argv[2]
? readFile(process.argv[2])
: readStdin();
const startTime = Date.now();
const data = JSON.parse(input);
const parseMs = Date.now() - startTime;
// Reactive state
const searchQuery = new State("");
const matchCount = new State(0);
// Build the app
const app = new App("Pry", {
width: 800,
height: 600,
minWidth: 400,
minHeight: 300,
});
app.body(() => {
return VStack({ spacing: 0 }, [
SearchBar({
placeholder: "Search keys and values...",
onSearch: (q) => searchQuery.value = q,
}),
TreeView(data, {
collapsible: true,
syntaxHighlight: true,
searchQuery: searchQuery,
onMatchCount: (n) => matchCount.value = n,
copyOnClick: true,
}),
StatusBar([
`${countNodes(data)} nodes`,
`Parsed in ${parseMs}ms`,
`${matchCount.value} matches`,
]),
]);
});
app.registerShortcut("/", () => app.focusSearchBar());
app.registerShortcut("Escape", () => {
searchQuery.value = "";
app.focusTree();
});
app.run();
```

นั่นคือแกนหลักของแอปพลิเคชันเนทีฟ ไม่มี boilerplate ของเฟรมเวิร์ก ไม่มีการกำหนดค่า build ไม่มีไฟล์เฉพาะแพลตฟอร์ม ไฟล์ TypeScript ไฟล์เดียว

### ฟังก์ชันช่วยเหลือ

Pry ยังมียูทิลิตี้ `countNodes` ที่ นับโหนดทั้งหมดในต้นไม้ JSON แบบ recursive และตัวช่วย `formatBytes` สำหรับแสดงขนาดไฟล์ เหล่านี้ เป็นฟังก์ชัน TypeScript มาตรฐาน — ไม่มีอะไรเฉพาะของ Perry คอมไพล์เป็น โค้ดเนทีฟเหมือนกับทุกอย่างอื่น

**utils.ts**

```typescript
export function countNodes(data: unknown): number {
if (data === null || typeof data !== "object") {
return 1;
}
if (Array.isArray(data)) {
return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);
}
const values = Object.values(data as Record<string, unknown>);
return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);
}
```

## การคอมไพล์ Pry

การคอมไพล์ Pry ด้วย Perry เป็นคำสั่งเดียว ไม่ต้องมีโปรเจกต์ Xcode ไม่มีการกำหนดค่า Gradle ไม่มีคอนฟิก webpack แค่ชี้ Perry ไปที่ไฟล์เริ่มต้นและระบุเป้าหมายของคุณ

### macOS (ARM64)

```
$ perry build pry.ts --target macos-arm64
Parsing pry.ts...
Resolving imports: perry/ui, perry/fs
Compiling (cranelift, arm64)...
Linking with AppKit.framework...
✓ Built executable: pry (48 MB)
$ file pry
pry: Mach-O 64-bit executable arm64
$ otool -L pry | head -5
pry:
/System/Library/Frameworks/AppKit.framework/AppKit
/System/Library/Frameworks/Foundation.framework/Foundation
/usr/lib/libSystem.B.dylib
```

ไบนารีมีขนาด 48 MB เพราะรวมสแต็ก UI AppKit ทั้งหมด — การเรนเดอร์ tree view การไฮไลท์การค้นหา การระบายสี syntax และการจัดการคีย์บอร์ด เมื่อเปรียบเทียบแล้ว แอปเดียวกัน ใน Electron จะมีขนาด 200+ MB แอป Perry แบบ CLI อย่างเดียวคอมไพล์ได้ 2-5 MB

### iOS

```
$ perry build pry.ts --target ios-arm64
✓ Built executable: pry (52 MB)
```

Build สำหรับ iOS เชื่อมต่อกับ UIKit แทน AppKit Perry แมป API `TreeView` เดียวกันเป็น `UITableView` พร้อม ส่วนที่ขยายได้ `SearchBar` เป็น `UISearchBar` และอีเวนต์สัมผัสแทนที่อีเวนต์เมาส์ Build สำหรับ iOS สามารถติดตั้งบนอุปกรณ์จริงและ simulator

### Android

```
$ perry build pry.ts --target android-arm64
✓ Built: pry.apk
```

Build สำหรับ Android สร้างไลบรารีเนทีฟที่โหลดผ่าน JNI บรรจุลงใน APK `TreeView` แมปเป็น `RecyclerView` พร้อม view holders ที่ขยายได้ `SearchBar` แมปเป็น `EditText` พร้อม `TextWatcher` และ แถบสถานะแมปเป็น `TextView` ที่ด้านล่างของเลย์เอาต์

## สิ่งที่เกิดขึ้นเบื้องหลัง

เมื่อ Perry คอมไพล์ Pry มันผ่านหลายเฟส:

1.  **แยกวิเคราะห์** — SWC แยกวิเคราะห์ซอร์ส TypeScript เป็น AST การนำเข้าจาก `perry/ui` และ `perry/fs` ถูก แก้ไขไปยังการใช้งานโมดูลในตัวของ Perry
2.  **วิเคราะห์ชนิดข้อมูล** — Perry แก้ไขชนิดข้อมูลทั้งหมด รวมถึงเจเนอริก `State<string>` และ `State<number>` ทำให้เป็นชนิดข้อมูลที่เป็นรูปธรรม
3.  **การแก้ไขแพลตฟอร์ม** — ตามแฟล็กเป้าหมาย Perry เลือก แบ็กเอนด์ UI ที่เหมาะสม ทุกการเรียก `TreeView`, `SearchBar` และ `Button`ถูกแก้ไขไปยังการใช้งานเฉพาะแพลตฟอร์ม
4.  **สร้าง IR** — Perry สร้าง intermediate representation ที่ รวมการเรียก API เนทีฟ — การส่งข้อความ Objective-C สำหรับ macOS/iOS การเรียก JNI สำหรับ Android การเรียกฟังก์ชัน C สำหรับ GTK4/Win32
5.  **สร้างโค้ด** — Cranelift คอมไพล์ IR เป็นโค้ดเครื่องเนทีฟ สำหรับสถาปัตยกรรมเป้าหมาย
6.  **เชื่อมต่อ** — โค้ดเนทีฟถูกเชื่อมต่อกับเฟรมเวิร์กของแพลตฟอร์ม (AppKit, UIKit, Android NDK, GTK4 หรือ Win32) เพื่อสร้างไฟล์เรียกทำงานสุดท้าย

## ไม่มี Runtime ไม่มี Web Views

สิ่งนี้คุ้มค่าที่จะเน้นเพราะเป็นความแตกต่างหลักระหว่าง Perry กับทุก แนวทาง TypeScript-เป็น-เนทีฟ อื่นๆ ไบนารี Pry ที่คอมไพล์แล้วมี:

-   **ไม่มีเอนจิน JavaScript** — ไม่มี V8 ไม่มี Hermes ไม่มี JavaScriptCore
-   **ไม่มี web views** — ไม่มี Chromium ไม่มี WebKit ไม่มี WKWebView
-   **ไม่มีเลเยอร์ bridge** — ไม่มีข้อความที่ซีเรียลไลซ์ระหว่าง JS และเนทีฟ
-   **ไม่มี runtime ของเฟรมเวิร์ก** — ไม่มี React ไม่มีเอนจิน Flutter ไม่มี Dart VM

ไบนารีเรียก API ของแพลตฟอร์มโดยตรง บน macOS มันเรียก `objc_msgSend` เพื่อโต้ตอบกับออบเจ็กต์ AppKit บน Android มันเรียกฟังก์ชัน JNI เพื่อสร้างและจัดการ Views เหมือนกับที่แอปเนทีฟ Swift หรือ Kotlin จะทำ

ผลลัพธ์เชิงปฏิบัติ: Pry เปิดขึ้นทันที ไม่มีการเริ่มต้น VM ไม่มีการอุ่น JIT ไม่มีการแยกวิเคราะห์สคริปต์ โปรเซสเริ่ม หน้าต่างปรากฏ JSON ถูกเรนเดอร์ การใช้หน่วยความจำเป็นเศษส่วนของสิ่งที่ Electron เทียบเท่าจะใช้

## ประสบการณ์ของนักพัฒนา

การสร้าง Pry รู้สึกคล้ายคลึงกับการสร้างแอปพลิเคชัน TypeScript ทั่วไปอย่างน่าทึ่ง เวิร์กโฟลว์คือ:

1.  เขียน TypeScript ในเอดิเตอร์ของคุณ (VS Code, Zed, Neovim หรืออะไรก็ตามที่คุณชอบ)
2.  รัน `perry compile pry.ts`
3.  รัน `./pry test.json`
4.  ทำซ้ำ

ไม่ต้องกำหนดค่าโปรเจกต์ Xcode ไม่ต้องติดตั้ง Android Studio ไม่มี build Gradle ที่ใช้เวลา 45 วินาที ตัวคอมไพเลอร์ Perry เองก็เร็ว — การแยกวิเคราะห์และคอมไพล์ Pry ใช้เวลาไม่กี่ วินาที และเรากำลังทำงานเพื่อให้มันเร็วขึ้น

TypeScript ที่คุณเขียนเป็น TypeScript มาตรฐาน การตรวจสอบชนิดข้อมูลของเอดิเตอร์ autocomplete และเครื่องมือ refactoring ทำงานได้ทั้งหมด คุณสามารถแยกฟังก์ชัน สร้างโมดูล ใช้เจเนอริก — รูปแบบ TypeScript ทั้งหมดที่คุณรู้จักอยู่แล้ว

## สิ่งที่เราเรียนรู้

การสร้าง Pry สอนเราหลายอย่างเกี่ยวกับสิ่งที่ API UI ของ Perry ต้องรองรับ บทเรียนบางอย่าง:

-   **Tree views มีความซับซ้อน** การขยาย การยุบ การไฮไลท์การค้นหา การนำทางด้วยคีย์บอร์ด และการรวมเข้ากับคลิปบอร์ดต้องประสานงานกัน วิดเจ็ต `TreeView` ของ Perry จัดการสิ่งนี้ภายใน แต่เราต้อง มั่นใจว่าการใช้งานเนทีฟสอดคล้องกันข้ามทั้งสามแพลตฟอร์ม
-   **ปุ่มลัดต้องเป็นไปตามอนุสัญญาของแพลตฟอร์ม** บน macOS คือ `⌘C` เพื่อคัดลอก บน Linux และ Android คือ `Ctrl+C` ระบบปุ่มลัดของ Perry ทำ abstraction สิ่งนี้ แต่ต้องมีการใช้งานอย่างระมัดระวังเพื่อให้ถูกต้อง
-   **แถบสถานะนั้นซับซ้อนอย่างน่าประหลาดใจ** แต่ละแพลตฟอร์มมีอนุสัญญาที่แตกต่างกัน สำหรับตำแหน่งและวิธีการแสดงข้อมูลสถานะ AppKit ใช้แถบด้านล่างของหน้าต่าง UIKit ใช้ toolbar Android ใช้ view ด้านล่างในเลย์เอาต์ `StatusBar` ของ Perry แมปไปยังแต่ละแบบอย่างถูกต้อง
-   **การรองรับ stdin ต้องมีการรับรู้แพลตฟอร์ม** บน macOS และ Linux การอ่าน จาก stdin ทำได้ง่าย บน iOS และ Android "stdin" ไม่มีอยู่จริง ในแบบเดียวกัน ดังนั้น Pry ใช้การเลือกไฟล์บนแพลตฟอร์มมือถือแทน `readStdin` ของ Perry จัดการสิ่งนี้อย่างโปร่งใส

## ประสิทธิภาพ

Pry จัดการไฟล์ JSON ขนาดใหญ่ได้สบาย ในการทดสอบของเรา:

-   ไฟล์ JSON ขนาด 1 MB (10,000+ โหนด) แยกวิเคราะห์และเรนเดอร์ในเวลาน้อยกว่า 50 ms
-   ไฟล์ JSON ขนาด 10 MB เรนเดอร์ในเวลาน้อยกว่า 200 ms
-   การค้นหาใน 10,000 โหนดส่งคืนผลลัพธ์ขณะที่คุณพิมพ์ โดยไม่มีความล่าช้าที่เห็นได้
-   การใช้หน่วยความจำอยู่ต่ำกว่า 50 MB แม้สำหรับไฟล์ขนาดใหญ่

นี่คือข้อได้เปรียบของการคอมไพล์เนทีฟ การแยกวิเคราะห์ JSON ใน Perry ถูกคอมไพล์เป็น ลูปเนทีฟที่แน่นโดยไม่มีการหยุด GC การเรนเดอร์ต้นไม้ใช้ list views แบบ virtualized ของแพลตฟอร์มเอง (NSOutlineView, UITableView, RecyclerView) ซึ่งผ่านการทดสอบ ด้านประสิทธิภาพมาอย่างดี

## ซอร์สโค้ดและดาวน์โหลด

Pry เป็นโอเพนซอร์ส คุณสามารถเรียกดูซอร์สทั้งหมด สร้างมันเอง หรือแค่ดู โค้ดเพื่อเข้าใจว่าแอป UI เนทีฟ Perry มีโครงสร้างอย่างไร

-   [รีโป GitHub](https://github.com/perryts/pry) — ซอร์สโค้ดทั้งหมดและคำแนะนำการ build
-   [หน้า showcase](/th/showcase/pry/) — ภาพหน้าจอ รายการฟีเจอร์ และรายละเอียดแพลตฟอร์ม

ถ้าคุณกำลังสร้างอะไรด้วย Perry เราอยากรู้ เปิด issue บน [รีโป Perry](https://github.com/PerryTS/perry) หรือเริ่มการสนทนา เรากำลังสร้าง Perry แบบเปิดเผยและข้อเสนอแนะจากผู้ใช้จริง ที่สร้างแอปจริงนั้นมีค่ามาก
