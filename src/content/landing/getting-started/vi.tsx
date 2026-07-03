import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Bắt đầu với Perry — Cài đặt & Biên dịch TypeScript thành gốc",
  description:
    "Cài đặt Perry qua Homebrew, APT hoặc winget và biên dịch tệp TypeScript đầu tiên của bạn thành tệp thực thi gốc trong chưa đầy một phút. Không cần Node.js.",
  breadcrumb: "Bắt đầu",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Bắt đầu với <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Từ con số không đến một tệp thực thi gốc đang chạy chỉ trong ba
            bước. Không cần Node.js, không cần bundler, không cần cài runtime
            trên máy đích.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Binary đầu tiên của bạn, từng bước một
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Sau khi cài đặt Perry, biên dịch TypeScript thành tệp thực thi gốc
            chỉ là một lệnh duy nhất. Viết một tệp:
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">hello.ts</span>
            </div>
            <pre className="text-sm text-slate-300">
              <code>{`const name = process.argv[2] ?? "World";
console.log(\`Hello, \${name}!\`);`}</code>
            </pre>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8">
            Biên dịch nó và chạy kết quả — đầu ra là một binary mã máy tự
            chứa, không phải một script được đóng gói:
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">terminal</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">$</span>{" "}
                <span className="text-cyan-400">perry</span> compile hello.ts
              </p>
              <p className="text-green-400">✓ Compiled executable: hello</p>
              <p>
                <span className="text-slate-500">$</span> ./hello Perry
              </p>
              <p className="text-slate-300">Hello, Perry!</p>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-12">
            Binary đó khởi động trong khoảng một mili giây và chạy được trên
            bất kỳ máy nào có cùng hệ điều hành và kiến trúc — không cần cài
            đặt gì trước. Đọc thêm về{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              cách Perry biên dịch TypeScript thành binary
            </Link>{" "}
            hoặc điều gì diễn ra bên trong{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              trình biên dịch TypeScript gốc
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Bước tiếp theo</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Tài liệu
              </h3>
              <p className="text-slate-400 text-sm">
                Hướng dẫn về CLI, widget perry/ui, threading, i18n và mọi mục
                tiêu biên dịch — tại docs.perryts.com.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Ứng dụng thực tế được biên dịch bằng Perry, đã ra mắt trên App
                Store và nhiều nơi khác.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                So sánh
              </h3>
              <p className="text-slate-400 text-sm">
                Perry so sánh thế nào với Bun, Deno, Electron, Tauri, React
                Native và Static Hermes.
              </p>
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                GitHub
              </h3>
              <p className="text-slate-400 text-sm">
                Mã nguồn, issue và discussion — Perry là mã nguồn mở.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
