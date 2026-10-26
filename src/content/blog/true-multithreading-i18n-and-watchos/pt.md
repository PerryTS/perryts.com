---
title: "Multi-Threading Real, i18n em Tempo de Compilação e watchOS"
excerpt: "Perry v0.4.0: threads reais do SO com segurança em tempo de compilação, um sistema de internacionalização sem cerimônia para mais de 30 idiomas, watchOS como 9º alvo de compilação, APIs de áudio e câmera e um pipeline de compilação paralelo."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 é o maior lançamento desde o início do projeto. Três saltos de versão num único ciclo — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — e o próprio compilador agora é paralelo. Aqui está tudo o que foi lançado.

## Multi-Threading Real

O Perry agora tem paralelismo real com threads do SO. Não web workers com overhead de serialização. Não `SharedArrayBuffer` com `Atomics`. Threads reais — threads leves do SO com stack de 8MB que não partilham nada e não custam nada quando ociosas.

O novo módulo `perry/thread` expõe três primitivas:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap` e `parallelFilter` detetam automaticamente o número de núcleos de CPU e dividem o array de entrada entre eles. Para arrays pequenos, ignoram o threading e executam de forma síncrona — sem overhead para cargas triviais.

`spawn` lança uma thread do SO em segundo plano e retorna uma Promise. O resultado flui através de uma fila de resultados pendentes que é drenada durante o processamento de microtasks, então faz `await` como qualquer outra operação assíncrona.

### Segurança em Tempo de Compilação

A parte mais importante não é a API — é o que o compilador *impede*. O Perry rejeita estaticamente closures que capturam variáveis mutáveis:

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

Sem estado mutável partilhado significa sem corridas de dados. Sem locks, sem mutexes, sem `Atomics`. O compilador garante a segurança de threads antes de uma única linha de código máquina ser emitida.

### Por Baixo do Capô

Cada thread de trabalho recebe a sua própria arena de memória com limpeza `Drop` — sem coordenação de GC entre threads. Valores são transferidos via cópia profunda `SerializedValue`: custo zero para números, O(n) para strings, arrays e objetos. A implementação reside num único ficheiro Rust de 1.120 linhas (`perry-runtime/src/thread.rs`) e não exigiu alterações no coletor de lixo.

Compare com os isolates V8, que requerem heaps separados por worker com ~2MB de overhead cada. As threads do Perry são apenas pthreads com arenas.

### Pipeline de Compilador Paralelo

O próprio compilador agora também é paralelo. Codegen de módulos, passes de transformação (imports JS, instâncias nativas, monomorfização), e verificação de símbolos `nm` executam todos em todos os núcleos de CPU via rayon. Combinado com a atualização Cranelift 0.121 (de 0.113 — oito versões menores de alocação de registos e melhorias x64), a compilação é significativamente mais rápida.

## i18n em Tempo de Compilação (v0.3.0)

O sistema de internacionalização do Perry tem zero cerimónia. Literais de string em widgets de UI são automaticamente tratados como chaves localizáveis. Ficheiros de tradução são JSON plano num diretório `locales/`. Toda a validação acontece em tempo de compilação.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

O compilador valida tudo: traduções em falta, incompatibilidades de parâmetros, erros de formas plurais. As traduções são incorporadas no binário como uma tabela de strings 2D embutida com consulta quase zero em runtime — sem parsing de JSON no arranque.

### O Que Está Incluído

-   **Regras de plural CLDR** para mais de 30 locales com sufixos `.one`/`.other`/`.few`/`.many`/`.zero`/`.two`
-   **Wrappers de formato**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Deteção nativa de locale** em todas as plataformas: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: analisa ficheiros TS/TSX, gera e atualiza scaffolds de JSON de locale
-   **Geração de recursos nativos da plataforma**: diretórios iOS `.lproj` e Android `values-xx/`
-   **`import { t } from "perry/i18n"`** para localizar strings não-UI

Configure no `perry.toml`:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## Apps Nativas watchOS (v0.3.2)

O Perry agora compila para watchOS — o 9.º alvo de compilação. Isto não é um wrapper ou uma app companheira. É um binário watchOS autónomo com uma interface SwiftUI nativa.

O renderizador watchOS usa uma **abordagem orientada por dados**: o Perry constrói uma árvore de UI via chamadas FFI `perry_ui_*`, e uma `PerryWatchApp.swift` enviada consulta a árvore e renderiza vistas SwiftUI de forma reativa. 15 tipos de widgets são suportados com stubs para os não suportados.

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

O fluxo completo funciona: `perry setup watchos` partilha credenciais do App Store Connect com iOS, `perry run watchos` deteta automaticamente simuladores de Apple Watch, e `perry publish watchos` submete para a App Store.

Isto também eleva o **total de alvos de widget para quatro**: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) e Wear OS (Tiles). Cada um tem o seu próprio alvo de compilação e backend de codegen.

## APIs de Áudio e Câmara

Duas novas APIs de hardware neste lançamento:

### Captura de Áudio (`perry/system`)

Captura de áudio cross-platform com medição de dB(A) ponderada em A:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

Backends de plataforma: AVAudioEngine (macOS/iOS), AudioRecord via JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Captura de Câmara (`perry/ui`)

Pré-visualização nativa de câmara com amostragem de cor ao nível do pixel (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## Pacotes do Ecossistema

Dois pacotes nativos de primeira parte foram lançados:

-   **perry/push** — Bindings de notificações push para iOS/macOS: pedidos de permissão, obtenção de token APNs, contagem de badges. Stub Android com FCM planeado.
-   **perry/storekit** — Bindings de compras in-app StoreKit 2: carregamento de produtos, compras com recibos JWS, verificação de subscrições, restauro e listeners de transações.

Ambos seguem a mesma arquitetura: declarações TypeScript → crate FFI Rust → ponte Swift. Instale como dependência, importe as funções, faça `await` dos resultados. O compilador trata de toda a ponte nativa.

## Infraestrutura

-   **Cranelift 0.113 → 0.121** — oito versões menores de alocação de registos, correções x64 e melhorias de alinhamento de stack slot
-   **Divisão de funções Windows** — divide automaticamente funções com mais de 50 instruções em continuações para contornar problemas de codegen Cranelift no Windows
-   **Carregamento seletivo de variáveis de módulo** — carrega apenas variáveis de nível de módulo referenciadas na entrada da função, reduzindo o tamanho do binário Windows em 26%
-   **Atualização Array.sort()** — de ordenação por inserção O(n²) para híbrido estilo TimSort O(n log n)
-   **perry run android** — pipeline completo de build APK: compilação, geração de projeto Gradle, assembleDebug, instalação, lançamento
-   **Entradas personalizadas Info.plist** — `[ios.info_plist]` no perry.toml para descrições de privacidade, esquemas de URL, modos de background

## Em Números

-   **Versão**: 0.2.197 → 0.4.0 (três marcos principais)
-   **Alvos de compilação**: 8 → 9 (adicionado watchOS)
-   **Alvos de widget**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Novos crates**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **Nova documentação**: threading (4 páginas), i18n (4 páginas), watchOS, documentação expandida de widgets (3 → 8 páginas)
-   **Implementação perry/thread**: 1.120 linhas de Rust, zero alterações no GC

## Próximos Passos

A fundação de threading abre muitas possibilidades: processamento paralelo de pedidos HTTP, operações de ficheiros concorrentes e cargas de trabalho computacionalmente pesadas que eram anteriormente bloqueadas pela execução single-threaded. No lado da linguagem, o suporte completo a regex continua a ser a maior lacuna, e a expansão do `perry/ui` (drag and drop, acessibilidade, DatePicker) continua.

Acompanhe o progresso no [GitHub](https://github.com/PerryTS/perry), leia a documentação em [docs.perryts.com](https://docs.perryts.com), ou consulte o [roadmap](/pt/roadmap/) para o panorama completo.
