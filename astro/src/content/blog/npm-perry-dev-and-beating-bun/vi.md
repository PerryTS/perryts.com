---
title: "Phân phối npm, perry dev, và thắng mọi benchmark"
excerpt: "Perry v0.5.80 → v0.5.174 trong sáu ngày. @perryts/perry được phát hành trên npm cho tất cả bảy nền tảng được hỗ trợ. perry dev thêm tự động biên dịch lại ở watch-mode trên nền AST cache trong bộ nhớ và object cache trên đĩa theo từng module. json_roundtrip đóng lại khoảng cách cuối cùng — Perry giờ thắng mọi benchmark trước cả Node.js và Bun."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
Bài viết trước kết thúc với Perry ở v0.5.80 và một thất bại cứng đầu trên bảng benchmark: `JSON.parse`/`stringify` roundtrip vẫn chậm hơn Node 1,6 lần. Sáu ngày sau Perry đã ở **v0.5.174** — đó là **94 bản phát hành patch** — và ba điều đã thay đổi đáng để chỉ ra trước bất cứ điều gì khác:

-   `@perryts/perry` được phát hành trên **npm**. Một lệnh duy nhất cài đặt Perry trên mọi nền tảng được hỗ trợ.
-   **`perry dev`** thêm tính năng tự động biên dịch lại ở chế độ watch-mode, trên nền một AST cache trong bộ nhớ mới và object cache trên đĩa theo từng module.
-   Khoảng cách `json_roundtrip` đã được đóng lại. Perry giờ **thắng Node và Bun trên mọi benchmark** trong bộ chính (15/15 so với cả hai).

Phần còn lại của bài viết là dàn diễn viên phụ: các bản sửa WebAssembly, watchOS cuối cùng đã biên dịch end-to-end, các primitive `perry/thread` được kết nối hoàn chỉnh, và một loạt chiến thắng về tính nghiêm ngặt tại thời điểm biên dịch biến những lỗi âm thầm thành lỗi thật sự.

## 1\. `@perryts/perry` trên npm

Perry luôn được cài qua Homebrew trên macOS và APT trên Debian/Ubuntu. Phủ sóng tốt cho các lập trình viên trên những nền tảng đó, không có gì cho người dùng Windows trừ khi họ build từ source, và không có gì đồng nhất trong một đội ngũ kết hợp Mac, Linux và Windows. v0.5.107 đã làm cho vấn đề đó biến mất.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

Gói này là một launcher mỏng phụ thuộc vào bảy gói tùy chọn theo nền tảng — macOS arm64/x64, Linux x64/arm64 trên cả glibc và musl, Windows x64 — và npm chỉ cài cái phù hợp với máy của bạn. Kích thước nhị phân mỗi nền tảng ở mức megabyte một chữ số thấp. Quá trình cài đặt chỉ mất vài giây. Cũng có đường cài đặt global (`npm install -g @perryts/perry`) nếu bạn thích, nhưng cài đặt cục bộ cho dự án ghim phiên bản compiler bên cạnh dependency của bạn, đó là mặc định đúng đắn.

Việc publish đi qua OIDC Trusted Publisher nên mọi bản phát hành đều có provenance và gắn ngược lại với job CI đã build nó. Đó là một ngày công việc CI riêng — nhiều commit CI `v0.5.107` đuổi theo đúng sự kết hợp `--provenance` / phiên bản npm / đường dẫn workflow — nhưng nó đã hoàn tất, và mọi bản phát hành kể từ đó đều sạch. Người dùng Windows giờ là công dân hạng nhất, và sự ma sát giữa các đội “cài theo cách OS của bạn thích” đã biến mất.

## 2\. `perry dev` — chế độ watch

v0.5.143 thêm một CLI subcommand mới:

```
perry dev
```

Chỉ vậy thôi. Nó theo dõi dự án của bạn, biên dịch lại khi lưu, và khởi động lại nhị phân của bạn. Cảm hứng là Vite và `nodemon`; mục đích là để ngừng giả vờ rằng quy trình compiler-đến-nhị-phân phải có cảm giác chậm hơn một runtime. Đối với hầu hết dự án, `perry dev` rebuild trong dưới một giây trên cache nóng.

Phần “cache nóng” rất quan trọng. Hai cache mới ra mắt cùng với `perry dev`:

-   **AST cache trong bộ nhớ** (v0.5.156). Trong các lần rebuild của một phiên `perry dev`, Perry giữ AST đã được parse cho mọi module chưa thay đổi trên đĩa. Sửa một file sẽ re-parse một file, không phải toàn bộ đồ thị module.
-   **Object cache trên đĩa theo từng module (V2.2)**. Mỗi module được biên dịch thành file `.o` riêng và được hash; các module không thay đổi bỏ qua codegen hoàn toàn và linker lấy object đã được cache. Đầu ra verbose của cache khớp với spec trong [#131](https://github.com/PerryTS/perry/issues/131), và một vòng audit tăng cường ở v0.5.160 đã đóng các trường hợp biên khi các entry cache cũ có thể sống sót qua một thay đổi header.

Hai cache cộng hưởng với nhau. Lần chỉnh sửa đầu tiên của phiên là biên dịch đầy đủ; mọi thứ sau đó chỉ làm công việc tỷ lệ với những gì bạn thực sự thay đổi. Đây là thay đổi DX lớn nhất trong tuần.

## 3\. Thắng Bun trên mọi benchmark

Ở v0.5.166, README có một lưu ý trung thực: Perry chậm hơn Node 1,6 lần trên `json_roundtrip` (50 lần `JSON.parse` + `JSON.stringify` trên một blob 1MB, 10K mục), và chậm hơn Bun 2,4 lần. Issue [#149](https://github.com/PerryTS/perry/issues/149) theo dõi phần tiếp theo. Đến v0.5.173 — bảy ngày sau — khoảng cách đó đã đóng lại.

| Workload | Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry giờ thắng mọi workload trong bộ benchmark chính — **15/15 so với Node, 15/15 so với Bun**, best-of-5 run trên macOS ARM64. Bun 1.3 vẫn dẫn đầu về peak RSS (84MB so với 310MB của Perry trên `json_roundtrip`), vậy nên áp lực allocator là điều tiếp theo cần đóng, nhưng độ trễ thô thuộc về Perry.

Việc đóng khoảng cách JSON không phải là một thay đổi duy nhất — đó là sự tích lũy của công việc object-layout parity đã chạy suốt tuần này: Phase 1 suy luận shape cho object-literal (v0.5.167), Phase 4 suy luận kiểu trả về dựa trên body cho các hàm tự do, phương thức class, getter, và arrow function (v0.5.169), và Phase 4.1 suy luận kiểu trả về của lời gọi phương thức (v0.5.170). Chủ đề cũng giống bài trước: cho LLVM đủ cấu trúc tĩnh để nhìn xuyên qua, và optimizer sẽ làm phần còn lại.

v0.5.164 cũng khôi phục autovectorization accumulator song song `<2 x double>` trên các vòng lặp reduction pure-fadd, vốn đã regress âm thầm ở đâu đó trong khoảng v0.5.9x→v0.5.16x. Đó là điều đưa `math_intensive` và `accumulate` trở lại vị trí dẫn trước 3-4 lần so với Rust/C++/Go/Swift — cùng LLVM, một cờ `reassoc contract`, một body vòng lặp được vectorize.

## 4\. `perry/ui` và doc-tests

Bốn khoảng trống còn lại của perry/ui đã được đóng ở v0.5.151. Bên cạnh đó, v0.5.119 chuyển việc sử dụng sai API perry/ui âm thầm từ “biên dịch và không làm gì cả” thành lỗi biên dịch cứng — cùng lý luận như v0.5.165 áp dụng cho decorator (xem bên dưới). Việc sử dụng sai hiện ra tại thời điểm biên dịch luôn tốt hơn tại thời điểm chạy.

v0.5.123 phát hành một **bộ test harness cho doc-examples** và một widget gallery. Mọi ví dụ TypeScript trong tài liệu giờ được biên dịch mỗi lần CI chạy, và widget gallery so sánh ảnh chụp màn hình với các baseline đã được phê duyệt. v0.5.125 mở rộng điều đó sang một ma trận biên dịch chéo: mọi ví dụ trong docs được build cho iOS, tvOS, Android, WASM, và Web cùng với nền tảng host, nên sai lệch API giữa các target được bắt trên PR giới thiệu nó thay vì chu kỳ phát hành đã ship nó.

Một chiến thắng nhỏ về chất lượng cuộc sống: `perry check` giờ đưa ra `file:line:column` cho các lỗi HIR lowering ([#129](https://github.com/PerryTS/perry/issues/129)), nghĩa là jump-to-error trong editor hoạt động thay vì hiển thị một thông báo chung chung không có vị trí.

## 5\. watchOS biên dịch end-to-end

watchOS đã được phát hành là target biên dịch tháng trước, nhưng một build end-to-end sạch có vài chỗ gân góc. Công việc watchOS tuần này:

-   **v0.5.113**: `--target watchos` và `--target watchos-simulator` giờ biên dịch end-to-end không cần những workaround đã tích lũy.
-   **v0.5.114**: `--features watchos-game-loop` cho các ứng dụng Metal-surface.
-   **v0.5.122**: `--features watchos-swift-app` cho rendering host bởi SwiftUI — khi bạn muốn SwiftUI sở hữu vòng đời ứng dụng và Perry tạo UI bên trong đó.
-   **v0.5.135**: `PERRY_UI_TEST_MODE` được kết nối vào perry-ui-ios và perry-ui-tvos, nên kiểm thử UI Geisterhand chạy trên hai target đó theo cùng cách như trên macOS và Linux.

## 6\. Các primitive `perry/thread` được kết nối đầy đủ

v0.5.174 (hôm nay) đã đóng [#146](https://github.com/PerryTS/perry/issues/146): `parallelMap`, `parallelFilter`, và `spawn` được kết nối hoàn toàn qua đường codegen với đảm bảo an toàn tại thời điểm biên dịch. Các capture mutable bị từ chối tại thời điểm biên dịch — cùng tư thế tính đúng đắn tại thời điểm biên dịch mà perry/ui và decorator giờ đã có. Các primitive thread đã được kết nối một phần từ thông báo v0.4.0 giờ đã hoàn chỉnh end-to-end.

## 7\. WebAssembly và target web

Hai bản sửa WASM đáng nhắc đến:

-   **v0.5.158**: năm bug dồn vào nhau trong `--target web` (đường WASM output) che giấu lẫn nhau. Sửa theo lot nên target web giờ đứng vững dưới toàn bộ bề mặt `perry/ui` ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: `break`/`continue` bên trong `if` bên trong một vòng lặp bị treo trên WASM — một bug codegen không tái tạo được trên các target native. Đã sửa ([#135](https://github.com/PerryTS/perry/issues/135)).

Về mặt tính đúng đắn: v0.5.157 sửa `obj.field` trả về `NaN` trên Android ([#128](https://github.com/PerryTS/perry/issues/128)), và v0.5.162 sửa một bug ws đáng nguyền rủa nơi `sendToClient` và `closeClient` đã biên dịch thành no-op âm thầm ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Chiến thắng về tính nghiêm ngặt tại thời điểm biên dịch

Chủ đề của tuần này: bất cứ điều gì trước đây là một thất bại âm thầm giờ là một lỗi biên dịch.

-   **v0.5.165**: Các decorator TypeScript được parse vào HIR và sau đó bị loại bỏ âm thầm. Giờ chúng báo lỗi tại điểm decoration với một thông báo rõ ràng ([#144](https://github.com/PerryTS/perry/issues/144)). Cùng lý luận warn→bail như v0.5.119 áp dụng cho perry/ui.
-   **v0.5.119**: Việc sử dụng sai API perry/ui bị từ chối tại thời điểm biên dịch thay vì tạo ra một nhị phân no-op.
-   **v0.5.172**: `console.trace()` giờ tạo ra backtrace native thực sự ra stderr thay vì chỉ echo lại message ([#20](https://github.com/PerryTS/perry/issues/20)). Các frame đã được symbolicate yêu cầu `PERRY_DEBUG_SYMBOLS=1`; không có nó bạn nhận được địa chỉ, vẫn nhiều hơn hành vi echo message mà nó thay thế.

## 9\. Kết luận

Mẫu của tuần này: **phân phối** (npm), **trải nghiệm nhà phát triển** (`perry dev`, cache tăng dần), và **thất bại benchmark còn lại cuối cùng đã đóng lại**. Cộng với một lot chiến thắng về tính nghiêm ngặt tại thời điểm biên dịch biến những lỗi âm thầm thành lỗi thật sự. Sáu ngày, 94 bản phát hành patch, một thay đổi DX lớn.

Hãy thử nó:

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev
```

Mã nguồn: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
