---
title: "จากคอมไพเลอร์สู่ระบบนิเวศ: React, ฐานข้อมูล และ Cloud Build"
excerpt: "Perry เติบโตจากคอมไพเลอร์เป็นระบบนิเวศที่สมบูรณ์ perry/ui เป็นแกนหลัก, ORM ที่เข้ากันได้กับ Prisma สำหรับ MySQL/PostgreSQL/SQLite, push notification สากล, build แบบกระจายพร้อมการเผยแพร่บน App Store และเลเยอร์ความเข้ากันได้กับ React — ทั้งหมดในหนึ่งสัปดาห์"
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
เมื่อสัปดาห์ที่แล้ว Perry เป็นคอมไพเลอร์ที่มีชุดเครื่องมือ UI คุณสามารถเขียน TypeScript คอมไพล์เป็น ไบนารีเนทีฟ และส่งมอบบน 6 แพลตฟอร์ม นั่นคือเรื่องราวทั้งหมด วันนี้เรื่องราวใหญ่ขึ้น: Perry กำลังกลายเป็นระบบนิเวศ ORM ฐานข้อมูล 3 ตัว การแจ้งเตือนแบบพุชแบบครอบคลุม บิลด์แบบกระจายพร้อมการเผยแพร่ไปยัง App Store และ Play Store เลเยอร์ความเข้ากันได้กับ React และการตรวจสอบแอปอัตโนมัติ — ทั้งหมดมาถึงในสัปดาห์ที่ผ่านมา

โพสต์นี้ครอบคลุมสิ่งที่เปิดตัว ทำไมมันสำคัญ และโค้ดเป็นอย่างไร

## perry/ui: รากฐาน

ก่อนจะเข้าสู่ไลบรารีใหม่ๆ ควรเน้นย้ำสิ่งที่อยู่ตรงกลางของทุกอย่าง: `perry/ui` นี่คือชุดเครื่องมือ UI เนทีฟของ Perry เอง — วิดเจ็ตกว่า 20 ตัวที่คอมไพล์โดยตรงเป็นคอมโพเนนต์เนทีฟของแพลตฟอร์มบนทั้ง 6 เป้าหมาย ไม่ใช่ wrapper ไม่ใช่ชั้นนามธรรม ไม่ใช่เว็บวิว ทุก `Button` กลายเป็น `NSButton` บน macOS, `UIButton` บน iOS, `GtkButton` บน Linux, `android.widget.Button` บน Android และ `CreateWindowEx` control บน Windows

`perry/ui` คือพื้นผิว UI หลักและก้าวหน้าที่สุดของ Perry รวมถึงการจัดการสถานะแบบรีแอคทีฟ คอนเทนเนอร์เลย์เอาต์ (VStack, HStack, ZStack, SplitView) Canvas ที่ใช้การเร่งด้วยฮาร์ดแวร์ มุมมอง Table พร้อมการเรียงลำดับคอลัมน์ โมดูล `perry/system` สำหรับไดอะล็อกไฟล์ การเข้าถึง keychain การแจ้งเตือน และหลายหน้าต่าง — ทั้งหมดจาก TypeScript ทั้งหมดคอมไพล์เป็นการเรียก API ของแพลตฟอร์มโดยตรง แนวทาง UI อื่นๆ ทุกอย่างใน Perry รวมถึงเลเยอร์ความเข้ากันได้กับ React ถูกสร้างบน `perry/ui` และแมปกลับไปยังวิดเจ็ตของมัน

app.ts

import { Window, VStack, Button, Text, State } from 'perry/ui';

const count = new State(0);

const window = new Window({ title: "Counter" });

window.setContent(

new VStack({ children: \[

new Text({ text: count }),

new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),

\] })

);

อ็อบเจ็กต์ `State` แบบรีแอคทีฟเป็นพื้นฐานสำคัญ เมื่อค่า State เปลี่ยน เฉพาะวิดเจ็ตที่ผูกกับสถานะนั้นเท่านั้นที่อัปเดต — ไม่มี การเปรียบเทียบ DOM เสมือน ไม่มีการเรนเดอร์ใหม่ทั้งต้นไม้ ไม่มีการปรับยอดใดๆ มันเป็นเส้นทางที่ตรงที่สุดจาก TypeScript ไปยัง UI เนทีฟของแพลตฟอร์มที่มีอยู่

## ความเข้ากันได้กับ React: เลเยอร์บางๆ บน perry/ui

สำหรับนักพัฒนาที่มาจาก React `perry-react` ให้เลเยอร์ความเข้ากันได้ที่แมปโมเดลคอมโพเนนต์ของ React ไปยัง วิดเจ็ตของ `perry/ui` คุณสามารถใช้ `useState`, `useRef`, `useReducer` และ JSX — แล้ว Perry จะคอมไพล์เป็น วิดเจ็ตเนทีฟเดียวกันข้างใต้ มันเป็นสะพานเพื่อความสะดวก ไม่ใช่เอนจินเรนเดอร์แยกต่างหาก

counter.tsx

import React, { useState } from 'react';

function Counter() {

const \[count, setCount\] = useState(0);

return (

<div\>

<h1\>{count}</h1\>

<button onClick\={() => setCount(count + 1)}\>+1</button\>

</div\>

);

}

ภายใต้ฝากระโปรง ทุกเอลิเมนต์ JSX แมปไปยังวิดเจ็ต `perry/ui`: `<div>` กลายเป็น VStack, `<button>` กลายเป็น Button, `useState` รองรับโดย State แบบรีแอคทีฟของ Perry ยังอยู่ในช่วงเริ่มต้น — เฟส 1 พร้อมการเรนเดอร์ใหม่ทั้งต้นไม้และที่เก็บ hook แบบ global — แต่ พิสูจน์ว่าโค้ด React ที่มีอยู่สามารถเป้าหมายแพลตฟอร์มเนทีฟผ่าน Perry ได้ เรายังกำลัง สำรวจความเข้ากันได้กับ Angular และ Ionic ในแนวทางเดียวกัน

## ORM ฐานข้อมูล 3 ตัว: API แบบ Prisma, ประสิทธิภาพแบบเนทีฟ

หากคุณกำลังสร้างเซิร์ฟเวอร์หรือแอปเดสก์ท็อปที่สื่อสารกับฐานข้อมูล Perry ตอนนี้ ครอบคลุมด้วย ORM ที่เข้ากันได้กับ Prisma 3 ตัว: `perry-prisma` (MySQL), `perry-sqlite` (SQLite) และ `perry-postgres` (PostgreSQL) ทั้ง 3 ตัวเป็นตัวแทนที่ แบบ drop-in ของ `@prisma/client` API เดียวกัน รูปแบบคิวรีเดียวกัน แต่คอมไพล์เป็นโค้ดเนทีฟพร้อม FFI ตรงกับฐานข้อมูล — ไม่มีเอนจิน Prisma ไม่มี Node.js

database.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Same Prisma API — compiled to native SQL via Rust FFI

const users = await prisma.user.findMany({

where: { email: { contains: "@perry.dev" } },

orderBy: { createdAt: "desc" },

take: 10,

});

await prisma.post.create({

data: { title: "Hello", authorId: users\[0\].id },

});

ภายใต้ฝากระโปรง ORM แต่ละตัวเป็นฟรอนต์เอนด์ TypeScript ที่รองรับด้วยเลเยอร์ FFI ของ Rust โดยใช้ `sqlx` โฟลว์คิวรี: TypeScript ซีเรียลไลซ์คิวรีเป็น JSON ส่งผ่านขอบเขต FFI Rust สร้าง SQL แบบมีพารามิเตอร์ รันผ่านคอนเนกชันพูล และซีเรียลไลซ์ผลลัพธ์กลับ สกีมา Prisma จะถูกอ่านในเวลาบิลด์ — ไม่มีการพาร์สขณะรันไทม์

ทั้ง 3 การใช้งานแชร์โค้ดประมาณ 95% ความแตกต่างเป็นสิ่งที่คาดหวังได้: การ quote ตัวระบุ (`` `col` `` vs `"col"`), ไวยากรณ์ placeholder ( `?` vs `$1, $2`) และความหมายของทรานแซกชัน ทั้ง 3 ตัว รองรับพื้นผิว CRUD ทั้งหมดของ Prisma: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — พร้อม raw SQL, ทรานแซกชัน และตัวดำเนินการกรอง WHERE กว่า 10 ตัว

## perry-push: การแจ้งเตือนแบบพุชแบบครอบคลุม

`perry-push` เป็นไลบรารีเดียวที่จัดการการแจ้งเตือนแบบ พุชข้ามทุกแพลตฟอร์ม: APNs (iOS/macOS), FCM (Android), Web Push (เบราว์เซอร์) และ WNS (Windows) แต่ละ provider เป็นโมดูล FFI ของ Rust ที่มีฟังก์ชันเพียง 3 ตัว: `*_provider_new`, `*_provider_close` และ `*_send`

notify.ts

import { ApnProvider } from 'perry-push/apn';

import { FcmProvider } from 'perry-push/fcm';

const apn = new ApnProvider({ teamId, keyId, key });

const fcm = new FcmProvider({ serviceAccount });

// Unified result type for all providers

const result = await apn.send({

deviceToken: token,

title: "New message",

body: "You have a new reply",

});

การเข้ารหัสจัดการโดย `ring` — JWT แบบ ES256 สำหรับ APNs และ VAPID, RS256 สำหรับ บัญชีบริการ FCM, AES-GCM สำหรับการเข้ารหัส payload ของ Web Push ทั้งหมดคอมไพล์เป็นโค้ดเนทีฟ ไม่มี `node-gyp` ไม่มีการพึ่งพา OpenSSL

## Perry Hub + Builders: บิลด์คลาวด์แบบกระจาย

นี่คือการเคลื่อนไหวด้านโครงสร้างพื้นฐาน `perry-hub` เป็น เซิร์ฟเวอร์จัดการบิลด์ — ตัวมันเองคอมไพล์จาก TypeScript โดย Perry — ที่จัดการพูล ของ worker บิลด์ คุณพุชโปรเจกต์ ฮับส่งไปยัง worker ที่เหมาะสมตาม แพลตฟอร์มเป้าหมาย และ worker คอมไพล์ ลงนาม และเผยแพร่แอปของคุณตามต้องการ

ปัจจุบันมี worker 2 ตัว: builder macOS (จัดการเป้าหมาย macOS, iOS และ Android) และ builder Linux (จัดการ Linux และ Android) ทั้งสองเป็นไบนารี Rust ที่เชื่อมต่อกับฮับ ผ่าน WebSocket ดาวน์โหลด tarball ซอร์ส รันคอมไพเลอร์ Perry และอัปโหลดอาร์ทิแฟกต์กลับ

-   **การลงนามโค้ด** — การรับรอง Apple สำหรับ macOS, provisioning profile สำหรับ iOS, การลงนาม keystore Android
-   **การเผยแพร่ App Store** — อัปโหลดโดยตรงไปยัง App Store Connect และ Google Play Store
-   **การจัดการอาร์ทิแฟกต์** — ไบนารีที่บิลด์แล้วอัปโหลดไปยังฮับพร้อมการล้างข้อมูลตาม TTL
-   **การจัดการไลเซนส์** — จำกัดอัตราต่อไลเซนส์ คิวตามลำดับความสำคัญ (ระดับ pro ได้รับความสำคัญก่อน)

ฮับเองเป็นกรณีศึกษาที่น่าสนใจ เป็นไฟล์ TypeScript ประมาณ 1,500 บรรทัดที่คอมไพล์เป็น ไบนารีเนทีฟ 2 MB โดย Perry รัน Fastify บนพอร์ต 3456 สำหรับ HTTP และ `ws` บนพอร์ต 3457 สำหรับ WebSocket สถานะทั้งหมดอยู่ ในหน่วยความจำพร้อมการเก็บข้อมูลแบบ JSON — ไม่มีฐานข้อมูลภายนอก เป็นเซิร์ฟเวอร์ประเภทที่ คุณสามารถ deploy ด้วย `scp` และไฟล์ systemd unit

## perry-verify: การตรวจสอบแอปอัตโนมัติ

`perry-verify` เป็นบริการ HTTP แบบสแตนด์อโลนที่ รับไบนารีที่คอมไพล์แล้วและการกำหนดค่า รันไปป์ไลน์การตรวจสอบ และส่งคืน ผลลัพธ์ pass/fail แบบมีโครงสร้างพร้อมภาพหน้าจอ มันเปิดแอป รันโฟลว์การยืนยันตัวตน (แบบกำหนดได้หรือช่วยเหลือด้วย AI) ตรวจสอบสถานะ และจับภาพหลักฐาน

มีอะแดปเตอร์แพลตฟอร์มสำหรับ macOS (ผ่าน API การเข้าถึง), Linux (AT-SPI) และ stub สำหรับ iOS Simulator และ Android Emulator เลเยอร์ AI ใช้ Claude สำหรับการยืนยันตัวตนสำรอง และการตรวจสอบสถานะเมื่อการตรวจสอบแบบกำหนดได้ไม่สามารถทำได้ ออกแบบมา เพื่อแทรกเข้าไปในไปป์ไลน์บิลด์ของฮับเป็นขั้นตอนหลังบิลด์: คอมไพล์ ลงนาม ตรวจสอบ เผยแพร่

## Pry ส่งมอบทุกที่

[Pry](/th/blog/building-pry/) ตัวดู JSON เนทีฟที่เราสร้างเป็นตัวอย่างของ Perry ตอนนี้ส่งมอบบน 5 แพลตฟอร์ม อยู่บน [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) และ [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry) พร้อมไบนารีเนทีฟสำหรับ Linux และ Windows โค้ดเบส TypeScript เดียวกัน จุดเข้าเฉพาะแพลตฟอร์ม 5 จุด ไบนารีเนทีฟ 5 ตัว เป็นหลักฐานที่เป็นรูปธรรมที่สุด ว่าแนวทางทั้งหมดนี้ใช้งานได้ตั้งแต่ต้นจนจบ — จากซอร์ส TypeScript ถึงรายการบน App Store

## ทั้งหมดนี้หมายความว่าอะไร

คอมไพเลอร์น่าสนใจ ระบบนิเวศมีประโยชน์ ในสัปดาห์ที่ผ่านมา Perry เปลี่ยนจาก "คุณสามารถคอมไพล์ TypeScript เป็นเนทีฟ" เป็น "คุณสามารถสร้างแอปเต็มรูปแบบพร้อม UI เนทีฟ ฐานข้อมูล Prisma การแจ้งเตือนแบบพุช และบิลด์ที่เผยแพร่อัตโนมัติไปยัง App Store"

ชิ้นส่วนต่างๆ กำลังเริ่มเชื่อมต่อกัน:

-   **perry/ui** คือเส้นทางที่ตรงที่สุดจาก TypeScript ไปยัง UI เนทีฟของแพลตฟอร์ม — สถานะแบบรีแอคทีฟ วิดเจ็ตกว่า 20 ตัว ไม่มีชั้นนามธรรม
-   **perry-prisma/sqlite/postgres** หมายความว่าโค้ดฐานข้อมูลที่มีอยู่ย้ายได้พร้อมการเปลี่ยนแปลงน้อยที่สุด
-   **perry-push** หมายความว่าการแจ้งเตือนแบบพุชเนทีฟโดยไม่ต้องมีไลบรารีเฉพาะแพลตฟอร์ม
-   **perry-hub + builders** หมายความว่าคุณสามารถจาก `perry publish` ไปถึง App Store ในขั้นตอนเดียว
-   **perry-verify** หมายความว่าการทดสอบอัตโนมัติของผลลัพธ์ที่คอมไพล์แล้ว ไม่ใช่แค่ซอร์ส
-   **perry-react** หมายความว่านักพัฒนา React สามารถเข้าสู่ Perry โดยใช้รูปแบบที่คุ้นเคย ทั้งหมดแมปไปยัง perry/ui ข้างใต้

สิ่งเหล่านี้ไม่ใช่ทฤษฎี ทุกไลบรารีที่ระบุไว้ที่นี่มีโค้ดที่ทำงานได้ การทดสอบ และ เอกสารประกอบ หลายตัวถูกใช้งานจริงในโปรดักชันแล้ว — เว็บไซต์ landing ของ Perry เอง รันบนเซิร์ฟเวอร์ Fastify ที่คอมไพล์ด้วย Perry และ Pry เปิดให้บริการบน 2 แอปสโตร์

## ขั้นตอนถัดไป

แผนงานในระยะใกล้:

-   **การขยาย perry/ui** — ลากและวาง ป้ายกำกับการเข้าถึง เมนูบริบทที่กำหนดเอง พื้นฐานเลย์เอาต์เพิ่มเติม
-   **การรวม perry-verify** — การตรวจสอบอัตโนมัติในไปป์ไลน์บิลด์
-   **ความเข้ากันได้ของเฟรมเวิร์ก** — ปรับปรุงเลเยอร์ React, Angular และ Ionic เป็นทางเข้าสู่ perry/ui
-   **รองรับ regex เต็มรูปแบบ** — เอนจิน regex ที่เข้ากันได้กับ ECMAScript คอมไพล์เป็นเนทีฟ

ติดตามความคืบหน้าบน [GitHub](https://github.com/PerryTS/perry) หรือดู [แผนงาน](/th/roadmap/) สำหรับภาพรวมทั้งหมด
