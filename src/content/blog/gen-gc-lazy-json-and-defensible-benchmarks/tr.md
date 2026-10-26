---
title: "Kuşaksal GC, Lazy JSON ve İncelemeye Dayanan Benchmark'lar"
excerpt: "Perry v0.5.174 → v0.5.306 üç günde. Birlikte inen GC ve JSON çalışmasıyla. Kuşaksal GC artık varsayılan. Small String Optimization artık varsayılan. JSON pipeline, validate-and-roundtrip'te 75 ms medyana inen bir lazy tape kazanıyor — dinamik tipli runtime grubunun en iyisi. Benchmark sayfası RUNS=11 medyan + p95 + σ ile yeniden yazıldı, simdjson ve AssemblyScript+json-as eş olarak eklendi ve Perry'nin her zayıflığı dürüstçe sergilendi."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
Son yazı **v0.5.174**'te tek bir manşetle kapanmıştı: Perry, ağaç içi suite'teki her benchmark'ta nihayet hem Node'u hem de Bun'ı yeniyordu. Üç günlük çalışma ve birikmiş GC + JSON commit'leri sonrası Perry **v0.5.306**'da — yani **132 patch sürümü** — ve hikâye farklı. Manşet 547x bir hızlanma ya da yeni bir kazanç sütunu değil. Asıl iş, o kazanımları savunulabilir kılan iş.

-   **Generational GC** varsayılan olarak gönderiliyor. Phase A'dan D'ye kadar v0.5.217–v0.5.237 arasında indi.
-   **Small String Optimization** varsayılan olarak gönderiliyor. Step 1.5 → 2 v0.5.213–v0.5.216'da indi.
-   **JSON pipeline'ı** tape tabanlı parser, lazy parse, lazy stringify ve element başına seyrek materyalizasyon kazandı. Varsayılan validate-and-roundtrip artık **medyan 75 ms** — dinamik tipli grupta en iyisi.
-   **Benchmark sayfası** uçtan uca **RUNS=11 medyan + p95 + σ + min + max** ile yeniden yazıldı, simdjson ve AssemblyScript+json-as eş olarak eklendi, optimizasyon probe'ları gerçek karşılaştırmalardan ayrıldı ve Perry'nin her zayıflığı dürüstçe yüzeye çıkarıldı.

Yardımcı kadro istikrarlı bir doğruluk düzeltmesi serisi: Promise microtask FIFO, NaN eşitliği ve ECMAScript sayı biçimlendirmesi, BigInt ikiye tümleyen, uçtan uca AsyncLocalStorage, decimal.js + ioredis + commander runtime'ları ve tape yolları altında saklanan bir `JSON.stringify` segfault'u (düz f64 üzerinde). Ayrıca Windows toolchain nihayet hafifledi: LLVM + xwin, Visual Studio kurulumu gerekmiyor.

## 1\. Generational GC, varsayılan olarak açık

Generational GC iki aydır aşamalı bir roll-out süreciydi. Bu pencerede kapanan fazların özeti:

-   **v0.5.217–v0.5.221** — Phase A: shadow-stack runtime iskelesi, push/pop emisyonu, slot-map threading, `Let`/`LocalSet` shadow yansıtması ve root scanner.
-   **v0.5.222** — Phase B: nursery + old-gen arena ayrımı.
-   **v0.5.223–v0.5.225** — Phase C1–C2: write-barrier runtime altyapısı, codegen barrier'ı yayıyor, her heap store oradan geçiyor.
-   **v0.5.226–v0.5.228** — Phase C3a–C4: remembered-set kökleri mark + clear'a akıyor; minor GC trace old-gen'i atlıyor; non-moving tenuring.
-   **v0.5.229–v0.5.236** — Phase C4b α/β/γ/δ: forwarding-pointer altyapısı, pinning + evacuation pass, scanner + transitif pinning, referans yeniden yazımı, boştaki nursery blokları OS'a iade ediliyor, GC tetikleyici başlangıç eşiğinde sınırlanıyor.
-   **v0.5.237** — Phase D part 1: `PERRY_GEN_GC=1` varsayılan.
-   **v0.5.238** — Phase D part 2: `PERRY_SHADOW_STACK=1` varsayılan.
-   **v0.5.239–v0.5.240** — kapanış dokümanları: yol haritası tamamlandı, akademik + endüstri soyağacı eki (Bartlett 1988, Ungar 1984, Cheney 1970).

En önemli ölçülen kazanç: `test_memory_json_churn` gen-GC varsayılana çevrildiği anda tepe RSS'te **115 MB → 91 MB**'ye düştü. Compute regresyonları küçüktü ve özür dilemeden listelendi — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` her biri +1 ms. Kaçış kapısı (`PERRY_GEN_GC=0`) eski rakamları geri getiriyor; ödünleşim kasıtlıydı ve benchmark sayfası artık her iki satırı yan yana listeliyor, böylece okuyucu seçim yapabiliyor.

## 2\. Small String Optimization, varsayılan olarak açık

SSO, kısa string'ler için heap allocation'ından kaçınan 22 byte'lık inline-string temsilidir — tipik JSON anahtarları (2–8 byte) ve kısa değerler inline forma iniyor. Roll-out yüzeyde küçük, kaputun altında büyüktü:

-   **v0.5.213**: SSO altyapısı (temsil + erişimciler).
-   **v0.5.214**: Step 1 consumer arms + test için `PERRY_SSO_FORCE` kapısı.
-   **v0.5.215**: Step 1.5 codegen `PropertyGet` üç-yönlü dal — inline string'ler için fast path, heap string'ler için fast path, kalan için slow path.
-   **v0.5.216**: Step 2 flip — varsayılan olarak SSO yay.

v0.5.279'daki takipler, SSO sıcak hale gelince yüzeye çıkan son property-read NaN bug'ını kapattı; v0.5.272'deki zincirli cross-module getter dispatch düzeltmesi de bir başkasını kapattı. İkisi de varsayılan çevrilmeden önce kontrol listesindeydi; ikisi de perf regresyonu olmadan gönderildi.

## 3\. JSON: tape tabanlı parse, varsayılan olarak lazy

JSON pipeline'ı dönemin en istilacı yeniden yazımını aldı. Eski davranış: `JSON.parse` NaN-boxed değerlerden tam materyalize edilmiş bir ağaç inşa ediyordu. Yeni davranış: `JSON.parse` değer başına 12 byte'lık bir tape inşa ediyor ve lazy şekilde materyalize ediyor — yalnızca gerçekten okuduğunuz değerler materyalizasyon maliyetini ödüyor. Değiştirilmemiş bir parse'ın stringify'ı artık orijinal girdinin memcpy'si — simdjson'ın `raw_json()` ile kullandığı aynı fast-path numarası.

-   **v0.5.200**: `JSON.parse<T>(blob)` şema yönlendirmeli parse (Step 1). Derleme zamanında bilinen şekil, derleyicinin önceden çözümlenmiş anahtar erişimi yaymasına izin veriyor.
-   **v0.5.203**: tape tabanlı parse temeli — Step 2 Phase 1.
-   **v0.5.204**: lazy parse + lazy stringify — Step 2 Phase 2+4.
-   **v0.5.206**: lazy-safe indeksli erişim + uç durumlar — Step 2 Phase 3.
-   **v0.5.208**: element başına seyrek materyalizasyon — Step 2 Phase 5b.
-   **v0.5.209**: walk cursor + uyarlanır materyalize eşiği.
-   **v0.5.210**: ≥1 KB blob'lar için lazy parse'ı varsayılana çevir.

Lazy tape'in tasarlandığı iş yükündeki sonuç (10k kayıt, ~1 MB blob, ara yineleme olmadan parse → stringify):

| Implementasyon | Medyan (ms) | p95 (ms) | σ | Tepe RSS |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson) | 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + lazy tape) | 75 | 91 | 6.9 | 85 MB |
| rust serde\_json (LTO) | 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialization) | 473 | 533 | 21.4 | 606 MB |
| assemblyscript+json-as (wasmtime) | 598 | 621 | 10.5 | 58 MB |

**Medyan 75 ms** ile Perry karşılaştırmadaki en hızlı dinamik-tipli runtime — Bun'ı (259 ms), Node'u (394 ms), Kotlin'in sunucu JIT'ini (453 ms) yeniyor. 24 ms'de simdjson, SIMD-hızlandırmalı C++ tavanı ve sayfada bilinçli olarak duruyor — cherry-pick'in arkasına saklanmıyor. Perry onu yenmiyor. Amaç farkı göstermek, böylece kapatmanın bir hedefi olsun — `docs/json-typed-parse-plan.md`'de izleniyor.

Dürüst eşlikçi bench **parse-and-iterate**: aynı blob, ama her yineleme her kaydın `nested.x` değerini topluyor, bu da lazy tape'i materyalize etmeye zorluyor. Orada Perry **466 ms**'ye iniyor — mark-sweep kaçış kapısının 375 ms'sinden daha yavaş, çünkü tape amortize edemediği bir overhead ödüyor. O satır TL;DR §B'de. İşten kaçınamadığınızda, lazy tape kaçabiliyormuş gibi davranmıyor.

## 4\. Benchmark sayfası, yeniden yazıldı

Perry'nin performans rakamlarını sunma şekliyle ilgili üç şey değişti.

**RUNS=11 medyan + p95 + σ + min + max, best-of-N değil.** Best-of-N tail latency'yi sessizce düşürür; bu donanımda 9.4 saniyelik Python `accumulate` outlier'larını ve Swift JSON'un 5.3 saniyelik p95 spike'larını saklıyordu. Medyan kuyrukları sayfaya geri koyuyor. Metodoloji değişikliği v0.5.248'de indi; TL;DR §A ve §B'deki her hücre **2026-04-25** itibarıyla taze RUNS=11.

**Optimizasyon probe'ları gerçek runtime perf'ten ayrıldı.** Perry'yi 12–34 ms'de, Rust/C++'ı 98 ms'de gösteren beş hücre — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — silikon değil, derleyici bayrak duruşunu ölçüyor. Artık kendi alt bölümlerindeler ve üstlerindeki bir paragraf, `clang++ -O3 -ffast-math`'ın bunları bir milisaniye içine kapattığını açıklıyor. Manşet gerçek-runtime kernel'i `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — derleyicinin gerçekten işi katlayamadığı bir kernel'de Perry no-FMA-contract grubunun tam ortasında oturuyor. Dürüst karşılaştırma bu.

**Eşler eklendi.** simdjson (4.3.0) artık her iki JSON tablosunda da — C++ parse-throughput tavanı, sayfada okuyucunun farkı görebilmesi için. json-as (1.3.2) ile AssemblyScript en yakın kurulabilir TS-to-native eş; porffor bu boyuttaki iş yükünde segfault verdi, Static Hermes macOS arm64'te kurulmadı. kotlinx.serialization ile Kotlin v0.5.241–v0.5.242'de JSON polyglot'a katıldı. Her satır gerçek, her uyarı sayfada.

## 5\. Polyglot compute tablosu

Gerçekten katlanamaz manşet kernel'leri, RUNS=11 medyan, 2026-04-25'te v0.5.249'da yenilendi:

| Benchmark | Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci | 318 | 330 | 315 | 282 | 1022 | 589 |
| loop\_data\_dependent | 235 | 229 | 129 | 229 | 322 | 232 |
| object\_create | 1 | 0 | 0 | 5 | 11 | 6 |
| nested\_loops | 18 | 8 | 8 | 11 | 18 | 21 |

`fibonacci`'de Perry, derlenmiş grupla 3–15 ms içinde eşleşiyor. Java'nın HotSpot JIT'i, özyinelemeli çağrıyı inline ettiği için ~%11 daha hızlı. `loop_data_dependent`'ta kernel iki FP-contract kümesine ayrılıyor: ~128 ms'deki FMA-contract grubu (Go default, Apple Clang'daki `g++ -O3` — her ikisi de `sum * a + b`'yi tek bir FMADDD'ye birleştiriyor) ve 229–235 ms'deki no-contract grubu (Perry, Rust default, Swift, `-XX:+UseFMA`'sız Java, Bun) skaler FMUL + FADD çalıştırıyor. LLVM, FMA grubunu `-ffp-contract=fast` ile eşliyor; Perry bunu varsayılan olarak etkinleştirmiyor. `nested_loops` cache-bound, compute-bound değil; herkes 8–21 ms'ye iniyor.

## 6\. Windows toolchain, hafif

Windows kullanıcılarının artık Visual Studio kurulumuna ihtiyacı yok. **v0.5.199** [#176](https://github.com/PerryTS/perry/issues/176)'yı kapattı: `perry setup windows` + winget LLVM + xwin tüm VS BuildTools ağacının yerini alıyor. `v0.5.201` `find_lld_link` / `find_perry_windows_sdk` üzerindeki cfg kapısını kaldırdı, böylece path keşfi yalnızca macOS host'larda değil, Windows'u hedefleyen her platformda çalışıyor.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Runtime doğruluk geçişi

Dönemin bir teması: V8/JSC'den sessiz runtime sapmaları ya düzeltmelere ya da derleme hatalarına dönüştü. Önemsiz olmayanlar:

-   **v0.5.255**: `BigInt.fromTwos`/`toTwos` ikiye tümleyen.
-   **v0.5.263**: `Promise.all`/`race`/`any` non-promise tip ayrımı.
-   **v0.5.281**: `NaN==NaN` + ECMAScript sayı biçimlendirmesi (`3 → "3"`, `"3.0"` değil; `-0 → "0"`; vb.).
-   **v0.5.280**: `(x) | 0` içinde `NaN`/`Infinity` ToInt32 zorlaması.
-   **v0.5.284**: Promise microtask FIFO + thrown-handler propagasyonu.
-   **v0.5.286**: Düz f64 üzerinde `JSON.stringify` tape yolları altında segfault veriyordu.
-   **v0.5.277**: `fs.readFileSync` encoding geçilmediğinde Buffer döndürüyor (Node ile eşleşiyor).
-   **v0.5.272**: zincirli cross-module getter dispatch `undefined` döndürüyordu.

Issue [#187](https://github.com/PerryTS/perry/issues/187) için stdlib takipleri tamamlandı: uçtan uca AsyncLocalStorage (v0.5.261), `.action()`'ı gerçekten çağıran commander runtime + codegen (v0.5.250), decimal.js kodu (v0.5.259), uçtan uca Redis ioredis (v0.5.270), pg + mongo async-factory deseni (v0.5.275) ve EE/LRU/WSS'te aynı async-factory bug'ı (v0.5.252).

`perry/ui` tarafında: notification tap callback (#97) hem Apple (v0.5.254) hem Android (v0.5.258) tarafında bağlandı; local notification'ları zamanlama + iptal (#96, v0.5.244); Android'de FCM register + receive (v0.5.262).

## 8\. Toparlama

Bu dönemin deseni manşet rakamlar değil. Mevcut kazanımların incelemeye dayanmasını sağlayan iş: sürekli-allocation iş yüklerini yakalayan bir generational GC, kısa-string maliyet açığını kapatan bir SSO, en yaygın iş yükünün “değişiklik yok” yapısını sömüren bir JSON pipeline'ı ve best-of-N yerine medyan ölçen ve simdjson'ın 24 ms parse tavanını Perry'nin 75 ms'siyle aynı satırda gösteren bir benchmark sayfası. Okuyucu farkı — ve Perry'nin tabana göre nerede oturduğunu — görüyor.

Deneyin:

```
# npm (herhangi bir platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — VS kurulumu gerekmiyor)
winget install PerryTS.Perry

# Varsayılan benchmark suite&apos;i
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Kaynak: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Benchmarks: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
