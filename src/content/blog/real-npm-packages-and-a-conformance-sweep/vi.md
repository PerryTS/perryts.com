---
title: "Các package npm thực tế giờ compile được: axios, zod, express — và một lượt quét conformance"
excerpt: "Khoảng 270 release từ v0.5.875 đến v0.5.1146 không phải về một benchmark — chúng là về việc làm cho các package npm thực tế compile và chạy. axios, zod v4, express, fastify, và hono giờ hoạt động; parity test262 nhảy vọt (String 60→79%, Array 61→72%); Windows chuyển sang Fluent với Mica; và DatePicker + drag & drop đáp xuống mọi nền tảng."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
Bài trước khép lại ở **v0.5.875** với câu chuyện GC — khép lại khoảng cách mà benchmark của aya\_koto phơi bày. Bài đó nói về việc thắng một benchmark. Bài này nói về một loại công việc khác: khoảng **270 release giữa v0.5.875 và v0.5.1146**, được tung ra trong khoảng bốn tuần, gần như không cái nào là tiêu đề benchmark. Chủ đề chuyển từ “chạy nhanh trên một microbenchmark” sang **“làm cho TypeScript thực tế và các package npm thực tế thực sự compile và chạy.”** Cộng thêm một cuộc đại tu hình ảnh Windows toàn diện và một đống widget mới dọc đường đi.

Đây là những gì đã ra mắt, nhóm theo mục đích thực sự của nó.

## Các package npm thực tế giờ compile được

Sợi chỉ đơn lớn nhất xuyên qua cửa sổ này là một lượt quét để làm cho các package npm phổ biến compile thành binary native và vượt qua các test hành vi — không chỉ “link không lỗi,” mà chạy và cho ra đúng output. Danh sách giờ hoạt động qua `perry.compilePackages` bao gồm **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, và Colyseus**.

Mỗi cái thất bại vì lý do riêng của nó, và mỗi bản sửa là câu chuyện nhỏ riêng:

-   **zod v4** crash với `Cannot read properties of undefined (reading 'onattach')`. Nguyên nhân gốc (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `new F()` với `F` là một hàm được import từ module khác lặng lẽ tạo ra một object rỗng — thân constructor không bao giờ chạy, nên mọi check kiểu `$ZodCheckMinLength` trở về bị tước mất thuộc tính `_zod` của nó.
-   **axios + jose** cần crypto và nén mà Perry chưa có: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` cho AES-GCM, và `randomFillSync` (v0.5.972–976).
-   **fastify** đang deadlock trên một timeout polling một giây trong `wait_for_promise`; chúng tôi thay nó bằng một condvar wait và làm cho các promise bị reject hiện ra dưới dạng `HTTP 500` thay vì treo (v0.5.912).
-   **@hono/node-server** không đọc được body POST — `c.req.text()` / `.json()` / `.formData()` trả về rỗng trên POST/PUT cho đến một bản sửa parent-registration trong v0.5.1142.
-   **chalk, ms, debug, express** đều vấp cùng một hình dạng: một *giá trị có thể gọi với các thuộc tính gắn kèm* (`chalk.red`, `express()` cộng `express.Router`). Ba biến thể của khuôn mẫu đó được sửa qua v0.5.935 và lượt quét npm xung quanh, cộng thêm `util.inherits` + một scaffold stream prototype để gỡ chặn express (v0.5.990).
-   **dayjs**, được ship dưới dạng một bundle đã minify, kích hoạt dispatch method prototype kiểu JS-classic (`Class.prototype.m = fn`) mà Perry lower sai (v0.5.924/932).

Bên dưới tất cả những thứ đó là phần làm cho các package mà Perry *không thể* compile native vẫn chạy được: **runtime V8-fallback** trở nên thực sự trong cửa sổ này. ModuleLoader của nó giờ đọc từ một module map nhúng, nên một binary fallback vẫn **tự chứa** — không có `node_modules` rời rạc lúc runtime (v0.5.994). `createServer` bắc cầu tới một hyper server thực (v0.5.999), và các global Web Fetch `Response` / `Request` / `Headers` tồn tại trong đường fallback (v0.5.1006). Và **`import()` động tại compile-time** — chuỗi literal `await import('./foo.ts')` được giải tại lúc build — cuối cùng đã đáp xuống (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## Một lượt quét conformance test262

Sợi chỉ chủ đạo còn lại là conformance. Chúng tôi chạy các lượt tập trung đối chiếu với các radar tập con test262 và lay chuyển kim chỉ trên các built-in mà mã thực tế dựa vào mạnh nhất:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

Cú nhảy String đến từ việc cho mọi method `String.prototype` dispatch generic-`this` và sửa coercion index của `slice`/`substring`. Cú nhảy Array là `thisArg` trên các callback dense-array (`forEach`/`map`/`filter`/…), `ToLength` kiểu array-like, thứ tự thao tác theo spec, và validation không-tham-số. Destructuring thu được parameter-destructuring trên các method plain, generator, async-generator, static, và private của class.

Bên cạnh các con số tiêu đề, một cái đuôi dài về tính đúng đắn đã đáp xuống: `JSON.parse` giờ ném ra một `SyntaxError` thực (không phải `TypeError`) và từ chối các token thừa; reviver của nó đi theo thuật toán spec `InternalizeJSONProperty`; `Object.prototype.toString` gắn brand đúng cho typed array, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; `RegExp.prototype.toString` trả về `/source/flags`; các async generator có đúng ngữ nghĩa `yield`\-awaits-operand. Đây là các radar tập con, không phải toàn bộ suite — Perry vẫn đang leo — nhưng cú leo tháng này dốc.

## Windows chuyển sang Fluent

Windows được đại tu hình ảnh (chuỗi [#4681](https://github.com/PerryTS/perry/issues/4681)). Các cửa sổ Perry giờ chọn dùng chrome DWM hiện đại theo mặc định — **nền Mica**, góc bo tròn, và thanh tiêu đề nhận biết theme — và các control phổ biến render qua **comctl32 v6** thay vì các mặc định thời Windows 95. Window proc giờ xử lý `WM_DPICHANGED`, nên một cửa sổ giữ được độ sắc nét khi bạn kéo nó giữa các màn hình có scaling lẫn lộn thay vì bị kéo giãn bitmap.

Quan trọng là, không gì trong số này tái xuất hiện regression cũ [#1542](https://github.com/PerryTS/perry/issues/1542) “vùng đen sau khi resize”: vùng client vẫn được vẽ đục, và blur-through Mica/Acrylic toàn khung vẫn là một tùy chọn bật tường minh qua `app.setVibrancy(...)`. Cũng có một scaffold backend `--target windows-winui` mới (WinUI 3) cho các ứng dụng muốn ngăn xếp hiện đại trọn vẹn, và một bản sửa nhỏ nhưng thực làm cho `perry compile main.ts -o main` tạo ra `main.exe` trên Windows để PowerShell thực sự khởi chạy được nó (v0.5.1146).

## Widget mới, mọi nền tảng

Hai widget đáp xuống chỉ trong ngày cuối cùng, và cả hai trải khắp mọi nền tảng UI mà Perry nhắm tới:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — một control ngày kiểu field, gọn gàng: `NSDatePicker` trên macOS, `UIDatePicker` (.compact) trên iOS/visionOS, `SysDateTimePick32` trên Windows, `android.widget.DatePicker` trên Android, GTK4 trên Linux. Một bề mặt TS trên tất cả chúng.
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — bất kỳ widget nào cũng có thể là đích thả và nguồn kéo cho text/file/URL, ánh xạ tới `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit), và `View.setOnDragListener` (Android).

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Sớm hơn trong cửa sổ, kệ widget cũng được lấp đầy trên cả desktop và mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, và một ImageGallery có thể vuốt — mỗi cái được hậu thuẫn bởi control native thực trên mọi nền tảng. HarmonyOS (ArkTS) có được Chart và TreeView (v0.5.893), hai widget cuối cùng nó cần để đạt tương đương với các nền tảng khác.

## GC, nội bộ, và ổn định

Hầu hết 270 release đó không phải tiêu đề — chúng là các bản sửa bug và nội bộ, và đó chính là điểm của giai đoạn này. Vài cái đáng nêu ra:

-   **GC tiếp tục.** Công việc free-list có điều kiện từ bài GC tiếp tục ổn định, và một lớp bug sắc bén được đóng: các Promise được bắc cầu native giờ được **ghim lại khi đang bay trên một tokio worker** để GC không thể sweep chúng trước khi resolution đáp xuống (v0.5.923). Nếu bạn chạy một async fetch dưới tải và thấy một lần thu gom ma, đó là cái này.
-   **Mô hình bộ nhớ được ghi tài liệu.** Giờ có một bài đào sâu `internals/memory-model.md` — NaN-boxing, generational GC, shadow stack, và write barrier — được nối vào trang docs (v0.5.933).
-   **Một làn sóng các bản sửa ổn định codegen** được lượt quét npm phơi bày: một arrow `const` ở mức module được gọi bên trong một bước async được resume không còn SIGSEGV (v0.5.953), `try { await rejected } catch { return X }` không còn treo mãi mãi (v0.5.870), và một nhúm crash `js_is_truthy` / raw-pointer-range mà các bundle thực vấp phải.

## Việc nhà Apple

Nhỏ hơn nhưng thực: `perry setup ios --development` giờ cấp provision cho các build phát triển (v0.5.1023), và đường build/link cross-library của Apple được khử trùng lặp và làm cho khả chuyển theo độ rộng con trỏ (v0.5.1121/1125) — đó là thứ đã gỡ chặn ma trận publish npm / Homebrew / APT / winget vốn đang bị kẹt.

## Điều này đưa mọi thứ đến đâu

Cá cược phía sau Perry luôn là “TypeScript native” chỉ có ý nghĩa nếu TypeScript *thực sự* chạy — không phải một tập con đồ chơi, mà là các package thực tế mà người ta `npm install`. Tháng này hầu hết là công việc đó: ít hơn một con số duy nhất để khoe, nhiều hơn một cú đẩy dài, không hào nhoáng để khép lại khoảng cách giữa “compile được” và “hoạt động được.” Các radar conformance và các test parity npm là bảng điểm chúng tôi đang theo dõi lúc này, và chúng tôi sẽ tiếp tục đăng các con số — cái tốt và cái còn chưa hoàn hảo.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
