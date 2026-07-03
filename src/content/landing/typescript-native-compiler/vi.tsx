import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Trình biên dịch TypeScript gốc: Cách Perry biên dịch TS thành mã máy",
  description:
    "Perry là trình biên dịch TypeScript gốc viết bằng Rust: parse bằng SWC, HIR có kiểu, monomorphization, sinh mã LLVM. Binary gốc cho 10 nền tảng, không cần VM.",
  breadcrumb: "Trình biên dịch TypeScript gốc",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Một trình biên dịch TypeScript gốc,{" "}
            <span className="gradient-text">được xây dựng bằng Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry biên dịch chính TypeScript bạn đang viết thành mã máy — theo
            cách một toolchain Rust hay Go biên dịch ngôn ngữ của nó. Không
            có JavaScript transpile, không có máy ảo, không có runtime trên
            hệ thống đích.
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Không phải transpiler. Không phải runtime.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Phần lớn công cụ TypeScript rơi vào hai nhóm. Transpiler —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild — kiểm
            tra rồi loại bỏ kiểu, sau đó sinh ra JavaScript để một engine
            thực thi sau này. Runtime — Node.js, Bun, Deno — chính là những
            engine đó: chúng parse, thông dịch và biên dịch JIT JavaScript
            mỗi lần chương trình của bạn khởi động.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Trình biên dịch gốc là nhóm thứ ba, và với TypeScript nhóm này
            gần như còn bỏ trống. Perry coi chú thích kiểu không phải là tài
            liệu để loại bỏ mà là đầu vào dẫn dắt việc sinh mã. Kết quả của{" "}
            <code className="text-slate-300">perry compile main.ts</code> là
            một tệp thực thi độc lập chứa mã máy — thường{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB, khởi động trong khoảng một mili giây
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Pipeline, từng bước một</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Parse (SWC).</strong> Tệp
              nguồn được parse bằng SWC, trình phân tích cú pháp TypeScript
              viết bằng Rust, nên ngay cả dự án lớn cũng được parse trong
              vài mili giây. Sinh mã module, các transform pass và quét
              symbol chạy song song trên nhiều lõi.
            </li>
            <li>
              <strong className="text-slate-300">Giải quyết kiểu.</strong>{" "}
              Trình biên dịch giải quyết các kiểu đã khai báo và suy luận
              phần còn lại, gán cho mỗi biểu thức một kiểu cụ thể trước khi
              việc sinh mã bắt đầu.
            </li>
            <li>
              <strong className="text-slate-300">
                HIR có kiểu &amp; monomorphization.
              </strong>{" "}
              AST được hạ cấp thành một IR bậc cao có kiểu (HIR). Hàm và lớp
              generic được monomorphize — mỗi lần khởi tạo như{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> được
              biên dịch riêng với kiểu cụ thể của nó, nên generic không tốn
              chi phí gì lúc runtime. Khi kiểu đã biết, lệnh gọi phương thức
              trở thành static dispatch và trường đối tượng trở thành phép
              đọc trực tiếp với offset cố định.
            </li>
            <li>
              <strong className="text-slate-300">Sinh mã (LLVM).</strong>{" "}
              HIR được hạ cấp thành LLVM IR và chạy qua pipeline tối ưu hóa
              của LLVM — inlining, tối ưu hóa vòng lặp, vector hóa — rồi
              được xuất thành mã máy cho mục tiêu.
            </li>
            <li>
              <strong className="text-slate-300">Liên kết.</strong> Đầu ra
              là một tệp thực thi nền tảng bình thường: Mach-O trên macOS,
              ELF trên Linux, PE trên Windows — cộng với các mục tiêu di
              động, watch, TV và WebAssembly.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            Phần liên quan đến LLVM — tại sao LLVM được chọn thay vì
            Cranelift, NaN-boxing biểu diễn giá trị động ra sao, trình tối
            ưu hóa làm gì với IR có kiểu — có bài tìm hiểu chuyên sâu riêng:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript trên LLVM
            </Link>
            . Chi tiết triển khai như NaN-boxing, static dispatch và
            zero-cost abstraction được trình bày trong{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              cấu trúc bên trong trình biên dịch
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Còn mã động và npm thì sao?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript về bản chất vẫn là JavaScript, và một trình biên dịch
            TypeScript gốc phải thẳng thắn thừa nhận điều đó. Độ tuân thủ
            của Perry với bộ test262 chính thức được đo lường và công bố —
            tính đến v0.5.1146, ngữ nghĩa String đạt 79% và Array đạt 72%,
            cả hai đều tăng dần qua từng bản phát hành. Các gói npm
            TypeScript/JavaScript thuần biên dịch gốc qua{" "}
            <code className="text-slate-300">perry.compilePackages</code>:
            axios, zod v4, express, fastify và hono đã có thể biên dịch và
            chạy ngay hôm nay. Mã cần đầy đủ ngữ nghĩa engine có thể dùng
            tùy chọn V8 nhúng dự phòng với{" "}
            <code className="text-slate-300">--enable-js-runtime</code>.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Câu chuyện đầy đủ nằm trong{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Các package npm thực tế và một lượt quét conformance
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry liên hệ thế nào với các nỗ lực &ldquo;TypeScript gốc&rdquo;
            khác
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry không phải là dự án duy nhất nhìn vào chú thích kiểu của
            TypeScript và thấy một cơ hội biên dịch — nhưng cách tiếp cận
            khác nhau rất nhiều. AssemblyScript chỉ biên dịch một ngôn ngữ
            giống TypeScript nghiêm ngặt sang WebAssembly: nó cố tình không
            tương thích JavaScript, và không tạo ra tệp thực thi hệ điều
            hành hay UI gốc. Static Hermes của Meta biên dịch ahead-of-time
            một tập con JavaScript có kiểu bên trong engine Hermes, chủ yếu
            cho React Native — tính đến giữa năm 2026 nó vẫn là một dự án
            nghiên cứu phải được build từ mã nguồn, và engine Hermes V1
            thực sự được đưa vào React Native không bao gồm các tính năng
            biên dịch tĩnh (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              so sánh đầy đủ
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Canh bạc của Perry khác biệt trên cả hai trục: TypeScript chuẩn
            làm ngôn ngữ đầu vào, và các tệp thực thi nền tảng thông thường
            — CLI, server và GUI — làm đầu ra, có thể cài đặt ngay hôm nay
            qua Homebrew, APT, winget hoặc npm.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Một trình biên dịch, mười mục tiêu
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Vì việc sinh mã đi qua LLVM, một mã nguồn duy nhất biên dịch
            được sang macOS, iOS, iPadOS, Android, Linux, Windows, watchOS,
            tvOS, WebAssembly và Web/JS thuần — bao gồm cả biên dịch chéo
            binary Windows, macOS và iOS từ một máy Linux. Ứng dụng GUI sử
            dụng <code className="text-slate-300">perry/ui</code>, một API
            khai báo trên các widget nền tảng thực sự (AppKit, UIKit, GTK4,
            Win32, Android qua JNI) — không có webview nào liên quan.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            So sánh với các cách tiếp cận khác thế nào:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native và Static
              Hermes
            </Link>
            .
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Dùng thử trình biên dịch
            </h2>
            <p className="text-slate-400 mb-6">
              Cài đặt Perry và biên dịch binary gốc đầu tiên của bạn trong
              chưa đầy một phút.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Bắt đầu
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Đọc tài liệu
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
