---
title: "Derleyiciden Ekosisteme: React, Veritabanları ve Bulut Derlemeleri"
excerpt: "Perry bir derleyiciden tam bir ekosisteme dönüşür. Merkezde perry/ui, MySQL/PostgreSQL/SQLite için Prisma uyumlu ORM'ler, evrensel push bildirimleri, App Store yayınlamalı dağıtık derlemeler ve React uyumluluk katmanı — hepsi bir haftada."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Bir hafta önce Perry, UI araç seti olan bir derleyiciydi. TypeScript yazabilir, yerel bir ikili dosyaya derleyebilir ve altı platformda dağıtabilirdiniz. Hikaye buydu. Bugün hikaye daha büyük: Perry bir ekosisteme dönüşüyor. Üç veritabanı ORM'u, evrensel push bildirimleri, App Store ve Play Store yayınlaması ile dağıtık derlemeler, bir React uyumluluk katmanı ve otomatik uygulama doğrulaması — hepsi geçen hafta geldi.

Bu yazı nelerin yayınlandığını, neden önemli olduğunu ve kodun nasıl göründüğünü kapsar.

## perry/ui: Temel

Yeni kütüphanelere girmeden önce, her şeyin merkezinde ne olduğunu vurgulamakta fayda var: `perry/ui`. Bu, Perry'nin kendi yerel UI araç setidir — altı hedefin tamamında doğrudan platforma özgü bileşenlere derlenen 20'den fazla widget. Bir sarmalayıcı değil, bir soyutlama katmanı değil, bir web görünümü değil. Her `Button`, macOS'ta bir `NSButton`, iOS'ta bir `UIButton`, Linux'ta bir `GtkButton`, Android'de bir `android.widget.Button` ve Windows'ta bir `CreateWindowEx` kontrolü olur.

`perry/ui`, Perry'nin birincil ve en gelişmiş UI yüzeyidir. Reaktif durum yönetimi, düzen konteynerları (VStack, HStack, ZStack, SplitView), donanım hızlandırmalı Canvas, sütun sıralamalı Table görünümleri, dosya diyalogları, keychain erişimi, bildirimler ve çoklu pencere için `perry/system` modülünü içerir — hepsi TypeScript'ten, hepsi doğrudan platform API çağrılarına derlenir. React uyumluluk katmanı dahil Perry'deki diğer tüm UI yaklaşımları, `perry/ui` üzerine inşa edilir ve onun widget'larına eşlenir.

app.ts

import { Window, VStack, Button, Text, State } from 'perry/ui';

const count = new State(0);

const window = new Window({ title: "Counter" });

window.setContent(

new VStack({ children: \[

new Text({ text: count }),

new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),

\] })

);

Reaktif `State` nesnesi anahtar ilkeldir. Bir State değeri değiştiğinde, yalnızca o duruma bağlı widget'lar güncellenir — sanal DOM karşılaştırması yok, tam ağaç yeniden renderlama yok, uzlaştırma geçişi yok. TypeScript'ten yerel platform UI'sine mevcut en doğrudan yoldur.

## React Uyumluluğu: perry/ui Üzerinde İnce Bir Katman

React'ten gelen geliştiriciler için, `perry-react` React'ın bileşen modelini `perry/ui` widget'larına eşleyen bir uyumluluk katmanı sağlar. `useState`, `useRef`, `useReducer` ve JSX kullanabilirsiniz — ve Perry bunları altındaki aynı yerel widget'lara derler. Ayrı bir renderlama motoru değil, bir kolaylık köprüsüdür.

counter.tsx

import React, { useState } from 'react';

function Counter() {

const \[count, setCount\] = useState(0);

return (

<div\>

<h1\>{count}</h1\>

<button onClick\={() => setCount(count + 1)}\>+1</button\>

</div\>

);

}

Perde arkasında, her JSX öğesi bir `perry/ui` widget'ına eşlenir: `<div>` bir VStack olur, `<button>` bir Button olur, `useState` Perry'nin reaktif State'i tarafından desteklenir. Erken aşamada — tam ağaç yeniden renderlama ve global hook depolama ile Faz 1 — ama mevcut React kodunun Perry aracılığıyla yerel platformları hedefleyebildiğini kanıtlıyor. Benzer hatlar boyunca Angular ve Ionic uyumluluğunu da keşfediyoruz.

## Üç Veritabanı ORM'u: Prisma API'si, Yerel Performans

Bir veritabanıyla iletişim kuran bir sunucu veya masaüstü uygulaması oluşturuyorsanız, Perry artık sizi Prisma uyumlu üç ORM ile karşılıyor: `perry-prisma` (MySQL), `perry-sqlite` (SQLite) ve `perry-postgres` (PostgreSQL). Üçü de `@prisma/client` için doğrudan yerine geçen değişikliklerdir. Aynı API, aynı sorgu kalıpları, ama doğrudan veritabanı FFI'si ile yerel koda derlenir — Prisma motoru yok, Node.js yok.

database.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Same Prisma API — compiled to native SQL via Rust FFI

const users = await prisma.user.findMany({

where: { email: { contains: "@perry.dev" } },

orderBy: { createdAt: "desc" },

take: 10,

});

await prisma.post.create({

data: { title: "Hello", authorId: users\[0\].id },

});

Perde arkasında, her ORM `sqlx` kullanan bir Rust FFI katmanı tarafından desteklenen bir TypeScript ön yüzüdür. Sorgu akışı: TypeScript sorguyu JSON'a serileştirir, FFI sınırı üzerinden geçirir, Rust parametreli SQL oluşturur, bağlantı havuzu üzerinden çalıştırır ve sonucu geri serileştirir. Prisma şeması derleme zamanında okunur — sıfır çalışma zamanı ayrıştırma.

Üç uygulama kodlarının yaklaşık %95'ini paylaşır. Farklılıklar beklediğiniz şeylerdir: tanımlayıcı tırnaklama (`` `col` `` vs `"col"`), yer tutucu sözdizimi ( `?` vs `$1, $2`) ve işlem semantiği. Üçü de tam Prisma CRUD yüzeyini destekler: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — artı ham SQL, işlemler ve 10'dan fazla WHERE filtre operatörü.

## perry-push: Evrensel Push Bildirimleri

`perry-push`, her platformda push bildirimlerini yöneten tek bir kütüphanedir: APNs (iOS/macOS), FCM (Android), Web Push (tarayıcılar) ve WNS (Windows). Her sağlayıcı, tam olarak üç fonksiyona sahip bir Rust FFI modülüdür: `*_provider_new`, `*_provider_close` ve `*_send`.

notify.ts

import { ApnProvider } from 'perry-push/apn';

import { FcmProvider } from 'perry-push/fcm';

const apn = new ApnProvider({ teamId, keyId, key });

const fcm = new FcmProvider({ serviceAccount });

// Unified result type for all providers

const result = await apn.send({

deviceToken: token,

title: "New message",

body: "You have a new reply",

});

Kriptografi `ring` tarafından yönetilir — APNs ve VAPID için ES256 JWT'ler, FCM hizmet hesapları için RS256, Web Push yük şifrelemesi için AES-GCM. Hepsi yerel koda derlenir.`node-gyp` yok, OpenSSL bağımlılığı yok.

## Perry Hub + Builder'lar: Dağıtık Bulut Derlemeleri

Bu altyapı hamlesidir. `perry-hub`, Perry tarafından TypeScript'ten derlenen bir derleme orkestrasyon sunucusudur ve bir derleme işçisi havuzunu yönetir. Projenizi gönderirsiniz, hub hedef platforma göre doğru işçiye yönlendirir ve işçi uygulamanızı derler, imzalar ve isteğe bağlı olarak yayınlar.

Bugün iki işçi mevcut: bir macOS builder (macOS, iOS ve Android hedeflerini yönetir) ve bir Linux builder (Linux ve Android'i yönetir). Her ikisi de WebSocket üzerinden hub'a bağlanan, kaynak tarball'ları indiren, Perry derleyicisini çalıştıran ve yapıtları geri yükleyen Rust ikili dosyalarıdır.

-   **Kod imzalama** — macOS için Apple noter onayı, iOS için provisioning profilleri, Android keystore imzalama
-   **App Store yayınlama** — App Store Connect ve Google Play Store'a doğrudan yükleme
-   **Yapıt yönetimi** — derlenen ikili dosyalar TTL tabanlı temizleme ile hub'a yüklenir
-   **Lisans yönetimi** — lisans başına hız limitleri, öncelikli kuyruklama (pro seviye öncelik alır)

Hub'ın kendisi büyüleyici bir vaka çalışmasıdır. Perry tarafından 2 MB yerel ikili dosyaya derlenen yaklaşık 1.500 satırlık bir TypeScript dosyasıdır. HTTP için 3456 portunda Fastify ve WebSocket için 3457 portunda `ws` çalıştırır. Tüm durum JSON kalıcılığı ile bellekte tutulur — harici veritabanı yok. `scp` ve bir systemd birim dosyası ile dağıtabileceğiniz türden bir sunucudur.

## perry-verify: Otomatik Uygulama Doğrulaması

`perry-verify`, derlenmiş bir ikili dosya ve yapılandırma alan, bir doğrulama ardışık düzeni çalıştıran ve ekran görüntüleriyle yapılandırılmış başarılı/başarısız sonuçları döndüren bağımsız bir HTTP hizmetidir. Uygulamayı başlatır, kimlik doğrulama akışlarını (deterministik veya yapay zeka destekli) çalıştırır, durumu kontrol eder ve kanıt yakalar.

macOS (erişilebilirlik API'leri aracılığıyla), Linux (AT-SPI) ve iOS Simulator ile Android Emulator için stub platform adaptörleri mevcuttur. Yapay zeka katmanı, deterministik kontrollerin mümkün olmadığı durumlarda yedek kimlik doğrulama ve durum doğrulaması için Claude kullanır. Hub'ın derleme ardışık düzenine derleme sonrası adım olarak yerleştirilmek üzere tasarlanmıştır: derle, imzala, doğrula, yayınla.

## Pry Her Yerde

Perry vitrin uygulaması olarak oluşturduğumuz yerel JSON görüntüleyicisi [Pry](/tr/blog/building-pry/), artık beş platformda sunuluyor. [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) ve [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry)'de, Linux ve Windows için yerel ikili dosyalarla birlikte. Aynı TypeScript kod tabanı, beş platforma özgü giriş noktası, beş yerel ikili dosya. Tüm bu yaklaşımın uçtan uca çalıştığının en somut kanıtıdır — TypeScript kaynağından App Store listesine.

## Tüm Bunlar Ne Anlama Geliyor

Bir derleyici ilginçtir. Bir ekosistem kullanışlıdır. Geçen hafta Perry, "TypeScript'i yerele derleyebilirsiniz"den "yerel UI, Prisma veritabanı, push bildirimleri ve App Store'a otomatik yayınlayan derlemelerle tam bir uygulama oluşturabilirsiniz"e geçti.

Parçalar bağlanmaya başlıyor:

-   **perry/ui** TypeScript'ten yerel platform UI'sine en doğrudan yoldur — reaktif durum, 20'den fazla widget, sıfır soyutlama katmanı
-   **perry-prisma/sqlite/postgres** mevcut veritabanı kodunun minimum değişiklikle taşınabileceği anlamına gelir
-   **perry-push** platforma özgü kütüphaneler olmadan yerel push bildirimleri anlamına gelir
-   **perry-hub + builder'lar** `perry publish`'ten App Store'a tek adımda gidebileceğiniz anlamına gelir
-   **perry-verify** yalnızca kaynak değil, derlenmiş çıktının otomatik testi anlamına gelir
-   **perry-react** React geliştiricilerinin tanıdık kalıpları kullanarak Perry'ye geçebileceği, hepsinin altında perry/ui'ye eşlendiği anlamına gelir

Bunlar teorik değil. Burada listelenen her kütüphanenin çalışan kodu, testleri ve belgeleri var. Birçoğu zaten üretimde kullanılıyor — Perry landing sitesinin kendisi Perry ile derlenmiş bir Fastify sunucusunda çalışıyor ve Pry iki uygulama mağazasında yayında.

## Sırada Ne Var

Yakın vadeli yol haritası:

-   **perry/ui genişlemesi** — sürükle bırak, erişilebilirlik etiketleri, özel bağlam menüleri, daha fazla düzen ilkeli
-   **perry-verify entegrasyonu** — derleme ardışık düzeninde otomatik doğrulama
-   **Framework uyumluluğu** — perry/ui'ye giriş rampaları olarak React, Angular ve Ionic katmanlarının iyileştirilmesi
-   **Tam regex desteği** — yerele derlenen ECMAScript uyumlu regex motoru

Gelişmeleri [GitHub](https://github.com/PerryTS/perry)'da takip edin veya tam resim için [yol haritasına](/tr/roadmap/) göz atın.
