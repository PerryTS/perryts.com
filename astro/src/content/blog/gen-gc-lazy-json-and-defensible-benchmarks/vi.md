---
title: "GC theo thế hệ, JSON lười và benchmark chịu được soi xét"
excerpt: "Perry v0.5.174 → v0.5.306 trong ba ngày, cộng với công việc GC và JSON đáp xuống cùng lúc. GC theo thế hệ trở thành mặc định. Small String Optimization trở thành mặc định. Đường ống JSON nhận một lazy tape, đáp ở 75 ms trung vị trên validate-and-roundtrip — tốt nhất trong nhóm runtime kiểu động. Trang benchmark được viết lại với trung vị RUNS=11 + p95 + σ, thêm simdjson và AssemblyScript+json-as làm peer, và mọi điểm yếu của Perry được nêu thẳng thắn."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
Bài viết trước kết thúc ở **v0.5.174** với một tiêu đề: cuối cùng Perry đã thắng mọi benchmark trong bộ in-tree so với cả Node và Bun. Sau ba ngày làm việc và một tồn đọng commit về GC + JSON, Perry đang ở **v0.5.306** — đó là **132 bản phát hành patch** — và câu chuyện đã khác. Tiêu đề không phải là tăng tốc 547 lần hay một cột thắng mới. Đó là công việc khiến những chiến thắng đó có thể bảo vệ được.

-   **Generational GC** được ship làm mặc định. Phase A đến D đã hoàn thành từ v0.5.217–v0.5.237.
-   **Small String Optimization** được ship làm mặc định. Step 1.5 → 2 hoàn thành ở v0.5.213–v0.5.216.
-   **Pipeline JSON** có parser dạng tape, lazy parse, lazy stringify, và sparse materialization theo từng phần tử. Validate-and-roundtrip mặc định giờ là **median 75 ms** — tốt nhất trong nhóm dynamic-typing.
-   **Trang benchmarks** được viết lại từ đầu đến cuối với **RUNS=11 median + p95 + σ + min + max**, simdjson và AssemblyScript+json-as được thêm vào làm peer, các probe tối ưu được tách khỏi so sánh thực tế, và mọi điểm yếu của Perry được phơi bày một cách trung thực.

Dàn diễn viên phụ là một loạt các bản sửa tính đúng đắn ổn định: Promise microtask FIFO, NaN equality và định dạng số ECMAScript, BigInt two's complement, AsyncLocalStorage end-to-end, runtime cho decimal.js + ioredis + commander, và một segfault `JSON.stringify` trên f64 thuần đã ẩn dưới các đường tape. Cộng với toolchain Windows cuối cùng cũng nhẹ nhàng: LLVM + xwin, không cần cài Visual Studio.

## 1\. Generational GC, mặc định bật

Generational GC đã là một cuộc triển khai theo giai đoạn trong hai tháng. Tóm tắt các giai đoạn đã đóng trong cửa sổ này:

-   **v0.5.217–v0.5.221** — Phase A: bộ khung runtime shadow-stack, phát emit push/pop, threading slot-map, mirror shadow cho `Let`/`LocalSet`, và root scanner.
-   **v0.5.222** — Phase B: tách nursery + arena old-gen.
-   **v0.5.223–v0.5.225** — Phase C1–C2: hạ tầng runtime cho write-barrier, codegen phát emit barrier, mọi heap store đều đi qua nó.
-   **v0.5.226–v0.5.228** — Phase C3a–C4: các root remembered-set chảy vào mark + clear; minor GC trace bỏ qua old-gen; tenuring không di chuyển.
-   **v0.5.229–v0.5.236** — Phase C4b α/β/γ/δ: hạ tầng forwarding-pointer, pass pinning + evacuation, scanner + transitive pinning, viết lại reference, các block nursery rảnh được trả về OS, GC trigger bị giới hạn ở ngưỡng ban đầu.
-   **v0.5.237** — Phase D phần 1: `PERRY_GEN_GC=1` mặc định.
-   **v0.5.238** — Phase D phần 2: `PERRY_SHADOW_STACK=1` mặc định.
-   **v0.5.239–v0.5.240** — tài liệu kết thúc: roadmap đã hoàn thiện, phụ lục lineage học thuật + công nghiệp (Bartlett 1988, Ungar 1984, Cheney 1970).

Chiến thắng đo lường được quan trọng nhất: `test_memory_json_churn` giảm từ **115 MB → 91 MB** peak RSS đúng lúc gen-GC mặc định bật. Các regression compute nhỏ và được liệt kê không xin lỗi — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` +1 ms mỗi cái. Lối thoát (`PERRY_GEN_GC=0`) khôi phục các con số cũ; sự đánh đổi là có chủ đích, và trang benchmarks giờ liệt kê cả hai hàng cạnh nhau để người đọc có thể chọn.

## 2\. Small String Optimization, mặc định bật

SSO là một biểu diễn chuỗi inline 22 byte tránh cấp phát heap cho các chuỗi ngắn — key JSON điển hình (2–8 byte) và giá trị ngắn rơi vào dạng inline. Việc triển khai nhỏ ở bề mặt và lớn bên dưới:

-   **v0.5.213**: hạ tầng SSO (biểu diễn + accessor).
-   **v0.5.214**: Step 1 các arm consumer + cổng `PERRY_SSO_FORCE` để kiểm thử.
-   **v0.5.215**: Step 1.5 codegen `PropertyGet` ba nhánh — fast path cho chuỗi inline, fast path cho chuỗi heap, slow path cho phần còn lại.
-   **v0.5.216**: Step 2 lật — phát emit SSO mặc định.

Các follow-up trong v0.5.279 đã đóng bug NaN cuối cùng trên property-read xuất hiện khi SSO chạy nóng, và bản sửa dispatch getter cross-module xếp chuỗi ở v0.5.272 đóng một cái nữa. Cả hai đã nằm trong danh sách trước khi mặc định bật; cả hai đều ship mà không có regression hiệu năng.

## 3\. JSON: parse dựa trên tape, mặc định lazy

Pipeline JSON nhận được cuộc viết lại xâm lấn nhất của giai đoạn này. Hành vi cũ: `JSON.parse` xây dựng một cây NaN-boxed value được materialize đầy đủ. Hành vi mới: `JSON.parse` xây dựng một tape 12 byte mỗi value và materialize lazy — chỉ những value bạn thực sự đọc mới phải trả chi phí materialize. Stringify trên một parse chưa bị mutate giờ là một memcpy của input gốc, cùng mẹo fast-path mà simdjson sử dụng với `raw_json()`.

-   **v0.5.200**: `JSON.parse<T>(blob)` parse hướng schema (Step 1). Shape biết tại thời điểm biên dịch cho phép compiler phát emit truy cập key đã được resolve sẵn.
-   **v0.5.203**: nền tảng parse dựa trên tape — Step 2 Phase 1.
-   **v0.5.204**: lazy parse + lazy stringify — Step 2 Phase 2+4.
-   **v0.5.206**: truy cập theo chỉ số an toàn với lazy + các trường hợp biên — Step 2 Phase 3.
-   **v0.5.208**: sparse materialization theo từng phần tử — Step 2 Phase 5b.
-   **v0.5.209**: walk cursor + ngưỡng materialize thích ứng.
-   **v0.5.210**: lật lazy parse làm mặc định cho blob ≥1 KB.

Kết quả trên workload mà lazy tape được thiết kế riêng cho (10k bản ghi, blob ~1 MB, parse → stringify không có iteration trung gian):

| Triển khai | Median (ms) | p95 (ms) | σ | Peak RSS |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson) | 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + lazy tape) | 75 | 91 | 6.9 | 85 MB |
| rust serde\_json (LTO) | 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialization) | 473 | 533 | 21.4 | 606 MB |
| assemblyscript+json-as (wasmtime) | 598 | 621 | 10.5 | 58 MB |

Perry tại **median 75 ms** là runtime dynamic-typing nhanh nhất trong so sánh — thắng Bun (259 ms), thắng Node (394 ms), thắng JIT server của Kotlin (453 ms). simdjson tại 24 ms là trần C++ tăng tốc bằng SIMD và sống trên trang một cách có chủ đích, không giấu sau một cherry-pick. Perry không đánh bại nó. Mục đích là chỉ ra khoảng cách để đóng nó có mục tiêu — được theo dõi trong `docs/json-typed-parse-plan.md`.

Bench đồng hành trung thực là **parse-and-iterate**: cùng blob, nhưng mỗi iteration cộng `nested.x` của mọi bản ghi, buộc lazy tape phải materialize. Ở đó Perry rơi xuống **466 ms** — chậm hơn 375 ms của lối thoát mark-sweep vì tape phải trả chi phí mà nó không thể amortize. Hàng đó nằm trong TL;DR §B. Khi bạn không thể tránh công việc, lazy tape không giả vờ.

## 4\. Trang benchmarks, viết lại

Ba điều đã thay đổi về cách Perry trình bày các con số hiệu năng.

**RUNS=11 median + p95 + σ + min + max, không phải best-of-N.** Best-of-N âm thầm bỏ tail latency; trên phần cứng này nó đã che giấu các outlier 9,4 giây của Python `accumulate` và spike p95 5,3 giây của Swift JSON. Median đặt các tail trở lại trên trang. Thay đổi phương pháp luận đã hoàn thành ở v0.5.248; mọi cell trong TL;DR §A và §B đều là RUNS=11 mới tính đến **2026-04-25**.

**Các probe tối ưu được tách khỏi hiệu năng runtime thực.** Năm cell hiển thị Perry tại 12–34 ms so với Rust/C++ tại 98 ms — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — đo tư thế cờ compiler, không phải silicon. Giờ chúng nằm trong tiểu mục riêng, với một đoạn bên trên giải thích rằng `clang++ -O3 -ffast-math` đóng chúng trong vòng một mili giây. Kernel runtime thực tiêu đề là `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry ngồi đúng giữa nhóm no-FMA-contract trên một kernel mà compiler thực sự không thể gấp công việc đi. Đó là so sánh trung thực.

**Thêm peer.** simdjson (4.3.0) giờ có trong cả hai bảng JSON — trần parse-throughput của C++, trên trang để người đọc có thể thấy khoảng cách. AssemblyScript với json-as (1.3.2) là peer TS-to-native có thể cài đặt gần nhất; porffor segfault trên workload ở kích thước này, Static Hermes không cài được trên macOS arm64. Kotlin với kotlinx.serialization gia nhập polyglot JSON ở v0.5.241–v0.5.242. Mọi hàng đều thật, mọi disclaimer đều ở trên trang.

## 5\. Bảng compute polyglot

Các kernel tiêu đề thực sự không-thể-gấp, RUNS=11 median, làm mới 2026-04-25 ở v0.5.249:

| Benchmark | Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci | 318 | 330 | 315 | 282 | 1022 | 589 |
| loop\_data\_dependent | 235 | 229 | 129 | 229 | 322 | 232 |
| object\_create | 1 | 0 | 0 | 5 | 11 | 6 |
| nested\_loops | 18 | 8 | 8 | 11 | 18 | 21 |

Trên `fibonacci`, Perry bám sát nhóm compiled trong vòng 3–15 ms. JIT HotSpot của Java nhanh hơn ~11% nhờ inline lời gọi đệ quy. Trên `loop_data_dependent`, kernel chia thành hai cụm FP-contract: nhóm FMA-contract ở ~128 ms (Go mặc định, `g++ -O3` trên Apple Clang — cả hai fuse `sum * a + b` thành một FMADDD đơn) và nhóm no-contract ở 229–235 ms (Perry, Rust mặc định, Swift, Java không có `-XX:+UseFMA`, Bun) chạy FMUL + FADD scalar. LLVM khớp với nhóm FMA bằng `-ffp-contract=fast`; Perry không bật nó mặc định. `nested_loops` bị giới hạn cache, không phải compute; mọi người đều rơi vào 8–21 ms.

## 6\. Toolchain Windows, nhẹ nhàng

Người dùng Windows không còn cần cài Visual Studio. **v0.5.199** đóng [#176](https://github.com/PerryTS/perry/issues/176): `perry setup windows` + winget LLVM + xwin thay thế toàn bộ cây VS BuildTools. `v0.5.201` bỏ cổng cfg trên `find_lld_link` / `find_perry_windows_sdk` để việc khám phá đường dẫn hoạt động trên mọi nền tảng nhắm đến Windows, không chỉ host macOS.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Đợt sàng lọc tính đúng đắn runtime

Một chủ đề của giai đoạn này: các sai lệch runtime âm thầm so với V8/JSC biến thành hoặc bản sửa hoặc lỗi biên dịch. Các cái không tầm thường:

-   **v0.5.255**: `BigInt.fromTwos`/`toTwos` two's complement.
-   **v0.5.263**: phân biệt kiểu non-promise của `Promise.all`/`race`/`any`.
-   **v0.5.281**: `NaN==NaN` + định dạng số ECMAScript (`3 → "3"`, không phải `"3.0"`; `-0 → "0"`; v.v.).
-   **v0.5.280**: ép kiểu ToInt32 cho `NaN`/`Infinity` trong `(x) | 0`.
-   **v0.5.284**: Promise microtask FIFO + lan truyền handler bị throw.
-   **v0.5.286**: `JSON.stringify` của một f64 thuần segfault dưới các đường tape.
-   **v0.5.277**: `fs.readFileSync` trả về Buffer khi không truyền encoding (khớp Node).
-   **v0.5.272**: dispatch getter cross-module xếp chuỗi trả về `undefined`.

Các follow-up stdlib cho issue [#187](https://github.com/PerryTS/perry/issues/187) đã được lấp đầy: AsyncLocalStorage end-to-end (v0.5.261), runtime commander + codegen thực sự gọi `.action()` (v0.5.250), code decimal.js (v0.5.259), Redis ioredis end-to-end (v0.5.270), pattern async-factory pg + mongo (v0.5.275), và cùng bug async-factory trên EE/LRU/WSS (v0.5.252).

Về phía `perry/ui`: callback tap thông báo (#97) được kết nối trên cả Apple (v0.5.254) và Android (v0.5.258); lên lịch + hủy thông báo cục bộ (#96, v0.5.244); FCM register + receive trên Android (v0.5.262).

## 8\. Kết luận

Mẫu của khoảng thời gian này không phải là những con số tiêu đề. Đó là công việc làm cho các chiến thắng hiện có sống sót qua sự xem xét kỹ lưỡng: một generational GC bắt được các workload cấp phát liên tục, một SSO đóng khoảng cách chi phí chuỗi ngắn, một pipeline JSON khai thác cấu trúc “không sửa đổi” của workload phổ biến nhất, và một trang benchmarks đo median thay vì best-of-N và hiển thị trần parse 24 ms của simdjson trên cùng hàng với 75 ms của Perry. Người đọc được thấy khoảng cách — và vị trí Perry so với sàn.

Hãy thử nó:

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Mã nguồn: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Benchmarks: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
