---
title: "Hono, tRPC ve Strapi'yi Yerel İkili Dosyalara Derleme"
excerpt: "Perry artık üç büyük TypeScript framework'ünü — Hono, tRPC ve Strapi — yerel ARM64 çalıştırılabilir dosyalara derler. Bir saniyeden kısa sürede derlenir, 2 MB'nin altında ikili dosyalar üretir ve çökmeden çalışır."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry artik uc buyuk TypeScript cercevesini — Hono, tRPC ve Strapi — yerel ARM64 calistirilabilir dosyalara derliyor. Bir saniyenin altinda derleniyor, 2 MB'nin altinda ikililer uretiyor ve cokme olmadan calisiyor.

Bu yazi nelerin calistigini, nelerin henuz calismadigini ve derleyiciyi gercek dunya koduna karsi test ederken neler ogrendigimizi kapsiyor.

## Projeler

Bu ucu sectik cunku farkli TypeScript sekillerini temsil ediyorlar:

-   **Hono** — Hafif bir web cercevesi (29 modul). Yogun jenerik kullanimi, sinif kalitimi, dinamik metot atamasi ve `Request`/`Response` Web API'leri. Disari aktarma yapisi barrel dosyalari araciligiyla adli yeniden disari aktarmalar kullanir.
-   **tRPC** — Tur guvenli bir RPC cercevesi (52 modul). 4+ seviye uzerinde derin yeniden disari aktarma zincirleri, jenerik tur daraltmali olusturucu deseni, modul kapsaminda sinif ornekleme ve Web Streams araciligiyla akis.
-   **Strapi** — Basiz bir CMS cekirdegi (4 modul yerel olarak derlendi, gerisi harici olarak cozumlendi). Calisma alani paket cozumlemeli monorepo, ad alani yeniden disari aktarmalari (`export * as X`), `Map` ile hizmet konteyneri deseni ve fabrika fonksiyonlari.

## Derleme Sonuclari

Ucu de sifir derleme hatasiyla yerel ikililer olarak derleniyor:

| Proje | Derlenen Moduller | Ikili Boyutu | Derleme Suresi |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

Her kaynak modul tam boru hattindan gecer: SWC ayristirma, HIR indirme, Cranelift kod uretimi, nesne dosyasi cikarma ve yerel baglama. Derleme sureleri hepsini icerir — ayristirmadan son baglantiya kadar.

Baglam olarak, tek basina tRPC uzerinde `tsc --noEmit` birkac saniye surer. Perry 52 modulu bir saniyenin altinda baglanmis yerel bir ikiliye derler.

## Calisma Zamaninda Ne Calisiyor

### Moduller Arasi Sinif Ornekleme

Bu buyuk donum noktasiydi. Hono'nun disari aktarma yapisi soyle gorunur:

**hono dışa aktarma zinciri**

```
// hono/src/hono.ts
export class Hono extends HonoBase { ... }
// hono/src/index.ts
import { Hono } from './hono'
export { Hono }
```

Bu `export { Hono }` adli bir yeniden disari aktarmadir — `export * from` veya `export { Hono } from './hono'` degil. Perry'nin HIR'inda bu `Export::Named` olur, `Export::ReExport` veya `Export::ExportAll` degil. Onceden derleyicinin sinif yayilimi yalnizca `ExportAll` ve `ReExport` zincirlerini takip ediyordu, bu nedenle `index.ts`'den `Hono`'yu iceri aktarmak sessizce basarisiz oluyordu — sinif arama iskalaniyordu ve `new Hono()` `undefined` donduruyordu.

Artik Perry `Export::Named`'i modulun iceri aktarmalari araciligiyla orijinal sinif tanimini bulmak ve yaymak icin geri izler. Sonuc:

```
$ ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono
[1] Class instantiation through named re-export chain
PASS: new Hono() returned a real object
[2] Constructor-initialized fields
PASS: app.router initialized by constructor
PASS: app.router.name = SmartRouter
[5] Multiple instances
PASS: second instance created with router
[6] Constructor with options
PASS: new Hono({ strict: false }) accepted options
```

Hono yapicisi calisir, bir `SmartRouter` baslatir (dahili olarak hem bir `RegExpRouter` hem de bir `TrieRouter` olusturur) ve gercek bir nesne dondurur. Birden fazla bagimsiz ornek calisir. Yapici secenekleri kabul edilir.

### Cok Seviyeli Yeniden Disari Aktarma Cozumlemesi

tRPC'nin `initTRPC`'si 4 seviye derinliktedir:

```
initTRPC.ts                          (export const initTRPC = ...)
-> unstable-core-do-not-import.ts  (export * from './initTRPC')
-> @trpc/server/index.ts           (export { initTRPC } from '../../..')
-> index.ts                        (export * from './@trpc/server')
```

Bu `ExportAll` → `Named` → `ExportAll`'dir. Perry tam zinciri cozer — `initTRPC` derlenmis ikilide erisilebilir. Ayni yolu izleyen `TRPCError` icin de ayni.

### Argumanlari Olan Moduller Arasi Sinif Ornekleme

```
const err = new TRPCError({ code: 'NOT_FOUND', message: 'resource missing' })
// PASS: new TRPCError() returned object
// PASS: err.code = NOT_FOUND
```

`TRPCError` bir modulde tanimlanir, uc ara barrel dosyasi araciligiyla yeniden disari aktarilir, testte iceri aktarilir ve bir secenekler nesnesiyle orneklenir. Ornegin `code` alani erisilebilir.

### Monorepo'larda Paket Cozumlemesi

Strapi calisma alani paketleri kullanir — `@strapi/core` monorepo'da bir kardes pakettir, npm bagimliligi degildir. Perry, `package.json` exports alanlari araciligiyla ciplak belirticiyi cozer:

```
"exports": {
".": { "source": "./src/index.ts", "import": "./dist/index.mjs" }
}
```

`createStrapi` fonksiyonu `export * from '@strapi/core'` araciligiyla cagirilabilir bir fonksiyon olarak dogru sekilde cozumlenir.

### Yalnizca Tur Disari Aktarma Filtrelemesi

TypeScript'in `export type { Foo }` sozdiziminin calisma zamani anlamı yoktur — ancak onceden Perry bunlari baglayici araciligiyla yayilan ve stub sembolleri ureten gercek `Export::ReExport` girislerine donusturuyordu. Hono'nun `index.ts`'si tek basina onlarca turu kapsayan dort `export type` bildirimi icerir.

Perry artik `ExportNamed` bildirimlerinde SWC'nin `type_only` bayragini ve bireysel belirticilerde `is_type_only`'yi kontrol eder ve bunlari HIR indirme sirasinda atlar. Bu, uc projenin tamaminda tur yeniden disari aktarmalarindan olu stub uretimini ortadan kaldirdi.

### RegExp Yapicisi

`new RegExp(pattern, flags)` artik Perry'nin mevcut `js_regexp_new` calisma zamani fonksiyonuna derlenir. Bu basitti — calisma zamani zaten RegExp'i destekliyordu — ancak `Expr::New` codegen isleyicisinde bunun icin bir durum yoktu, bu nedenle her `new RegExp(...)` bir "Unknown class" uyarisina dusuyordu. Hono'nun `RegExpRouter`'u bunu kapsamli olarak kullanir.

## Henuz Ne Calismiyor

Burada belirgin oluyoruz cunku bosluklar kazanimlar kadar cok sey anlatiyor.

### `this` Uzerinde Dinamik Ozellik Atamasi

Hono'nun yapicisi HTTP metot isleyicilerini dinamik olarak kurar:

```
const allMethods = ['get', 'post', 'put', 'delete', ...]
allMethods.forEach((method) => {
this[method] = (args1, ...args) => {
// register route
return this
}
})
```

Bu, `app.get`, `app.post` vb.'nin statik olarak bildirilmedigini — hesaplanmis ozellik adlari araciligiyla calisma zamaninda atandigini gosterir. Perry henuz `this[variable] = value`'yu desteklemiyor, bu nedenle bu metotlar eksik:

```
[4] Dynamic method assignment (this[method] = ...)
INFO: app.get not available
INFO: app.on not available
```

Bu Hono icin en buyuk bosluktur. Hono sinifi mevcuttur, yonlendiricisi baslatilmistir, ancak rota kaydedemezsiniz.

### Modul Seviyesi Yapici Cagrilari

tRPC giris noktasini su sekilde tanimlar:

```
export const initTRPC = new TRPCBuilder()
```

Calisma zamaninda `initTRPC`, `typeof object` yerine `typeof function` olarak gorunur — modul seviyesi `new TRPCBuilder()` ifadesi yapiciyi calistirmiyor, bu nedenle bir ornek yerine sinifa bir referans elde edersiniz. Bu `initTRPC.create()` ve `initTRPC.context()`'un her ikisinin de `undefined` oldugu anlamina gelir.

### Miras Alinan Ozellikler

`TRPCError extends Error` ve `err.code` (`TRPCError` uzerinde dogrudan tanimlanmis) calisirken, `err.message` (`Error`'dan miras alinan) erisilebilir degildir. Ozellik arama icin prototip zinciri tam olarak uygulanmamistir.

### Karmasik Yapici Zincirleri

Strapi'nin `createStrapi()` fonksiyonu dahili olarak `new Strapi(opts)`'u cagirir, bu `Container`'i (`Map` tarafindan desteklenen) genisletir, `loadConfiguration()`'i cagirir, saglayicilari yineler ve hizmetleri kaydeder. Bu derin yapici zinciri bir falsy donus degeri uretir — cokmiyor ancak kullanilabilir bir ornek de uretmiyor.

### Web API Yerlesik Siniflari

Uc proje genelinde kalan "Unknown class" uyarilari bunlardir:

| Sinif | Sayi |
| --- | --- |
| Yanıt| 11 |
| TransformStream| 7 |
| Okunabilir Akış| 5 |
| Request | 4 |
| Headers | 3 |
| Proxy | 2 |
| TextEncoderStream| 2 |
| Yazılabilir Akış| 1 |
| DOME istisnası| 1 |

`Response`, `Request` ve `Headers` herhangi bir HTTP cercevesi icin kritik olanlardir. Bunlar `Map`, `Set`, `RegExp`, `Buffer`, `AbortController` ve digerleri icin sahip oldugumuz benzer yerlesik codegen destegine ihtiyac duyar.

## Bu Bize Ne Anlatiyor

Iyi haber: Perry'nin derleme boru hatti gercek cerceve koduyla basariyla ilgileniyor. Karmasik yeniden disari aktarma zincirleri, jenerik agirlikli tur imzalari, sinif hiyerarsileri ve monorepo paket cozumlemesi olan cok dosyali projeler bagli ikililer olusturmak icin tamamiyla geciyor.

Bosluklar calisma zamani bosluklaridir, derleme bosluklari degil. Kalan is:

1.  **Dinamik ozellik atamasi** — metotlari programatik olarak kuran cerceveler icin gerekli
2.  **Modul seviyesi baslangic ifadeleri** — `export const x = new Foo()` gercekten yapiciyi calistirmali
3.  **Prototip zinciri** — miras alinan ozellikler ve metotlar
4.  **Web API yerlesikleri** — HTTP cercereleri icin `Response`, `Request`, `Headers`

Bunlar somut, iyi kapsamli sorunlardir. Hicbiri mimari degisiklik gerektirmez — daha basit durumlar icin zaten calisan kaliplarin uzantilaridir.

Bunlar uzerinde calismaya devam edecegiz. Hedef `new Hono().get('/', (c) => c.text('hello'))`'in yerel bir ikilide calisan bir HTTP sunucusu uretmesidir.
