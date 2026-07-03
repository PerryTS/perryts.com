import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Biên dịch TypeScript thành Binary (Tệp thực thi độc lập)",
  description:
    "Biên dịch TypeScript thành binary: tệp thực thi gốc độc lập 2–5 MB, không cần Node.js. So sánh Perry với bun build --compile và Node SEA.",
  breadcrumb: "Biên dịch TypeScript thành Binary",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Biên dịch TypeScript <span className="gradient-text">thành Binary</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Một lệnh duy nhất biến <code className="text-slate-300">main.ts</code>{" "}
            thành một tệp thực thi gốc độc lập. Không cần Node.js trên máy
            đích, không có runtime đóng gói kèm, không có bước cài đặt nào
            cho người dùng của bạn.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Cài đặt Perry
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

          <div className="max-w-2xl mx-auto text-left">
            <div className="code-block glow">
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs">terminal</span>
              </div>
              <div className="space-y-2">
                <p>
                  <span className="text-slate-500">$</span>{" "}
                  <span className="text-cyan-400">perry</span> compile main.ts
                </p>
                <p className="text-green-400">
                  ✓ Compiled executable: main (2.3 MB)
                </p>
                <p className="mt-4">
                  <span className="text-slate-500">$</span> ./main
                </p>
                <p className="text-slate-300">Hello, World!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Ba điều người ta gọi là &ldquo;biên dịch TypeScript&rdquo;
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Khi các nhà phát triển tìm cách biên dịch TypeScript thành binary,
            họ thường gặp ba kỹ thuật rất khác nhau nhưng dùng chung một từ:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpiling.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC và esbuild
              biến TypeScript thành JavaScript. Đầu ra vẫn cần Node.js, Bun
              hoặc trình duyệt để chạy. Không có binary nào ở đây.
            </li>
            <li>
              <strong className="text-slate-300">Nhúng runtime.</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code>, và Node.js
              Single Executable Applications (SEA) nối JavaScript đã đóng gói
              của bạn với một bản sao đầy đủ của runtime. Bạn có được một
              tệp duy nhất, nhưng engine vẫn đi kèm bên trong nó và mã của
              bạn vẫn được parse và biên dịch JIT mỗi lần tiến trình khởi
              động.
            </li>
            <li>
              <strong className="text-slate-300">
                Biên dịch gốc ahead-of-time.
              </strong>{" "}
              Đây là những gì Perry làm. TypeScript được parse bằng SWC,
              kiểu được giải quyết, generic được monomorphize, và LLVM sinh
              ra mã máy. Linker tạo ra một tệp thực thi bình thường — cùng
              loại artifact mà toolchain Rust, Go hay C++ tạo ra. Không hề
              có engine JavaScript nào trong binary.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Vì không có engine nào cần khởi động và không có gì cần parse
            lúc khởi chạy, một binary Perry khởi động trong khoảng một mili
            giây. Bản thân pipeline này được mô tả chi tiết hơn trên trang{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              trình biên dịch TypeScript gốc
            </Link>{" "}
            và trong phần{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              cấu trúc bên trong trình biên dịch
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Binary lớn cỡ nào?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Kích thước phụ thuộc vào những gì bạn đưa vào, vì chỉ mã bạn
            thực sự sử dụng mới được biên dịch và liên kết:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              Một hello world có kích thước khoảng{" "}
              <strong className="text-slate-300">330 KB</strong>.
            </li>
            <li>
              Các công cụ CLI điển hình rơi vào khoảng{" "}
              <strong className="text-slate-300">2–5 MB</strong>.
            </li>
            <li>
              Ứng dụng đầy đủ liên kết các framework lớn (Fastify, mysql2,
              và tương tự) có kích thước khoảng{" "}
              <strong className="text-slate-300">48 MB</strong>.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Để so sánh: một tệp thực thi Node SEA chính là một bản sao của
            binary{" "}
            <code className="text-slate-300">node</code>, nên nó đã ở khoảng
            88–118 MB tùy nền tảng trước cả khi thêm mã của bạn, còn một
            hello world biên dịch bằng Bun có kích thước khoảng 60 MB trên
            macOS arm64 và khoảng 100 MB trên Linux x64, vì toàn bộ runtime
            Bun được nhúng vào.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Cả ba đều cho bạn một tệp duy nhất có thể đưa cho người khác.
            Ngoài ra chúng là những công cụ rất khác nhau, và mỗi công cụ
            là câu trả lời đúng cho một nhu cầu khác nhau:
          </p>
          <div className="overflow-x-auto mb-8 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">
                    Perry
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    bun build --compile
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    Node SEA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Nó tạo ra gì
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Mã máy biên dịch AOT (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JS đóng gói + runtime Bun nhúng kèm
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Bản sao của binary node với script đã đóng gói của bạn
                    được tiêm vào
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Mô hình thực thi
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Mã gốc, không có engine JS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) lúc runtime
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) lúc runtime
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Kích thước hello-world
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) đến ~100+ MB (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (kích thước của binary node)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Khởi động
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Biên dịch chéo
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 mục tiêu, bao gồm Windows/macOS/iOS từ Linux
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Có — Linux, Windows, macOS qua --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Không — thay vào đó sao chép binary node theo từng nền
                    tảng
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Khả năng tương thích JS/npm
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Đang mở rộng: axios, zod v4, express, fastify, hono biên
                    dịch gốc; phần còn lại có tùy chọn V8 dự phòng
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Đầy đủ — vì đó chính là runtime Bun
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Đầy đủ ngữ nghĩa Node; yêu cầu đóng gói trước, chỉ
                    CommonJS trên Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Trạng thái
                  </td>
                  <td className="px-4 py-3 text-slate-400">Trước 1.0</td>
                  <td className="px-4 py-3 text-slate-400">Ổn định</td>
                  <td className="px-4 py-3 text-slate-400">
                    Độ ổn định &ldquo;Đang phát triển tích cực&rdquo; trong
                    Node 24 LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Nhìn nhận thẳng thắn: nếu ứng dụng của bạn dựa nhiều vào toàn bộ
            hệ sinh thái npm và bạn muốn rủi ro tương thích bằng không, Bun
            và Node SEA chạy đúng ngữ nghĩa engine mà bạn đã phát triển theo
            — đó là thế mạnh của chúng, và cái giá về kích thước có thể
            không quan trọng với việc triển khai của bạn. Perry là một sự
            đánh đổi khác. Bạn có được biên dịch ahead-of-time thực sự,
            binary nhỏ và khởi động tính bằng mili giây; đổi lại bạn chấp
            nhận một trình biên dịch trước 1.0 mà độ tuân thủ JavaScript
            được đo lường và công bố (test262: String 79%, Array 72% tính
            đến v0.5.1146) thay vì được kế thừa từ V8.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            So sánh chi tiết:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            và{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . Về cách các gói npm biên dịch, xem{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Các package npm thực tế và một lượt quét conformance
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Benchmark table (shared section) */}
      <Performance />

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Biên dịch binary đầu tiên của bạn ngay hôm nay
            </h2>
            <p className="text-slate-400 mb-6">
              Cài đặt qua Homebrew, APT hoặc winget — sau đó{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
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
