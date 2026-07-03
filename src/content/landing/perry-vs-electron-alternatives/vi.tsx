import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Giải pháp thay thế Electron cho TypeScript: Perry vs Tauri vs Bun",
  description:
    "Đang tìm giải pháp thay thế Electron cho TypeScript? So sánh Electron, Tauri, các cách tiếp cận dựa trên Bun và Perry về kích thước binary, bộ nhớ, UI stack và ngôn ngữ.",
  breadcrumb: "Giải pháp thay thế Electron cho TypeScript",
};

export default function Content() {
  return (
    <>
            <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Quay lại so sánh
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              Giải pháp thay thế Electron cho lập trình viên TypeScript
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron đã giúp lập trình viên web dễ dàng xây dựng ứng dụng
            desktop, và cái giá về kích thước cũng như bộ nhớ của nó đã
            biến &ldquo;giải pháp thay thế Electron&rdquo; thành một truy
            vấn tìm kiếm vĩnh viễn. Nếu TypeScript là ngôn ngữ của bạn, có
            bốn hướng đi thực tế vào năm 2026: ở lại với Electron, chuyển
            sang Tauri, xây dựng binary nhúng runtime bằng Bun, hoặc biên
            dịch sang gốc bằng Perry. Chúng có những đánh đổi rất khác
            nhau.
          </p>

          <h2 className="text-2xl font-bold mb-6">Bốn cách tiếp cận</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — đường cơ sở
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Đóng gói Chromium và Node.js cùng mọi ứng dụng. Điểm mạnh
                là hơn một thập kỷ trưởng thành trong sản xuất và một UI
                stack (HTML/CSS/JS) mà đội của bạn đã quen thuộc — VS Code,
                Slack và Discord đều chạy trên đó. Điểm yếu là cái giá cơ
                bản: trình cài đặt hello-world khoảng 80–150 MB, nhiều tiến
                trình Chromium, và hàng trăm MB RAM lúc nhàn rỗi. Chỉ dành
                cho desktop.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  So sánh đầy đủ Perry vs Electron
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — UI web trong webview hệ thống, backend Rust
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri giữ lại frontend web nhưng bỏ Chromium đóng gói: UI
                được render trong webview của OS (WKWebView, WebView2,
                WebKitGTK), nên trình cài đặt chỉ ở mức vài MB. Nó ổn định,
                tài liệu đầy đủ, và Tauri 2 đã thêm iOS/Android. Đánh đổi:
                backend là Rust, không phải TypeScript — logic ứng dụng
                ngoài UI nghĩa là phải viết Rust và đi qua một bridge IPC —
                và việc render hơi khác nhau giữa các nền tảng vì mỗi OS
                dùng một webview khác nhau.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  So sánh đầy đủ Perry vs Tauri
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — binary đơn tệp, không có lớp GUI
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Những người tìm kiếm &ldquo;bun electron&rdquo; thường
                muốn sự tiện lợi của Electron mà không có sự nặng nề của
                nó.{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                tạo ra một tệp thực thi duy nhất bằng cách nhúng runtime
                Bun cùng TypeScript đã đóng gói của bạn — tuyệt vời cho CLI
                và server, với khả năng tương thích npm đầy đủ vì nó chính
                là runtime. Nhưng binary có kích thước khoảng 60 MB (macOS
                arm64) đến hơn 100 MB (Linux/Windows), mã vẫn được thực thi
                bằng JIT, và Bun không có framework UI — một ứng dụng
                desktop vẫn cần Electron, Tauri, hoặc một thư viện webview
                ở trên.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  So sánh đầy đủ Perry vs Bun
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript biên dịch thành widget gốc
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry biên dịch ahead-of-time TypeScript thành mã máy và
                render UI qua các widget nền tảng thực sự — AppKit, UIKit,
                GTK4, Win32, Android qua JNI — không có webview và không
                có bridge IPC. Một ngôn ngữ duy nhất cho cả UI và logic,
                hello world ~330 KB, binary điển hình 2–5 MB, khởi động ~1
                ms, và mười mục tiêu bao gồm di động, watch và TV. Điểm
                cần lưu ý thẳng thắn: Perry vẫn ở giai đoạn trước 1.0, API
                UI của nó là riêng biệt (khai báo, kiểu SwiftUI — không
                phải HTML/CSS), và hệ sinh thái còn non trẻ so với
                Electron.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">So sánh cạnh nhau</h2>
          <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Electron</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Tauri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Bun (--compile)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Ngôn ngữ</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript ở mọi nơi</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">Frontend JS/TS, backend Rust</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Cách tiếp cận UI</td>
                  <td className="px-4 py-3 text-slate-400">Widget nền tảng gốc</td>
                  <td className="px-4 py-3 text-slate-400">Chromium đóng gói</td>
                  <td className="px-4 py-3 text-slate-400">Webview hệ thống</td>
                  <td className="px-4 py-3 text-slate-400">Không có (CLI/server)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Kích thước hello-world</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB tùy nền tảng</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Thực thi</td>
                  <td className="px-4 py-3 text-slate-400">Mã máy AOT</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (engine JS của webview) + Rust gốc</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Bộ nhớ lúc nhàn rỗi</td>
                  <td className="px-4 py-3 text-slate-400">Vài chục MB (một tiến trình gốc duy nhất)</td>
                  <td className="px-4 py-3 text-slate-400">Hàng trăm MB (Chromium đa tiến trình)</td>
                  <td className="px-4 py-3 text-slate-400">Thấp hơn Electron (webview của OS)</td>
                  <td className="px-4 py-3 text-slate-400">Điển hình của runtime</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Di động / watch / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">Không</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">Không</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Độ trưởng thành</td>
                  <td className="px-4 py-3 text-slate-400">Trước 1.0</td>
                  <td className="px-4 py-3 text-slate-400">Hơn một thập kỷ trong sản xuất</td>
                  <td className="px-4 py-3 text-slate-400">Ổn định (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Ổn định</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            Còn React Native hay Flutter thì sao?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Chúng luôn xuất hiện trong mọi cuộc thảo luận về Electron,
            nhưng chúng trả lời một câu hỏi khác. React Native ưu tiên di
            động: JavaScript của bạn chạy trong engine Hermes và điều
            khiển view gốc qua một bridge, còn hỗ trợ desktop chỉ tồn tại
            qua các fork riêng của cộng đồng/Microsoft — nó không phải là
            một thay thế trực tiếp cho Electron (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). Flutter bao phủ cả desktop và di động nhưng đồng nghĩa với
            việc rời TypeScript để dùng Dart, và nó tự vẽ widget của riêng
            mình thay vì dùng widget của nền tảng. Nếu việc ở lại với
            TypeScript là ràng buộc, danh sách thực tế cho desktop vẫn là
            bốn lựa chọn ở trên.
          </p>

          <h2 className="text-2xl font-bold mb-6">Bạn nên chọn cái nào?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Ở lại với web stack
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Nếu UI của bạn đã được xây dựng bằng React/Vue/Svelte và
                bạn cần phân phối desktop đã được thử thách ngay hôm nay,
                Electron vẫn là lựa chọn rủi ro thấp nhất — bạn trả giá
                bằng kích thước và bộ nhớ. Nếu cái giá đó làm bạn khó chịu
                và bạn thoải mái viết backend bằng Rust, Tauri mang lại
                phần lớn trải nghiệm web stack với dấu chân nhỏ hơn nhiều.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bỏ lại webview phía sau
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Nếu điều bạn thực sự muốn là đưa TypeScript vào, nhận ứng
                dụng gốc ra — một ngôn ngữ duy nhất, widget nền tảng thực
                sự, binary nhỏ, và di động/watch/TV từ cùng một mã nguồn —
                đó chính xác là khoảng trống mà Perry tồn tại để lấp đầy,
                với cái giá phải trả là độ trưởng thành trước 1.0. Và nếu
                bạn chỉ cần một CLI hay server dưới dạng một tệp duy nhất
                với rủi ro tương thích bằng không,{" "}
                <code className="text-slate-300">--compile</code> của Bun
                là lựa chọn thực dụng.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Tự mình trải nghiệm
            </h2>
            <p className="text-slate-400 mb-6">
              Cài đặt Perry và xuất bản một ứng dụng gốc từ TypeScript.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Bắt đầu
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Xem trên GitHub
              </a>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
