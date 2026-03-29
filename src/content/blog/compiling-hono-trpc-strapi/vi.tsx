export default function Content() {
  return (
    <>
      <p>
        Perry giờ đây biên dịch ba framework TypeScript lớn — Hono, tRPC, và Strapi — thành
        các tệp thực thi ARM64 native. Chúng biên dịch trong dưới một giây, tạo ra binary dưới 2 MB,
        và chạy không bị crash.
      </p>
      <p>
        Bài viết này trình bày những gì hoạt động, những gì chưa hoạt động, và những gì chúng tôi đã
        học được khi đẩy trình biên dịch đối mặt với mã thực tế.
      </p>

      <h2>Các dự án</h2>
      <p>
        Chúng tôi chọn ba dự án này vì chúng đại diện cho các hình thái khác nhau của TypeScript:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — Một web framework nhẹ (29 module). Sử dụng nhiều generics,
          kế thừa class, gán phương thức động, và các Web API <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>.
          Cấu trúc export sử dụng named re-export qua barrel file.
        </li>
        <li>
          <strong>tRPC</strong> — Một RPC framework type-safe (52 module). Chuỗi re-export sâu
          qua 4+ cấp, builder pattern với thu hẹp kiểu generic, khởi tạo class ở phạm vi module,
          và streaming qua Web Streams.
        </li>
        <li>
          <strong>Strapi</strong> — Một headless CMS core (4 module được biên dịch native, phần còn lại
          được giải quyết dưới dạng external). Monorepo với phân giải workspace package, namespace re-export
          (<code className="text-perry-400">export * as X</code>), pattern service container với{" "}
          <code className="text-perry-400">Map</code>, và factory function.
        </li>
      </ul>

      <h2>Kết quả biên dịch</h2>
      <p>
        Cả ba đều biên dịch thành binary native với không lỗi biên dịch nào:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Dự án</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Module được biên dịch</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Kích thước binary</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Thời gian biên dịch</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Hono</td>
              <td className="py-3 px-4 text-slate-400">29</td>
              <td className="py-3 px-4 text-slate-400">1.6 MB</td>
              <td className="py-3 px-4 text-slate-400">0.59s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">tRPC</td>
              <td className="py-3 px-4 text-slate-400">52</td>
              <td className="py-3 px-4 text-slate-400">1.8 MB</td>
              <td className="py-3 px-4 text-slate-400">0.97s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Strapi</td>
              <td className="py-3 px-4 text-slate-400">4</td>
              <td className="py-3 px-4 text-slate-400">1.9 MB</td>
              <td className="py-3 px-4 text-slate-400">0.80s</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Mỗi module nguồn đi qua toàn bộ pipeline: phân tích SWC, hạ thấp HIR, sinh mã Cranelift,
        phát ra object file, và liên kết native. Thời gian biên dịch bao gồm tất cả — từ phân tích cú pháp
        đến liên kết cuối cùng.
      </p>
      <p>
        Để so sánh, <code className="text-perry-400">tsc --noEmit</code> chỉ riêng trên tRPC đã mất vài giây.
        Perry biên dịch 52 module thành binary native đã liên kết trong dưới một giây.
      </p>

      <h2>Những gì hoạt động tại Runtime</h2>

      <h3>Khởi tạo Class xuyên Module</h3>
      <p>
        Đây là cột mốc quan trọng. Cấu trúc export của Hono trông như thế này:
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">hono export chain</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">export {"{"} Hono {"}"}</code> đó là một named re-export — không phải{" "}
        <code className="text-perry-400">export * from</code> hay{" "}
        <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code>. Trong HIR của Perry,
        điều này trở thành <code className="text-perry-400">Export::Named</code>, không phải{" "}
        <code className="text-perry-400">Export::ReExport</code> hay{" "}
        <code className="text-perry-400">Export::ExportAll</code>. Trước đây, việc lan truyền class của trình
        biên dịch chỉ theo các chuỗi <code className="text-perry-400">ExportAll</code> và{" "}
        <code className="text-perry-400">ReExport</code>, nên import{" "}
        <code className="text-perry-400">Hono</code> từ <code className="text-perry-400">index.ts</code> âm thầm
        thất bại — tra cứu class không tìm thấy, và <code className="text-perry-400">new Hono()</code> trả về{" "}
        <code className="text-perry-400">undefined</code>.
      </p>
      <p>
        Bây giờ Perry truy ngược <code className="text-perry-400">Export::Named</code> qua các import của module
        để tìm định nghĩa class gốc và lan truyền nó.
      </p>

      <h2>Những gì chưa hoạt động</h2>
      <p>
        Chúng tôi cụ thể ở đây vì các khoảng trống nói lên nhiều như các thành công.
      </p>

      <h3>Gán thuộc tính động trên <code className="text-perry-400">this</code></h3>
      <p>
        Constructor của Hono thiết lập các handler phương thức HTTP một cách động. Perry chưa hỗ trợ
        <code className="text-perry-400">this[variable] = value</code>, nên các phương thức này bị thiếu.
        Đây là khoảng trống lớn nhất cho Hono.
      </p>

      <h3>Gọi Constructor ở phạm vi Module</h3>
      <p>
        tRPC định nghĩa điểm khởi đầu là <code className="text-perry-400">export const initTRPC = new TRPCBuilder()</code>.
        Tại runtime, <code className="text-perry-400">initTRPC</code> xuất hiện dưới dạng{" "}
        <code className="text-perry-400">typeof function</code> thay vì{" "}
        <code className="text-perry-400">typeof object</code> — biểu thức{" "}
        <code className="text-perry-400">new TRPCBuilder()</code> ở phạm vi module không thực thi constructor.
      </p>

      <h3>Thuộc tính kế thừa</h3>
      <p>
        <code className="text-perry-400">TRPCError extends Error</code>, và trong khi{" "}
        <code className="text-perry-400">err.code</code> (định nghĩa trực tiếp trên{" "}
        <code className="text-perry-400">TRPCError</code>) hoạt động,{" "}
        <code className="text-perry-400">err.message</code> (kế thừa từ{" "}
        <code className="text-perry-400">Error</code>) không truy cập được. Chuỗi prototype cho tra cứu
        thuộc tính chưa được triển khai đầy đủ.
      </p>

      <h2>Điều này cho chúng tôi biết gì</h2>
      <p>
        Tin tốt: pipeline biên dịch của Perry xử lý mã framework thực. Các dự án đa file với chuỗi
        re-export phức tạp, type signature nặng generics, phân cấp class, và phân giải package monorepo
        đều biên dịch thành binary đã liên kết.
      </p>
      <p>
        Các khoảng trống là ở runtime, không phải ở biên dịch. Công việc còn lại là:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Gán thuộc tính động</strong> — cần cho các framework thiết lập phương thức theo chương trình</li>
        <li><strong>Biểu thức khởi tạo ở phạm vi module</strong> — <code className="text-perry-400">export const x = new Foo()</code> cần thực sự thực thi constructor</li>
        <li><strong>Chuỗi prototype</strong> — thuộc tính và phương thức kế thừa</li>
        <li><strong>Built-in Web API</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> cho HTTP framework</li>
      </ol>
      <p>
        Đây là những vấn đề cụ thể, có phạm vi rõ ràng. Không có vấn đề nào đòi hỏi thay đổi kiến trúc
        — chúng là phần mở rộng của các pattern đã hoạt động cho các trường hợp đơn giản hơn.
      </p>
      <p>
        Chúng tôi sẽ tiếp tục cải thiện. Mục tiêu là{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>{" "}
        tạo ra một HTTP server hoạt động trong binary native.
      </p>
    </>
  );
}
