---
title: "Gerçek npm Paketleri Artık Derleniyor: axios, zod, express — ve Bir Uygunluk Süpürmesi"
excerpt: "v0.5.875'ten v0.5.1146'ya ~270 sürüm tek bir benchmark'la ilgili değildi — gerçek npm paketlerini derletip çalıştırmakla ilgiliydi. axios, zod v4, express, fastify ve hono artık çalışıyor; test262 paritesi sıçradı (String 60→79%, Array 61→72%); Windows Mica ile Fluent oldu; ve DatePicker + drag & drop her platforma indi."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
Son yazı **v0.5.875**'te GC hikayesiyle bitmişti — aya\_koto'nun benchmark'ının açığa çıkardığı açığı kapatmakla. O yazı tek bir benchmark'ı kazanmakla ilgiliydi. Bu yazı farklı türden bir işle ilgili: yaklaşık dört hafta boyunca inen, neredeyse hiçbiri benchmark manşeti olmayan **v0.5.875 ile v0.5.1146 arasındaki kabaca 270 sürüm**. Tema, “bir mikrobenchmark'ta hızlı git”ten **“gerçek dünya TypeScript'ini ve gerçek npm paketlerini gerçekten derle ve çalıştır”**a kaydı. Artı yol boyunca tam bir Windows görsel elden geçirmesi ve bir yığın yeni widget.

İşte yayınlananlar, gerçekte ne için olduklarına göre gruplanmış.

## Gerçek npm paketleri artık derleniyor

Bu pencerenin en büyük tek dizisi, popüler npm paketlerini native ikiliklere derleyip davranışsal testleri geçirmeye yönelik bir süpürme — yalnızca “hatasız linkle” değil, çalış ve doğru çıktıyı üret. `perry.compilePackages` üzerinden artık çalışan liste şunları içeriyor: **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2 ve Colyseus**.

Her biri kendi nedeniyle başarısız oluyordu ve her düzeltme kendi küçük hikayesi:

-   **zod v4**, `Cannot read properties of undefined (reading 'onattach')` ile çöküyordu. Kök neden (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `F`'in başka bir modülden import edilmiş bir fonksiyon olduğu `new F()` sessizce boş bir nesne üretiyordu — constructor gövdesi hiç çalışmadığı için, her `$ZodCheckMinLength`\-tarzı kontrol `_zod` property'sinden soyulmuş halde geri geliyordu.
-   **axios + jose**, Perry'nin henüz sahip olmadığı crypto ve sıkıştırmaya ihtiyaç duyuyordu: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, AES-GCM için `subtle.generateKey` / `encrypt` / `decrypt` ve `randomFillSync` (v0.5.972–976).
-   **fastify**, `wait_for_promise`'teki bir saniyelik polling timeout'unda deadlock'a giriyordu; onu bir condvar bekleyişiyle değiştirdik ve reddedilen promise'ların asılı kalmak yerine `HTTP 500` olarak yüzeye çıkmasını sağladık (v0.5.912).
-   **@hono/node-server** bir POST gövdesini okuyamıyordu — v0.5.1142'deki bir parent-registration düzeltmesine kadar `c.req.text()` / `.json()` / `.formData()` POST/PUT'ta boş dönüyordu.
-   **chalk, ms, debug, express** hepsi aynı şekle çarptı: *property'leri iliştirilmiş çağrılabilir bir değer* (`chalk.red`, `express()` artı `express.Router`). Bu örüntünün üç çeşidi v0.5.935 ve onu çevreleyen npm süpürmesi boyunca düzeltildi, artı express'i serbest bırakmak için `util.inherits` + bir stream prototype iskeleti (v0.5.990).
-   **dayjs**, minify edilmiş bir bundle olarak yayınlanmış halde, Perry'nin yanlış lower ettiği JS-klasik prototype-metot dispatch'ini (`Class.prototype.m = fn`) çalıştırıyordu (v0.5.924/932).

Tüm bunların altında, Perry'nin native derleyemediği paketlerin yine de çalışmasını sağlayan kısım yatıyor: **V8-fallback runtime** bu pencerede gerçek oldu. ModuleLoader'ı artık gömülü bir modül haritasından okuyor, dolayısıyla bir fallback ikiliği hâlâ **kendi kendine yeterli** — runtime'da gevşek `node_modules` yok (v0.5.994). `createServer` gerçek bir hyper sunucusuna köprü kuruyor (v0.5.999) ve `Response` / `Request` / `Headers` Web Fetch global'leri fallback yolunda mevcut (v0.5.1006). Ve **derleme zamanı dinamik `import()`** — build zamanında çözülen string-literal `await import('./foo.ts')` — nihayet indi (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## Bir test262 uygunluk süpürmesi

Diğer baskın dizi uygunluk. test262 alt küme radarlarına karşı odaklı geçişler yaptık ve gerçek kodun en çok dayandığı built-in'lerde iğneyi oynattık:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

String sıçraması, her `String.prototype` metoduna generic-`this` dispatch vermekten ve `slice`/`substring` index coercion'ını düzeltmekten geldi. Array sıçraması, dense-array callback'lerindeki (`forEach`/`map`/`filter`/…) `thisArg`, array-like `ToLength`, spec işlem sıralaması ve sıfır-argümanlı doğrulamaydı. Destructuring; düz, generator, async-generator, static ve private sınıf metotları boyunca parametre-destructuring kazandı.

Manşet sayıların yanında, uzun bir doğruluk kuyruğu indi: `JSON.parse` artık gerçek bir `SyntaxError` fırlatıyor (`TypeError` değil) ve sondaki token'ları reddediyor; reviver'ı spec `InternalizeJSONProperty` algoritmasıyla dolaşıyor; `Object.prototype.toString` typed array'ler, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp için doğru markalıyor; `RegExp.prototype.toString` `/source/flags` döndürüyor; async generator'lar `yield`\-awaits-operand semantiğini doğru aldı. Bunlar alt küme radarları, tam paket değil — Perry hâlâ tırmanıyor — ama bu ayki tırmanış dikti.

## Windows Fluent oluyor

Windows bir görsel elden geçirme aldı ([#4681](https://github.com/PerryTS/perry/issues/4681) serisi). Perry pencereleri artık varsayılan olarak modern DWM chrome'una geçiyor — **Mica backdrop**, yuvarlatılmış köşeler ve tema-duyarlı bir başlık çubuğu — ve ortak kontroller Windows 95 dönemi varsayılanları yerine **comctl32 v6** üzerinden render ediliyor. Window proc artık `WM_DPICHANGED`'i ele alıyor, böylece bir pencereyi karışık ölçekli monitörler arasında sürüklediğinizde bitmap olarak gerilmek yerine net kalıyor.

Kritik olarak, bunların hiçbiri eski [#1542](https://github.com/PerryTS/perry/issues/1542) “yeniden boyutlandırmadan sonra siyah alan” gerilemesini yeniden getirmedi: client alanı hâlâ opak boyanıyor ve tam çerçeve Mica/Acrylic blur-through açık bir `app.setVibrancy(...)` opt-in'i olarak kalıyor. Ayrıca tamamen modern yığını isteyen uygulamalar için yeni bir `--target windows-winui` backend iskelesi (WinUI 3) ve `perry compile main.ts -o main`'in Windows'ta `main.exe` üretmesini sağlayan küçük ama gerçek bir düzeltme var; böylece PowerShell onu gerçekten başlatabiliyor (v0.5.1146).

## Yeni widget'lar, her platform

Sadece son günde iki widget indi ve ikisi de Perry'nin hedeflediği her UI platformunu kapsıyor:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — kompakt, alan-tarzı bir tarih kontrolü: macOS'ta `NSDatePicker`, iOS/visionOS'ta `UIDatePicker` (.compact), Windows'ta `SysDateTimePick32`, Android'de `android.widget.DatePicker`, Linux'ta GTK4. Hepsinin üzerinde tek bir TS yüzeyi.
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — herhangi bir widget metin/dosya/URL için bir bırakma hedefi ve bir sürükleme kaynağı olabilir; `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit) ve `View.setOnDragListener` (Android)'e eşlenmiş.

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Pencerenin başlarında widget rafı masaüstü ve mobil boyunca da doldu — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation ve kaydırılabilir bir ImageGallery — her biri her platformda gerçek native kontrolle destekleniyor. HarmonyOS (ArkTS), diğerleriyle pariteye ulaşmak için ihtiyaç duyduğu son iki widget olan Chart ve TreeView'i aldı (v0.5.893).

## GC, internals ve kararlılık

O 270 sürümün çoğu manşet değil — bug düzeltmeleri ve internals, ve bu fazın amacı da bu. Öne çıkarmaya değer birkaçı:

-   **GC devam etti.** GC yazısındaki koşullu free-list çalışması yerine oturmaya devam etti ve keskin bir bug sınıfı kapandı: native-köprülenmiş Promise'lar artık **bir tokio worker'ında uçuştayken sabitleniyor**, böylece GC çözülme inmeden önce onları sweep edemiyor (v0.5.923). Yük altında bir async fetch çalıştırıp hayalet bir collection gördüyseniz, o buydu.
-   **Bellek modeli belgelendi.** Artık bir `internals/memory-model.md` derin-dalışı var — NaN-boxing, generational GC, shadow stack ve write barrier'lar — docs sitesine bağlanmış halde (v0.5.933).
-   **npm süpürmesinin açığa çıkardığı bir codegen kararlılık düzeltmeleri dalgası**: resume edilmiş bir async adımın içinde çağrılan modül seviyesindeki bir `const` arrow artık SIGSEGV vermiyor (v0.5.953), `try { await rejected } catch { return X }` artık sonsuza dek asılı kalmıyor (v0.5.870) ve gerçek bundle'ların takıldığı bir avuç `js_is_truthy` / raw-pointer-range çökmesi.

## Apple ev işleri

Daha küçük ama gerçek: `perry setup ios --development` artık development build'leri için provision yapıyor (v0.5.1023) ve Apple cross-library build/link yolu tekilleştirildi ve pointer-genişliği taşınabilir yapıldı (v0.5.1121/1125) — ki bu da sıkışıp kalmış olan npm / Homebrew / APT / winget publish matrisini serbest bırakan şey.

## Bu işin bıraktığı yer

Perry'nin arkasındaki bahis her zaman şu oldu: “native TypeScript”, ancak *gerçek* TypeScript çalışırsa önem kazanır — oyuncak bir alt küme değil, insanların `npm install` ettiği gerçek paketler. Bu ay çoğunlukla o işti: övünülecek tek bir sayıdan çok, “derleniyor” ile “çalışıyor” arasındaki açığı kapatmaya yönelik uzun, gösterişsiz bir itiş. Uygunluk radarları ve npm parite testleri artık izlediğimiz skor tablosu ve sayıları yayınlamaya devam edeceğiz — iyilerini de hâlâ kusurlu olanları da.

Kaynak: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Sorunlar: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
