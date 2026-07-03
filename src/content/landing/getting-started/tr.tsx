import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Perry ile Başlayın — Kurun ve TypeScript'i Yerel Koda Derleyin",
  description:
    "Perry'yi Homebrew, APT veya winget ile kurun ve ilk TypeScript dosyanızı bir dakikadan kısa sürede yerel bir çalıştırılabilir dosyaya derleyin. Node.js gerekmez.",
  breadcrumb: "Başlayın",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">Perry</span> ile Başlayın
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Üç adımda sıfırdan çalışan bir yerel çalıştırılabilir dosyaya
            ulaşın. Node.js yok, bundler yok, hedef makineye kurulacak bir
            runtime yok.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            İlk ikili dosyanız, adım adım
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Perry kurulduktan sonra, TypeScript&apos;i yerel bir
            çalıştırılabilir dosyaya derlemek tek bir komuttur. Bir dosya
            yazın:
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
            Onu derleyin ve sonucu çalıştırın — çıktı, paketlenmiş bir script
            değil, kendi kendine yeterli bir makine kodu ikili dosyasıdır:
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
            Bu ikili dosya yaklaşık bir milisaniyede başlar ve aynı işletim
            sistemine ve mimariye sahip her makinede çalışır — önce kurulacak
            hiçbir şey yoktur. Ayrıntılar için{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry&apos;nin TypeScript&apos;i bir ikili dosyaya nasıl
              derlediği
            </Link>{" "}
            hakkında ya da{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript yerel derleyicisinin
            </Link>{" "}
            içinde neler olduğu hakkında bilgi edinin.
          </p>

          <h2 className="text-2xl font-bold mb-6">Sırada ne var?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Dokümantasyon
              </h3>
              <p className="text-slate-400 text-sm">
                CLI, perry/ui widget&apos;ları, iş parçacıkları, i18n ve her
                derleme hedefi için rehberler — docs.perryts.com adresinde.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Perry ile derlenmiş, App Store ve ötesinde yayınlanan gerçek
                uygulamalar.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Karşılaştır
              </h3>
              <p className="text-slate-400 text-sm">
                Perry&apos;nin Bun, Deno, Electron, Tauri, React Native ve
                Static Hermes ile karşılaştırması.
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
                Kaynak kod, sorunlar ve tartışmalar — Perry açık kaynaktır.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
