export default function Content() {
  return (
    <>
      <p>
        Bài trước khép lại ở <strong>v0.5.306</strong> với câu chuyện gen-GC + JSON + benchmark. Bốn ngày sau, Perry đã ở <strong>v0.5.359</strong> — tức <strong>53 patch release</strong> — và câu chuyện lại khác. Không có release nào trong số đó là tiêu đề của những con số benchmark. Hầu hết đều là <strong>các issue trong tracker được đóng</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> đã có — auto-update theo phong cách Sparkle/Tauri cho ứng dụng desktop (Ed25519 trên SHA-256 digest, sentinel-rollback, relaunch tách rời). PR cộng đồng từ <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Phase D</strong> — một inspector trực tiếp tại <code>http://localhost:7676</code> với cây widget, chi tiết theo từng widget, dispatch click và chỉnh style trực tiếp qua <code>POST /style/:h</code>.</li>
        <li><strong>Refactor compiler.</strong> Trong khoảng v0.5.329 → v0.5.343, bốn file được nhắc đến nhiều nhất đã được cắt nhỏ: <code>lower::lower_expr</code> 6.687 → 624 LOC (−91%), <code>compile.rs</code> 9.391 → 3.783 LOC (−60%), <code>lower.rs</code> 13.591 → 7.554 LOC (−44%), <code>lower_call.rs</code> 7.000+ → 4.681 LOC (−33%). <code>walker.rs</code> mới biến lớp bug catch-all <code>_ =&gt; {}</code> thành lỗi compile.</li>
        <li><strong>UI styling Phase C đóng</strong> — props inline <code>style: {`{ ... }`}</code> trên mọi widget của Apple, Android, GTK4, Windows và Web. Windows được gắn 4/5 stub (decoration / opacity / borders); chỉ còn <code>widget.shadow</code> (follow-up DirectComposition).</li>
        <li><strong>Một bucket Scoop</strong> cho Windows: <code>scoop install perry-ts/perry</code>. Sidecar SHA-256 trong workflow release.</li>
        <li><strong>Làn sóng fix issue cộng đồng</strong> — khoảng 30 issue được đóng trên runtime, codegen, fetch, GTK4, linker Windows, async và stdlib.</li>
      </ul>

      <h2>1. perry/updater — auto-update cho ứng dụng desktop</h2>
      <p>
        Trước khi fix, Perry không có lộ trình cập nhật. Ứng dụng được phát hành, rồi phát hành nữa, vậy thôi. <strong>TheHypnoo</strong> mở <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> với toàn bộ câu chuyện:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback nếu lần khởi động trước bị crash

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // gọi sau khi build mới khởi động thành công`}</code></pre>
      <p>
        Mô hình tin cậy: <strong>Ed25519 trên SHA-256 digest của file</strong> (không phải trên byte file — giúp việc verify rẻ ngay cả với binary lớn). Manifest là JSON, có versioning theo schema, mỗi entry cho một bộ ba <code>&lt;os&gt;-&lt;arch&gt;</code>. Cài đặt nguyên tử với backup <code>&lt;exe&gt;.prev</code>, relaunch tách rời (<code>setsid</code> trên Unix, <code>DETACHED_PROCESS</code> trên Windows). Mobile bị loại khỏi thiết kế — App Store / Play Store sở hữu pipeline cài đặt ở mức OS.
      </p>
      <p>
        Hai điểm lạ của runtime Perry lộ ra khi viết smoke test, và được fix luôn:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> trả về một stub chỉ có metadata.</strong> Đã fix trong <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (cũng TheHypnoo) — <code>js_response_array_buffer</code> giờ allocate một <code>BufferHeader</code> thực và <code>memcpy</code> <code>resp.body</code> vào trong.</li>
        <li><strong><code>fs.appendFileSync</code> ghi 0 byte.</strong> Đã fix trong <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — đường lowering namespace-import (<code>import * as fs from &quot;fs&quot;</code>) không có nhánh cho <code>appendFileSync</code>, và codegen LLVM cũng chưa có nhánh cho biến thể HIR. Cả hai đều đã được nối.</li>
      </ul>
      <p>
        Tài liệu nằm ở <code>docs/src/updater/overview.md</code>.
      </p>

      <h2>2. Geisterhand: inspector trực tiếp tại localhost:7676</h2>
      <p>
        Geisterhand vốn là khung kiểm thử UI in-process của Perry — HTTP API trên cổng 7676 để snapshot trạng thái widget và dispatch click. Phase D biến nó thành một inspector kiểu devtools mà bạn có thể mở từ bất kỳ trình duyệt nào.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Bước 1 (v0.5.349)</strong> — <code>GET /</code> phục vụ một UI vanilla-JS một trang gồm cây widget, chi tiết theo widget (frame, value, raw JSON), auto-refresh 1,5 giây với pause/resume, và một nút &laquo;kích hoạt onClick&raquo;. Codegen ghim <code>INSPECTOR_HTML</code> chống lại lazy-load <code>-dead_strip</code> trên macOS để nó sống sót qua release build.</li>
        <li><strong>Bước 2 (v0.5.350)</strong> — <code>POST /style/:h</code> nhận một túi props JSON và áp dụng trực tiếp. 9 props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) chảy từ thread HTTP → thread chính qua pump-queue sẵn có. JSON sai → 400; handle sai → 400; props không nhận diện được sẽ bị lọc phía server và response liệt kê những props đã được áp.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        Dispatcher macOS đã được nối; Linux / Windows / iOS / tvOS / visionOS / Android theo cùng hình dạng và sẽ là kế tiếp.
      </p>

      <h2>3. Refactor compiler — cắt bốn file lớn nhất</h2>
      <p>
        Năm issue trong tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, cộng thêm phần đuôi dài) cùng dạng: một biến thể <code>Expr</code> mới được thêm vào <code>ir.rs</code>, nhưng một trong bốn walker ad-hoc trong <code>lower.rs</code> có catch-all <code>_ =&gt; {}</code> và lặng lẽ compile sai biến thể mới đó. Bắt cái này khi runtime thì đắt — đôi khi vô hình, đôi khi là SIGSEGV dưới SSO.
      </p>
      <p>
        <strong>v0.5.329</strong> giới thiệu <code>crates/perry-hir/src/walker.rs</code> với <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — match exhaustive trên cả 178 biến thể <code>Expr</code>, <strong>không có catch-all</strong>. Thêm một biến thể mới mà không liệt kê ở đây bây giờ là lỗi compile. Bốn người dùng (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) đã co lại:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Hàm</th>
              <th className="text-right py-2 px-3">Trước</th>
              <th className="text-right py-2 px-3">Sau</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−75%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−86%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−90%</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−84%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Tổng: <strong>−1.830 dòng descent trùng lặp</strong>, được thay bằng <strong>+1.840 dòng walker tập trung</strong> — net gần như phẳng, nhưng lớp bug đã biến mất.
      </p>
      <p>
        Điều đó mở khóa phần còn lại. <strong>v0.5.331 → v0.5.343</strong> chia tách bốn monolith trong 14 commit. Các con số tiêu đề:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">File</th>
              <th className="text-right py-2 px-3">Trước</th>
              <th className="text-right py-2 px-3">Sau</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6.687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9.391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3.783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13.591</td><td className="text-right py-2 px-3">7.554</td><td className="text-right py-2 px-3">−44%</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7.000+</td><td className="text-right py-2 px-3">4.681</td><td className="text-right py-2 px-3">−33%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Việc tách hạ cánh dưới dạng 19 sub-module tập trung: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, cộng thêm crate mới <code>crates/perry-dispatch</code> trở thành nguồn duy nhất của sự thật cho các bảng method UI / system / i18n (cú fan-out <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> từng gây các bất ngờ &laquo;compile được trên macOS, vỡ trên web&raquo; ở issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> nay là một cú lookup duy nhất).
      </p>
      <p>
        <strong>Các thắng lợi perf Tier 4</strong> đi cùng (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Gộp hai pass trong <code>inline_functions</code> và ba pass rayon trong <code>compile.rs</code> — tiết kiệm 5 lần quét module + 3 vòng round-trip scheduler mỗi lần compile.</li>
        <li>Giới hạn parse cache của <code>perry dev</code> ở 500 entry, FIFO eviction. Trước khi fix, một phiên đi qua <code>node_modules</code> có thể giữ trên 100 MB AST của SWC.</li>
        <li>Song song hóa vòng lặp ghi <code>.ll</code> sau codegen — wall-time nhanh 2–4 lần trên SSD với 50+ module.</li>
        <li><code>Arc&lt;I18nTable&gt;</code> thay vì clone bảng locale theo từng worker.</li>
      </ul>
      <p>
        Test workspace giữ ở <strong>434 passed / 0 failed / 5 ignored</strong> qua mỗi commit; gap test ở baseline 25/28; doc-test ở baseline 80/82.
      </p>

      <h2>4. UI styling Phase C, hoàn tất</h2>
      <p>
        Phase C là cuộc rollout của <code>style: {`{ ... }`}</code> inline. Các bước 1–7 đóng trong cửa sổ này:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — bề mặt kiểu <code>StyleProps</code> + <code>style:</code> inline trên Button.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — destructure inline color/padding/shadow trên mọi widget bảng, rồi đến VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — chuỗi hex + gradient + <code>parseColor</code> tại runtime cho giá trị động.</li>
        <li><strong>v0.5.312</strong> — tài liệu styling + issue tracking Windows.</li>
      </ul>
      <p>Sau đó là quét cross-platform:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 FFI styling được nối, cộng thêm 7 FFI thiếu đang chặn cổng doc-test trên Linux (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — đường ống bóng <code>CALayer</code> cho <code>widget.shadow</code> + hạ tầng visual_test; class-probe <code>set_color</code> cho widget không phải <code>NSTextField</code>.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button với <code>color: ...</code> đang gọi <code>setTextColor:</code> trên <code>UIButton</code>, vốn không cài đặt selector đó; panic của <code>objc2</code> vượt qua biên <code>extern &quot;C&quot;</code> và process bị abort. Đã fix theo cùng pattern class-probe như macOS — UIButton giờ đi qua <code>setTitleColor:forState:UIControlStateNormal</code>.</li>
        <li><strong>Windows</strong> (v0.5.347) — 4/5 stub styling được nối (<code>text.decoration</code> qua <code>LOGFONT</code> round-trip, <code>widget.opacity</code> qua <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, borders qua <code>SetWindowSubclass</code> + <code>WM_PAINT</code>). Chỉ còn <code>widget.shadow</code> (cần DirectComposition).</li>
      </ul>
      <p>
        Ma trận styling trong <code>docs/src/ui/styling-matrix.md</code> kết thúc cửa sổ với <strong>Web ở 43/43 Wired</strong>, <strong>Windows ở 42/43 Wired</strong>, phần còn lại đầy đủ.
      </p>

      <h2>5. Lượt rà soát đúng đắn của runtime — issue đến issue</h2>
      <p>
        Chủ đề của giai đoạn: mọi miscompile vào qua tracker đều biến thành fix hoặc lỗi compile-time. Điểm nhấn:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — method class bên trong <code>fn</code> không thể capture local của fn bao quanh. Repro nhiều module nay khớp byte-cho-byte với Node.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — unbox string-handle an toàn với SSO trên 7 site có toán hạng string: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, đầu vào digest crypto. Trước khi fix, mỗi cái hoặc trả rác im lặng hoặc SIGSEGV với toán hạng string inline.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — mảng <code>const</code> rỗng ở mức module bị mất các thao tác ghi <code>arr[i]=</code> từ trong các hàm. Lộ ra khi <code>discoverLevels()</code> của Bloom-Engine/jump điền <code>LEVEL_FILES</code> ở mức module qua index-assign và màn chọn level hiển thị trống.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> từ trong hàm async im lặng bị giới hạn ở 16 phần tử khi mảng vào dưới dạng tham số. Hàm async không được inline; realloc trả về một con trỏ mới mà người gọi không thấy. Fix: cài đặt một con trỏ forwarding tại vị trí cũ ở mỗi lần lớn lên, tận dụng cơ chế <code>GC_FLAG_FORWARDED</code> sẵn có của GC.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — dispatch tham số mặc định của method truyền rác khi caller bỏ qua các arg cuối. Hai phần đóng góp: declare method cross-module hardcode 6 double thay vì <code>arity + 1</code>, và <code>lower_class_method</code> hoàn toàn không gọi <code>build_default_param_stmts</code>. Lộ ra qua việc <code>findOne(filter, options = {`{}`})</code> của mongodb treo im lặng; fix đồng nhất giữa dispatch nội bộ và cross-module.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — ba bug fetch + promise độc lập từ một repro: api.github.com 403 cho ẩn danh (giờ đặt User-Agent mặc định), <code>.then(console.log)</code> treo mãi (callback null không đẩy entry vào TASK_QUEUE), mọi reject của fetch in <code>Uncaught exception: [object Object]</code> (NaN-box <code>*StringHeader</code> trần thay vì <code>ErrorHeader</code> thật).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — <code>Blob</code> thật với các method instance <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code>. Trước khi fix, <code>await response.blob()</code> trả về stub chỉ có metadata <code>{`{size, type}`}</code>. Fix ba phần đáp xuống runtime + HIR + codegen.</li>
      </ul>
      <p>Cùng vài cái nhỏ:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup tỉa quá đà các monomorphization generic trên Linux + silent-fallback link GTK4. Fix: thay lọc theo pattern tên bằng so sánh <strong>tập hợp ký hiệu</strong> qua <code>llvm-nm</code>. Member chỉ cần có một ký hiệu riêng cũng được giữ. <code>libperry_ui_macos.a</code> được tỉa từ 196 → 35 object mà không có lỗi link.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — thêm <code>secur32.lib</code> vào dòng link Windows.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> round-trip FP qua Ryū.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — nối codegen dispatch cho các wrapper format <code>perry/i18n</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — codegen dispatch <code>perry/plugin</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — widget Canvas qua codegen LLVM.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView qua codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — widget Table qua codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (một phần) — 11 nhánh dispatch helper stdlib.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — nhận thông báo nền trên iOS + Android (warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — fallback yếu cho hook FFI vòng lặp game trên watchOS.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — hook dispose <code>using</code> / <code>await using</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — nâng alloca của args <code>js_native_call_method</code> lên block entry.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — nhánh Uint8Array của <code>substitute_locals</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> nối từ đầu đến cuối (PR cộng đồng).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        Câu chuyện toolchain Windows vẫn đang đơn giản hóa. <strong>v0.5.353</strong> ghim <code>clang -target</code> trên các build host — clang không phải MSVC trên PATH (MinGW / MSYS2 / Anaconda / bundle GNU của Rust) đang im lặng viết lại IR <code>x86_64-pc-windows-msvc</code> của Perry thành <code>windows-gnu</code>, và lld-link không thể giải tham chiếu <code>__main</code> mà emitter mingw32 của LLVM chèn vào. <code>probe_clang_default_triple</code> mới chạy <code>clang --version</code> một lần mỗi process và in một dòng ghi chú thông tin khi default của host là GNU nhưng đang target MSVC. Có thể tắt với <code>PERRY_NO_CLANG_PROBE=1</code>.
      </p>
      <p>
        <strong>v0.5.345</strong> căn chỉnh ABI <code>perry-ui</code> Win64 với <code>perry-dispatch</code> — ba chữ ký extern runtime đã lệch (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). Trên ABI Win64, các arg vị trí kiểu integer và float chia sẻ chỉ số slot, nên một mismatch sẽ đọc rác từ register chưa khởi tạo. SysV (macOS / Linux) dùng pool register int/float tách rời và tình cờ đặt đúng bit hợp lệ — chỉ Windows mới crash, được fix trên cả 8 crate platform perry-ui-*.
      </p>
      <p>
        Sau đó: <strong><code>scoop install perry-ts/perry</code></strong>. Manifest ghim ở v0.5.345 (với <code>depends: main/llvm</code> để tự kéo về LLVM mặc định MSVC chính thức). Workflow release nay sản xuất các sidecar <code>&lt;artifact&gt;.sha256</code> bên cạnh từng archive, định dạng tương thích <code>sha256sum</code> cho mọi bumper package manager downstream.
      </p>
      <pre><code>{`# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Khép lại</h2>
      <p>
        Khuôn mẫu của giai đoạn này là sự tham gia của cộng đồng cộng với việc dọn dẹp nội bộ. <strong>TheHypnoo</strong> gửi ba PR đáng kể (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> nối <code>fs.appendFileSync</code>, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> byte body của <code>response.arrayBuffer</code>). Tracker giảm khoảng 30 issue. Compiler nhỏ đi 60% trên file lớn nhất và mọc thêm một walker exhaustive biến &laquo;quên cập nhật một trong bốn walker ad-hoc&raquo; từ một miscompile runtime thành lỗi <code>cargo build</code>. UI styling đạt mức tương đương trên mọi nền desktop, chỉ trừ shadow trên Windows. Geisterhand mọc thêm bề mặt devtools trên trình duyệt. Đường cài đặt trên Windows ngắn đi một lệnh.
      </p>
      <p>Thử ngay:</p>
      <pre><code>{`# npm (mọi nền tảng)
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
./app &  # rồi mở http://localhost:7676`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
