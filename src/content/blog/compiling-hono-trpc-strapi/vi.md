---
title: "Biên dịch Hono, tRPC và Strapi thành binary gốc"
excerpt: "Perry giờ đây biên dịch ba framework TypeScript lớn — Hono, tRPC và Strapi — thành tệp thực thi ARM64 gốc. Biên dịch trong chưa đầy một giây, tạo binary dưới 2 MB và chạy không lỗi."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry giờ đây biên dịch ba framework TypeScript lớn — Hono, tRPC, và Strapi — thành các tệp thực thi ARM64 native. Chúng biên dịch trong dưới một giây, tạo ra binary dưới 2 MB, và chạy không bị crash.

Bài viết này trình bày những gì hoạt động, những gì chưa hoạt động, và những gì chúng tôi đã học được khi đẩy trình biên dịch đối mặt với mã thực tế.

## Các dự án

Chúng tôi chọn ba dự án này vì chúng đại diện cho các hình thái khác nhau của TypeScript:

-   **Hono** — Một web framework nhẹ (29 module). Sử dụng nhiều generics, kế thừa class, gán phương thức động, và các Web API `Request`/`Response`. Cấu trúc export sử dụng named re-export qua barrel file.
-   **tRPC** — Một RPC framework type-safe (52 module). Chuỗi re-export sâu qua 4+ cấp, builder pattern với thu hẹp kiểu generic, khởi tạo class ở phạm vi module, và streaming qua Web Streams.
-   **Strapi** — Một headless CMS core (4 module được biên dịch native, phần còn lại được giải quyết dưới dạng external). Monorepo với phân giải workspace package, namespace re-export (`export * as X`), pattern service container với `Map`, và factory function.

## Kết quả biên dịch

Cả ba đều biên dịch thành binary native với không lỗi biên dịch nào:

| Dự án | Module được biên dịch | Kích thước binary | Thời gian biên dịch |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

Mỗi module nguồn đi qua toàn bộ pipeline: phân tích SWC, hạ thấp HIR, sinh mã Cranelift, phát ra object file, và liên kết native. Thời gian biên dịch bao gồm tất cả — từ phân tích cú pháp đến liên kết cuối cùng.

Để so sánh, `tsc --noEmit` chỉ riêng trên tRPC đã mất vài giây. Perry biên dịch 52 module thành binary native đã liên kết trong dưới một giây.

## Những gì hoạt động tại Runtime

### Khởi tạo Class xuyên Module

Đây là cột mốc quan trọng. Cấu trúc export của Hono trông như thế này:

hono export chain

// hono/src/hono.ts

export class Hono extends HonoBase { ... }

// hono/src/index.ts

import { Hono } from './hono'

export { Hono }

`export { Hono }` đó là một named re-export — không phải `export * from` hay `export { Hono } from './hono'`. Trong HIR của Perry, điều này trở thành `Export::Named`, không phải `Export::ReExport` hay `Export::ExportAll`. Trước đây, việc lan truyền class của trình biên dịch chỉ theo các chuỗi `ExportAll` và `ReExport`, nên import `Hono` từ `index.ts` âm thầm thất bại — tra cứu class không tìm thấy, và `new Hono()` trả về `undefined`.

Bây giờ Perry truy ngược `Export::Named` qua các import của module để tìm định nghĩa class gốc và lan truyền nó.

## Những gì chưa hoạt động

Chúng tôi cụ thể ở đây vì các khoảng trống nói lên nhiều như các thành công.

### Gán thuộc tính động trên `this`

Constructor của Hono thiết lập các handler phương thức HTTP một cách động. Perry chưa hỗ trợ`this[variable] = value`, nên các phương thức này bị thiếu. Đây là khoảng trống lớn nhất cho Hono.

### Gọi Constructor ở phạm vi Module

tRPC định nghĩa điểm khởi đầu là `export const initTRPC = new TRPCBuilder()`. Tại runtime, `initTRPC` xuất hiện dưới dạng `typeof function` thay vì `typeof object` — biểu thức `new TRPCBuilder()` ở phạm vi module không thực thi constructor.

### Thuộc tính kế thừa

`TRPCError extends Error`, và trong khi `err.code` (định nghĩa trực tiếp trên `TRPCError`) hoạt động, `err.message` (kế thừa từ `Error`) không truy cập được. Chuỗi prototype cho tra cứu thuộc tính chưa được triển khai đầy đủ.

## Điều này cho chúng tôi biết gì

Tin tốt: pipeline biên dịch của Perry xử lý mã framework thực. Các dự án đa file với chuỗi re-export phức tạp, type signature nặng generics, phân cấp class, và phân giải package monorepo đều biên dịch thành binary đã liên kết.

Các khoảng trống là ở runtime, không phải ở biên dịch. Công việc còn lại là:

1.  **Gán thuộc tính động** — cần cho các framework thiết lập phương thức theo chương trình
2.  **Biểu thức khởi tạo ở phạm vi module** — `export const x = new Foo()` cần thực sự thực thi constructor
3.  **Chuỗi prototype** — thuộc tính và phương thức kế thừa
4.  **Built-in Web API** — `Response`, `Request`, `Headers` cho HTTP framework

Đây là những vấn đề cụ thể, có phạm vi rõ ràng. Không có vấn đề nào đòi hỏi thay đổi kiến trúc — chúng là phần mở rộng của các pattern đã hoạt động cho các trường hợp đơn giản hơn.

Chúng tôi sẽ tiếp tục cải thiện. Mục tiêu là `new Hono().get('/', (c) => c.text('hello'))` tạo ra một HTTP server hoạt động trong binary native.
