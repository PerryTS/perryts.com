import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript'i İkili Dosyaya Derleyin (Bağımsız Çalıştırılabilir Dosyalar)",
  description:
    "TypeScript'i ikili dosyaya derleyin: Node.js olmadan 2–5 MB bağımsız yerel çalıştırılabilir dosyalar. Perry'nin bun build --compile ve Node SEA ile karşılaştırması.",
  breadcrumb: "TypeScript'i İkili Dosyaya Derleyin",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript&apos;i <span className="gradient-text">İkili Dosyaya</span> Derleyin
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Tek bir komut <code className="text-slate-300">main.ts</code>{" "}
            dosyasını bağımsız bir yerel çalıştırılabilir dosyaya dönüştürür.
            Hedef makinede Node.js yok, gömülü runtime yok, kullanıcılarınız
            için kurulum adımı yok.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Perry&apos;yi Kur
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              GitHub&apos;da Görüntüle
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
            İnsanların &ldquo;TypeScript derleme&rdquo; dediği üç şey
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Geliştiriciler TypeScript&apos;in nasıl ikili dosyaya
            derleneceğini araştırdığında, genellikle aynı kelimeyi paylaşan üç
            çok farklı teknikle karşılaşır:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpile etme.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC ve esbuild
              TypeScript&apos;i JavaScript&apos;e dönüştürür. Çıktının
              çalışması için hâlâ Node.js, Bun veya bir tarayıcı gerekir.
              Ortada bir ikili dosya yoktur.
            </li>
            <li>
              <strong className="text-slate-300">Runtime gömme.</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code> ve
              Node.js&apos;in Tek Çalıştırılabilir Uygulamalar (SEA) özelliği,
              paketlenmiş JavaScript kodunuzu runtime&apos;ın tam bir
              kopyasıyla birleştirir. Tek bir dosya elde edersiniz, ama motor
              bu dosyanın içinde taşınır ve kodunuz süreç her başladığında
              yine ayrıştırılır ve JIT ile derlenir.
            </li>
            <li>
              <strong className="text-slate-300">
                Ahead-of-time yerel derleme.
              </strong>{" "}
              Perry&apos;nin yaptığı budur. TypeScript SWC ile ayrıştırılır,
              türler çözümlenir, generic&apos;ler monomorphize edilir ve LLVM
              makine kodu üretir. Linker, bir Rust, Go veya C++ araç
              zincirinin ürettiğiyle aynı sınıftan normal bir çalıştırılabilir
              dosya üretir. İkili dosyanın içinde hiçbir JavaScript motoru
              yoktur.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Başlatılacak bir motor ve başlangıçta ayrıştırılacak hiçbir şey
            olmadığı için bir Perry ikili dosyası yaklaşık bir milisaniyede
            başlar. Pipeline&apos;ın kendisi{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript yerel derleyici
            </Link>{" "}
            sayfasında ve{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              derleyici iç yapısı
            </Link>{" "}
            içinde daha ayrıntılı olarak ele alınmıştır.
          </p>

          <h2 className="text-2xl font-bold mb-6">İkili dosya ne kadar büyük?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Boyut, projenize dahil ettiğiniz şeye bağlıdır, çünkü yalnızca
            gerçekten kullandığınız kod derlenir ve linklenir:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              Bir hello world yaklaşık{" "}
              <strong className="text-slate-300">330 KB</strong> boyutundadır.
            </li>
            <li>
              Tipik CLI araçları{" "}
              <strong className="text-slate-300">2–5 MB</strong> civarındadır.
            </li>
            <li>
              Büyük framework&apos;ler (Fastify, mysql2 ve benzerleri) bağlayan
              tam uygulamalar yaklaşık{" "}
              <strong className="text-slate-300">48 MB</strong> civarındadır.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Karşılaştırma olarak: bir Node SEA çalıştırılabilir dosyası{" "}
            <code className="text-slate-300">node</code> ikili dosyasının
            kendisinin bir kopyasıdır, bu yüzden kodunuz eklenmeden önce
            platforma bağlı olarak kabaca 88–118 MB&apos;tan başlar; Bun ile
            derlenmiş bir hello world ise tüm Bun runtime&apos;ı gömülü olduğu
            için macOS arm64&apos;te yaklaşık 60 MB, Linux x64&apos;te ise
            yaklaşık 100 MB ölçülür.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Üçü de size birine verebileceğiniz tek bir dosya sağlar. Bunun
            dışında birbirinden çok farklı araçlardır ve her biri farklı bir
            durumda doğru cevaptır:
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
                    Ürettiği şey
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    AOT derlenmiş makine kodu (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Paketlenmiş JS + gömülü Bun runtime&apos;ı
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Paketlenmiş betiğinizin enjekte edildiği node ikili
                    dosyasının kopyası
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Çalıştırma modeli
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Yerel kod, JS motoru yok
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Çalışma zamanında JIT (JavaScriptCore)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Çalışma zamanında JIT (V8)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Hello-world boyutu
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) ile ~100+ MB (Linux/Windows) arası
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (node ikili dosyasının boyutu)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Başlatma
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Çapraz derleme
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Linux&apos;tan Windows/macOS/iOS dahil olmak üzere 10 hedef
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Evet — --target ile Linux, Windows, macOS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Hayır — bunun yerine platforma özgü bir node ikili
                    dosyası kopyalanır
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    JS/npm uyumluluğu
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Artıyor: axios, zod v4, express, fastify, hono yerel
                    olarak derlenir; geri kalanı için isteğe bağlı V8
                    fallback&apos;i
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Tam — zaten Bun runtime&apos;ının kendisi
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Tam Node semantiği; ön-paketleme gerektirir, Node 24
                    LTS&apos;te yalnızca CommonJS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Durum
                  </td>
                  <td className="px-4 py-3 text-slate-400">1.0 öncesi</td>
                  <td className="px-4 py-3 text-slate-400">Kararlı</td>
                  <td className="px-4 py-3 text-slate-400">
                    Node 24 LTS&apos;te &ldquo;Active development&rdquo;
                    kararlılık düzeyi
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Dürüst çerçeveleme: uygulamanız npm ekosisteminin tamamına
            dayanıyorsa ve sıfır uyumluluk riski istiyorsanız, Bun ve Node SEA
            zaten üzerine geliştirme yaptığınız motor semantiğini birebir
            çalıştırır — güçlü yanları budur ve boyut maliyeti dağıtımınız
            için önemli olmayabilir. Perry farklı bir takas sunar. Gerçek bir
            ahead-of-time derleme, küçük ikili dosyalar ve milisaniye
            seviyesinde başlatma elde edersiniz; karşılığında JavaScript
            uyumluluğu V8&apos;den miras alınmak yerine ölçülüp yayımlanan
            (test262: String 79%, Array 72%, v0.5.1146 itibarıyla) 1.0 öncesi
            bir derleyiciyi benimsersiniz.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Ayrıntılı karşılaştırmalar:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            ve{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . npm paketlerinin nasıl derlendiğini görmek için{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Real npm packages and a conformance sweep
            </Link>{" "}
            yazısına bakın.
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
              Bugün ilk ikili dosyanızı derleyin
            </h2>
            <p className="text-slate-400 mb-6">
              Homebrew, APT veya winget ile kurun — ardından{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Başlayın
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Dokümanları Okuyun
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
