---
title: "Tối ưu hóa mọi thứ: Một tuần, 68 bản phát hành, và JSON nhanh hơn 547 lần"
excerpt: "Perry v0.5.13 → v0.5.80 trong bảy ngày. JSON.parse thu hẹp khoảng cách 547 lần với Node. mimalloc trở thành allocator toàn cục. Inline cache, shape transition, typed Buffer slot, bitwise i32-native, scalar replacement, và event loop native giữ cho máy chủ Fastify và WebSocket luôn hoạt động."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
Bài blog trước được phát hành cùng Perry v0.5.12. Hôm nay chúng tôi đang ở v0.5.80. Đó là **68 bản phát hành patch trong bảy ngày**, gần như hoàn toàn tập trung vào một điều: biến mọi slow path còn lại thành fast path.

Việc chuyển sang LLVM ở v0.5.0 đã phục hồi về ngang bằng với Cranelift vào v0.5.12. Đó là kết thúc của một câu chuyện và khởi đầu của một câu chuyện khác. Giờ đây LLVM nhìn thấy mọi thứ. Câu hỏi không còn là “tại sao cái này chậm?” mà bắt đầu trở thành “tại sao cái này chưa nhanh?” — đó là một câu hỏi dễ giải quyết hơn nhiều.

Bài viết này là một chuyến tham quan qua tuần vừa rồi. JSON nhận được tốc độ tăng 547 lần. mimalloc trở thành allocator toàn cục. Truy cập property có được monomorphic inline cache. Buffer có được các slot pointer có kiểu với metadata `noalias`. Các server Fastify và WebSocket không còn crash sau một phút nữa. Và các benchmark lại dịch chuyển.

## 1\. JSON: đóng lại khoảng cách 547 lần

Tại v0.5.29, JSON.parse của Perry trên một mảng 20 bản ghi **chậm hơn Node 547 lần**. Đến v0.5.46 con số đó là 1,3 lần. Đây là delta lớn nhất trong tuần, và đáng để đi qua chi tiết vì mọi tối ưu hóa khác trong bài này đều là một biến thể của cùng một chủ đề: đừng làm công việc mà bạn không cần phải làm.

Parser ban đầu cấp phát một Vec cho mỗi property, một Vec key cho mỗi object, và một thread-local được bảo vệ bởi RefCell cho key cache. Nó copy mọi string. Nó hash lại mọi tên field. Nó xây dựng một object shape hoàn toàn mới cho mỗi bản ghi, ngay cả khi cả 20 bản ghi có chính xác cùng field theo cùng thứ tự. Parser của Node xử lý việc này bằng cách nhận ra mẫu và chia sẻ một shape duy nhất cho tất cả bản ghi. Perry thì không.

Bản sửa được thực hiện trong bốn bước:

1.  **Key interning qua một `PARSE_KEY_CACHE` thread-local** (v0.5.45). Bản ghi đầu tiên cấp phát N string key; các bản ghi từ 2 đến 20 không cấp phát gì cả. Key lặp lại được phân giải về cùng một pointer, điều này làm cho chúng có thể sử dụng làm key tra cứu shape-cache mà không cần strcmp.
2.  **Chia sẻ shape qua transition cache** (v0.5.45). Các object được xây dựng bởi `js_object_set_field_by_name` đi qua cùng một transition graph. Khi schema lặp lại, pointer `keys_array` được chia sẻ, và đó là điều mà polymorphic inline cache cần để hit.
3.  **Parse string zero-copy + xây dựng object tăng dần** (v0.5.46). `parse_string_bytes` giờ trả về `ParsedStr::Borrowed(&[u8])` khi không có backslash escape — đây là trường hợp phổ biến cho mọi key và hầu hết giá trị. `parse_object` ghi trực tiếp field thay vì gom vào một Vec trước.
4.  **Ngãn GC trong lúc parse** (v0.5.60, đóng #59). Parse một mảng lớn cấp phát hàng nghìn object nhỏ trong một vòng lặp chặt. Mỗi cái đều kích hoạt kiểm tra ngưỡng GC. Đặt một cờ “parsing in progress” hoãn collection cho đến khi parse trả về — cùng kích thước heap hiệu dụng, ít nhánh kế toán hơn nhiều.

Rồi đến stringify. JSON.stringify trên các mảng đồng nhất — cùng shape, hàng triệu lần — đang thực hiện lặp property đầy đủ cho mỗi object, đối với một mảng shape-ổn định thì đó là sự lãng phí thuần túy. Bản sửa năm bước cũng đóng phần lớn khoảng cách đó:

-   v0.5.62: fast path itoa / ryu cho số, kiểm tra tham chiếu vòng dựa trên độ sâu thay vì HashSet.
-   v0.5.63: guard `toJSON` + key cache bền vững + inline dispatch (ba chi phí mỗi lời gọi cộng dồn lại).
-   v0.5.65: template stringify cho shape đồng nhất + fast path escape ASCII. Khi mọi phần tử có cùng shape, khung key/colon/comma được tính trước một lần.
-   v0.5.70, v0.5.72, v0.5.75: cache template shape mỗi lời gọi, đóng khoảng cách GC dành dư sau parse, loại bỏ overhead cố định mỗi lời gọi còn lại.
-   v0.5.79: path giá trị nhỏ. Số, boolean, và string ngắn đi qua một path trực tiếp không thiết lập bất cứ bộ máy object nào.

Kết quả tích lũy: một pipeline JSON **kém Node 547 lần** đầu tuần giờ đây khoảng **kém 1,3 lần trên parse và cạnh tranh trên stringify**, trên các workload thực tế.

## 2\. Câu chuyện allocator

Perry cấp phát rất nhiều. Mỗi object literal, mỗi array literal, mỗi phép nối string, mỗi closure. Allocator là điểm nóng, và trong phần lớn v0.5 nó là system allocator mặc định của Rust cộng với một arena thread-local cho các giá trị tồn tại ngắn.

v0.5.67 thay thế allocator toàn cục bằng **mimalloc**. Đây là thay đổi một dòng trong Cargo.toml trả lại ngay lập tức trên bất kỳ workload nào thực hiện nhiều cấp phát nhỏ — đó là mọi chương trình TypeScript. v0.5.66 đi trước nó bằng cách hợp nhất tất cả trạng thái thread-local của `gc_malloc` thành một truy cập TLS duy nhất mỗi lời gọi, để đường đi vào mimalloc rẻ nhất có thể.

v0.5.68 đi xa hơn với **string cấp phát từ arena**. Chuỗi tồn tại ngắn (kết quả nối trung gian, các mảnh `split()`, nháp parser) bỏ qua toàn bộ allocator toàn cục và rơi vào một bump arena theo thread được reset tại các ranh giới tự nhiên. Đối với parsing JSON, riêng điều này đã là một chiến thắng hai con số phần trăm.

Và hai tối ưu hóa không cấp phát gì cả:

-   **Thay thế scalar cho object không thoát** (v0.5.17, sau đó object literal vào v0.5.76). Nếu một object không bao giờ rời khỏi hàm bao quanh nó, nó không cần tồn tại. Các field của nó trở thành các biến cục bộ thuần túy. LLVM xử lý điều này ngay khi bạn ngừng che giấu object đằng sau một lời gọi allocator không minh bạch.
-   **Thay thế scalar cho mảng không thoát** (v0.5.73). Cùng ý tưởng — nếu mảng không thoát, các phần tử của nó trở thành giá trị SSA và toàn bộ cấp phát biến mất.

Cụ thể cho đường đi array literal, v0.5.69 đã thêm **fast path kích thước chính xác** (bỏ qua bộ máy tăng capacity khi kích thước đã biết tại thời điểm biên dịch), và v0.5.74 inline IR bump-allocator cho array literal nhỏ để LLVM có thể thấy cấp phát, gấp lại, nâng ra, hoặc loại bỏ nó. Các benchmark nặng về mảng tiến thêm một bước.

Khuôn mặt cuối cùng, v0.5.25 sửa một bug âm thầm hơn: `gc_malloc` không kích hoạt collection trên đường đi của chính nó, vì vậy các workload nặng malloc có thể tăng heap vô hạn trước khi bất cứ thứ gì kiểm tra. v0.5.61 thêm kích thước bước thích ứng vào ngưỡng, đó là điều bạn thực sự muốn: kiểm tra rẻ khi heap nhỏ, ít hơn khi heap lớn.

## 3\. Truy cập property đã có một inline cache thực sự

Mọi engine JavaScript hiện đại đều có một polymorphic inline cache (PIC) cho truy cập property. Trong phần lớn chuỗi v0.5 của Perry, PropertyGet đi qua một tra cứu shape-table với hash thread-local. Điều đó ổn cho mã lạnh. Không ổn khi 95% các lần đọc property tại một call site thấy cùng một shape, đó gần như luôn luôn.

v0.5.44 đưa vào một **monomorphic inline cache** cho `PropertyGet`. Mỗi site PropertyGet nhận một mục cache theo call site: một pointer shape kỳ vọng và một offset field. Đường hit là một so sánh đơn cùng một lần tải được đánh chỉ mục. Đường miss rơi xuống một helper chậm để cập nhật cache.

```
; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont
```

v0.5.51 thêm một **cache shape-transition theo content-hash** cho các phép ghi property động. Hai object tăng cùng field theo cùng thứ tự hash về cùng một transition, nên chúng kết thúc chia sẻ cùng một shape — và điều đó có nghĩa là phía đọc của PIC thực sự hit.

v0.5.55 bóc lớp truy cập TLS cuối cùng ra khỏi transition cache. v0.5.46 sửa một bug trong handler miss của PIC nơi các object có >8 field đã đọc vượt qua các slot inline vào bộ nhớ chưa khởi tạo (đóng #55). v0.5.78 thêm một guard để ngăn PIC của PropertyGet đánh chỉ mục vào các receiver không phải pointer như số thuần — điều có thể xảy ra khi type refinement quá lạc quan và đây là một trong những vấn đề ổn định cuối cùng trong IC.

Hiệu ứng ròng: mã nặng về property — trong thực tế có nghĩa là hầu hết TypeScript — nhanh hơn khoảng 2-3 lần so với một tuần trước, chỉ từ IC mà thôi.

## 4\. Số nguyên, phép bitwise, và mẫu `| 0`

NaN-boxing làm cho mọi số đều là f64. Lập trình viên TypeScript viết `x | 0` để ép ngữ nghĩa số nguyên. V8 đã dành mười lăm năm để làm điều đó rẻ. Tuần này Perry đã đuổi kịp.

Ngân xếp các thay đổi, theo thứ tự:

-   **v0.5.48**: `sdiv` cho `(int / const) | 0`. LLVM gấp thành `smulh + asr`, khoảng ~2 chu kỳ so với ~10 cho `fdiv`.
-   **v0.5.48**: `@llvm.assume` trên giới hạn Uint8ArrayGet. Thay thế kim cương nhánh+phi kiểm tra giới hạn bằng một khối cơ bản duy nhất mà vectorizer có thể suy luận.
-   **v0.5.49**: sửa các phép bitwise với NaN/Infinity để tạo ra 0 theo spec ToInt32. Tính đúng đắn lên trước.
-   **v0.5.50**: `toint32_fast` bỏ qua guard NaN/Inf 5 lệnh khi giá trị đã biết là hữu hạn. Cộng `alwaysinline` trên các helper nhỏ và phát hiện clamp.
-   **v0.5.52**: nhắm trực tiếp các hàm clamp bằng intrinsics `smin`/`smax`. Clamp là mẫu số nguyên phổ biến nhất sau increment.
-   **v0.5.53**: `x | 0` và `x >>> 0` trên một giá trị đã biết là hữu hạn trở thành noop — chỉ `fptosi + sitofp`, không có guard nào cả.
-   **v0.5.56**: các phép bitwise i32 native; chỉ mục và giá trị i32 trong Uint8ArrayGet/Set.
-   **v0.5.58, v0.5.60**: `Math.imul` được lower thành phép nhân i32 native thay vì đường polyfill. Phát hiện polyfill nhận ra các shim `Math.imul` do người dùng viết và thay thế chúng.
-   **v0.5.59**: inlining init hàm thuần + seeding integer-local. Phân tích integer cục bộ trong hàm được thấy qua các ranh giới lời gọi khi callee nhỏ và thuần.
-   **v0.5.37-v0.5.40**: fast path số học nguyên cho mẫu accumulator. Vòng lặp cổ điển `for (...) acc += f(i)` ở lại i32 từ đầu đến cuối khi kiểu cho phép.

v0.5.41 là cái tinh tế. Khi codegen thấy một `const K: number[][] = [[...], ...]` ở cấp module, nó lower toàn bộ thành một hằng số `[N x i32]` phẳng trong `.rodata`. `K[y][x]` trở thành một `getelementptr + load i32` duy nhất. Kết hợp với cầu nối phân tích integer trong v0.5.43, đây là cái đã cho `image_conv` (blur Gaussian 5×5 trên khung RGB 4K) một **tăng tốc 3 lần trong một bản phát hành**.

## 5\. Buffer và Uint8Array

Các workload nhị phân — crypto, xử lý ảnh, parsing, networking — sống trong Buffer và Uint8Array. v0.5.64 cho chúng **các slot pointer có kiểu cộng với metadata `noalias`**. Nơi mà một Buffer trước đây là một double được NaN-box trong một `alloca double`, giờ nó là một pointer `i64` thuần trong một `alloca i64`, với chú thích LLVM nói với optimizer “pointer này không alias các pointer khác trong phạm vi.” Điều đó mở khoá sắp xếp lại load/store, vectorization, và cấp phát thanh ghi mà optimizer sẽ từ chối làm.

v0.5.80 đóng vấn đề đúng đắn cuối cùng ở đây: một bộ đếm `alias-scope` buffer cấp module đang được reset theo hàm, có thể trong những trường hợp hiếm khiến LLVM suy luận qua các phạm vi không nên chia sẻ một scope ID. Giờ bộ đếm ở cấp module và câu chuyện `noalias` hoạt động không kê hở.

v0.5.53 làm `Uint8ArraySet` không nhánh — một store có mask thay vì một if/else ghi 0 khi vượt giới hạn. v0.5.54 thêm **Two-Way indexOf** cho các mẫu dài hơn và một `split` cấp phát từ arena, cùng nhau đóng phần lớn khoảng cách trên parsing Buffer nặng về string.

## 6\. String: ASCII là fast path

String JavaScript là UTF-16, nhưng hầu hết string thực tế (key, identifier, HTTP header, khung JSON) là ASCII. v0.5.71 thêm một **`charCodeAt` và `codePointAt` O(1) cho string ASCII** — không quét UTF-16, chỉ một lần tải byte. v0.5.20 đã làm `indexOf`, `slice`, và `charAt` bỏ qua quét UTF-16 trên ASCII.

Một ghi chú về tính đúng đắn trong cùng bản phát hành đó: `String.length` giờ trả về các đơn vị mã UTF-16 (spec ECMAScript) thay vì số byte. Đó là một bug ẩn nấp nơi `"café".length` trả về 5 thay vì 4.

## 7\. Các server giờ thực sự vẫn chạy

Công việc ít hấp dẫn nhất trong tuần cũng là công việc dễ thấy nhất đối với người dùng: làm cho các server kiểu Node chạy lâu dài — Fastify, ws, http, net — không crash sau vài phút.

Tất cả crash đều có chung một nguyên nhân gốc: GC không biết về các closure listener. Khi bạn viết `wss.on('message', handler)`, closure capture các biến, sống dưới dạng field bên trong một cell được GC cấp phát. Nếu bộ quét gốc GC không biết đến thăm các cell đó, các capture của chúng bị thu hồi và sự kiện message tiếp theo dereference bộ nhớ đã giải phóng.

-   **v0.5.26**: quét gốc các closure listener sự kiện `net.Socket` (đóng #35).
-   **v0.5.27**: mở rộng tới `ws`, `http`, `events`, `fastify`.
-   **v0.5.28**: đăng ký các biến toàn cục cấp module làm gốc GC (đóng #36). Bug về vòng đời ở một tầng cao hơn.
-   **v0.5.21**: an toàn `gc()` bên trong các handler request Fastify/WebSocket — lời gọi GC tường minh đang chạy trong khi các handler request giữ pointer vào arena (đóng #31).

Cùng với công việc GC, v0.5.20 phát hành một **event loop chính** — một cái thực sự, không phải placeholder — giữ cho các server WebSocket và dựa trên timer tồn tại thay vì thoát sau khi lời gọi sync cuối cùng trả về (tham chiếu #28). Đây là bản sửa có tác động lớn nhất đối với bất kỳ ai cố gắng chạy Perry làm một HTTP server production. Fastify giờ vẫn chạy. Các server WebSocket giờ vẫn chạy.

v0.5.19 sửa lỗi không khớp SysV AMD64 ABI cho args/returns JSValue FFI — một vấn đề trên Linux nơi các lời gọi FFI native có thể làm hỏng tham số một cách im lặng. v0.5.18 thêm dispatch native cho `axios` (get/post/put/delete/patch), bao gồm `response.status` và `response.data`. v0.5.30 sửa dispatch `fastify request.header()` và `request.headers[]`, vốn đã trả về undefined cho tra cứu không phân biệt chữ hoa chữ thường.

## 8\. `@perry/postgres`: driver làm cho tất cả những điều này trở nên cần thiết

Nhiều công việc trong tuần được thúc đẩy bởi một workload: làm một [driver Postgres](https://github.com/PerryTS/postgres) tương thích đầy đủ với Node chạy trên Perry-native. Driver có khả năng TLS, có một registry codec cross-module, hỗ trợ cancel/close/notify, và giờ benchmark so với `pg`, `postgres.js`, và `tokio-postgres`.

Công việc hiệu năng ở phía driver đi song song với phía compiler:

-   **Nâng codec theo cột** và bỏ các copy Buffer theo cell. BigInt(string) cho int8 để tránh cấp phát trung gian.
-   **Constructor Row động theo shape** cho các row dạng object. Nếu truy vấn của bạn luôn trả về cùng các cột, driver xây dựng một constructor row chuyên biệt theo shape lần đầu và tái sử dụng nó — kết hợp với PIC của compiler, điều này làm cho truy cập field trên row nhanh như truy cập field trên bất kỳ object nào khác.
-   **Tùy chọn opt-out `parseTypes: 'minimal'`** cho caller muốn string thô cho int8/numeric/date.

Đây là vòng lặp phản hồi tích cực mà compiler luôn được định để cho phép. Một driver thực tạo ra những nghẽn cổ chai thực. Nghẽn cổ chai được nộp dưới dạng issue GitHub với một bản reproducer một dòng. Một tuần sửa compiler sau, driver nhanh hơn và compiler cũng nhanh hơn cho mọi người khác. Đó là toàn bộ kế hoạch, nén lại thành bảy ngày.

## 9\. Các bản sửa tính đúng đắn đáng nhắc tên

Công việc hiệu năng làm nổi lên các vấn đề tính đúng đắn theo cách náo vét một con sông làm nổi lên các xe đẩy siêu thị. Một danh sách không đầy đủ:

-   **Promise.race** đang đọc `.value` khi bị reject thay vì `.reason`, nên reject bị nuốt trong im lặng (v0.5.13-v0.5.14).
-   **Promise.any** giờ ném một `AggregateError` đúng khi tất cả promise đầu vào reject. Đã thêm `Promise.withResolvers` và sửa thứ tự `queueMicrotask`.
-   **`[..."hello"]`** giờ tạo ra một mảng ký tự thay vì một object hỏng (đóng #16).
-   **Số học BigInt và ép kiểu `BigInt()`** (đóng #33). Fast path bigint i64 (v0.5.29) làm cho trường hợp phổ biến trở nên rẻ.
-   **Buffer.indexOf / Buffer.includes** với tham số byte số đang so sánh với pointer buffer thay vì giá trị byte (đóng #56).
-   **Các phép bitwise với NaN/Infinity** tạo ra 0 theo spec ToInt32 (đóng #57).
-   **Windows x86\_64**: năm bản sửa cụ thể cho nền tảng — `localtime`, tìm kiếm `clang`, và một vài điều chỉnh codegen — đưa Windows x86\_64 trở lại màu xanh (v0.5.72).

## 10\. Các con số

Benchmark tiêu đề từ bài viết trước là `factorial` nhanh hơn Node 24,6 lần. Con số đó không thay đổi. Cái đã dịch chuyển trong tuần này là mọi thứ xung quanh nó:

| Khối lượng công việc| v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (schema 20 bản ghi) | chậm hơn Node 547 lần | chậm hơn Node 1,3 lần | ~420x |
| image\_conv (blur 4K 5×5) | 1.980ms | 457ms | 4.3x |
| Mã nặng property (PIC hit) | đường cơ sở| 2-3x | 2-3x |
| Fibonacci(40)| 401ms | 309ms | 1.3x |
| Uptime Fastify dưới tải | ~60s trước khi crash | vô thời hạn | ∞ |

Bộ 15 benchmark đầy đủ so với Node vẫn là 14 thắng và 1 hòa — cùng bảng như bài viết trước, với các con số tốt hơn một chút trên toàn bộ. Dịch chuyển thực sự trong tuần này là trên các workload không có trong bộ đó: JSON, xử lý ảnh, server chạy lâu dài. Đó là nơi các khoảng cách tồn tại, và đó là những gì đã đóng lại.

## 11\. Tiếp theo là gì

Benchmark duy nhất chúng tôi vẫn đang đuổi theo là `image_conv` so với Zig. Perry ở 457ms; Zig ở 246ms. Khoảng cách đó mang tính kiến trúc, không phải cấp pass tối ưu hóa, và nó nằm ở ba nơi:

1.  **Buffer local có kiểu**. Phần lớn công việc Buffer đã được thực hiện trong tuần này, nhưng các tham số hàm và biến cục bộ kiểu buffer vẫn unbox trên mỗi truy cập. Cách tiếp cận slot `i64` chúng tôi dùng cho biến đếm vòng lặp cần mở rộng sang buffer.
2.  **Tách vòng lặp biên/trong**. Vòng lặp blur clamp mọi pixel, bao gồm cả 99,9% pixel không cần. Tách thành vùng biên (clamp) và vùng trong (không clamp) cho phép LLVM vectorize phần trong bằng `ld3`/`st3` NEON.
3.  **Hash FNV-1a ABI kép**. Helper hash được gọi qua ABI NaN-box. Chuyên biệt nó thành i64 thô vào/ra cho các hot path là vài giờ công việc sẽ trả lãi trên mọi workload nặng về hash.

Những việc đó được theo dõi trong `PERF_ROADMAP.md`. Mong được thấy chúng trong chu kỳ tiếp theo.

## Tổng kết

Mẫu của tuần này — 68 bản phát hành patch, gần như toàn bộ về hiệu năng, một khoảng cách JSON đi từ 547 lần xuống 1,3 lần — là điều xảy ra khi bạn vượt qua đến bên tốt của ngọn đồi LLVM-cutover. Optimizer giờ là đồng minh thay vì một bức tường, và hầu hết những gì còn lại là công việc nhỏ, cụ thể, đo lường được: tìm một slow path, tìm hiểu tại sao optimizer không thể nhìn xuyên qua, lộ cấu trúc ra, đo lại. Không commit nào trong số này là kỳ lạ. Chúng chỉ được áp dụng ở nơi cần.

Nếu bạn muốn thử bất kỳ điều gì trong số này:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Mã nguồn: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Các issue, reproducer, và benchmark chưa đủ nhanh: hãy tiếp tục gửi đến. Tốc độ này chỉ hoạt động vì các báo cáo bug đủ cụ thể để biến thành reproducer một dòng. Mọi commit trong bài viết này có một `#N` đính kèm là có lý do.

— Ralph
