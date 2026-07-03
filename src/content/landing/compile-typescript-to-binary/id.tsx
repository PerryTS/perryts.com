import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Kompilasi TypeScript ke Binary (Executable Standalone)",
  description:
    "Kompilasi TypeScript ke binary: executable native standalone 2–5 MB, tanpa Node.js. Bagaimana Perry dibandingkan dengan bun build --compile dan Node SEA.",
  breadcrumb: "Kompilasi TypeScript ke Binary",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Kompilasi TypeScript <span className="gradient-text">ke Binary</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Satu perintah mengubah <code className="text-slate-300">main.ts</code>{" "}
            menjadi executable native standalone. Tanpa Node.js di mesin
            target, tanpa runtime yang dibundel, tanpa langkah instalasi
            untuk pengguna Anda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Instal Perry
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
            Tiga hal yang disebut orang &ldquo;mengompilasi TypeScript&rdquo;
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Ketika developer mencari cara mengompilasi TypeScript ke binary,
            mereka biasanya menemukan tiga teknik yang sangat berbeda namun
            berbagi satu kata yang sama:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpilasi.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC, dan esbuild
              mengubah TypeScript menjadi JavaScript. Outputnya masih
              membutuhkan Node.js, Bun, atau browser untuk berjalan. Tidak
              ada binary yang terlibat.
            </li>
            <li>
              <strong className="text-slate-300">Runtime tertanam.</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code>, dan
              Node.js Single Executable Applications (SEA) menggabungkan
              JavaScript yang telah dibundel dengan salinan lengkap dari
              runtime-nya. Anda mendapat satu file, tetapi engine-nya ikut
              serta di dalamnya dan kode Anda tetap di-parse dan
              di-JIT-compile setiap kali proses dimulai.
            </li>
            <li>
              <strong className="text-slate-300">
                Kompilasi native ahead-of-time.
              </strong>{" "}
              Inilah yang dilakukan Perry. TypeScript di-parse dengan SWC,
              tipe diselesaikan, generic di-monomorphize, dan LLVM
              menghasilkan kode mesin. Linker menghasilkan executable biasa
              — jenis artifact yang sama seperti yang dihasilkan toolchain
              Rust, Go, atau C++. Sama sekali tidak ada JavaScript engine di
              dalam binary.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Karena tidak ada engine yang perlu dijalankan dan tidak ada yang
            perlu di-parse saat startup, binary Perry mulai berjalan dalam
            waktu sekitar satu milidetik. Pipeline-nya sendiri dijelaskan
            lebih dalam di halaman{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              kompiler TypeScript native
            </Link>{" "}
            dan di{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              struktur internal kompiler
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Seberapa besar binary-nya?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Ukurannya bergantung pada apa yang Anda sertakan, karena hanya
            kode yang benar-benar Anda gunakan yang dikompilasi dan
            di-link:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              Hello world berukuran sekitar{" "}
              <strong className="text-slate-300">330 KB</strong>.
            </li>
            <li>
              Tool CLI tipikal berada di kisaran{" "}
              <strong className="text-slate-300">2–5 MB</strong>.
            </li>
            <li>
              Aplikasi lengkap yang menyertakan framework besar (Fastify,
              mysql2, dan sejenisnya) berukuran sekitar{" "}
              <strong className="text-slate-300">48 MB</strong>.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Sebagai perbandingan: executable Node SEA adalah salinan dari
            binary <code className="text-slate-300">node</code> itu
            sendiri, jadi ukurannya sudah sekitar 88–118 MB tergantung
            platform sebelum kode Anda ditambahkan, dan hello world yang
            dikompilasi Bun berukuran sekitar 60 MB di macOS arm64 dan
            sekitar 100 MB di Linux x64, karena seluruh runtime Bun ikut
            ditanam.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Ketiganya memberi Anda satu file yang bisa Anda serahkan ke
            orang lain. Selebihnya, ketiganya adalah tool yang sangat
            berbeda, dan masing-masing merupakan jawaban yang tepat untuk
            situasi tertentu:
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
                    Apa yang dihasilkan
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Kode mesin AOT-compiled (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JS yang dibundel + runtime Bun tertanam
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Salinan binary node dengan skrip Anda yang dibundel
                    disisipkan
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Model eksekusi
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Kode native, tanpa JS engine
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) saat runtime
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) saat runtime
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Ukuran hello-world
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) hingga ~100+ MB (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (ukuran binary node)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Waktu mulai
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Kompilasi silang
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 target, termasuk Windows/macOS/iOS dari Linux
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Ya — Linux, Windows, macOS via --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Tidak — sebagai gantinya salin binary node per platform
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Kompatibilitas JS/npm
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Terus bertambah: axios, zod v4, express, fastify, hono
                    dikompilasi secara native; fallback V8 opsional untuk
                    sisanya
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Penuh — inilah runtime Bun itu sendiri
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Semantik Node penuh; membutuhkan pre-bundling, hanya
                    CommonJS di Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Status
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pra-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Stabil</td>
                  <td className="px-4 py-3 text-slate-400">
                    Stabilitas &ldquo;dalam pengembangan aktif&rdquo; di
                    Node 24 LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Kerangka berpikir yang jujur: jika aplikasi Anda bergantung
            pada ekosistem npm secara penuh dan Anda menginginkan risiko
            kompatibilitas nol, Bun dan Node SEA menjalankan persis
            semantik engine yang sudah Anda kembangkan — itulah kekuatan
            mereka, dan biaya ukuran mungkin tidak menjadi masalah untuk
            deployment Anda. Perry menawarkan trade-off yang berbeda. Anda
            mendapat kompilasi ahead-of-time sejati, binary kecil, dan
            startup dalam hitungan milidetik; sebagai gantinya Anda
            mengadopsi kompiler pra-1.0 yang konformansi JavaScript-nya
            diukur dan dipublikasikan (test262: String 79%, Array 72% per
            v0.5.1146) alih-alih diwariskan dari V8.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Perbandingan head-to-head mendetail:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            dan{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . Untuk cara paket npm dikompilasi, lihat{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              paket npm nyata dan sapuan konformansi
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
              Kompilasi binary pertama Anda hari ini
            </h2>
            <p className="text-slate-400 mb-6">
              Instal dengan Homebrew, APT, atau winget — lalu{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
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
