export default function Content() {
  return (
    <>
      <p>
        B&agrave;i viết trước kết th&uacute;c ở <strong>v0.5.174</strong> với một ti&ecirc;u đề: cuối c&ugrave;ng Perry đ&atilde; thắng mọi benchmark trong bộ in-tree so với cả Node v&agrave; Bun. Sau ba ng&agrave;y l&agrave;m việc v&agrave; một tồn đọng commit về GC + JSON, Perry đang ở <strong>v0.5.306</strong> &mdash; đ&oacute; l&agrave; <strong>132 bản ph&aacute;t h&agrave;nh patch</strong> &mdash; v&agrave; c&acirc;u chuyện đ&atilde; kh&aacute;c. Ti&ecirc;u đề kh&ocirc;ng phải l&agrave; tăng tốc 547 lần hay một cột thắng mới. Đ&oacute; l&agrave; c&ocirc;ng việc khiến những chiến thắng đ&oacute; c&oacute; thể bảo vệ được.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Generational GC</strong> được ship l&agrave;m mặc định. Phase A đến D đ&atilde; ho&agrave;n th&agrave;nh từ v0.5.217&ndash;v0.5.237.</li>
        <li><strong>Small String Optimization</strong> được ship l&agrave;m mặc định. Step 1.5 &rarr; 2 ho&agrave;n th&agrave;nh ở v0.5.213&ndash;v0.5.216.</li>
        <li><strong>Pipeline JSON</strong> c&oacute; parser dạng tape, lazy parse, lazy stringify, v&agrave; sparse materialization theo từng phần tử. Validate-and-roundtrip mặc định giờ l&agrave; <strong>median 75 ms</strong> &mdash; tốt nhất trong nh&oacute;m dynamic-typing.</li>
        <li><strong>Trang benchmarks</strong> được viết lại từ đầu đến cuối với <strong>RUNS=11 median + p95 + σ + min + max</strong>, simdjson v&agrave; AssemblyScript+json-as được th&ecirc;m v&agrave;o l&agrave;m peer, c&aacute;c probe tối ưu được t&aacute;ch khỏi so s&aacute;nh thực tế, v&agrave; mọi điểm yếu của Perry được phơi b&agrave;y một c&aacute;ch trung thực.</li>
      </ul>
      <p>
        Dàn diễn vi&ecirc;n phụ l&agrave; một loạt c&aacute;c bản sửa t&iacute;nh đ&uacute;ng đắn ổn định: Promise microtask FIFO, NaN equality v&agrave; định dạng số ECMAScript, BigInt two&apos;s complement, AsyncLocalStorage end-to-end, runtime cho decimal.js + ioredis + commander, v&agrave; một segfault <code>JSON.stringify</code> tr&ecirc;n f64 thuần đ&atilde; ẩn dưới c&aacute;c đường tape. Cộng với toolchain Windows cuối c&ugrave;ng cũng nhẹ nh&agrave;ng: LLVM + xwin, kh&ocirc;ng cần c&agrave;i Visual Studio.
      </p>

      <h2>1. Generational GC, mặc định bật</h2>
      <p>
        Generational GC đ&atilde; l&agrave; một cuộc triển khai theo giai đoạn trong hai th&aacute;ng. T&oacute;m tắt c&aacute;c giai đoạn đ&atilde; đ&oacute;ng trong cửa sổ n&agrave;y:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217&ndash;v0.5.221</strong> &mdash; Phase A: bộ khung runtime shadow-stack, ph&aacute;t emit push/pop, threading slot-map, mirror shadow cho <code>Let</code>/<code>LocalSet</code>, v&agrave; root scanner.</li>
        <li><strong>v0.5.222</strong> &mdash; Phase B: t&aacute;ch nursery + arena old-gen.</li>
        <li><strong>v0.5.223&ndash;v0.5.225</strong> &mdash; Phase C1&ndash;C2: hạ tầng runtime cho write-barrier, codegen ph&aacute;t emit barrier, mọi heap store đều đi qua n&oacute;.</li>
        <li><strong>v0.5.226&ndash;v0.5.228</strong> &mdash; Phase C3a&ndash;C4: c&aacute;c root remembered-set chảy v&agrave;o mark + clear; minor GC trace bỏ qua old-gen; tenuring kh&ocirc;ng di chuyển.</li>
        <li><strong>v0.5.229&ndash;v0.5.236</strong> &mdash; Phase C4b α/β/γ/δ: hạ tầng forwarding-pointer, pass pinning + evacuation, scanner + transitive pinning, viết lại reference, c&aacute;c block nursery rảnh được trả về OS, GC trigger bị giới hạn ở ngưỡng ban đầu.</li>
        <li><strong>v0.5.237</strong> &mdash; Phase D phần 1: <code>PERRY_GEN_GC=1</code> mặc định.</li>
        <li><strong>v0.5.238</strong> &mdash; Phase D phần 2: <code>PERRY_SHADOW_STACK=1</code> mặc định.</li>
        <li><strong>v0.5.239&ndash;v0.5.240</strong> &mdash; t&agrave;i liệu kết th&uacute;c: roadmap đ&atilde; ho&agrave;n thiện, phụ lục lineage học thuật + c&ocirc;ng nghiệp (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        Chiến thắng đo lường được quan trọng nhất: <code>test_memory_json_churn</code> giảm từ <strong>115 MB &rarr; 91 MB</strong> peak RSS đ&uacute;ng l&uacute;c gen-GC mặc định bật. C&aacute;c regression compute nhỏ v&agrave; được liệt k&ecirc; kh&ocirc;ng xin lỗi &mdash; <code>nested_loops</code> 8 &rarr; 18 ms, <code>accumulate</code> 24 &rarr; 34 ms, <code>object_create</code> 0 &rarr; 1 ms, <code>array_read</code> / <code>array_write</code> +1 ms mỗi c&aacute;i. Lối tho&aacute;t (<code>PERRY_GEN_GC=0</code>) kh&ocirc;i phục c&aacute;c con số cũ; sự đ&aacute;nh đổi l&agrave; c&oacute; chủ đ&iacute;ch, v&agrave; trang benchmarks giờ liệt k&ecirc; cả hai h&agrave;ng cạnh nhau để người đọc c&oacute; thể chọn.
      </p>

      <h2>2. Small String Optimization, mặc định bật</h2>
      <p>
        SSO l&agrave; một biểu diễn chuỗi inline 22 byte tr&aacute;nh cấp ph&aacute;t heap cho c&aacute;c chuỗi ngắn &mdash; key JSON điển h&igrave;nh (2&ndash;8 byte) v&agrave; gi&aacute; trị ngắn rơi v&agrave;o dạng inline. Việc triển khai nhỏ ở bề mặt v&agrave; lớn b&ecirc;n dưới:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: hạ tầng SSO (biểu diễn + accessor).</li>
        <li><strong>v0.5.214</strong>: Step 1 c&aacute;c arm consumer + cổng <code>PERRY_SSO_FORCE</code> để kiểm thử.</li>
        <li><strong>v0.5.215</strong>: Step 1.5 codegen <code>PropertyGet</code> ba nh&aacute;nh &mdash; fast path cho chuỗi inline, fast path cho chuỗi heap, slow path cho phần c&ograve;n lại.</li>
        <li><strong>v0.5.216</strong>: Step 2 lật &mdash; ph&aacute;t emit SSO mặc định.</li>
      </ul>
      <p>
        C&aacute;c follow-up trong v0.5.279 đ&atilde; đ&oacute;ng bug NaN cuối c&ugrave;ng tr&ecirc;n property-read xuất hiện khi SSO chạy n&oacute;ng, v&agrave; bản sửa dispatch getter cross-module xếp chuỗi ở v0.5.272 đ&oacute;ng một c&aacute;i nữa. Cả hai đ&atilde; nằm trong danh s&aacute;ch trước khi mặc định bật; cả hai đều ship m&agrave; kh&ocirc;ng c&oacute; regression hiệu năng.
      </p>

      <h2>3. JSON: parse dựa tr&ecirc;n tape, mặc định lazy</h2>
      <p>
        Pipeline JSON nhận được cuộc viết lại x&acirc;m lấn nhất của giai đoạn n&agrave;y. H&agrave;nh vi cũ: <code>JSON.parse</code> x&acirc;y dựng một c&acirc;y NaN-boxed value được materialize đầy đủ. H&agrave;nh vi mới: <code>JSON.parse</code> x&acirc;y dựng một tape 12 byte mỗi value v&agrave; materialize lazy &mdash; chỉ những value bạn thực sự đọc mới phải trả chi ph&iacute; materialize. Stringify tr&ecirc;n một parse chưa bị mutate giờ l&agrave; một memcpy của input gốc, c&ugrave;ng mẹo fast-path m&agrave; simdjson sử dụng với <code>raw_json()</code>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> parse hướng schema (Step 1). Shape biết tại thời điểm bi&ecirc;n dịch cho ph&eacute;p compiler ph&aacute;t emit truy cập key đ&atilde; được resolve sẵn.</li>
        <li><strong>v0.5.203</strong>: nền tảng parse dựa tr&ecirc;n tape &mdash; Step 2 Phase 1.</li>
        <li><strong>v0.5.204</strong>: lazy parse + lazy stringify &mdash; Step 2 Phase 2+4.</li>
        <li><strong>v0.5.206</strong>: truy cập theo chỉ số an to&agrave;n với lazy + c&aacute;c trường hợp bi&ecirc;n &mdash; Step 2 Phase 3.</li>
        <li><strong>v0.5.208</strong>: sparse materialization theo từng phần tử &mdash; Step 2 Phase 5b.</li>
        <li><strong>v0.5.209</strong>: walk cursor + ngưỡng materialize th&iacute;ch ứng.</li>
        <li><strong>v0.5.210</strong>: lật lazy parse l&agrave;m mặc định cho blob ≥1 KB.</li>
      </ul>
      <p>
        Kết quả tr&ecirc;n workload m&agrave; lazy tape được thiết kế ri&ecirc;ng cho (10k bản ghi, blob ~1 MB, parse &rarr; stringify kh&ocirc;ng c&oacute; iteration trung gian):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Triển khai</th>
              <th className="text-right py-2 px-3">Median (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">Peak RSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry tại <strong>median 75 ms</strong> l&agrave; runtime dynamic-typing nhanh nhất trong so s&aacute;nh &mdash; thắng Bun (259 ms), thắng Node (394 ms), thắng JIT server của Kotlin (453 ms). simdjson tại 24 ms l&agrave; trần C++ tăng tốc bằng SIMD v&agrave; sống tr&ecirc;n trang một c&aacute;ch c&oacute; chủ đ&iacute;ch, kh&ocirc;ng giấu sau một cherry-pick. Perry kh&ocirc;ng đ&aacute;nh bại n&oacute;. Mục đ&iacute;ch l&agrave; chỉ ra khoảng c&aacute;ch để đ&oacute;ng n&oacute; c&oacute; mục ti&ecirc;u &mdash; được theo d&otilde;i trong <code>docs/json-typed-parse-plan.md</code>.
      </p>
      <p>
        Bench đồng h&agrave;nh trung thực l&agrave; <strong>parse-and-iterate</strong>: c&ugrave;ng blob, nhưng mỗi iteration cộng <code>nested.x</code> của mọi bản ghi, buộc lazy tape phải materialize. Ở đ&oacute; Perry rơi xuống <strong>466 ms</strong> &mdash; chậm hơn 375 ms của lối tho&aacute;t mark-sweep v&igrave; tape phải trả chi ph&iacute; m&agrave; n&oacute; kh&ocirc;ng thể amortize. H&agrave;ng đ&oacute; nằm trong TL;DR §B. Khi bạn kh&ocirc;ng thể tr&aacute;nh c&ocirc;ng việc, lazy tape kh&ocirc;ng giả vờ.
      </p>

      <h2>4. Trang benchmarks, viết lại</h2>
      <p>
        Ba điều đ&atilde; thay đổi về c&aacute;ch Perry tr&igrave;nh b&agrave;y c&aacute;c con số hiệu năng.
      </p>
      <p>
        <strong>RUNS=11 median + p95 + σ + min + max, kh&ocirc;ng phải best-of-N.</strong> Best-of-N &acirc;m thầm bỏ tail latency; tr&ecirc;n phần cứng n&agrave;y n&oacute; đ&atilde; che giấu c&aacute;c outlier 9,4 gi&acirc;y của Python <code>accumulate</code> v&agrave; spike p95 5,3 gi&acirc;y của Swift JSON. Median đặt c&aacute;c tail trở lại tr&ecirc;n trang. Thay đổi phương ph&aacute;p luận đ&atilde; ho&agrave;n th&agrave;nh ở v0.5.248; mọi cell trong TL;DR §A v&agrave; §B đều l&agrave; RUNS=11 mới t&iacute;nh đến <strong>2026-04-25</strong>.
      </p>
      <p>
        <strong>C&aacute;c probe tối ưu được t&aacute;ch khỏi hiệu năng runtime thực.</strong> Năm cell hiển thị Perry tại 12&ndash;34 ms so với Rust/C++ tại 98 ms &mdash; <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> &mdash; đo tư thế cờ compiler, kh&ocirc;ng phải silicon. Giờ ch&uacute;ng nằm trong tiểu mục ri&ecirc;ng, với một đoạn b&ecirc;n tr&ecirc;n giải th&iacute;ch rằng <code>clang++ -O3 -ffast-math</code> đ&oacute;ng ch&uacute;ng trong v&ograve;ng một mili gi&acirc;y. Kernel runtime thực ti&ecirc;u đề l&agrave; <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 &mdash; Perry ngồi đ&uacute;ng giữa nh&oacute;m no-FMA-contract tr&ecirc;n một kernel m&agrave; compiler thực sự kh&ocirc;ng thể gấp c&ocirc;ng việc đi. Đ&oacute; l&agrave; so s&aacute;nh trung thực.
      </p>
      <p>
        <strong>Th&ecirc;m peer.</strong> simdjson (4.3.0) giờ c&oacute; trong cả hai bảng JSON &mdash; trần parse-throughput của C++, tr&ecirc;n trang để người đọc c&oacute; thể thấy khoảng c&aacute;ch. AssemblyScript với json-as (1.3.2) l&agrave; peer TS-to-native c&oacute; thể c&agrave;i đặt gần nhất; porffor segfault tr&ecirc;n workload ở k&iacute;ch thước n&agrave;y, Static Hermes kh&ocirc;ng c&agrave;i được tr&ecirc;n macOS arm64. Kotlin với kotlinx.serialization gia nhập polyglot JSON ở v0.5.241&ndash;v0.5.242. Mọi h&agrave;ng đều thật, mọi disclaimer đều ở tr&ecirc;n trang.
      </p>

      <h2>5. Bảng compute polyglot</h2>
      <p>
        C&aacute;c kernel ti&ecirc;u đề thực sự kh&ocirc;ng-thể-gấp, RUNS=11 median, l&agrave;m mới 2026-04-25 ở v0.5.249:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Tr&ecirc;n <code>fibonacci</code>, Perry b&aacute;m s&aacute;t nh&oacute;m compiled trong v&ograve;ng 3&ndash;15 ms. JIT HotSpot của Java nhanh hơn ~11% nhờ inline lời gọi đệ quy. Tr&ecirc;n <code>loop_data_dependent</code>, kernel chia th&agrave;nh hai cụm FP-contract: nh&oacute;m FMA-contract ở ~128 ms (Go mặc định, <code>g++ -O3</code> tr&ecirc;n Apple Clang &mdash; cả hai fuse <code>sum * a + b</code> th&agrave;nh một FMADDD đơn) v&agrave; nh&oacute;m no-contract ở 229&ndash;235 ms (Perry, Rust mặc định, Swift, Java kh&ocirc;ng c&oacute; <code>-XX:+UseFMA</code>, Bun) chạy FMUL + FADD scalar. LLVM khớp với nh&oacute;m FMA bằng <code>-ffp-contract=fast</code>; Perry kh&ocirc;ng bật n&oacute; mặc định. <code>nested_loops</code> bị giới hạn cache, kh&ocirc;ng phải compute; mọi người đều rơi v&agrave;o 8&ndash;21 ms.
      </p>

      <h2>6. Toolchain Windows, nhẹ nh&agrave;ng</h2>
      <p>
        Người d&ugrave;ng Windows kh&ocirc;ng c&ograve;n cần c&agrave;i Visual Studio. <strong>v0.5.199</strong> đ&oacute;ng <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>: <code>perry setup windows</code> + winget LLVM + xwin thay thế to&agrave;n bộ c&acirc;y VS BuildTools. <code>v0.5.201</code> bỏ cổng cfg tr&ecirc;n <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> để việc kh&aacute;m ph&aacute; đường dẫn hoạt động tr&ecirc;n mọi nền tảng nhắm đến Windows, kh&ocirc;ng chỉ host macOS.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Đợt s&agrave;ng lọc t&iacute;nh đ&uacute;ng đắn runtime</h2>
      <p>
        Một chủ đề của giai đoạn n&agrave;y: c&aacute;c sai lệch runtime &acirc;m thầm so với V8/JSC biến th&agrave;nh hoặc bản sửa hoặc lỗi bi&ecirc;n dịch. C&aacute;c c&aacute;i kh&ocirc;ng tầm thường:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: <code>BigInt.fromTwos</code>/<code>toTwos</code> two&apos;s complement.</li>
        <li><strong>v0.5.263</strong>: ph&acirc;n biệt kiểu non-promise của <code>Promise.all</code>/<code>race</code>/<code>any</code>.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + định dạng số ECMAScript (<code>3 &rarr; &quot;3&quot;</code>, kh&ocirc;ng phải <code>&quot;3.0&quot;</code>; <code>-0 &rarr; &quot;0&quot;</code>; v.v.).</li>
        <li><strong>v0.5.280</strong>: ép kiểu ToInt32 cho <code>NaN</code>/<code>Infinity</code> trong <code>(x) | 0</code>.</li>
        <li><strong>v0.5.284</strong>: Promise microtask FIFO + lan truyền handler bị throw.</li>
        <li><strong>v0.5.286</strong>: <code>JSON.stringify</code> của một f64 thuần segfault dưới c&aacute;c đường tape.</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> trả về Buffer khi kh&ocirc;ng truyền encoding (khớp Node).</li>
        <li><strong>v0.5.272</strong>: dispatch getter cross-module xếp chuỗi trả về <code>undefined</code>.</li>
      </ul>
      <p>
        C&aacute;c follow-up stdlib cho issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> đ&atilde; được lấp đầy: AsyncLocalStorage end-to-end (v0.5.261), runtime commander + codegen thực sự gọi <code>.action()</code> (v0.5.250), code decimal.js (v0.5.259), Redis ioredis end-to-end (v0.5.270), pattern async-factory pg + mongo (v0.5.275), v&agrave; c&ugrave;ng bug async-factory tr&ecirc;n EE/LRU/WSS (v0.5.252).
      </p>
      <p>
        Về ph&iacute;a <code>perry/ui</code>: callback tap th&ocirc;ng b&aacute;o (#97) được kết nối tr&ecirc;n cả Apple (v0.5.254) v&agrave; Android (v0.5.258); l&ecirc;n lịch + hủy th&ocirc;ng b&aacute;o cục bộ (#96, v0.5.244); FCM register + receive tr&ecirc;n Android (v0.5.262).
      </p>

      <h2>8. Kết luận</h2>
      <p>
        Mẫu của khoảng thời gian n&agrave;y kh&ocirc;ng phải l&agrave; những con số ti&ecirc;u đề. Đ&oacute; l&agrave; c&ocirc;ng việc l&agrave;m cho c&aacute;c chiến thắng hiện c&oacute; sống s&oacute;t qua sự xem x&eacute;t kỹ lưỡng: một generational GC bắt được c&aacute;c workload cấp ph&aacute;t li&ecirc;n tục, một SSO đ&oacute;ng khoảng c&aacute;ch chi ph&iacute; chuỗi ngắn, một pipeline JSON khai th&aacute;c cấu tr&uacute;c &ldquo;kh&ocirc;ng sửa đổi&rdquo; của workload phổ biến nhất, v&agrave; một trang benchmarks đo median thay v&igrave; best-of-N v&agrave; hiển thị trần parse 24 ms của simdjson tr&ecirc;n c&ugrave;ng h&agrave;ng với 75 ms của Perry. Người đọc được thấy khoảng c&aacute;ch &mdash; v&agrave; vị tr&iacute; Perry so với s&agrave;n.
      </p>
      <p>
        H&atilde;y thử n&oacute;:
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        M&atilde; nguồn: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Benchmarks: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
