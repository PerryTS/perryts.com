---
title: "คอมไพล์ Hono, tRPC และ Strapi เป็นไบนารีเนทีฟ"
excerpt: "ตอนนี้ Perry คอมไพล์เฟรมเวิร์ก TypeScript สำคัญสามตัว — Hono, tRPC และ Strapi — เป็นไฟล์ปฏิบัติการ ARM64 เนทีฟ คอมไพล์ได้ในไม่ถึงวินาที สร้างไบนารีขนาดไม่ถึง 2 MB และทำงานได้โดยไม่มีข้อผิดพลาด"
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
ตอนนี้ Perry คอมไพล์เฟรมเวิร์ก TypeScript หลักสามตัว — Hono, tRPC และ Strapi — เป็น ไฟล์เรียกทำงานเนทีฟ ARM64 คอมไพล์ในเวลาน้อยกว่าหนึ่งวินาที สร้างไบนารีที่มีขนาดต่ำกว่า 2 MB และรันโดยไม่ crash

โพสต์นี้ครอบคลุมสิ่งที่ใช้ได้ สิ่งที่ยังใช้ไม่ได้ และสิ่งที่เราเรียนรู้จากการทดสอบ คอมไพเลอร์กับโค้ดจากโลกจริง

## โปรเจกต์

เราเลือกสามตัวนี้เพราะเป็นตัวแทนของรูปแบบ TypeScript ที่แตกต่างกัน:

-   **Hono** — เฟรมเวิร์กเว็บน้ำหนักเบา (29 โมดูล) ใช้เจเนอริกอย่างหนัก การสืบทอดคลาส การกำหนดเมธอดแบบไดนามิก และ Web API `Request`/`Response` โครงสร้างการส่งออกใช้ named re-exports ผ่าน barrel files
-   **tRPC** — เฟรมเวิร์ก RPC แบบ type-safe (52 โมดูล) สาย re-export ที่ลึก ข้ามมากกว่า 4 ระดับ รูปแบบ builder พร้อมการ narrowing ชนิดข้อมูลเจเนอริก การสร้างอินสแตนซ์คลาสในขอบเขตโมดูล และ streaming ผ่าน Web Streams
-   **Strapi** — แกน CMS แบบ headless (4 โมดูลคอมไพล์เนทีฟ ที่เหลือเป็น external) Monorepo พร้อมการแก้ไขแพ็กเกจ workspace re-exports แบบ namespace (`export * as X`) รูปแบบ service container ด้วย `Map` และฟังก์ชัน factory

## ผลการคอมไพล์

ทั้งสามคอมไพล์เป็นไบนารีเนทีฟโดยไม่มีข้อผิดพลาดในการคอมไพล์:

| โปรเจกต์ | โมดูลที่คอมไพล์ | ขนาดไบนารี | เวลาคอมไพล์ |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

ทุกโมดูลซอร์สผ่านไปป์ไลน์เต็มรูปแบบ: แยกวิเคราะห์ SWC, ลดระดับ HIR, สร้างโค้ด Cranelift, สร้างไฟล์ออบเจ็กต์ และลิงก์เนทีฟ เวลาคอมไพล์รวมทุกอย่าง — ตั้งแต่การแยกวิเคราะห์จนถึงลิงก์สุดท้าย

เพื่อเปรียบเทียบ `tsc --noEmit` บน tRPC เพียงอย่างเดียวใช้เวลาหลาย วินาที Perry คอมไพล์ 52 โมดูลเป็นไบนารีเนทีฟที่ลิงก์แล้วในเวลาน้อยกว่าหนึ่งวินาที

## สิ่งที่ทำงานได้ในรันไทม์

### การสร้างอินสแตนซ์คลาสข้ามโมดูล

นี่คือจุดเปลี่ยนสำคัญ โครงสร้างการส่งออกของ Hono มีลักษณะดังนี้:

hono export chain

// hono/src/hono.ts

export class Hono extends HonoBase { ... }

// hono/src/index.ts

import { Hono } from './hono'

export { Hono }

`export { Hono }` นั้นเป็น named re-export — ไม่ใช่ `export * from` หรือ `export { Hono } from './hono'` ใน HIR ของ Perry สิ่งนี้กลายเป็น `Export::Named` ไม่ใช่ `Export::ReExport` หรือ `Export::ExportAll` ก่อนหน้านี้ การแพร่กระจายคลาสของคอมไพเลอร์ ติดตามเฉพาะสาย `ExportAll` และ `ReExport` ดังนั้นการนำเข้า `Hono` จาก `index.ts` ล้มเหลว อย่างเงียบๆ — การค้นหาคลาสพลาดและ `new Hono()` ส่งคืน `undefined`

ตอนนี้ Perry ติดตาม `Export::Named` กลับผ่านการนำเข้าของ โมดูลเพื่อค้นหานิยามคลาสดั้งเดิมและแพร่กระจาย ผลลัพธ์:

$ ./perry compile test\_hono.ts -o /tmp/test-hono && /tmp/test-hono

\[1\] Class instantiation through named re-export chain

PASS: new Hono() returned a real object

\[2\] Constructor-initialized fields

PASS: app.router initialized by constructor

PASS: app.router.name = SmartRouter

\[5\] Multiple instances

PASS: second instance created with router

\[6\] Constructor with options

PASS: new Hono({ strict: false }) accepted options

Constructor ของ Hono ทำงาน เริ่มต้น `SmartRouter` (ซึ่งภายในสร้างทั้ง `RegExpRouter` และ `TrieRouter`) และส่งคืนออบเจ็กต์จริง อินสแตนซ์อิสระหลายตัว ทำงานได้ ตัวเลือก constructor ถูกรับ

### การแก้ไข Re-export หลายระดับ

`initTRPC` ของ tRPC อยู่ลึก 4 ระดับ:

initTRPC.ts (export const initTRPC = ...)

\-> unstable-core-do-not-import.ts (export \* from './initTRPC')

\-> @trpc/server/index.ts (export { initTRPC } from '../../..')

\-> index.ts (export \* from './@trpc/server')

นั่นคือ `ExportAll` → `Named` → `ExportAll` Perry แก้ไขสายทั้งหมด — `initTRPC` สามารถเข้าถึงได้ใน ไบนารีที่คอมไพล์แล้ว เช่นเดียวกับ `TRPCError` ซึ่งใช้เส้นทางเดียวกัน

### การสร้างอินสแตนซ์คลาสข้ามโมดูลพร้อมอาร์กิวเมนต์

const err = new TRPCError({ code: 'NOT\_FOUND', message: 'resource missing' })

// PASS: new TRPCError() returned object

// PASS: err.code = NOT\_FOUND

`TRPCError` ถูกกำหนดในโมดูลหนึ่ง re-export ผ่าน barrel files ระดับกลางสามตัว นำเข้าในการทดสอบ และสร้างอินสแตนซ์ด้วยออบเจ็กต์ตัวเลือก ฟิลด์ `code` ของอินสแตนซ์สามารถเข้าถึงได้

### การแก้ไขแพ็กเกจใน Monorepos

Strapi ใช้แพ็กเกจ workspace — `@strapi/core` เป็นแพ็กเกจ พี่น้องใน monorepo ไม่ใช่ dependency npm Perry แก้ไข bare specifier ผ่าน ฟิลด์ exports ใน `package.json`:

"exports": {

".": { "source": "./src/index.ts", "import": "./dist/index.mjs" }

}

ฟังก์ชัน `createStrapi` ถูกแก้ไขอย่างถูกต้องเป็นฟังก์ชันที่เรียกได้ ผ่าน `export * from '@strapi/core'`

### การกรอง Export เฉพาะชนิดข้อมูล

ไวยากรณ์ `export type { Foo }` ของ TypeScript ไม่มี ความหมายในรันไทม์ — แต่ก่อนหน้านี้ Perry แปลงสิ่งเหล่านี้เป็นรายการ `Export::ReExport` จริงที่แพร่กระจายผ่าน linker และสร้างสัญลักษณ์ stub `index.ts` ของ Hono เพียงไฟล์เดียวมี สี่การประกาศ `export type` ที่ครอบคลุมชนิดข้อมูลหลายสิบตัว

ตอนนี้ Perry ตรวจสอบแฟล็ก `type_only` ของ SWC ในการประกาศ `ExportNamed` และ `is_type_only` ในตัวระบุแต่ละตัว ข้ามพวกมันระหว่าง การลดระดับ HIR สิ่งนี้กำจัดการสร้าง stub ที่ตายจาก type re-exports ข้ามทั้งสาม โปรเจกต์

### Constructor RegExp

`new RegExp(pattern, flags)` ตอนนี้คอมไพล์เป็นฟังก์ชันรันไทม์`js_regexp_new` ที่มีอยู่ของ Perry สิ่งนี้ทำได้ตรงไปตรงมา — รันไทม์รองรับ RegExp อยู่แล้ว — แต่ตัวจัดการ codegen `Expr::New` ไม่มีกรณีสำหรับมัน ดังนั้นทุก `new RegExp(...)` ตกไปเป็นคำเตือน "Unknown class"`RegExpRouter` ของ Hono ใช้สิ่งนี้อย่างกว้างขวาง

## สิ่งที่ยังไม่ทำงาน

เราเจาะจงที่นี่เพราะช่องว่างบอกคุณได้มากเท่ากับชัยชนะ

### การกำหนดคุณสมบัติแบบไดนามิกบน `this`

Constructor ของ Hono ตั้งค่า handler เมธอด HTTP แบบไดนามิก:

const allMethods = \['get', 'post', 'put', 'delete', ...\]

allMethods.forEach((method) => {

this\[method\] = (args1, ...args) => {

// register route

return this

}

})

ซึ่งหมายความว่า `app.get`, `app.post` ฯลฯ ไม่ได้ถูกประกาศแบบสแตติก — มันถูก กำหนดในรันไทม์ผ่านชื่อคุณสมบัติแบบคำนวณ Perry ยังไม่รองรับ `this[variable] = value` ดังนั้นเมธอดเหล่านี้จึงหายไป:

\[4\] Dynamic method assignment (this\[method\] = ...)

INFO: app.get not available

INFO: app.on not available

นี่คือช่องว่างที่ใหญ่ที่สุดสำหรับ Hono คลาส Hono มีอยู่ router ของมันถูกเริ่มต้น แต่คุณไม่สามารถลงทะเบียนเส้นทางได้

### การเรียก Constructor ระดับโมดูล

tRPC กำหนดจุดเริ่มต้นเป็น:

export const initTRPC = new TRPCBuilder()

ในรันไทม์ `initTRPC` แสดงเป็น `typeof function` แทนที่จะเป็น `typeof object` — นิพจน์ `new TRPCBuilder()` ระดับโมดูลไม่ได้รัน constructor ดังนั้นสิ่งที่คุณได้คือการอ้างอิงไปยังคลาสแทนที่จะเป็นอินสแตนซ์ ซึ่งหมายความว่า `initTRPC.create()` และ `initTRPC.context()` เป็น `undefined` ทั้งคู่

### คุณสมบัติที่สืบทอด

`TRPCError extends Error` และในขณะที่ `err.code` (กำหนดโดยตรงบน `TRPCError`) ทำงาน `err.message` (สืบทอดจาก `Error`) ไม่สามารถเข้าถึงได้ สาย prototype สำหรับการค้นหา คุณสมบัติยังไม่ได้ถูกนำไปใช้อย่างเต็มที่

### สายโซ่ Constructor ที่ซับซ้อน

ฟังก์ชัน `createStrapi()` ของ Strapi ภายในเรียก `new Strapi(opts)` ซึ่งสืบทอดจาก `Container` (รองรับด้วย `Map`) เรียก `loadConfiguration()` วนซ้ำผ่าน providers และลงทะเบียน services สายโซ่ constructor ที่ลึกนี้สร้างค่าส่งคืนที่เป็น falsy — ไม่ crash แต่ก็ไม่สร้างอินสแตนซ์ที่ใช้งานได้เช่นกัน

### คลาส Built-in ของ Web API

เหล่านี้คือคำเตือน "Unknown class" ที่เหลือจากสามโปรเจกต์:

| คลาส | จำนวน |
| --- | --- |
| Response | 11 |
| TransformStream | 7 |
| ReadableStream | 5 |
| Request | 4 |
| Headers | 3 |
| Proxy | 2 |
| TextEncoderStream | 2 |
| WritableStream | 1 |
| DOMException | 1 |

`Response`, `Request`และ `Headers` เป็นตัวสำคัญสำหรับเฟรมเวิร์ก HTTP ใดๆ สิ่งเหล่านี้ต้องการการรองรับ codegen แบบ built-in คล้ายกับที่เรามีอยู่แล้วสำหรับ `Map`, `Set`, `RegExp`, `Buffer`, `AbortController` และอื่นๆ

## สิ่งที่สิ่งนี้บอกเรา

ข่าวดี: ไปป์ไลน์การคอมไพล์ของ Perry จัดการโค้ดเฟรมเวิร์กจริง โปรเจกต์หลายไฟล์ ที่มีสาย re-export ที่ซับซ้อน ลายเซ็นชนิดข้อมูลที่มีเจเนอริกหนัก ลำดับชั้นคลาส และการแก้ไขแพ็กเกจ monorepo ทั้งหมดผ่านไปจนถึงไบนารีที่ลิงก์แล้ว

ช่องว่างเป็นช่องว่างรันไทม์ ไม่ใช่ช่องว่างการคอมไพล์ งานที่เหลือคือ:

1.  **การกำหนดคุณสมบัติแบบไดนามิก** — จำเป็นสำหรับเฟรมเวิร์กที่ตั้งค่าเมธอดแบบโปรแกรม
2.  **นิพจน์เริ่มต้นระดับโมดูล** — `export const x = new Foo()` ต้องรัน constructor จริงๆ
3.  **สาย prototype** — คุณสมบัติและเมธอดที่สืบทอด
4.  **Built-ins ของ Web API** — `Response`, `Request`, `Headers` สำหรับเฟรมเวิร์ก HTTP

เหล่านี้เป็นปัญหาที่เป็นรูปธรรมและมีขอบเขตชัดเจน ไม่มีอันไหนที่ต้องการการเปลี่ยนแปลงสถาปัตยกรรม — เป็นส่วนขยายของรูปแบบที่ทำงานได้แล้วสำหรับกรณีที่ง่ายกว่า

เราจะทำงานต่อไปกับสิ่งเหล่านี้ เป้าหมายคือ `new Hono().get('/', (c) => c.text('hello'))` ที่สร้างเซิร์ฟเวอร์ HTTP ที่ทำงานได้ในไบนารีเนทีฟ
