---
title: "Otomatik Güncelleme, Canlı Inspector ve Kendini İkiye Bölen Derleyici"
excerpt: "Perry v0.5.306 → v0.5.359 dört günde — 53 patch sürüm, ~30 issue kapandı ve üç büyük şey indi: masaüstü otomatik güncelleme için perry/updater, localhost:7676'da canlı bir inspector ve en büyük dört dosyayı %33–91 küçülten bir derleyici refactor'u."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
Önceki yazı **v0.5.306**'da gen-GC + JSON + benchmark hikayesiyle kapanmıştı. Dört gün sonra Perry **v0.5.359**'da — yani **53 patch sürüm** — ve hikaye yine farklı. Bu sürümlerin hiçbiri benchmark sayılarını manşete taşımıyor. Neredeyse hepsi **tracker'daki issue'ların kapanması** üzerine.

-   **`perry/updater`** geldi — masaüstü uygulamaları için Sparkle/Tauri tarzı otomatik güncelleme (SHA-256 digest'e Ed25519, sentinel-rollback, ayrılmış yeniden başlatma). Topluluk PR'ı **TheHypnoo**'dan ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Faz D** — `http://localhost:7676` üzerinde canlı bir inspector: widget ağacı, widget bazlı detay, click dispatch ve `POST /style/:h` ile canlı stil düzenleme.
-   **Derleyici refactor'u.** v0.5.329 → v0.5.343 boyunca en çok atıfta bulunulan dört dosya parçalandı: `lower::lower_expr` 6.687 → 624 LOC (−%91), `compile.rs` 9.391 → 3.783 LOC (−%60), `lower.rs` 13.591 → 7.554 LOC (−%44), `lower_call.rs` 7.000+ → 4.681 LOC (−%33). Yeni `walker.rs`, `_ =>` catch-all bug sınıfını derleme hatasına çeviriyor.
-   **UI styling Faz C kapandı** — Apple, Android, GTK4, Windows ve Web'de her widget'ta inline `style: { ... }` props. Windows 5 stub'tan 4'ünü bağladı (decoration / opacity / borders); kalan tek şey `widget.shadow` (DirectComposition takibi).
-   **Windows için Scoop bucket'ı**: `scoop install perry-ts/perry`. Release workflow'una SHA-256 sidecar'ları.
-   **Topluluk issue düzeltmeleri dalgası** — runtime, codegen, fetch, GTK4, Windows linker, async ve stdlib boyunca yaklaşık 30 issue kapandı.

## 1\. perry/updater — masaüstü uygulamaları için otomatik güncelleme

Düzeltmeden önce Perry'nin güncelleme yolu yoktu. Uygulamalar yayınlanıyordu, yine yayınlanıyordu, hepsi bu. **TheHypnoo** [#224](https://github.com/PerryTS/perry/pull/224)'ü tüm hikayeyle birlikte açtı:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // önceki açılış crash ettiyse sentinel-rollback

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // yeni build başarıyla başladıktan sonra çağır
```

Güven modeli: **dosyanın SHA-256 digest'i üzerine Ed25519** (dosya bayt'ları üzerine değil — büyük ikilikilerde doğrulamayı ucuz tutar). Manifest JSON, şema sürümlü, `<os>-<arch>` üçlüsü başına bir kayıt. `<exe>.prev` yedeğiyle atomik kurulum, ayrılmış yeniden başlatma (Unix'te `setsid`, Windows'ta `DETACHED_PROCESS`). Mobil tasarım gereği dışarıda — App Store / Play Store kurulum hattını OS düzeyinde sahipleniyor.

Smoke test yazılırken Perry runtime'ının iki tuhaflığı su yüzüne çıktı ve aynı anda düzeltildi:

-   **`response.arrayBuffer()` sadece metadata stub'u döndürüyordu.** [#232](https://github.com/PerryTS/perry/pull/232)'de düzeltildi (yine TheHypnoo) — `js_response_array_buffer` artık gerçek bir `BufferHeader` ayırıyor ve `resp.body`'yi içine `memcpy` ile kopyalıyor.
-   **`fs.appendFileSync` 0 bayt yazıyordu.** [#226](https://github.com/PerryTS/perry/issues/226)'da düzeltildi — namespace-import lowering yolunda (`import * as fs from "fs"`) `appendFileSync` için kol yoktu, LLVM codegen'de de HIR varyantı için kol yoktu. İkisi de bağlandı.

Belgeler `docs/src/updater/overview.md`'de yaşıyor.

## 2\. Geisterhand: localhost:7676 üzerinde canlı inspector

Geisterhand, Perry'nin in-process UI test koşumuydu — port 7676 üzerinde HTTP API ile widget durumlarını snapshot'lamak ve tıklama dağıtmak için. Faz D bunu, herhangi bir tarayıcıdan açılabilen devtools tarzı bir inspector'a dönüştürüyor.

-   **Adım 1 (v0.5.349)** — `GET /`, widget ağacı, widget başına detay (frame, value, raw JSON), pause/resume'lı 1.5 sn auto-refresh ve «onClick fırlat» aksiyon düğmesi içeren tek-sayfalık bir vanilla-JS UI sunuyor. codegen, macOS lazy-load `-dead_strip`'ine karşı `INSPECTOR_HTML`'i sabitleyerek release build'lerinde hayatta kalmasını sağlıyor.
-   **Adım 2 (v0.5.350)** — `POST /style/:h`, JSON'da bir prop torbasını alıyor ve canlı uyguluyor. 9 prop (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) mevcut pump-queue üzerinden HTTP thread → ana thread'e akıyor. Hatalı JSON → 400; hatalı handle → 400; bilinmeyen prop'lar sunucu tarafında filtreleniyor ve cevap, geçenleri listeliyor.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

macOS dispatcher bağlı; Linux / Windows / iOS / tvOS / visionOS / Android aynı şekli takip ediyor ve sıradaki.

## 3\. Derleyici refactor'u — en büyük dört dosyayı bölmek

Tracker'daki beş issue ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), artı uzun bir kuyruk) aynı şekildeydi: `ir.rs`'e yeni bir `Expr` varyantı eklendi, ama `lower.rs`'deki dört ad-hoc walker'dan birinin `_ =>` catch-all'u vardı ve yeni varyantı sessizce yanlış derliyordu. Bunu çalışma zamanında yakalamak pahalı — bazen görünmez, bazen SSO altında SIGSEGV.

**v0.5.329**, `walk_expr_children` / `walk_expr_children_mut` ile `crates/perry-hir/src/walker.rs`'i tanıttı — 178 `Expr` varyantının tümü üzerinde exhaustive match, **catch-all yok**. Yeni bir varyantı burada listelemeden eklemek artık derleme hatası. Dört tüketici (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) şöyle çöktü:

| Fonksiyon | Önce | Sonra | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −%75 |
| `substitute_locals` | 553 | 80 | −%86 |
| `collect_local_refs_expr` | 720 | 70 | −%90 |
| `remap_local_ids_in_expr` | 542 | 85 | −%84 |

Toplam: **−1.830 satır mükerrer descent**, yerine **+1.840 satır tek merkezli walker** — net düz, ama bug sınıfı yok oldu.

Bu, gerisinin önünü açtı. **v0.5.331 → v0.5.343**, dört monoliti 14 commit'te kesip biçti. Manşet sayıları:

| Dosya | Önce | Sonra | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6.687 | 624 | −%91 |
| `compile.rs` | 9.391 | 3.783 | −%60 |
| `lower.rs` | 13.591 | 7.554 | −%44 |
| `lower_call.rs` | 7.000+ | 4.681 | −%33 |

Bölme, 19 yeni odaklı alt modül olarak yere indi: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs` ve UI / system / i18n metot tabloları için tek doğruluk kaynağı haline gelen yeni `crates/perry-dispatch` crate'i (issue [#191](https://github.com/PerryTS/perry/issues/191)'in «macOS'ta derlenir, web'de kırılır» sürprizlerine yol açan `_ => "perry_ui_unknown"` fan-out'u artık tek lookup).

**Tier 4 perf kazanımları** eşlik etti (v0.5.335–v0.5.336):

-   `inline_functions`'daki iki pass ile `compile.rs`'deki üç rayon pass'ı birleştirildi — derleme başına 5 modül taraması + 3 scheduler gidiş-dönüşü tasarrufu.
-   `perry dev`'in parse cache'i 500 girdiyle sınırlandı, FIFO eviction. Düzeltmeden önce `node_modules`'u dolaşan bir oturum 100+ MB SWC AST tutabiliyordu.
-   codegen sonrası `.ll` yazma döngüsü paralelleştirildi — 50+ modüllü SSD'lerde wall-time 2–4 kat hızlandı.
-   Locale tablosunu worker başına klonlamak yerine `Arc<I18nTable>`.

Workspace testleri her commit boyunca **434 passed / 0 failed / 5 ignored**'da kaldı; gap testleri 25/28 baseline; doc-tests 80/82 baseline.

## 4\. UI styling Faz C, tamam

Faz C, inline `style: { ... }` rollout'uydu. 1–7 arası adımlar bu pencerede kapandı:

-   **v0.5.305 → v0.5.306** — `StyleProps` tip yüzeyi + Button'da inline `style:`.
-   **v0.5.307 → v0.5.309** — her tablo widget'ında color/padding/shadow inline destructure, ardından VStack / HStack.
-   **v0.5.310 → v0.5.311** — hex string'ler + gradient + dinamik değerler için runtime `parseColor`.
-   **v0.5.312** — styling docs + Windows takip issue'sı.

Sonra cross-platform süpürme:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 styling FFI bağlandı, ayrıca Linux doc-tests kapısını tıkayan 7 eksik FFI (v0.5.322).
-   **macOS** (v0.5.324) — `widget.shadow` için `CALayer` gölge tesisatı + visual\_test altyapısı; `NSTextField` olmayan widget'lar için `set_color` sınıf-probe.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button'da `color: ...`, `UIButton` üzerinde `setTextColor:`'a vuruyordu, ki bu selector implement edilmiyor; `objc2` panic'i bir `extern "C"` sınırını aşıyordu ve süreç abort oluyordu. macOS'teki sınıf-probe deseniyle düzeltildi — UIButton artık `setTitleColor:forState:UIControlStateNormal` üzerinden yönlendiriliyor.
-   **Windows** (v0.5.347) — 5 styling stub'tan 4'ü bağlandı (`text.decoration` `LOGFONT` round-trip'i ile, `widget.opacity` `WS_EX_LAYERED` + `SetLayeredWindowAttributes` ile, borders `SetWindowSubclass` + `WM_PAINT` ile). Yalnızca `widget.shadow` kaldı (DirectComposition gerekiyor).

`docs/src/ui/styling-matrix.md`'deki styling matrisi, pencereyi **Web 43/43 Wired**, **Windows 42/43 Wired**, geri kalanı tam kapsamla bitiriyor.

## 5\. Runtime doğruluk geçişi — issue'dan issue'ya

Dönemin teması: tracker'dan gelen her miscompile ya bir düzeltmeye ya da derleme zamanı hatasına dönüştü. Öne çıkanlar:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — `fn` içindeki sınıf metotları, çevreleyen fn'in local'lerini yakalayamıyordu. Çoklu modül repro&su artık Node ile bayt-bayt eşleşiyor.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — 7 string operand site'ında SSO-güvenli string-handle unboxing: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, crypto digest girişi. Düzeltmeden önce her biri ya sessizce çöp döndürüyordu ya inline-string operandlarda SIGSEGV oluyordu.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — modül seviyesindeki boş `const` dizileri, fonksiyon içlerinden gelen `arr[i]=` yazmalarını düşürüyordu. Bloom-Engine/jump'ın `discoverLevels()`'i, `LEVEL_FILES`'ı modül seviyesinde index-assign ile dolduruyor ve seviye seçim ekranı boş çıkıyorken ortaya çıktı.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — async fonksiyon içinden `Array.push`, dizi parametre olarak girdiğinde sessizce 16 elemanla sınırlanıyordu. Async fonksiyonlar inline edilmez; reallocation yeni bir pointer döndürüyor ama çağıran bunu görmüyordu. Düzeltme: her büyümede eski konuma forwarding pointer kur, GC'nin mevcut `GC_FLAG_FORWARDED` mekanizmasını yeniden kullan.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — çağıranlar sondaki args'ları atladığında metot default param dispatch'i çöp aktarıyordu. İki katkı parçası: cross-module metot declare'ları `arity + 1` yerine 6 double sabit kodluyordu, ve `lower_class_method` hiç `build_default_param_stmts` çağırmıyordu. mongodb'nin `findOne(filter, options = {})`'ı sessizce takılıyorken yüzeye çıktı; düzeltme yerel ve cross-module dispatch'te tek tip.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — bir repro'dan üç bağımsız fetch + promise hatası: api.github.com anonim için 403 dönüyordu (artık varsayılan User-Agent set), `.then(console.log)` sonsuza kadar takılıyordu (null callback'ler TASK\_QUEUE girdileri push'lamıyordu), her fetch reddi `Uncaught exception: [object Object]` basıyordu (gerçek `ErrorHeader` yerine NaN-box'lı çıplak `*StringHeader`).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — `arrayBuffer` / `text` / `bytes` / `slice` instance metotlarına sahip gerçek `Blob`. Düzeltmeden önce `await response.blob()` sadece metadata stub'u `{size, type}` döndürüyordu. Üç parçalı düzeltme runtime + HIR + codegen üzerine indi.

Artı küçük yetişmeler:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup, Linux'ta jenerik monomorfizasyonları aşırı budayarak + GTK4 link sessiz-fallback. Düzeltme: isim deseniyle filtrelemeyi `llvm-nm` üzerinden **sembol kümesi** karşılaştırmasıyla değiştir. Tek bir benzersiz sembolü bile olan üyeler korunuyor. Link hatasız `libperry_ui_macos.a` 196 → 35 nesneye budandı.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — Windows link satırına `secur32.lib` eklendi.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` Ryū üzerinden FP round-trip.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — `perry/i18n` format wrapper'ları için codegen dispatch bağlandı.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — `perry/plugin` codegen dispatch.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — Canvas widget'ı LLVM codegen üzerinden.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView codegen üzerinden.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — Table widget'ı codegen üzerinden.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (kısmi) — 11 stdlib helper dispatch kolu.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — iOS + Android'de arka planda bildirim alma (warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — watchOS oyun döngüsü FFI hook'ları için zayıf fallback'ler.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — `using` / `await using` dispose hook'ları.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — `js_native_call_method` args alloca'sı entry bloğuna kaldırıldı.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — `substitute_locals` Uint8Array kolları.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` uçtan uca bağlandı (topluluk PR'ı).

## 6\. Windows + Scoop

Windows toolchain hikayesi sadeleşmeye devam ediyor. **v0.5.353**, host build'lerde `clang -target`'ı sabitledi — PATH'teki MSVC olmayan clang (MinGW / MSYS2 / Anaconda / Rust GNU bundle'ları) Perry'nin `x86_64-pc-windows-msvc` IR'ını sessizce `windows-gnu`'ya çeviriyordu, ve lld-link, LLVM'in mingw32 emitter'ının eklediği `__main` referansını çözemiyordu. Yeni `probe_clang_default_triple`, süreç başına bir kez `clang --version` çalıştırıyor ve host varsayılanı GNU iken hedef MSVC ise tek bir bilgi notu yazıyor. `PERRY_NO_CLANG_PROBE=1` ile bastırılabilir.

**v0.5.345**, Win64 `perry-ui` ABI'ını `perry-dispatch` ile hizaladı — üç runtime extern imzası kaymıştı (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). Win64 ABI'ında integer ve float pozisyonel arg'lar slot indekslerini paylaşır, dolayısıyla bir uyumsuzluk başlatılmamış register'lardan çöp okur. SysV (macOS / Linux) ayrı int/float register havuzları kullanıyor ve şans eseri geçerli bit'ler düşüyordu — yalnızca Windows'a özgü crash, 8 perry-ui-\* platform crate'inin hepsinde düzeltildi.

Sonra: **`scoop install perry-ts/perry`**. Manifest v0.5.345'e sabit (resmi MSVC-default LLVM'i otomatik çekmek için `depends: main/llvm` ile). Release workflow'u artık her arşivin yanına `<artifact>.sha256` sidecar'ları yayıyor; format `sha256sum` uyumlu, herhangi bir downstream paket yöneticisi bumper'ı için.

```
# Windows host
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Toparlama

Bu dönemin örüntüsü topluluk katılımı artı dahili hijyen. **TheHypnoo** üç kayda değer PR teslim etti ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) `fs.appendFileSync` bağlantısı, [#232](https://github.com/PerryTS/perry/pull/232) `response.arrayBuffer` body bayt'ları). Tracker yaklaşık 30 issue boşaldı. Derleyici en büyük dosyasında %60 küçüldü ve «dört ad-hoc walker'dan birini güncellemeyi unuttum»u runtime miscompile'dan `cargo build` hatasına çeviren exhaustive bir walker kazandı. UI styling, Windows'taki gölgeler hariç her masaüstü platformunda parite yakaladı. Geisterhand tarayıcı tabanlı bir devtools yüzeyi büyüttü. Windows kurulum yolu bir komut kısaldı.

Dene:

```
# npm (her platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Masaüstü uygulamaları için otomatik güncelleme
npm install @perry/updater

# Canlı inspector
perry compile main.ts -o app --enable-geisterhand
./app &  # sonra http://localhost:7676 aç
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
