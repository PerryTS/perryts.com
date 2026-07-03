import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Kompiler TypeScript Native: Bagaimana Perry Mengompilasi TS ke Kode Mesin",
  description:
    "Perry adalah kompiler TypeScript native yang ditulis dalam Rust: parsing SWC, HIR bertipe, monomorphization, codegen LLVM. Binary native untuk 10 platform, tanpa VM.",
  breadcrumb: "Kompiler TypeScript Native",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Kompiler TypeScript Native,{" "}
            <span className="gradient-text">Dibangun dalam Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry mengompilasi TypeScript yang sudah Anda tulis menjadi kode
            mesin — seperti cara toolchain Rust atau Go mengompilasi
            bahasanya. Tanpa JavaScript hasil transpile, tanpa virtual
            machine, tanpa runtime di sistem target.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/getting-started" className="btn-primary">
              Mulai
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Lihat di GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Bukan transpiler. Bukan runtime.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Sebagian besar tooling TypeScript terbagi menjadi dua keluarga.
            Transpiler —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild —
            memeriksa dan menghapus tipe, lalu menghasilkan JavaScript untuk
            dieksekusi belakangan oleh sebuah engine. Runtime — Node.js,
            Bun, Deno — adalah engine-engine itu: mereka melakukan parsing,
            interpretasi, dan JIT-compile JavaScript setiap kali program
            Anda dimulai.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Kompiler native adalah keluarga ketiga, dan untuk TypeScript,
            keluarga ini sebagian besar masih kosong. Perry memperlakukan
            anotasi tipe bukan sebagai dokumentasi yang harus dihapus,
            melainkan sebagai input yang menggerakkan pembuatan kode. Hasil
            dari{" "}
            <code className="text-slate-300">perry compile main.ts</code> adalah
            executable standalone berisi kode mesin — biasanya{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB, mulai berjalan dalam waktu sekitar satu milidetik
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Pipeline-nya, langkah demi langkah</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Parse (SWC).</strong> File
              sumber di-parse dengan SWC, parser TypeScript Rust-native,
              sehingga bahkan proyek besar pun ter-parse dalam hitungan
              milidetik. Codegen modul, transform pass, dan symbol scanning
              berjalan paralel di berbagai core.
            </li>
            <li>
              <strong className="text-slate-300">Resolusi tipe.</strong>{" "}
              Kompiler menyelesaikan tipe yang dideklarasikan dan
              menyimpulkan sisanya, memberikan setiap ekspresi tipe konkret
              sebelum pembuatan kode dimulai.
            </li>
            <li>
              <strong className="text-slate-300">
                HIR bertipe &amp; monomorphization.
              </strong>{" "}
              AST diturunkan menjadi high-level IR yang bertipe. Fungsi dan
              kelas generic di-monomorphize — setiap instansiasi seperti{" "}
              <code className="text-slate-300">{`Stack<number>`}</code>{" "}
              dikompilasi secara terpisah dengan tipe konkretnya, sehingga
              generic tidak memakan biaya sama sekali saat runtime. Ketika
              tipe diketahui, pemanggilan metode menjadi static dispatch
              dan field objek menjadi pemuatan langsung dengan offset
              tetap.
            </li>
            <li>
              <strong className="text-slate-300">Codegen (LLVM).</strong>{" "}
              HIR diturunkan menjadi LLVM IR dan dijalankan melalui
              pipeline optimasi LLVM — inlining, optimasi loop,
              vectorization — lalu dihasilkan sebagai kode mesin untuk
              target.
            </li>
            <li>
              <strong className="text-slate-300">Link.</strong> Outputnya
              adalah executable platform biasa: Mach-O di macOS, ELF di
              Linux, PE di Windows — plus target mobile, watch, TV, dan
              WebAssembly.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            Sisi LLVM dari semua ini — mengapa LLVM dipilih dibanding
            Cranelift, bagaimana NaN-boxing merepresentasikan nilai
            dinamis, apa yang dilakukan optimizer terhadap IR bertipe —
            punya deep dive-nya sendiri:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript di atas LLVM
            </Link>
            . Detail implementasi seperti NaN-boxing, static dispatch, dan
            zero-cost abstraction dibahas di{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              struktur internal kompiler
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Bagaimana dengan kode dinamis dan npm?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript pada dasarnya tetaplah JavaScript, dan kompiler
            TypeScript native harus jujur soal itu. Konformansi Perry
            terhadap suite resmi test262 diukur dan dipublikasikan — per
            v0.5.1146, semantik String berada di 79% dan Array di 72%,
            keduanya terus meningkat dari rilis ke rilis. Paket npm
            TypeScript/JavaScript murni dikompilasi secara native melalui{" "}
            <code className="text-slate-300">perry.compilePackages</code>:
            axios, zod v4, express, fastify, dan hono sudah bisa
            dikompilasi dan berjalan hari ini. Kode yang membutuhkan
            semantik engine penuh dapat memilih fallback V8 tertanam
            dengan{" "}
            <code className="text-slate-300">--enable-js-runtime</code>.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Cerita lengkapnya ada di{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              paket npm nyata dan sapuan konformansi
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Bagaimana Perry berkaitan dengan upaya &ldquo;TypeScript
            native&rdquo; lainnya
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry bukan satu-satunya proyek yang melihat anotasi tipe
            TypeScript sebagai peluang kompilasi — tetapi pendekatannya
            sangat berbeda. AssemblyScript mengompilasi bahasa
            mirip-TypeScript yang ketat hanya ke WebAssembly: ia sengaja
            tidak kompatibel dengan JavaScript, dan tidak menghasilkan
            executable OS atau UI native. Static Hermes milik Meta
            mengompilasi subset JavaScript bertipe secara ahead-of-time di
            dalam engine Hermes, terutama untuk React Native — per
            pertengahan 2026 proyek ini masih berupa riset yang harus
            dibangun dari source, dan engine Hermes V1 yang benar-benar
            dikirim di React Native tidak menyertakan fitur statis
            tersebut (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              perbandingan lengkap
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Taruhan Perry berbeda pada kedua sumbu: TypeScript standar
            sebagai bahasa input, dan executable platform biasa — CLI,
            server, dan GUI — sebagai output, dapat diinstal hari ini via
            Homebrew, APT, winget, atau npm.
          </p>

          <h2 className="text-2xl font-bold mb-6">Satu kompiler, sepuluh target</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Karena pembuatan kode melewati LLVM, satu kode sumber
            dikompilasi ke macOS, iOS, iPadOS, Android, Linux, Windows,
            watchOS, tvOS, WebAssembly, dan Web/JS biasa — termasuk
            kompilasi silang binary Windows, macOS, dan iOS dari mesin
            Linux. Aplikasi GUI menggunakan{" "}
            <code className="text-slate-300">perry/ui</code>, API
            deklaratif di atas widget platform asli (AppKit, UIKit, GTK4,
            Win32, Android via JNI) — tanpa webview yang terlibat.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Bagaimana perbandingannya dengan pendekatan lain:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native, dan Static
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
              Coba kompiler ini
            </h2>
            <p className="text-slate-400 mb-6">
              Instal Perry dan kompilasi binary native pertama Anda dalam
              waktu kurang dari satu menit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Mulai
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Baca Dokumentasi
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
