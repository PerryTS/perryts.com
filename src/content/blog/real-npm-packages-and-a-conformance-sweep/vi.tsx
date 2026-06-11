export default function Content() {
  return (
    <>
      <p>
        Bài trước khép lại ở <strong>v0.5.875</strong> với câu chuyện GC — khép lại khoảng cách mà benchmark của aya_koto phơi bày. Bài đó nói về việc thắng một benchmark. Bài này nói về một loại công việc khác: khoảng <strong>270 release giữa v0.5.875 và v0.5.1146</strong>, được tung ra trong khoảng bốn tuần, gần như không cái nào là tiêu đề benchmark. Chủ đề chuyển từ &ldquo;chạy nhanh trên một microbenchmark&rdquo; sang <strong>&ldquo;làm cho TypeScript thực tế và các package npm thực tế thực sự compile và chạy.&rdquo;</strong> Cộng thêm một cuộc đại tu hình ảnh Windows toàn diện và một đống widget mới dọc đường đi.
      </p>
      <p>
        Đây là những gì đã ra mắt, nhóm theo mục đích thực sự của nó.
      </p>

      <h2>Các package npm thực tế giờ compile được</h2>
      <p>
        Sợi chỉ đơn lớn nhất xuyên qua cửa sổ này là một lượt quét để làm cho các package npm phổ biến compile thành binary native và vượt qua các test hành vi — không chỉ &ldquo;link không lỗi,&rdquo; mà chạy và cho ra đúng output. Danh sách giờ hoạt động qua <code>perry.compilePackages</code> bao gồm <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, và Colyseus</strong>.
      </p>
      <p>
        Mỗi cái thất bại vì lý do riêng của nó, và mỗi bản sửa là câu chuyện nhỏ riêng:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> crash với <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code>. Nguyên nhân gốc (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>new F()</code> với <code>F</code> là một hàm được import từ module khác lặng lẽ tạo ra một object rỗng — thân constructor không bao giờ chạy, nên mọi check kiểu <code>$ZodCheckMinLength</code> trở về bị tước mất thuộc tính <code>_zod</code> của nó.</li>
        <li><strong>axios + jose</strong> cần crypto và nén mà Perry chưa có: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> cho AES-GCM, và <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong> đang deadlock trên một timeout polling một giây trong <code>wait_for_promise</code>; chúng tôi thay nó bằng một condvar wait và làm cho các promise bị reject hiện ra dưới dạng <code>HTTP 500</code> thay vì treo (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> không đọc được body POST — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> trả về rỗng trên POST/PUT cho đến một bản sửa parent-registration trong v0.5.1142.</li>
        <li><strong>chalk, ms, debug, express</strong> đều vấp cùng một hình dạng: một <em>giá trị có thể gọi với các thuộc tính gắn kèm</em> (<code>chalk.red</code>, <code>express()</code> cộng <code>express.Router</code>). Ba biến thể của khuôn mẫu đó được sửa qua v0.5.935 và lượt quét npm xung quanh, cộng thêm <code>util.inherits</code> + một scaffold stream prototype để gỡ chặn express (v0.5.990).</li>
        <li><strong>dayjs</strong>, được ship dưới dạng một bundle đã minify, kích hoạt dispatch method prototype kiểu JS-classic (<code>Class.prototype.m = fn</code>) mà Perry lower sai (v0.5.924/932).</li>
      </ul>
      <p>
        Bên dưới tất cả những thứ đó là phần làm cho các package mà Perry <em>không thể</em> compile native vẫn chạy được: <strong>runtime V8-fallback</strong> trở nên thực sự trong cửa sổ này. ModuleLoader của nó giờ đọc từ một module map nhúng, nên một binary fallback vẫn <strong>tự chứa</strong> — không có <code>node_modules</code> rời rạc lúc runtime (v0.5.994). <code>createServer</code> bắc cầu tới một hyper server thực (v0.5.999), và các global Web Fetch <code>Response</code> / <code>Request</code> / <code>Headers</code> tồn tại trong đường fallback (v0.5.1006). Và <strong><code>import()</code> động tại compile-time</strong> — chuỗi literal <code>await import(&apos;./foo.ts&apos;)</code> được giải tại lúc build — cuối cùng đã đáp xuống (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>Một lượt quét conformance test262</h2>
      <p>
        Sợi chỉ chủ đạo còn lại là conformance. Chúng tôi chạy các lượt tập trung đối chiếu với các radar tập con test262 và lay chuyển kim chỉ trên các built-in mà mã thực tế dựa vào mạnh nhất:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        Cú nhảy String đến từ việc cho mọi method <code>String.prototype</code> dispatch generic-<code>this</code> và sửa coercion index của <code>slice</code>/<code>substring</code>. Cú nhảy Array là <code>thisArg</code> trên các callback dense-array (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), <code>ToLength</code> kiểu array-like, thứ tự thao tác theo spec, và validation không-tham-số. Destructuring thu được parameter-destructuring trên các method plain, generator, async-generator, static, và private của class.
      </p>
      <p>
        Bên cạnh các con số tiêu đề, một cái đuôi dài về tính đúng đắn đã đáp xuống: <code>JSON.parse</code> giờ ném ra một <code>SyntaxError</code> thực (không phải <code>TypeError</code>) và từ chối các token thừa; reviver của nó đi theo thuật toán spec <code>InternalizeJSONProperty</code>; <code>Object.prototype.toString</code> gắn brand đúng cho typed array, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; <code>RegExp.prototype.toString</code> trả về <code>/source/flags</code>; các async generator có đúng ngữ nghĩa <code>yield</code>-awaits-operand. Đây là các radar tập con, không phải toàn bộ suite — Perry vẫn đang leo — nhưng cú leo tháng này dốc.
      </p>

      <h2>Windows chuyển sang Fluent</h2>
      <p>
        Windows được đại tu hình ảnh (chuỗi <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a>). Các cửa sổ Perry giờ chọn dùng chrome DWM hiện đại theo mặc định — <strong>nền Mica</strong>, góc bo tròn, và thanh tiêu đề nhận biết theme — và các control phổ biến render qua <strong>comctl32 v6</strong> thay vì các mặc định thời Windows 95. Window proc giờ xử lý <code>WM_DPICHANGED</code>, nên một cửa sổ giữ được độ sắc nét khi bạn kéo nó giữa các màn hình có scaling lẫn lộn thay vì bị kéo giãn bitmap.
      </p>
      <p>
        Quan trọng là, không gì trong số này tái xuất hiện regression cũ <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> &ldquo;vùng đen sau khi resize&rdquo;: vùng client vẫn được vẽ đục, và blur-through Mica/Acrylic toàn khung vẫn là một tùy chọn bật tường minh qua <code>app.setVibrancy(...)</code>. Cũng có một scaffold backend <code>--target windows-winui</code> mới (WinUI 3) cho các ứng dụng muốn ngăn xếp hiện đại trọn vẹn, và một bản sửa nhỏ nhưng thực làm cho <code>perry compile main.ts -o main</code> tạo ra <code>main.exe</code> trên Windows để PowerShell thực sự khởi chạy được nó (v0.5.1146).
      </p>

      <h2>Widget mới, mọi nền tảng</h2>
      <p>
        Hai widget đáp xuống chỉ trong ngày cuối cùng, và cả hai trải khắp mọi nền tảng UI mà Perry nhắm tới:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — một control ngày kiểu field, gọn gàng: <code>NSDatePicker</code> trên macOS, <code>UIDatePicker</code> (.compact) trên iOS/visionOS, <code>SysDateTimePick32</code> trên Windows, <code>android.widget.DatePicker</code> trên Android, GTK4 trên Linux. Một bề mặt TS trên tất cả chúng.</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — bất kỳ widget nào cũng có thể là đích thả và nguồn kéo cho text/file/URL, ánh xạ tới <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit), và <code>View.setOnDragListener</code> (Android).</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Sớm hơn trong cửa sổ, kệ widget cũng được lấp đầy trên cả desktop và mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, và một ImageGallery có thể vuốt — mỗi cái được hậu thuẫn bởi control native thực trên mọi nền tảng. HarmonyOS (ArkTS) có được Chart và TreeView (v0.5.893), hai widget cuối cùng nó cần để đạt tương đương với các nền tảng khác.
      </p>

      <h2>GC, nội bộ, và ổn định</h2>
      <p>
        Hầu hết 270 release đó không phải tiêu đề — chúng là các bản sửa bug và nội bộ, và đó chính là điểm của giai đoạn này. Vài cái đáng nêu ra:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC tiếp tục.</strong> Công việc free-list có điều kiện từ bài GC tiếp tục ổn định, và một lớp bug sắc bén được đóng: các Promise được bắc cầu native giờ được <strong>ghim lại khi đang bay trên một tokio worker</strong> để GC không thể sweep chúng trước khi resolution đáp xuống (v0.5.923). Nếu bạn chạy một async fetch dưới tải và thấy một lần thu gom ma, đó là cái này.</li>
        <li><strong>Mô hình bộ nhớ được ghi tài liệu.</strong> Giờ có một bài đào sâu <code>internals/memory-model.md</code> — NaN-boxing, generational GC, shadow stack, và write barrier — được nối vào trang docs (v0.5.933).</li>
        <li><strong>Một làn sóng các bản sửa ổn định codegen</strong> được lượt quét npm phơi bày: một arrow <code>const</code> ở mức module được gọi bên trong một bước async được resume không còn SIGSEGV (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> không còn treo mãi mãi (v0.5.870), và một nhúm crash <code>js_is_truthy</code> / raw-pointer-range mà các bundle thực vấp phải.</li>
      </ul>

      <h2>Việc nhà Apple</h2>
      <p>
        Nhỏ hơn nhưng thực: <code>perry setup ios --development</code> giờ cấp provision cho các build phát triển (v0.5.1023), và đường build/link cross-library của Apple được khử trùng lặp và làm cho khả chuyển theo độ rộng con trỏ (v0.5.1121/1125) — đó là thứ đã gỡ chặn ma trận publish npm / Homebrew / APT / winget vốn đang bị kẹt.
      </p>

      <h2>Điều này đưa mọi thứ đến đâu</h2>
      <p>
        Cá cược phía sau Perry luôn là &ldquo;TypeScript native&rdquo; chỉ có ý nghĩa nếu TypeScript <em>thực sự</em> chạy — không phải một tập con đồ chơi, mà là các package thực tế mà người ta <code>npm install</code>. Tháng này hầu hết là công việc đó: ít hơn một con số duy nhất để khoe, nhiều hơn một cú đẩy dài, không hào nhoáng để khép lại khoảng cách giữa &ldquo;compile được&rdquo; và &ldquo;hoạt động được.&rdquo; Các radar conformance và các test parity npm là bảng điểm chúng tôi đang theo dõi lúc này, và chúng tôi sẽ tiếp tục đăng các con số — cái tốt và cái còn chưa hoàn hảo.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
