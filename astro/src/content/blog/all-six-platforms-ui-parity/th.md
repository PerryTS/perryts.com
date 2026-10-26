---
title: "ทั้ง 6 แพลตฟอร์ม ฟีเจอร์ครบถ้วนเท่าเทียมกัน"
excerpt: "วิดเจ็ต UI เนทีฟกว่า 20 ตัว, วิดเจ็ต Canvas, Table view, การแจ้งเตือนระบบ, การเข้าถึง keychain, รองรับหลายหน้าต่าง และฟีเจอร์ครบถ้วนเท่าเทียมกันบน macOS, iOS, iPadOS, Android, Linux และ Windows — ทั้งหมดจากโค้ดเบส TypeScript เดียว"
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
เมื่อเราเปิดตัวระบบ UI เนทีฟเวอร์ชันแรกของ Perry "ข้ามแพลตฟอร์ม" หมายความว่า macOS ทำงานได้ดีและอีกห้าแพลตฟอร์มเป็น stubs วันนี้ด้วย v0.2.162 นั่นไม่จริงอีกต่อไป ทั้งหกแพลตฟอร์ม — macOS, iOS, iPadOS, Android, Linux และ Windows — ตอนนี้มีความเท่าเทียมกันของฟีเจอร์อย่างเต็มที่ โค้ด TypeScript เดียวกันคอมไพล์เป็นวิดเจ็ตเนทีฟบนทุกเป้าหมาย

โพสต์นี้เดินผ่านสิ่งที่เราเปิดตัวระหว่าง v0.2.152 และ v0.2.164: วิดเจ็ต Canvas การใช้งาน NSTableView แบบเต็ม วิดเจ็ต UI มากกว่า 20 ตัว โมดูล `perry/system` การรองรับหลายหน้าต่าง การแจ้งเตือนของระบบ การเข้าถึง keychain การลดขนาดไบนารีอัตโนมัติ และระบบปลั๊กอินในเวลาคอมไพล์ มีเรื่องเกิดขึ้นมากมาย

## สปรินต์วิดเจ็ต: คอมโพเนนต์ UI เนทีฟมากกว่า 20 ตัว

การกระโดดครั้งใหญ่ที่สุดมาใน v0.2.155 ซึ่งเปิดตัววิดเจ็ต UI มากกว่า 20 ตัวข้ามทุกแพลตฟอร์ม API UI TypeScript ของ Perry ตอนนี้ครอบคลุมคอมโพเนนต์ที่คุณต้องการจริงๆ เพื่อส่งแอปจริง:

-   **เลย์เอาต์** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **อินพุต** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **การแสดงผล** — Text, Label, Image, ProgressView, Divider, Spacer
-   **ข้อมูล** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **ซ้อนทับ** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **การวาด** — Canvas (API วาด 2D เร่งด้วยฮาร์ดแวร์ต่อแพลตฟอร์ม)

เหล่านี้ไม่ใช่ wrapper รอบเรนเดอร์แบบกำหนดเอง แต่ละวิดเจ็ตคอมไพล์เป็นคอมโพเนนต์เนทีฟของแพลตฟอร์มเอง: `NSButton` บน macOS `UIButton` บน iOS `GtkButton` บน Linux `android.widget.Button` บน Android ผ่าน JNI และ `CreateWindowEx` บน Windows ระบบปฏิบัติการวาด ใส่ธีม และจัดการการเข้าถึง — Perry แค่เชื่อมต่อ API TypeScript

## Canvas: การวาด 2D จาก TypeScript

หนึ่งในการเพิ่มที่น่าสนใจทางเทคนิคมากที่สุดคือวิดเจ็ต Canvas (v0.2.152) มันเปิดเผย API วาด 2D ที่คุ้นเคยจาก TypeScript โดยตรง — เส้นโค้งเบเซียร์ การเติม การลากเส้น การ blit ภาพ — และคอมไพล์เป็นแบ็กเอนด์ 2D ที่เร่งด้วยฮาร์ดแวร์ของแพลตฟอร์ม: Core Graphics บน macOS/iOS, Cairo บน Linux, Direct2D บน Windows และ Skia บน Android

canvas.ts

import { Canvas, Color } from 'perry/ui';

// Compiles to Core Graphics on macOS, Cairo on Linux, etc.

const canvas = new Canvas({ width: 400, height: 300 });

canvas.onDraw((ctx) => {

ctx.fillStyle = Color.amber;

ctx.fillRect(10, 10, 100, 60);

ctx.strokeStyle = Color.blue;

ctx.lineWidth = 2;

ctx.beginPath();

ctx.arc(200, 150, 80, 0, Math.PI \* 2);

ctx.stroke();

});

## วิดเจ็ต Table: NSTableView มาถึง TypeScript

v0.2.163 เปิดตัววิดเจ็ต Table — คอมโพเนนต์ที่ซับซ้อนที่สุดในไลบรารี บน macOS มันแมปเป็น `NSTableView` พร้อมการเชื่อมต่อ delegate/data source แบบเต็ม บน Linux ใช้ `GtkTreeView` ของ GTK4 บน Windows คอนโทรล `ListView` ของ Win32 บน Android ผูกกับ `RecyclerView` ผ่าน JNI

API TypeScript เป็นแบบ declarative: คุณกำหนดคอลัมน์ ให้แหล่งข้อมูล และ Perry จัดการการเชื่อมต่อเฉพาะแพลตฟอร์มในเวลาคอมไพล์ การเรียงลำดับคอลัมน์ การจัดการการเลือก และการปรับแต่งความสูงของแถวทำงานได้ทันที

table.ts

import { Table, Column } from 'perry/ui';

const table = new Table({

columns: \[

new Column({ title: "Name", key: "name", width: 200 }),

new Column({ title: "Size", key: "size", width: 80 }),

\],

rows: files, // TypeScript array of objects

onSelect: (row) => console.log(row.name),

});

## โมดูล perry/system

v0.2.155 ยังเปิดตัว `perry/system` — โมดูล TypeScript ที่เปิดเผย API ระบบแพลตฟอร์มโดยไม่มีรันไทม์: กล่องเปิดไฟล์ กล่องบันทึก การแจ้งเตือน sheets การเข้าถึง keychain การแจ้งเตือนระบบ และการจัดการหลายหน้าต่าง

-   `system.showOpenDialog()` — ตัวเลือกไฟล์เนทีฟ
-   `system.showSaveDialog()` — กล่องบันทึกเนทีฟ
-   `system.showAlert()` — แผงแจ้งเตือนเนทีฟ
-   `system.notify()` — การแจ้งเตือน OS
-   `system.keychain.get/set()` — Keychain Services / Secret Service / Windows Credential Store
-   `system.openWindow()` — การจัดการหลายหน้าต่าง

## ความเท่าเทียมฟีเจอร์หกแพลตฟอร์ม: v0.2.162

เหตุการณ์สำคัญ v0.2.162 เป็นเรื่องของการปิดช่องว่าง ก่อนรุ่นนี้ macOS มีชุดฟีเจอร์ครบถ้วนที่สุด iOS เกือบจะถึง Linux/Windows/Android ตามหลัง v0.2.162 นำทุกแพลตฟอร์มมาสู่ระดับเดียวกัน:

-   **macOS** — AppKit ชุดวิดเจ็ตสมบูรณ์ Keychain การแจ้งเตือน หลายหน้าต่าง toolbar
-   **iOS / iPadOS** — UIKit ความเท่าเทียมวิดเจ็ตเต็มกับ macOS วงจรชีวิต scene
-   **Android** — JNI bridge วิดเจ็ตทั้งหมดผ่าน Android Views คอมไพล์ข้ามแพลตฟอร์ม NDK
-   **Linux** — GTK4 ชุดวิดเจ็ตสมบูรณ์รวม Table กล่องไฟล์ keychain ของ libsecret
-   **Windows** — Win32 วิดเจ็ตทั้งหมด Windows Credential Store การแจ้งเตือน WinRT

## การลดขนาดไบนารีอัตโนมัติ

v0.2.153 เปิดตัวการลดขนาดไบนารีอัตโนมัติ — คอมไพเลอร์ strip เส้นทางโค้ดที่ไม่ได้ใช้อย่างเข้มงวด กำจัดฟังก์ชัน stdlib ที่เข้าถึงไม่ได้ และลบนิยามสัญลักษณ์ที่ซ้ำกัน เครื่องมือ CLI ที่เคยคอมไพล์ได้ ~4 MB ตอนนี้ต่ำกว่า 2 MB โดยไม่ต้องเปลี่ยนซอร์ส

## ระบบปลั๊กอินในเวลาคอมไพล์

v0.2.152 เปิดตัวระบบปลั๊กอินของ Perry — ไม่มีการโหลดปลั๊กอินในรันไทม์ ไม่มี IPC ไม่มี `require()` แบบไดนามิก ปลั๊กอินเป็นโมดูล TypeScript ที่ Perry แก้ไขและคอมไพล์ในเวลา build

เราเขียนเกี่ยวกับปรัชญาเบื้องหลังสิ่งนี้ใน [ระบบปลั๊กอินเป็นภาษีประสิทธิภาพ](/th/blog/plugin-systems-are-a-performance-tax/) สถาปัตยกรรมปลั๊กอินรันไทม์แลกประสิทธิภาพกับความสามารถในการขยาย การผสมรวมในเวลา build ให้ทั้งสองอย่าง

## การปรับปรุงภาษา

สปรินต์ UI ไม่ได้เกิดขึ้นอย่างโดดเดี่ยว — คอมไพเลอร์เองก็มีความสามารถมากขึ้นเรื่อยๆ:

-   **นิพจน์คลาส** — `const Foo = class extends Bar {}` คอมไพล์ถูกต้องแล้ว
-   **การแปลง generators** — `function*` และ `yield` คอมไพล์เป็น state machines เนทีฟ
-   **Map/Set เป็นฟิลด์คลาส** — `private items = new Map()` ทำงานใน codegen
-   **การบังคับชนิดพารามิเตอร์ FFI** — การเรียกไลบรารีเนทีฟจัดการการบังคับชนิดโดยอัตโนมัติ
-   `string.match()` — รองรับเต็มรูปแบบแล้ว
-   **เป้าหมาย web** — Perry คอมไพล์เป็นเอาต์พุตที่เข้ากันได้กับ web ได้แล้ว

## ขั้นตอนถัดไป

ด้วยความเท่าเทียม UI หกแพลตฟอร์มที่เปิดตัวแล้ว เฟสถัดไปคือความลึกมากกว่าความกว้าง เรากำลังทำงานใน:

-   การรองรับ RegExp เต็มรูปแบบ
-   ลากและวาง เมนูบริบทแบบกำหนดเอง และ labels การเข้าถึง
-   ส่วนขยาย VS Code สำหรับการวินิจฉัย Perry
-   การรวมเข้ากับตัวจัดการแพ็กเกจ
-   เป้าหมายการคอมไพล์ WASM
-   Multi-threading ผ่านเธรด `Worker`

ถ้าคุณต้องการติดตาม [รีโป Perry](https://github.com/PerryTS/perry) เป็นโอเพนซอร์ส ดู [showcase](/th/showcase/) หรือเรียกดู [แผนงาน](/th/roadmap/) สำหรับภาพรวมทั้งหมด
