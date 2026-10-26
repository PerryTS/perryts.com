---
title: "Từ Cranelift đến LLVM: Điều gì đã hỏng và chúng tôi sửa nó thế nào"
excerpt: "Quá trình chuyển backend của Perry từ Cranelift sang LLVM đã hoàn tất. Lần chuyển đổi đầu tiên khiến benchmark chậm đi 70 lần — đây là những gì đã hỏng, và sáu tối ưu hóa có mục tiêu đã sửa nó."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Đính chính (tháng 9 năm 2026):** Benchmark bên dưới được gọi là “factorial” đã bị đặt tên sai: nó chỉ cộng dồn `i % 1000` trong một vòng lặp và không tính giai thừa nào cả. Con số 24,6 lần đến từ một lần chạy Node.js cũ không thể tái tạo; trên harness được công bố hiện tại, kết quả hòa với Node.js (93 ms so với 95 ms). Đây là một microbenchmark cho đường nhanh của phép chia lấy dư số nguyên, không phải thước đo hiệu năng TypeScript thông thường. Kết quả bên dưới được giữ lại như một bản ghi lịch sử. Số liệu hiện tại, bao gồm cả các benchmark mà Perry thua, có trong [README của Perry](https://github.com/PerryTS/perry#performance).

Quá trình chuyển backend của Perry từ Cranelift sang LLVM đã hoàn tất. Kể từ v0.5.12, LLVM là backend sinh mã duy nhất, và Perry giờ đây đánh bại Node.js trên mọi benchmark — với biên độ từ 1,7x đến 24,6x (với hai kết quả hòa).

Hành trình đến đây không hề thẳng tắp. Lần chuyển đổi ban đầu trong v0.5.0 khiến một số benchmark **chậm hơn 70 lần** so với phiên bản Cranelift mà nó thay thế. Bài viết này là phiên bản chi tiết về những gì đã xảy ra, tại sao chúng tôi vẫn chuyển, cái gì hỏng, cái gì sửa được, và các con số trông như thế nào ở phía bên kia.

Nếu bạn đang xây dựng compiler, đánh giá các codegen backend, hoặc chỉ đơn giản tò mò tại sao “chuyển sang LLVM” hiếm khi đơn giản như âm thanh của nó, bài này dành cho bạn.

## Phần 1: Tại Sao Phải Chuyển?

Perry biên dịch TypeScript trực tiếp thành mã máy gốc. Không Node, không V8, không Electron, không WebView. Lời đề nghị là “viết TypeScript, xuất binary gốc,” và toàn bộ giá trị đề xuất sẽ sụp đổ nếu binary đó thực sự không nhanh.

Trong các phiên bản minor đầu tiên của Perry, codegen backend là [Cranelift](https://cranelift.dev/). Cranelift tuyệt vời — nó là codegen đằng sau wasmtime, được sử dụng bởi baseline JIT của SpiderMonkey, và là công cụ được chọn khi bạn cần biên dịch nhanh, có thể dự đoán với câu chuyện nhúng sạch sẽ. Cho một dự án đang bootstrap ngôn ngữ mới, đó là điểm khởi đầu đúng đắn.

Nhưng hai điều cuối cùng đã đẩy chúng tôi rời khỏi nó.

### 1\. Trần của optimizer

Cranelift có chủ đích là một compiler tối ưu hóa nhanh, đơn tầng. Nhiệm vụ của nó là “tạo mã khá tốt một cách nhanh chóng,” không phải “tạo mã tốt nhất có thể với thời gian không giới hạn.” Đó là tradeoff đúng cho JIT. Đó là tradeoff sai cho một AOT compiler mà toàn bộ điểm bán là hiệu năng gốc.

LLVM đã có hơn hai thập kỷ công sức đổ vào middle-end. Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis — không có thế giới thực tế nào mà một dự án nhỏ hơn có thể bắt kịp. Nếu Perry muốn tuyên bố “nhanh hơn Node,” chúng tôi cần bộ máy đó.

### 2\. Vấn đề arm64\_32

Yếu tố búc bách trực tiếp là Apple Watch. `arm64_32` là một ABI mà Apple giới thiệu cho Series 4 trở lên — lệnh 64-bit, pointer 32-bit. Cranelift không hỗ trợ nó, và không có con đường thực tế nào để nó được thêm vào. Để Perry có thể tuyên bố “9 nền tảng từ một codebase” một cách đáng tin, watchOS không thể thiếu. LLVM hỗ trợ `arm64_32` ngay lập tức.

Khi chúng tôi chấp nhận rằng *một số* target sẽ yêu cầu LLVM, việc duy trì hai backend trở nên không thể. Hai backend nghĩa là hai bộ bug, hai bộ optimization pass, hai ma trận kiểm thử, hai baseline hiệu năng. Câu trả lời thành thật là: chọn một.

Chúng tôi chọn LLVM.

## Phần 2: Vài Lời Về Cranelift

Trước khi đi tiếp: bài viết này không phải là phê phán Cranelift. Cranelift là một kiệt tác kỹ thuật, và nếu bạn đang xây dựng JIT, sandbox runtime, hoặc bất cứ thứ gì mà độ trễ biên dịch quan trọng hơn throughput cao nhất, nó nên ở gần đầu danh sách của bạn. wasmtime sử dụng nó vì lý do chính đáng. Bytecode Alliance đã làm công việc mẫu mực.

Nhu cầu của Perry đơn giản là khác. Chúng tôi biên dịch trước, giao binary một lần, và người dùng chạy nó hàng triệu lần. Sự bất đối xứng đó — biên dịch hiếm khi, thực thi luôn luôn — chính xác là chế độ mà optimizer nặng hơn của LLVM tự hoàn vốn. Công cụ khác cho công việc khác.

## Phần 3: Thảm Họa Chuyển Đổi

v0.5.0 là bản phát hành đầu tiên với LLVM là backend duy nhất. Chúng tôi kỳ vọng một hồi quy nhỏ về thời gian biên dịch và cải thiện đáng kể về hiệu năng runtime. Chúng tôi nhận được điều ngược lại của cái thứ hai.

Đây là bảng mà tôi không muốn đăng vào lúc đó:

| Benchmark | Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| method\_calls | 16ms | 1,084ms | chậm hơn 68 lần |
| object\_create | 5ms | 318ms | chậm hơn 64 lần |
| matrix\_multiply | 61ms | 184ms | chậm hơn 3 lần |
| math\_intensive | 370ms | 131ms | nhanh hơn 2,8 lần |
| nested\_loops | 32ms | 57ms | chậm hơn 1,8 lần |
| fibonacci(40) | 505ms | 1,156ms | chậm hơn 2,3 lần |

Một số workload nhanh hơn. Phần lớn tệ đi đáng kể. `method_calls` — một trong những benchmark quan trọng nhất vì nó đại diện cho cách sử dụng class TypeScript đúng chuẩn — tệ hơn gần 70 lần so với những gì chúng tôi phát hành hai bản trước đó.

### Thực sự đã sai ở đâu

Perry sử dụng **NaN-boxing** để biểu diễn giá trị. Mỗi giá trị TypeScript là một word 64-bit. Số f64 được lưu trực tiếp; mọi thứ khác (object, string, boolean, undefined, null) được mã hóa vào các bit không sử dụng của quiet NaN theo IEEE 754.

Ưu điểm: số không tốn chi phí. Không boxing, không tagging, không cấp phát bộ nhớ cho phép toán.

Nhược điểm: mỗi thao tác trên giá trị không phải số yêu cầu thao tác bit để giải nén, xử lý và đóng gói lại. Nếu các chuỗi này tồn tại dưới dạng IR inline trong codegen, optimizer có thể hợp nhất và đơn giản hóa chúng. Nếu chúng tồn tại dưới dạng **lời gọi đến hàm helper runtime**, optimizer thấy một lời gọi không minh bạch và bỏ cuộc.

Backend Cranelift của chúng tôi đã phát triển một số lượng lớn các inline lowering cho các thao tác nóng — tải property, dispatch method, cấp phát object, phép toán số nguyên trên giá trị được tag f64. Việc chuyển sang LLVM, với mục tiêu tạo ra mã *đúng* trước, đã chuyển hướng gần như tất cả qua các helper runtime trong `perry-runtime`. Mỗi helper là một lệnh `call` trong LLVM IR.

LLVM tuyệt vời, nhưng nó không thể inline một hàm mà nó chưa bao giờ thấy body. `perry-runtime` được biên dịch riêng, liên kết cuối cùng, và từ góc nhìn optimizer, mọi lời gọi helper là hộp đen. Kết quả là các vòng lặp nóng mà backend Cranelift đã biên dịch thành ~5 lệnh toán học inline giờ đây được biên dịch thành lời gọi hàm — lưu thanh ghi, thiết lập stack frame, đủ thứ — lặp lại hàng triệu lần.

Đó là nguồn gốc của 70x. Không phải codegen tệ. Mà là **ranh giới inlining** tệ.

## Phần 4: Cách Sửa

Công việc để phục hồi và vượt qua các con số Cranelift chia thành khoảng sáu danh mục. Không cái nào kỳ lạ. Phần lớn là các tối ưu hóa compiler kiểu sách giáo khoa chỉ cần được áp dụng đúng chỗ.

### 1\. Inline bump allocator cho cấp phát object

`object_create` là hồi quy tệ nhất sau `method_calls`. Đường đi cũ gọi `js_object_alloc_class_with_keys` cho mỗi `new Point()` — một lời gọi hàm, một truy cập arena thread-local, một tra cứu shape-cache, và ghi header GC + header object.

Cách sửa: emit bump allocation **inline** trong LLVM IR. Mỗi hàm cấp phát object nhận một pointer được cache đến struct `InlineArenaState` thread-local. Việc cấp phát trở thành:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

Fast path là ~13 lệnh IR inline mà LLVM có thể thấy, sắp xếp và nâng ra ngoài vòng lặp. `object_create` giảm từ 318ms xuống 9ms.

### 2\. Biến đếm vòng lặp i32

NaN-boxing nghĩa là mọi số TypeScript là f64. Bao gồm cả biến đếm vòng lặp. Một vòng lặp `for (let i = 0; i < 100_000_000; i++)` với biến induction f64 là thảm họa: tăng f64, so sánh f64, chuyển đổi f64-sang-i64 mỗi lần truy cập mảng.

Codegen phát hiện các for-loop mà biến induction chứng minh được là giá trị nguyên và cấp phát một **slot stack i32 song song**. Điều kiện vòng lặp chuyển từ `fcmp` sang `icmp slt i32`, loại bỏ hoàn toàn biến đếm f64.

Điều này đưa `array_write` từ 11ms xuống 3ms, `nested_loops` từ 18ms xuống 9ms, và `array_read` từ 11ms xuống 4ms.

### 3\. Cờ fast-math

Chúng tôi đính kèm cờ `reassoc contract` vào mọi lệnh toán học f64. `reassoc` cho phép LLVM phá vỡ chuỗi accumulator nối tiếp thành song song, và `contract` cho phép fused multiply-add. Chúng tôi giữ `nnan` và `ninf` tắt vì Perry sử dụng các bit NaN làm tag giá trị.

Với các cờ đó, loop vectorizer của LLVM hoạt động trên `math_intensive`, giảm từ 131ms xuống 14ms — đánh bại Node 3,5 lần.

### 4\. Fast path cho modulo số nguyên

`%` trên f64 trong JavaScript là `fmod`, là lời gọi libm trên ARM. Nhưng với các toand hạng f64 có giá trị nguyên, chúng ta có thể làm `fptosi → srem → sitofp` và bỏ qua hoàn toàn chuyến đi khứ hồi libm. Codegen sử dụng phân tích tĩnh để phát hiện các toand hạng giá trị nguyên — không cần kiểm tra runtime.

Đây là toàn bộ lý do `factorial` giảm từ 1.553ms xuống 24ms — và từ 591ms của Node xuống 24ms. **Nhanh hơn Node 24,6 lần.**

### 5\. LICM cho vòng lặp lồng nhau

LLVM làm loop-invariant code motion mặc định, nhưng NaN-boxing ẩn cấu trúc. `arr.length` được lower thành một lần tải qua pointer NaN-boxed với kiểm tra tag — không rõ ràng là invariant.

Codegen phát hiện mẫu `for (...; i < arr.length; ...)` và tải trước độ dài vào slot stack trước vòng lặp, với walker tĩnh xác minh rằng thân vòng lặp không thể thay đổi độ dài mảng. Khi biến đếm bị giới hạn bởi độ dài được nâng lên này, IndexGet/IndexSet bỏ qua kiểm tra giới hạn hoàn toàn.

### 6\. Object có shape-cache

Khi codegen biết class của một object, nó giải quyết offset field tại thời điểm biên dịch và emit **các lần tải indexed trực tiếp** — không dispatch runtime. Cho dispatch method, `obj.method(args)` trở thành lời gọi trực tiếp `call @perry_method_Class_name(this, args)` — không vtable, không inline cache, không hash lookup.

Việc chuyển sang LLVM đã làm hồi quy phần này về slow path universal. Khôi phục static dispatch mang lại cho chúng tôi sự phục hồi `method_calls` — từ 1.084ms quay về 1ms. **Nhanh hơn Node 11 lần.**

## Phần 5: Các Con Số Hôm Nay

Trung vị của ba lần chạy, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| Benchmark | Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| factorial | 24ms | 591ms | 24.6x |
| method\_calls | 1ms | 11ms | 11x |
| loop\_overhead | 12ms | 53ms | 4.4x |
| math\_intensive | 14ms | 49ms | 3.5x |
| array\_read | 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array\_write | 3ms | 8ms | 2.6x |
| string\_concat | 1ms | 2ms | 2x |
| nested\_loops | 9ms | 16ms | 1.7x |
| prime\_sieve | 4ms | 7ms | 1.7x |
| matrix\_multiply | 21ms | 34ms | 1.6x |
| fibonacci(40) | 401ms | 991ms | 2.5x |
| binary\_trees | 9ms | 9ms | hòa |
| mandelbrot | 24ms | 24ms | hòa |
| object\_create | 9ms | 8ms | 0.9x |

Mọi benchmark đều là chiến thắng hoặc hòa. Sát nhất là `object_create` (9ms vs 8ms), nơi allocator của V8 thực sự xuất sắc.

## Phần 6: Câu Hỏi Thời Gian Biên Dịch

Lý do số một mà mọi người chọn Cranelift thay vì LLVM là tốc độ biên dịch. Vậy hãy nói về nó.

LLVM tăng thời gian biên dịch mỗi file của Perry thêm **20-50ms**, hoặc khoảng **8-19%**. Không phải 5x. Không phải 2x. Phần trăm một chữ số đến hai chữ số thấp.

Lý do là codegen không phải nút thắt cổ chai trong pipeline của Perry. Phân bổ cho một file điển hình:

-   Parsing SWC: ~30%
-   Lowering HIR (AST → IR, suy luận kiểu): ~25%
-   Các pass biến đổi IR (chuyển đổi closure, lowering async, inlining): ~15%
-   **Codegen (phát văn bản LLVM IR + `clang -c -O3`): ~20%**
-   Linking (`cc` + thư viện runtime): ~10%

Codegen là một phần trong năm. Ngay cả khi nhân đôi phần đó, tổng chỉ dịch chuyển 5-10%. Nếu bạn đang xây dựng AOT compiler mà người dùng gõ `perry compile` một lần rồi chạy binary mãi mãi, phép tính là: chi thêm 25ms khi biên dịch, tiết kiệm tới 24x mỗi lần thực thi.

## Phần 7: Những Gì Tôi Sẽ Làm Khác

Nếu tôi bắt đầu Perry hôm nay và có thể nhảy thẳng sang LLVM, tôi sẽ không làm vậy. Giai đoạn Cranelift thực sự có giá trị. Nó cho phép chúng tôi lặp lại trên frontend mà không phải chịu thuế phức tạp của LLVM, cho chúng tôi một baseline hoạt động để so sánh, và buộc chúng tôi giữ HIR đủ sạch để có thể di chuyển giữa các backend.

Điều tôi sẽ làm khác là bản thân việc chuyển đổi. Chúng tôi phát hành v0.5.0 với phần lớn các thao tác đi qua lời gọi helper runtime, dự định inline chúng sau. Đó là sai. Thứ tự đúng phải là: xác định các hot path trước, lower chúng inline trước khi chuyển đổi, và chỉ phát hành khi backend LLVM ít nhất đạt ngang bằng.

Bài học là điều nhạt nhẽo: ranh giới tối ưu hóa quan trọng hơn chất lượng optimizer. LLVM là một phần mềm đáng chú ý, nhưng nó không thể giúp bạn với mã mà nó không nhìn thấy. Nếu codegen của bạn chuyển hướng mọi thứ qua các lời gọi runtime không minh bạch, bạn đã xây một bức tường giữa chương trình nguồn và mọi optimization pass tồn tại.

## Tổng Kết

Perry giờ chỉ sử dụng LLVM, nhanh hơn Node trên mọi benchmark, và đã phát hành. Quá trình chuyển đổi mất nhiều thời gian hơn tôi dự tính, đau đớn hơn tôi kỳ vọng ở giữa chặng đường, và rõ ràng là quyết định đúng khi nhìn lại. Cranelift đưa chúng tôi đến v0.5; LLVM đang đưa chúng tôi đi tiếp.

Nếu bạn muốn thử Perry:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Mã nguồn: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Tự chạy benchmark: `cd benchmarks/suite && ./run_benchmarks.sh`

Nếu bạn có câu hỏi, tìm thấy bug, hoặc muốn tranh luận về codegen backend, GitHub issue đang mở. Tôi đọc tất cả.

— Ralph
