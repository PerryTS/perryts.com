import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript Yerel Derleyicisi: Perry TS'i Makine Koduna Nasıl Derler",
  description:
    "Perry, Rust ile yazılmış bir TypeScript yerel derleyicisidir: SWC ayrıştırma, tipli HIR, monomorphization, LLVM codegen. 10 platform için yerel ikili dosyalar, VM yok.",
  breadcrumb: "TypeScript Yerel Derleyicisi",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Rust ile Yazılmış Bir{" "}
            <span className="gradient-text">TypeScript Yerel Derleyicisi</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry, zaten yazdığınız TypeScript&apos;i makine koduna derler —
            tıpkı bir Rust ya da Go araç zincirinin kendi dilini derlediği
            gibi. Transpile edilmiş JavaScript yok, sanal makine yok, hedef
            sistemde runtime yok.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/getting-started" className="btn-primary">
              Başlayın
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
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Transpiler değil. Runtime değil.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Çoğu TypeScript aracı iki aileden birine girer. Transpiler&apos;lar
            —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild —
            tipleri kontrol edip ayıklar, ardından daha sonra bir motorun
            çalıştırması için JavaScript üretir. Runtime&apos;lar — Node.js,
            Bun, Deno — bu motorların ta kendisidir: programınız her
            başladığında JavaScript&apos;i ayrıştırır, yorumlar ve JIT ile
            derler.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Yerel derleyici üçüncü ailedir ve TypeScript için bu alan büyük
            ölçüde boş kalmıştır. Perry, tip açıklamalarını ayıklanacak
            dokümantasyon olarak değil, kod üretimini yönlendiren girdi
            olarak ele alır.{" "}
            <code className="text-slate-300">perry compile main.ts</code>{" "}
            komutunun sonucu, makine kodu içeren bağımsız bir çalıştırılabilir
            dosyadır — genellikle{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB, yaklaşık bir milisaniyede başlar
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Pipeline, adım adım</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Ayrıştırma (SWC).</strong>{" "}
              Kaynak dosyalar, Rust-yerel TypeScript ayrıştırıcısı olan SWC ile
              ayrıştırılır, bu sayede büyük projeler bile milisaniyeler içinde
              ayrıştırılır. Modül codegen&apos;i, dönüşüm geçişleri ve sembol
              taraması çekirdekler arasında paralel çalışır.
            </li>
            <li>
              <strong className="text-slate-300">Tip çözümleme.</strong>{" "}
              Derleyici bildirilen tipleri çözümler ve geri kalanını çıkarır,
              kod üretimi başlamadan önce her ifadeye somut bir tip verir.
            </li>
            <li>
              <strong className="text-slate-300">
                Tipli HIR &amp; monomorphization.
              </strong>{" "}
              AST, tipli bir yüksek seviye IR&apos;a indirgenir. Generic
              fonksiyonlar ve sınıflar monomorphize edilir —{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> gibi
              her somutlaştırma kendi somut tipleriyle ayrı ayrı derlenir, bu
              yüzden generic&apos;lerin runtime&apos;da hiçbir maliyeti olmaz.
              Tiplerin bilindiği yerlerde metot çağrıları statik dağıtıma,
              nesne alanları ise doğrudan, sabit ofsetli okumalara dönüşür.
            </li>
            <li>
              <strong className="text-slate-300">Codegen (LLVM).</strong> HIR,
              LLVM IR&apos;a indirgenir ve LLVM&apos;in optimizasyon
              pipeline&apos;ından geçirilir — inlining, döngü optimizasyonları,
              vektörleştirme — ardından hedef için makine kodu olarak
              üretilir.
            </li>
            <li>
              <strong className="text-slate-300">Bağlama (Link).</strong>{" "}
              Çıktı, sıradan bir platform çalıştırılabilir dosyasıdır:
              macOS&apos;ta Mach-O, Linux&apos;ta ELF, Windows&apos;ta PE —
              artı mobil, saat, TV ve WebAssembly hedefleri.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            Bunun LLVM tarafı — neden Cranelift yerine LLVM seçildiği,
            NaN-boxing&apos;in dinamik değerleri nasıl temsil ettiği,
            optimize edicinin tipli IR ile ne yaptığı — kendi derinlemesine
            incelemesine sahip:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              LLVM Üzerinde TypeScript
            </Link>
            . NaN-boxing, statik dağıtım ve sıfır maliyetli soyutlamalar gibi
            implementasyon detayları{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              derleyici iç yapısında
            </Link>{" "}
            ele alınır.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Peki dinamik kod ve npm ne olacak?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript, alt katmanda hâlâ JavaScript&apos;tir ve yerel bir
            TypeScript derleyicisi bu konuda dürüst olmak zorundadır.
            Perry&apos;nin resmi test262 paketine karşı uyumluluğu ölçülür ve
            yayınlanır — v0.5.1146 itibarıyla String semantiği %79, Array ise
            %72 seviyesinde ve her sürümde yükseliyor. Saf
            TypeScript/JavaScript npm paketleri{" "}
            <code className="text-slate-300">perry.compilePackages</code> ile
            yerel olarak derlenir: axios, zod v4, express, fastify ve hono
            bugün derlenip çalışıyor. Tam motor semantiğine ihtiyaç duyan kod,{" "}
            <code className="text-slate-300">--enable-js-runtime</code> ile
            gömülü bir V8 fallback&apos;ine geçiş yapabilir.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Tüm hikaye şurada:{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Real npm packages and a conformance sweep
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry, diğer &ldquo;yerel TypeScript&rdquo; girişimleriyle nasıl
            ilişkilidir
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry, TypeScript&apos;in tip açıklamalarına bakıp bunda bir
            derleme fırsatı gören tek proje değil — ama yaklaşımlar keskin
            biçimde farklılaşıyor. AssemblyScript, katı bir TypeScript benzeri
            dili yalnızca WebAssembly&apos;e derler: kasıtlı olarak
            JavaScript ile uyumlu değildir ve işletim sistemi çalıştırılabilir
            dosyaları ya da yerel UI üretmez. Meta&apos;nın Static Hermes&apos;i,
            ağırlıklı olarak React Native için Hermes motoru içinde tipli bir
            JavaScript alt kümesini ahead-of-time derler — 2026 ortası
            itibarıyla bu hâlâ kaynaktan derlenmesi gereken bir araştırma
            projesidir ve React Native&apos;de fiilen dağıtılan Hermes V1
            motoru statik özellikleri içermez (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              tam karşılaştırma
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Perry&apos;nin bahsi her iki eksende de farklı: girdi dili olarak
            standart TypeScript, çıktı olarak da CLI, sunucu ve GUI gibi
            sıradan platform çalıştırılabilir dosyaları — bugün Homebrew,
            APT, winget ya da npm üzerinden kurulabilir.
          </p>

          <h2 className="text-2xl font-bold mb-6">Tek derleyici, on hedef</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Kod üretimi LLVM üzerinden geçtiği için tek bir kod tabanı;
            macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS,
            WebAssembly ve düz Web/JS&apos;e derlenir — Windows, macOS ve iOS
            ikili dosyalarının bir Linux makinesinden cross-compile edilmesi
            dahil. GUI uygulamaları,{" "}
            <code className="text-slate-300">perry/ui</code> kullanır; gerçek
            platform widget&apos;ları (AppKit, UIKit, GTK4, Win32, JNI
            üzerinden Android) üzerinde deklaratif bir API — web view yok.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Bunun diğer yaklaşımlara karşı nasıl bir sonuç verdiği:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native ve Static
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
              Derleyiciyi deneyin
            </h2>
            <p className="text-slate-400 mb-6">
              Perry&apos;yi kurun ve bir dakikadan kısa sürede ilk yerel
              ikili dosyanızı derleyin.
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
