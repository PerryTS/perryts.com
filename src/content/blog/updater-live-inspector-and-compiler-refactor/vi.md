---
title: "Auto-Update, một Inspector trực tiếp và Compiler tự cắt mình một nửa"
excerpt: "Perry v0.5.306 → v0.5.359 trong bốn ngày — 53 patch release, ~30 issue được đóng, và ba thứ lớn hạ cánh: perry/updater cho auto-update desktop, inspector trực tiếp tại localhost:7676, và một cuộc refactor compiler khiến bốn file lớn nhất nhỏ đi 33–91%."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
Bài trước khép lại ở **v0.5.306** với câu chuyện gen-GC + JSON + benchmark. Bốn ngày sau, Perry đã ở **v0.5.359** — tức **53 patch release** — và câu chuyện lại khác. Không có release nào trong số đó là tiêu đề của những con số benchmark. Hầu hết đều là **các issue trong tracker được đóng**.

-   **`perry/updater`** đã có — auto-update theo phong cách Sparkle/Tauri cho ứng dụng desktop (Ed25519 trên SHA-256 digest, sentinel-rollback, relaunch tách rời). PR cộng đồng từ **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Phase D** — một inspector trực tiếp tại `http://localhost:7676` với cây widget, chi tiết theo từng widget, dispatch click và chỉnh style trực tiếp qua `POST /style/:h`.
-   **Refactor compiler.** Trong khoảng v0.5.329 → v0.5.343, bốn file được nhắc đến nhiều nhất đã được cắt nhỏ: `lower::lower_expr` 6.687 → 624 LOC (−91%), `compile.rs` 9.391 → 3.783 LOC (−60%), `lower.rs` 13.591 → 7.554 LOC (−44%), `lower_call.rs` 7.000+ → 4.681 LOC (−33%). `walker.rs` mới biến lớp bug catch-all `_ =>` thành lỗi compile.
-   **UI styling Phase C đóng** — props inline `style: { ... }` trên mọi widget của Apple, Android, GTK4, Windows và Web. Windows được gắn 4/5 stub (decoration / opacity / borders); chỉ còn `widget.shadow` (follow-up DirectComposition).
-   **Một bucket Scoop** cho Windows: `scoop install perry-ts/perry`. Sidecar SHA-256 trong workflow release.
-   **Làn sóng fix issue cộng đồng** — khoảng 30 issue được đóng trên runtime, codegen, fetch, GTK4, linker Windows, async và stdlib.

## 1\. perry/updater — auto-update cho ứng dụng desktop

Trước khi fix, Perry không có lộ trình cập nhật. Ứng dụng được phát hành, rồi phát hành nữa, vậy thôi. **TheHypnoo** mở [#224](https://github.com/PerryTS/perry/pull/224) với toàn bộ câu chuyện:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback nếu lần khởi động trước bị crash

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // gọi sau khi build mới khởi động thành công
```

Mô hình tin cậy: **Ed25519 trên SHA-256 digest của file** (không phải trên byte file — giúp việc verify rẻ ngay cả với binary lớn). Manifest là JSON, có versioning theo schema, mỗi entry cho một bộ ba `<os>-<arch>`. Cài đặt nguyên tử với backup `<exe>.prev`, relaunch tách rời (`setsid` trên Unix, `DETACHED_PROCESS` trên Windows). Mobile bị loại khỏi thiết kế — App Store / Play Store sở hữu pipeline cài đặt ở mức OS.

Hai điểm lạ của runtime Perry lộ ra khi viết smoke test, và được fix luôn:

-   **`response.arrayBuffer()` trả về một stub chỉ có metadata.** Đã fix trong [#232](https://github.com/PerryTS/perry/pull/232) (cũng TheHypnoo) — `js_response_array_buffer` giờ allocate một `BufferHeader` thực và `memcpy` `resp.body` vào trong.
-   **`fs.appendFileSync` ghi 0 byte.** Đã fix trong [#226](https://github.com/PerryTS/perry/issues/226) — đường lowering namespace-import (`import * as fs from "fs"`) không có nhánh cho `appendFileSync`, và codegen LLVM cũng chưa có nhánh cho biến thể HIR. Cả hai đều đã được nối.

Tài liệu nằm ở `docs/src/updater/overview.md`.

## 2\. Geisterhand: inspector trực tiếp tại localhost:7676

Geisterhand vốn là khung kiểm thử UI in-process của Perry — HTTP API trên cổng 7676 để snapshot trạng thái widget và dispatch click. Phase D biến nó thành một inspector kiểu devtools mà bạn có thể mở từ bất kỳ trình duyệt nào.

-   **Bước 1 (v0.5.349)** — `GET /` phục vụ một UI vanilla-JS một trang gồm cây widget, chi tiết theo widget (frame, value, raw JSON), auto-refresh 1,5 giây với pause/resume, và một nút «kích hoạt onClick». Codegen ghim `INSPECTOR_HTML` chống lại lazy-load `-dead_strip` trên macOS để nó sống sót qua release build.
-   **Bước 2 (v0.5.350)** — `POST /style/:h` nhận một túi props JSON và áp dụng trực tiếp. 9 props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) chảy từ thread HTTP → thread chính qua pump-queue sẵn có. JSON sai → 400; handle sai → 400; props không nhận diện được sẽ bị lọc phía server và response liệt kê những props đã được áp.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

Dispatcher macOS đã được nối; Linux / Windows / iOS / tvOS / visionOS / Android theo cùng hình dạng và sẽ là kế tiếp.

## 3\. Refactor compiler — cắt bốn file lớn nhất

Năm issue trong tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), cộng thêm phần đuôi dài) cùng dạng: một biến thể `Expr` mới được thêm vào `ir.rs`, nhưng một trong bốn walker ad-hoc trong `lower.rs` có catch-all `_ =>` và lặng lẽ compile sai biến thể mới đó. Bắt cái này khi runtime thì đắt — đôi khi vô hình, đôi khi là SIGSEGV dưới SSO.

**v0.5.329** giới thiệu `crates/perry-hir/src/walker.rs` với `walk_expr_children` / `walk_expr_children_mut` — match exhaustive trên cả 178 biến thể `Expr`, **không có catch-all**. Thêm một biến thể mới mà không liệt kê ở đây bây giờ là lỗi compile. Bốn người dùng (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) đã co lại:

| Hàm | Trước | Sau | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75% |
| `substitute_locals` | 553 | 80 | −86% |
| `collect_local_refs_expr` | 720 | 70 | −90% |
| `remap_local_ids_in_expr` | 542 | 85 | −84% |

Tổng: **−1.830 dòng descent trùng lặp**, được thay bằng **+1.840 dòng walker tập trung** — net gần như phẳng, nhưng lớp bug đã biến mất.

Điều đó mở khóa phần còn lại. **v0.5.331 → v0.5.343** chia tách bốn monolith trong 14 commit. Các con số tiêu đề:

| File | Trước | Sau | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6.687 | 624 | −91% |
| `compile.rs` | 9.391 | 3.783 | −60% |
| `lower.rs` | 13.591 | 7.554 | −44% |
| `lower_call.rs` | 7.000+ | 4.681 | −33% |

Việc tách hạ cánh dưới dạng 19 sub-module tập trung: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, cộng thêm crate mới `crates/perry-dispatch` trở thành nguồn duy nhất của sự thật cho các bảng method UI / system / i18n (cú fan-out `_ => "perry_ui_unknown"` từng gây các bất ngờ «compile được trên macOS, vỡ trên web» ở issue [#191](https://github.com/PerryTS/perry/issues/191) nay là một cú lookup duy nhất).

**Các thắng lợi perf Tier 4** đi cùng (v0.5.335–v0.5.336):

-   Gộp hai pass trong `inline_functions` và ba pass rayon trong `compile.rs` — tiết kiệm 5 lần quét module + 3 vòng round-trip scheduler mỗi lần compile.
-   Giới hạn parse cache của `perry dev` ở 500 entry, FIFO eviction. Trước khi fix, một phiên đi qua `node_modules` có thể giữ trên 100 MB AST của SWC.
-   Song song hóa vòng lặp ghi `.ll` sau codegen — wall-time nhanh 2–4 lần trên SSD với 50+ module.
-   `Arc<I18nTable>` thay vì clone bảng locale theo từng worker.

Test workspace giữ ở **434 passed / 0 failed / 5 ignored** qua mỗi commit; gap test ở baseline 25/28; doc-test ở baseline 80/82.

## 4\. UI styling Phase C, hoàn tất

Phase C là cuộc rollout của `style: { ... }` inline. Các bước 1–7 đóng trong cửa sổ này:

-   **v0.5.305 → v0.5.306** — bề mặt kiểu `StyleProps` + `style:` inline trên Button.
-   **v0.5.307 → v0.5.309** — destructure inline color/padding/shadow trên mọi widget bảng, rồi đến VStack / HStack.
-   **v0.5.310 → v0.5.311** — chuỗi hex + gradient + `parseColor` tại runtime cho giá trị động.
-   **v0.5.312** — tài liệu styling + issue tracking Windows.

Sau đó là quét cross-platform:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 FFI styling được nối, cộng thêm 7 FFI thiếu đang chặn cổng doc-test trên Linux (v0.5.322).
-   **macOS** (v0.5.324) — đường ống bóng `CALayer` cho `widget.shadow` + hạ tầng visual\_test; class-probe `set_color` cho widget không phải `NSTextField`.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button với `color: ...` đang gọi `setTextColor:` trên `UIButton`, vốn không cài đặt selector đó; panic của `objc2` vượt qua biên `extern "C"` và process bị abort. Đã fix theo cùng pattern class-probe như macOS — UIButton giờ đi qua `setTitleColor:forState:UIControlStateNormal`.
-   **Windows** (v0.5.347) — 4/5 stub styling được nối (`text.decoration` qua `LOGFONT` round-trip, `widget.opacity` qua `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, borders qua `SetWindowSubclass` + `WM_PAINT`). Chỉ còn `widget.shadow` (cần DirectComposition).

Ma trận styling trong `docs/src/ui/styling-matrix.md` kết thúc cửa sổ với **Web ở 43/43 Wired**, **Windows ở 42/43 Wired**, phần còn lại đầy đủ.

## 5\. Lượt rà soát đúng đắn của runtime — issue đến issue

Chủ đề của giai đoạn: mọi miscompile vào qua tracker đều biến thành fix hoặc lỗi compile-time. Điểm nhấn:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — method class bên trong `fn` không thể capture local của fn bao quanh. Repro nhiều module nay khớp byte-cho-byte với Node.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — unbox string-handle an toàn với SSO trên 7 site có toán hạng string: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, đầu vào digest crypto. Trước khi fix, mỗi cái hoặc trả rác im lặng hoặc SIGSEGV với toán hạng string inline.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — mảng `const` rỗng ở mức module bị mất các thao tác ghi `arr[i]=` từ trong các hàm. Lộ ra khi `discoverLevels()` của Bloom-Engine/jump điền `LEVEL_FILES` ở mức module qua index-assign và màn chọn level hiển thị trống.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` từ trong hàm async im lặng bị giới hạn ở 16 phần tử khi mảng vào dưới dạng tham số. Hàm async không được inline; realloc trả về một con trỏ mới mà người gọi không thấy. Fix: cài đặt một con trỏ forwarding tại vị trí cũ ở mỗi lần lớn lên, tận dụng cơ chế `GC_FLAG_FORWARDED` sẵn có của GC.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — dispatch tham số mặc định của method truyền rác khi caller bỏ qua các arg cuối. Hai phần đóng góp: declare method cross-module hardcode 6 double thay vì `arity + 1`, và `lower_class_method` hoàn toàn không gọi `build_default_param_stmts`. Lộ ra qua việc `findOne(filter, options = {})` của mongodb treo im lặng; fix đồng nhất giữa dispatch nội bộ và cross-module.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — ba bug fetch + promise độc lập từ một repro: api.github.com 403 cho ẩn danh (giờ đặt User-Agent mặc định), `.then(console.log)` treo mãi (callback null không đẩy entry vào TASK\_QUEUE), mọi reject của fetch in `Uncaught exception: [object Object]` (NaN-box `*StringHeader` trần thay vì `ErrorHeader` thật).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — `Blob` thật với các method instance `arrayBuffer` / `text` / `bytes` / `slice`. Trước khi fix, `await response.blob()` trả về stub chỉ có metadata `{size, type}`. Fix ba phần đáp xuống runtime + HIR + codegen.

Cùng vài cái nhỏ:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup tỉa quá đà các monomorphization generic trên Linux + silent-fallback link GTK4. Fix: thay lọc theo pattern tên bằng so sánh **tập hợp ký hiệu** qua `llvm-nm`. Member chỉ cần có một ký hiệu riêng cũng được giữ. `libperry_ui_macos.a` được tỉa từ 196 → 35 object mà không có lỗi link.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — thêm `secur32.lib` vào dòng link Windows.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` round-trip FP qua Ryū.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — nối codegen dispatch cho các wrapper format `perry/i18n`.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — codegen dispatch `perry/plugin`.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — widget Canvas qua codegen LLVM.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView qua codegen.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — widget Table qua codegen.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (một phần) — 11 nhánh dispatch helper stdlib.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — nhận thông báo nền trên iOS + Android (warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — fallback yếu cho hook FFI vòng lặp game trên watchOS.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — hook dispose `using` / `await using`.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — nâng alloca của args `js_native_call_method` lên block entry.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — nhánh Uint8Array của `substitute_locals`.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` nối từ đầu đến cuối (PR cộng đồng).

## 6\. Windows + Scoop

Câu chuyện toolchain Windows vẫn đang đơn giản hóa. **v0.5.353** ghim `clang -target` trên các build host — clang không phải MSVC trên PATH (MinGW / MSYS2 / Anaconda / bundle GNU của Rust) đang im lặng viết lại IR `x86_64-pc-windows-msvc` của Perry thành `windows-gnu`, và lld-link không thể giải tham chiếu `__main` mà emitter mingw32 của LLVM chèn vào. `probe_clang_default_triple` mới chạy `clang --version` một lần mỗi process và in một dòng ghi chú thông tin khi default của host là GNU nhưng đang target MSVC. Có thể tắt với `PERRY_NO_CLANG_PROBE=1`.

**v0.5.345** căn chỉnh ABI `perry-ui` Win64 với `perry-dispatch` — ba chữ ký extern runtime đã lệch (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). Trên ABI Win64, các arg vị trí kiểu integer và float chia sẻ chỉ số slot, nên một mismatch sẽ đọc rác từ register chưa khởi tạo. SysV (macOS / Linux) dùng pool register int/float tách rời và tình cờ đặt đúng bit hợp lệ — chỉ Windows mới crash, được fix trên cả 8 crate platform perry-ui-\*.

Sau đó: **`scoop install perry-ts/perry`**. Manifest ghim ở v0.5.345 (với `depends: main/llvm` để tự kéo về LLVM mặc định MSVC chính thức). Workflow release nay sản xuất các sidecar `<artifact>.sha256` bên cạnh từng archive, định dạng tương thích `sha256sum` cho mọi bumper package manager downstream.

```
# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Khép lại

Khuôn mẫu của giai đoạn này là sự tham gia của cộng đồng cộng với việc dọn dẹp nội bộ. **TheHypnoo** gửi ba PR đáng kể ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) nối `fs.appendFileSync`, [#232](https://github.com/PerryTS/perry/pull/232) byte body của `response.arrayBuffer`). Tracker giảm khoảng 30 issue. Compiler nhỏ đi 60% trên file lớn nhất và mọc thêm một walker exhaustive biến «quên cập nhật một trong bốn walker ad-hoc» từ một miscompile runtime thành lỗi `cargo build`. UI styling đạt mức tương đương trên mọi nền desktop, chỉ trừ shadow trên Windows. Geisterhand mọc thêm bề mặt devtools trên trình duyệt. Đường cài đặt trên Windows ngắn đi một lệnh.

Thử ngay:

```
# npm (mọi nền tảng)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update cho ứng dụng desktop
npm install @perry/updater

# Inspector trực tiếp
perry compile main.ts -o app --enable-geisterhand
./app &  # rồi mở http://localhost:7676
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
