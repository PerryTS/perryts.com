---
title: "เผยแพร่แอปสำหรับ Apple Watch โดยเฉพาะบน App Store เมื่อวิธีอื่นใช้ไม่ได้"
excerpt: "วิธีอัปโหลดแอป watchOS แบบอิสระไปยัง App Store ที่มีในเอกสารล้วนใช้ไม่ได้ ทั้ง altool, iTMSTransporter, xcodebuild และแม้แต่ Organizer ของ Xcode 26 ก็ปฏิเสธ watchOS นี่คือวิธีแก้ที่ไม่มีในเอกสารแต่ใช้ได้จริง และยังคง arm64_32 สำหรับนาฬิการุ่นเก่า: ห่อแอปด้วย iOS stub ที่กำหนด ITSWatchOnlyContainer แล้วอัปโหลดผ่าน iTMSTransporter"
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** เป็นเครื่องวัดระดับเสียงสำหรับ Apple Watch — แอป watchOS แบบสแตนด์อโลนที่ไม่มี iPhone เทียบเท่า ซึ่งรวบรวมจากแอปเดียว ไฟล์ TypeScript ที่มี Perry การสร้างและรันบนสมาร์ทวอทช์เป็นส่วนที่เราคาดว่าจะทำได้ยาก ส่วนที่มีค่าใช้จ่ายจริงต่อวันคือการนำมัน *เข้าสู่ App Store* ทุกเส้นทางการอัปโหลดที่จัดทำเป็นเอกสารจะปฏิเสธแอป watchOS แบบสแตนด์อโลน และวิธีแก้ปัญหาชั่วคราวที่ใช้งานได้นั้นแทบไม่มีการเขียนบันทึกไว้เลย โพสต์นี้คือหน้าที่ขาดหายไป

เวอร์ชันสั้น: หากต้องการเผยแพร่แอปเฉพาะสมาร์ทวอทช์ คุณจะต้องรวมแอปไว้ใน iOS *container stub* ตั้งค่าสถานะ `ITSWatchOnlyContainer` และอัปโหลดด้วย `iTMSTransporter` — ไม่ใช่ Xcode ไม่ใช่ `altool` เวอร์ชันยาวมีกับระเบิดสามลูกซึ่งแต่ละลูกต้องเดินทางไปกลับยังเซิร์ฟเวอร์ของ Apple เพื่อค้นหา

## แอป

dB Meter เป็นแอป `WKWatchOnly` โดยทำงานบนสมาร์ทวอทช์ด้วยตัวเอง ไม่จำเป็นต้องจับคู่แอป iPhone Perry คอมไพล์ TypeScript ตรงไปยังไบนารี watchOS แบบเนทีฟ และกระจายเป็นชิ้น **universal** — `arm64` สำหรับซีรีส์ 9/10/11 และ Ultras รวมถึง `arm64_32` (ILP32: รีจิสเตอร์ 64 บิต, พอยน์เตอร์ 32 บิต) สำหรับ Series 4 ถึง 8 และ SE ส่วนที่สองนั้นมีความสำคัญ หากไม่มีมัน ทุกอย่างตั้งแต่ Series 4 ไปจนถึง SE 2 ก็ไม่สามารถติดตั้งแอปได้ การรักษา `arm64_32` ให้คงอยู่ กลับกลายเป็นข้อจำกัดที่ตัดทอนวิธีแก้ปัญหาที่ชัดเจน

## จะไม่มีอะไรอัปโหลดแอป smartwatch แบบสแตนด์อโลน

`.ipa` สำหรับสมาร์ทวอทช์เท่านั้นคือชุดที่แอประดับบนสุดประกาศ `CFBundleSupportedPlatforms = [WatchOS]` เครื่องมือนำส่งบรรทัดคำสั่งของ Apple ไม่ทราบว่าต้องทำอย่างไร:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

ดังนั้นคุณจึงหันมาใช้ Xcode แต่ `xcodebuild -exportArchive` ด้วย `method: app-store-connect` ล้มเหลวในระหว่างการแจงนับวิธีการ และเหตุผลก็เป็นคำแนะนำ — บน Xcode 26 รีจิสทรีวิธีการแจกจ่ายมี *no App Store เลย* สำหรับไฟล์เก็บถาวร watchOS:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

Organizer GUI จะแสดงไทล์สามไทล์ที่เหมือนกันทุกประการ — การทดสอบรีลีส, องค์กร, การแก้ไขจุดบกพร่อง และ "กำหนดเอง" ที่ไม่มีประโยชน์เลย เฉพาะกิจ องค์กร การพัฒนา ไม่มี App Store ในเวอร์ชันของ Xcode ที่ติดตั้งอยู่ในปัจจุบัน ไม่มีวิธีใดที่รองรับในการส่งแอปสมาร์ทวอทช์แบบสแตนด์อโลนไปที่ App Store Connect ผ่านประตูหน้าบ้านของ Apple

## กับดักสหาย

ช่องทางหลบหนีที่น่าดึงดูดใจคือการหยุดการเป็นสมาร์ทวอทช์เท่านั้น จัดส่งแอป iOS จริงที่ *ฝัง* แอปสมาร์ทวอทช์ไว้ที่ `Payload/YourApp.app/Watch/` ซึ่งเป็นวิธีส่งมอบแอปสมาร์ทวอทช์มานานหลายปี ที่อัปโหลดได้อย่างหมดจดด้วย `altool --type ios` เนื่องจากบันเดิลระดับบนสุดเป็นแอป iOS ปกติ

มันยังนำคุณเข้าสู่ปัญหาสองประการด้วย ประการแรก App Store Connect จะเห็นแอป iPhone และ **ต้องการ iPhone ภาพหน้าจอ** และแอป iPhone ที่ไม่ทำอะไรเลยนอกจากพูดว่า "เปิดสิ่งนี้บนสมาร์ทวอทช์ของคุณ" เป็น ผู้สมัครสำหรับการปฏิเสธฟังก์ชันการทำงานขั้นต่ำ 4.2 ประการที่สอง และร้ายแรงสำหรับเรา: ไบนารี iOS *ระดับบนสุด* อาจไม่มีส่วน `arm64_32` เครื่องมือตรวจสอบของ Apple ปฏิเสธ:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

ดังนั้น โครงสร้างที่แสดงร่วมจึงบังคับให้คุณถอด `arm64_32` และเปลี่ยนเป็นรุ่น arm64 เท่านั้น ซึ่งจะดรอปสมาร์ทวอทช์ Series 4–8 และ SE ทุกเรือน รวมถึง Series 7 ที่เรากำลังทดสอบด้วย กับดักสหายแลกเปลี่ยนการสนับสนุนสมาร์ทวอทช์รุ่นเก่าของคุณเพื่อการอัปโหลดที่ใช้งานได้ เราไม่ต้องการการซื้อขายนั้น

## คอนเทนเนอร์เฉพาะสมาร์ทวอทช์เท่านั้น

คำตอบที่แท้จริงจะเก็บแอป smartwatch ไว้เฉพาะ smartwatch เท่านั้น *และ* จะเก็บ `arm64_32` คุณซ้อนแอปสมาร์ทวอทช์ไว้ใน iOS **container stub** ขนาดเล็ก และคุณทำเครื่องหมาย stub ดังนั้น App Store Connect จะถือว่าทั้งหมดเป็นผลิตภัณฑ์สำหรับสมาร์ทวอทช์เท่านั้น ปุ่ม Info.plist สองปุ่มทำหน้าที่ตั้งค่าสถานะ และปุ่มเหล่านี้คือเคล็ดลับทั้งหมด:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` บอกกับ App Store Connect "ชุด iOS นี้เป็นเพียงเครื่องมือในการจัดส่งสำหรับแอปสมาร์ทวอทช์ที่อยู่ภายในเท่านั้น" ปุ่มเดียวนั้นทำให้ข้อกำหนดภาพหน้าจอ iPhone หายไป — ร้านค้าจัดประเภทผลิตภัณฑ์เป็นสมาร์ทวอทช์เท่านั้น `LSApplicationLaunchProhibited=true` บอกว่า stub ไม่เคยเปิดตัว ดังนั้นจึงไม่จำเป็นต้องเป็นแอปจริง เพียงแต่ต้องมีอยู่เพื่อให้แพลตฟอร์มระดับบนสุดอ่านเป็น iOS และเครื่องมือนำส่งก็หยุดบ่น แอปสมาร์ทวอทช์ที่อยู่ภายในจะเก็บ `WKWatchOnly=true` และ *no* `WKCompanionAppBundleIdentifier` — มันไม่ได้เป็นเพื่อนกับ stub แต่ stub เป็นเหมือนเสื้อคลุมล้อมรอบ

คีย์ Info.plist ที่เหลือของ stub เป็นแบบสำเร็จรูปที่เครื่องมือตรวจสอบความถูกต้องยืนยัน: `UIDeviceFamily=[1,2]` ทั้งสี่ `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]` และ — เนื่องจาก stub คือ arm64 — `UIRequiredDeviceCapabilities=[arm64]` ต้นขั้วไม่มีไอคอนเลย แอปสมาร์ทวอทช์พกพาไปด้วย

จากนั้น คุณอัปโหลดด้วย `iTMSTransporter` ซึ่งมีโหมด `-assetFile` พอใจแล้วที่บันเดิลระดับบนสุดคือ iOS:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

บิลด์ดังกล่าวเข้าสู่ App Store Connect ในฐานะบิลด์ watchOS, `arm64_32` ครบถ้วน และเวอร์ชันหยุดขอภาพหน้าจอ iPhone

## กับระเบิด 3 ลูกระหว่างทาง

แต่ละรายการเป็นการอัปโหลดที่ล้มเหลวซึ่งกลับมาจากเครื่องมือตรวจสอบความถูกต้องของ Apple ไม่ใช่สิ่งที่เครื่องมือในเครื่องตรวจพบได้:

1.  **stub ต้องไม่ใช่ไบนารีที่เพิ่งสร้างด้วย `swiftc`** การคอมไพล์ stub แบบง่ายของ UIKit ด้วย iOS SDK จาก Xcode ที่ติดตั้งอยู่ทำให้ถูกปฏิเสธว่า *“สร้างด้วย SDK หรือ Xcode เวอร์ชันที่ไม่รองรับ”* (ข้อผิดพลาด 90534) เพราะ SDK นั้นถูกมองว่าเป็นรุ่นก่อนเปิดตัว เรามีไบนารี iOS จริงที่ใช้เวอร์ชัน SDK ที่ยอมรับได้อยู่แล้ว นั่นคือผลลัพธ์ `--target ios` ของ Perry ซึ่งลิงก์ runtime ของตัวเองและบันทึกเวอร์ชัน SDK ที่เปิดตัวแล้ว จึงผ่านการตรวจสอบในจุดที่ `swiftc` ไม่ผ่าน ตัว stub เป็นหน้าจอ “นี่คือแอป Apple Watch” ที่คอมไพล์ด้วย Perry และจะไม่ถูกเรียกใช้งานจริงเพราะ `LSApplicationLaunchProhibited`

2.  **ไอคอนจำเป็นต้องมี dict ไม่ใช่เฉพาะคีย์** แอป smartwatch ไม่ผ่านการตรวจสอบด้วย *“ค่าสำหรับ CFBundleIconName หายไป”* แม้ว่าจะมีการตั้งค่า `CFBundleIconName` และ `Assets.car` ถูกตั้งค่าไว้ ปัจจุบัน เครื่องมือตรวจสอบความถูกต้องต้องการโครงสร้างแบบเต็ม: `CFBundleIconName` *และ* พจนานุกรม `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}` ตั้งค่าเฉพาะคีย์ระดับบนสุดและยืนยันว่าคีย์หายไป

3.  **`WKWatchOnly` ถูกปฏิเสธในบันทึกที่กระจาย iOS บิวด์แล้ว** หากบันทึก App Store ของคุณเคยจัดส่ง iOS บิลด์ การอัปโหลดเฉพาะนาฬิกาอัจฉริยะเท่านั้นถูกปฏิเสธ และคุณต้องมีบันทึกแอปใหม่ (ซึ่ง ASC API ไม่สามารถสร้างได้ — `POST /apps` ส่งคืน 403 ดังนั้นคุณจึงสร้างมันใน UI ของเว็บ) บันทึกที่มีเพียงบิลด์ *un-distributed* ก็ถือว่าใช้ได้


ค่าคงที่เล็กๆ สองสามค่า: stub และแอป smartwatch ต้องแชร์ `CFBundleVersion` เดียวกัน และคุณต้องลงชื่อเข้าออก — แอป smartwatch ก่อน จากนั้นจึง stub — ด้วย `--generate-entitlement-der` และ `get-task-allow=false`.

## เหตุใดจึงเป็นเรื่องราวของPerry

ไม่มีการวางท่อคอนเทนเนอร์แบบใดที่ Perry เจาะจง — โดยจะนำไปใช้กับแอป watchOS แบบสแตนด์อโลนใดๆ ก็ตาม ไม่ว่าจะสร้างแอปใดก็ตาม แต่ Perry คือสาเหตุที่ dB Meter เป็นไฟล์ TypeScript ขนาด 280 บรรทัดไฟล์เดียวที่คอมไพล์เป็นไบนารีของสมาร์ทวอทช์แบบเนทีฟตั้งแต่แรก และ Perry คือสิ่งที่สร้าง SDK-clean iOS stub ที่มีข้อผิดพลาด 90534 ที่ผ่านมาเมื่อ `swiftc` ไม่สามารถทำได้ การคอมไพล์สำหรับ `arm64_32` ยังทำให้เกิดข้อผิดพลาดของโค้ดเจนจริง ๆ อีกด้วย — ฟิลด์สตริงอ็อบเจ็กต์ที่พิมพ์อ่านกลับเป็นขยะลอยบน ILP32 เนื่องจากการเข้าถึงคลาสฟิลด์แบบอินไลน์อบในขนาดส่วนหัวของวัตถุ 64 บิต (24 ไบต์) แทนที่จะเป็น 20 ที่รับรู้เป้าหมาย — สิ่งที่คุณพบก็ต่อเมื่อคุณยืนกรานที่จะสนับสนุนนาฬิการุ่นเก่าๆ แทนที่จะทิ้งมันไปอย่างเงียบๆ

ไปป์ไลน์ทั้งหมด — TypeScript ไปเป็นไบนารี่สากล watchOS ไปยังบิวด์ App Store ที่ใช้สมาร์ทวอทช์เท่านั้นที่ลงนามแล้ว ซึ่งขณะนี้อยู่ในสคริปต์ที่เราสามารถเรียกใช้ใหม่ได้ หากคุณกำลังเปิดตัวแอปสมาร์ทวอทช์แบบสแตนด์อโลนและ Xcode บอกคุณว่าทำไม่ได้ แอปจะทำได้: ห่อมัน ตั้งค่าสถานะ `ITSWatchOnlyContainer` และมอบให้กับ `iTMSTransporter`
