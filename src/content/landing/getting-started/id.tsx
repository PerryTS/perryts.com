import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Mulai dengan Perry — Instal & Kompilasi TypeScript ke Native",
  description:
    "Instal Perry dengan Homebrew, APT, atau winget dan kompilasi file TypeScript pertama Anda menjadi executable native dalam waktu kurang dari semenit. Tanpa Node.js.",
  breadcrumb: "Mulai",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Mulai dengan <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Dari nol menjadi executable native yang berjalan dalam tiga
            langkah. Tanpa Node.js, tanpa bundler, tanpa runtime yang perlu
            diinstal di mesin target.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Binary pertama Anda, langkah demi langkah
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Setelah Perry terinstal, mengompilasi TypeScript menjadi
            executable native hanya perlu satu perintah. Tulis sebuah file:
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
            Kompilasi lalu jalankan hasilnya — outputnya adalah binary kode
            mesin yang berdiri sendiri, bukan skrip yang dibundel:
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
            Binary tersebut mulai berjalan dalam waktu sekitar satu milidetik
            dan berjalan di mesin mana pun dengan OS dan arsitektur yang sama
            — tidak ada yang perlu diinstal terlebih dahulu. Baca lebih
            lanjut tentang{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              bagaimana Perry mengompilasi TypeScript menjadi binary
            </Link>{" "}
            atau apa yang terjadi di dalam{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              kompiler TypeScript native
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Langkah selanjutnya</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Dokumentasi
              </h3>
              <p className="text-slate-400 text-sm">
                Panduan untuk CLI, widget perry/ui, threading, i18n, dan
                setiap target kompilasi — di docs.perryts.com.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Aplikasi nyata yang dikompilasi dengan Perry, dikirim ke App
                Store dan lainnya.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Bandingkan
              </h3>
              <p className="text-slate-400 text-sm">
                Bagaimana Perry dibandingkan dengan Bun, Deno, Electron,
                Tauri, React Native, dan Static Hermes.
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
                Kode sumber, issue, dan diskusi — Perry adalah open source.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
