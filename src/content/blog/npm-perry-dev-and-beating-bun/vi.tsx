export default function Content() {
  return (
    <>
      <p>
        B&agrave;i viết trước kết th&uacute;c với Perry ở v0.5.80 v&agrave; một thất bại cứng đầu tr&ecirc;n bảng benchmark: <code>JSON.parse</code>/<code>stringify</code> roundtrip vẫn chậm hơn Node 1,6 lần. S&aacute;u ng&agrave;y sau Perry đ&atilde; ở <strong>v0.5.174</strong> &mdash; đ&oacute; l&agrave; <strong>94 bản ph&aacute;t h&agrave;nh patch</strong> &mdash; v&agrave; ba điều đ&atilde; thay đổi đ&aacute;ng để chỉ ra trước bất cứ điều g&igrave; kh&aacute;c:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> được ph&aacute;t h&agrave;nh tr&ecirc;n <strong>npm</strong>. Một lệnh duy nhất c&agrave;i đặt Perry tr&ecirc;n mọi nền tảng được hỗ trợ.</li>
        <li><strong><code>perry dev</code></strong> th&ecirc;m t&iacute;nh năng tự động bi&ecirc;n dịch lại ở chế độ watch-mode, tr&ecirc;n nền một AST cache trong bộ nhớ mới v&agrave; object cache tr&ecirc;n đĩa theo từng module.</li>
        <li>Khoảng c&aacute;ch <code>json_roundtrip</code> đ&atilde; được đ&oacute;ng lại. Perry giờ <strong>thắng Node v&agrave; Bun tr&ecirc;n mọi benchmark</strong> trong bộ ch&iacute;nh (15/15 so với cả hai).</li>
      </ul>
      <p>
        Phần c&ograve;n lại của b&agrave;i viết l&agrave; dàn diễn viên phụ: c&aacute;c bản sửa WebAssembly, watchOS cuối c&ugrave;ng đ&atilde; bi&ecirc;n dịch end-to-end, c&aacute;c primitive <code>perry/thread</code> được kết nối hoàn chỉnh, v&agrave; một loạt chiến thắng về t&iacute;nh nghi&ecirc;m ngặt tại thời điểm bi&ecirc;n dịch biến những lỗi &acirc;m thầm th&agrave;nh lỗi thật sự.
      </p>

      <h2>1. <code>@perryts/perry</code> tr&ecirc;n npm</h2>
      <p>
        Perry lu&ocirc;n được c&agrave;i qua Homebrew tr&ecirc;n macOS v&agrave; APT tr&ecirc;n Debian/Ubuntu. Phủ s&oacute;ng tốt cho c&aacute;c lập tr&igrave;nh vi&ecirc;n tr&ecirc;n những nền tảng đ&oacute;, kh&ocirc;ng c&oacute; g&igrave; cho người d&ugrave;ng Windows trừ khi họ build từ source, v&agrave; kh&ocirc;ng c&oacute; g&igrave; đồng nhất trong một đội ngũ kết hợp Mac, Linux v&agrave; Windows. v0.5.107 đ&atilde; l&agrave;m cho vấn đề đ&oacute; biến mất.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        G&oacute;i n&agrave;y l&agrave; một launcher mỏng phụ thuộc v&agrave;o bảy g&oacute;i t&ugrave;y chọn theo nền tảng &mdash; macOS arm64/x64, Linux x64/arm64 tr&ecirc;n cả glibc v&agrave; musl, Windows x64 &mdash; v&agrave; npm chỉ c&agrave;i c&aacute;i ph&ugrave; hợp với m&aacute;y của bạn. K&iacute;ch thước nhị ph&acirc;n mỗi nền tảng ở mức megabyte một chữ số thấp. Qu&aacute; tr&igrave;nh c&agrave;i đặt chỉ mất v&agrave;i gi&acirc;y. Cũng c&oacute; đường c&agrave;i đặt global (<code>npm install -g @perryts/perry</code>) nếu bạn th&iacute;ch, nhưng c&agrave;i đặt cục bộ cho dự &aacute;n ghim phi&ecirc;n bản compiler b&ecirc;n cạnh dependency của bạn, đ&oacute; l&agrave; mặc định đ&uacute;ng đắn.
      </p>
      <p>
        Việc publish đi qua OIDC Trusted Publisher n&ecirc;n mọi bản ph&aacute;t h&agrave;nh đều c&oacute; provenance v&agrave; gắn ngược lại với job CI đ&atilde; build n&oacute;. Đ&oacute; l&agrave; một ng&agrave;y c&ocirc;ng việc CI ri&ecirc;ng &mdash; nhiều commit CI <code>v0.5.107</code> đuổi theo đ&uacute;ng sự kết hợp <code>--provenance</code> / phi&ecirc;n bản npm / đường dẫn workflow &mdash; nhưng n&oacute; đ&atilde; ho&agrave;n tất, v&agrave; mọi bản ph&aacute;t h&agrave;nh kể từ đ&oacute; đều sạch. Người d&ugrave;ng Windows giờ l&agrave; c&ocirc;ng d&acirc;n hạng nhất, v&agrave; sự ma s&aacute;t giữa c&aacute;c đội &ldquo;c&agrave;i theo c&aacute;ch OS của bạn th&iacute;ch&rdquo; đ&atilde; biến mất.
      </p>

      <h2>2. <code>perry dev</code> &mdash; chế độ watch</h2>
      <p>
        v0.5.143 th&ecirc;m một CLI subcommand mới:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        Chỉ vậy th&ocirc;i. N&oacute; theo d&otilde;i dự &aacute;n của bạn, bi&ecirc;n dịch lại khi lưu, v&agrave; khởi động lại nhị ph&acirc;n của bạn. Cảm hứng l&agrave; Vite v&agrave; <code>nodemon</code>; mục đ&iacute;ch l&agrave; để ngừng giả vờ rằng quy tr&igrave;nh compiler-đến-nhị-ph&acirc;n phải c&oacute; cảm gi&aacute;c chậm hơn một runtime. Đối với hầu hết dự &aacute;n, <code>perry dev</code> rebuild trong dưới một gi&acirc;y tr&ecirc;n cache n&oacute;ng.
      </p>
      <p>
        Phần &ldquo;cache n&oacute;ng&rdquo; rất quan trọng. Hai cache mới ra mắt c&ugrave;ng với <code>perry dev</code>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>AST cache trong bộ nhớ</strong> (v0.5.156). Trong c&aacute;c lần rebuild của một phi&ecirc;n <code>perry dev</code>, Perry giữ AST đ&atilde; được parse cho mọi module chưa thay đổi tr&ecirc;n đĩa. Sửa một file sẽ re-parse một file, kh&ocirc;ng phải to&agrave;n bộ đồ thị module.
        </li>
        <li>
          <strong>Object cache tr&ecirc;n đĩa theo từng module (V2.2)</strong>. Mỗi module được bi&ecirc;n dịch th&agrave;nh file <code>.o</code> ri&ecirc;ng v&agrave; được hash; c&aacute;c module kh&ocirc;ng thay đổi bỏ qua codegen ho&agrave;n to&agrave;n v&agrave; linker lấy object đ&atilde; được cache. Đầu ra verbose của cache khớp với spec trong <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>, v&agrave; một v&ograve;ng audit tăng cường ở v0.5.160 đ&atilde; đ&oacute;ng c&aacute;c trường hợp bi&ecirc;n khi c&aacute;c entry cache cũ c&oacute; thể sống s&oacute;t qua một thay đổi header.
        </li>
      </ul>
      <p>
        Hai cache cộng hưởng với nhau. Lần chỉnh sửa đầu ti&ecirc;n của phi&ecirc;n l&agrave; bi&ecirc;n dịch đầy đủ; mọi thứ sau đ&oacute; chỉ l&agrave;m c&ocirc;ng việc tỷ lệ với những g&igrave; bạn thực sự thay đổi. Đ&acirc;y l&agrave; thay đổi DX lớn nhất trong tuần.
      </p>

      <h2>3. Thắng Bun tr&ecirc;n mọi benchmark</h2>
      <p>
        Ở v0.5.166, README c&oacute; một lưu &yacute; trung thực: Perry chậm hơn Node 1,6 lần tr&ecirc;n <code>json_roundtrip</code> (50 lần <code>JSON.parse</code> + <code>JSON.stringify</code> tr&ecirc;n một blob 1MB, 10K mục), v&agrave; chậm hơn Bun 2,4 lần. Issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> theo d&otilde;i phần tiếp theo. Đến v0.5.173 &mdash; bảy ng&agrave;y sau &mdash; khoảng c&aacute;ch đ&oacute; đ&atilde; đ&oacute;ng lại.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry giờ thắng mọi workload trong bộ benchmark ch&iacute;nh &mdash; <strong>15/15 so với Node, 15/15 so với Bun</strong>, best-of-5 run tr&ecirc;n macOS ARM64. Bun 1.3 vẫn dẫn đầu về peak RSS (84MB so với 310MB của Perry tr&ecirc;n <code>json_roundtrip</code>), vậy n&ecirc;n &aacute;p lực allocator l&agrave; điều tiếp theo cần đ&oacute;ng, nhưng độ trễ th&ocirc; thuộc về Perry.
      </p>
      <p>
        Việc đ&oacute;ng khoảng c&aacute;ch JSON kh&ocirc;ng phải l&agrave; một thay đổi duy nhất &mdash; đ&oacute; l&agrave; sự t&iacute;ch lũy của c&ocirc;ng việc object-layout parity đ&atilde; chạy suốt tuần n&agrave;y: Phase 1 suy luận shape cho object-literal (v0.5.167), Phase 4 suy luận kiểu trả về dựa tr&ecirc;n body cho c&aacute;c h&agrave;m tự do, phương thức class, getter, v&agrave; arrow function (v0.5.169), v&agrave; Phase 4.1 suy luận kiểu trả về của lời gọi phương thức (v0.5.170). Chủ đề cũng giống b&agrave;i trước: cho LLVM đủ cấu tr&uacute;c tĩnh để nh&igrave;n xuy&ecirc;n qua, v&agrave; optimizer sẽ l&agrave;m phần c&ograve;n lại.
      </p>
      <p>
        v0.5.164 cũng kh&ocirc;i phục autovectorization accumulator song song <code>&lt;2 x double&gt;</code> tr&ecirc;n c&aacute;c v&ograve;ng lặp reduction pure-fadd, vốn đ&atilde; regress &acirc;m thầm ở đ&acirc;u đ&oacute; trong khoảng v0.5.9x&rarr;v0.5.16x. Đ&oacute; l&agrave; điều đưa <code>math_intensive</code> v&agrave; <code>accumulate</code> trở lại vị tr&iacute; dẫn trước 3-4 lần so với Rust/C++/Go/Swift &mdash; c&ugrave;ng LLVM, một cờ <code>reassoc contract</code>, một body v&ograve;ng lặp được vectorize.
      </p>

      <h2>4. <code>perry/ui</code> v&agrave; doc-tests</h2>
      <p>
        Bốn khoảng trống c&ograve;n lại của perry/ui đ&atilde; được đ&oacute;ng ở v0.5.151. B&ecirc;n cạnh đ&oacute;, v0.5.119 chuyển việc sử dụng sai API perry/ui &acirc;m thầm từ &ldquo;bi&ecirc;n dịch v&agrave; kh&ocirc;ng l&agrave;m g&igrave; cả&rdquo; th&agrave;nh lỗi bi&ecirc;n dịch cứng &mdash; c&ugrave;ng l&yacute; luận như v0.5.165 &aacute;p dụng cho decorator (xem b&ecirc;n dưới). Việc sử dụng sai hiện ra tại thời điểm bi&ecirc;n dịch lu&ocirc;n tốt hơn tại thời điểm chạy.
      </p>
      <p>
        v0.5.123 ph&aacute;t h&agrave;nh một <strong>bộ test harness cho doc-examples</strong> v&agrave; một widget gallery. Mọi v&iacute; dụ TypeScript trong t&agrave;i liệu giờ được bi&ecirc;n dịch mỗi lần CI chạy, v&agrave; widget gallery so s&aacute;nh ảnh chụp m&agrave;n h&igrave;nh với c&aacute;c baseline đ&atilde; được ph&ecirc; duyệt. v0.5.125 mở rộng điều đ&oacute; sang một ma trận bi&ecirc;n dịch ch&eacute;o: mọi v&iacute; dụ trong docs được build cho iOS, tvOS, Android, WASM, v&agrave; Web c&ugrave;ng với nền tảng host, n&ecirc;n sai lệch API giữa c&aacute;c target được bắt tr&ecirc;n PR giới thiệu n&oacute; thay v&igrave; chu kỳ ph&aacute;t h&agrave;nh đ&atilde; ship n&oacute;.
      </p>
      <p>
        Một chiến thắng nhỏ về chất lượng cuộc sống: <code>perry check</code> giờ đưa ra <code>file:line:column</code> cho c&aacute;c lỗi HIR lowering (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), nghĩa l&agrave; jump-to-error trong editor hoạt động thay v&igrave; hiển thị một th&ocirc;ng b&aacute;o chung chung kh&ocirc;ng c&oacute; vị tr&iacute;.
      </p>

      <h2>5. watchOS bi&ecirc;n dịch end-to-end</h2>
      <p>
        watchOS đ&atilde; được ph&aacute;t h&agrave;nh l&agrave; target bi&ecirc;n dịch th&aacute;ng trước, nhưng một build end-to-end sạch c&oacute; v&agrave;i chỗ g&acirc;n g&oacute;c. C&ocirc;ng việc watchOS tuần n&agrave;y:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> v&agrave; <code>--target watchos-simulator</code> giờ bi&ecirc;n dịch end-to-end kh&ocirc;ng cần những workaround đ&atilde; t&iacute;ch lũy.</li>
        <li><strong>v0.5.114</strong>: <code>--features watchos-game-loop</code> cho c&aacute;c ứng dụng Metal-surface.</li>
        <li><strong>v0.5.122</strong>: <code>--features watchos-swift-app</code> cho rendering host bởi SwiftUI &mdash; khi bạn muốn SwiftUI sở hữu v&ograve;ng đời ứng dụng v&agrave; Perry tạo UI b&ecirc;n trong đ&oacute;.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code> được kết nối v&agrave;o perry-ui-ios v&agrave; perry-ui-tvos, n&ecirc;n kiểm thử UI Geisterhand chạy tr&ecirc;n hai target đ&oacute; theo c&ugrave;ng c&aacute;ch như tr&ecirc;n macOS v&agrave; Linux.</li>
      </ul>

      <h2>6. C&aacute;c primitive <code>perry/thread</code> được kết nối đầy đủ</h2>
      <p>
        v0.5.174 (h&ocirc;m nay) đ&atilde; đ&oacute;ng <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>: <code>parallelMap</code>, <code>parallelFilter</code>, v&agrave; <code>spawn</code> được kết nối ho&agrave;n to&agrave;n qua đường codegen với đảm bảo an to&agrave;n tại thời điểm bi&ecirc;n dịch. C&aacute;c capture mutable bị từ chối tại thời điểm bi&ecirc;n dịch &mdash; c&ugrave;ng tư thế t&iacute;nh đ&uacute;ng đắn tại thời điểm bi&ecirc;n dịch m&agrave; perry/ui v&agrave; decorator giờ đ&atilde; c&oacute;. C&aacute;c primitive thread đ&atilde; được kết nối một phần từ th&ocirc;ng b&aacute;o v0.4.0 giờ đ&atilde; ho&agrave;n chỉnh end-to-end.
      </p>

      <h2>7. WebAssembly v&agrave; target web</h2>
      <p>
        Hai bản sửa WASM đ&aacute;ng nhắc đến:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: năm bug dồn v&agrave;o nhau trong <code>--target web</code> (đường WASM output) che giấu lẫn nhau. Sửa theo lot n&ecirc;n target web giờ đứng vững dưới to&agrave;n bộ bề mặt <code>perry/ui</code> (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: <code>break</code>/<code>continue</code> b&ecirc;n trong <code>if</code> b&ecirc;n trong một v&ograve;ng lặp bị treo tr&ecirc;n WASM &mdash; một bug codegen kh&ocirc;ng t&aacute;i tạo được tr&ecirc;n c&aacute;c target native. Đ&atilde; sửa (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        Về mặt t&iacute;nh đ&uacute;ng đắn: v0.5.157 sửa <code>obj.field</code> trả về <code>NaN</code> tr&ecirc;n Android (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), v&agrave; v0.5.162 sửa một bug ws đ&aacute;ng nguyền rủa nơi <code>sendToClient</code> v&agrave; <code>closeClient</code> đ&atilde; bi&ecirc;n dịch th&agrave;nh no-op &acirc;m thầm (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Chiến thắng về t&iacute;nh nghi&ecirc;m ngặt tại thời điểm bi&ecirc;n dịch</h2>
      <p>
        Chủ đề của tuần n&agrave;y: bất cứ điều g&igrave; trước đ&acirc;y l&agrave; một thất bại &acirc;m thầm giờ l&agrave; một lỗi bi&ecirc;n dịch.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: C&aacute;c decorator TypeScript được parse v&agrave;o HIR v&agrave; sau đ&oacute; bị loại bỏ &acirc;m thầm. Giờ ch&uacute;ng b&aacute;o lỗi tại điểm decoration với một th&ocirc;ng b&aacute;o r&otilde; r&agrave;ng (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). C&ugrave;ng l&yacute; luận warn&rarr;bail như v0.5.119 &aacute;p dụng cho perry/ui.</li>
        <li><strong>v0.5.119</strong>: Việc sử dụng sai API perry/ui bị từ chối tại thời điểm bi&ecirc;n dịch thay v&igrave; tạo ra một nhị ph&acirc;n no-op.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> giờ tạo ra backtrace native thực sự ra stderr thay v&igrave; chỉ echo lại message (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). C&aacute;c frame đ&atilde; được symbolicate y&ecirc;u cầu <code>PERRY_DEBUG_SYMBOLS=1</code>; kh&ocirc;ng c&oacute; n&oacute; bạn nhận được địa chỉ, vẫn nhiều hơn h&agrave;nh vi echo message m&agrave; n&oacute; thay thế.</li>
      </ul>

      <h2>9. Kết luận</h2>
      <p>
        Mẫu của tuần n&agrave;y: <strong>ph&acirc;n phối</strong> (npm), <strong>trải nghiệm nh&agrave; ph&aacute;t triển</strong> (<code>perry dev</code>, cache tăng dần), v&agrave; <strong>thất bại benchmark c&ograve;n lại cuối c&ugrave;ng đ&atilde; đ&oacute;ng lại</strong>. Cộng với một lot chiến thắng về t&iacute;nh nghi&ecirc;m ngặt tại thời điểm bi&ecirc;n dịch biến những lỗi &acirc;m thầm th&agrave;nh lỗi thật sự. S&aacute;u ng&agrave;y, 94 bản ph&aacute;t h&agrave;nh patch, một thay đổi DX lớn.
      </p>
      <p>
        H&atilde;y thử n&oacute;:
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev`}</code></pre>
      <p>
        M&atilde; nguồn: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
