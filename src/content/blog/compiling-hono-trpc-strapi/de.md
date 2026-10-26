---
title: "Hono, tRPC und Strapi zu nativen Binaries kompilieren"
excerpt: "Perry kompiliert jetzt drei große TypeScript-Frameworks — Hono, tRPC und Strapi — zu nativen ARM64-Binaries. Sie kompilieren in unter einer Sekunde, erzeugen Binaries unter 2 MB und laufen ohne Abstürze."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry kompiliert jetzt drei große TypeScript-Frameworks — Hono, tRPC und Strapi — zu nativen ARM64-Executables. Sie kompilieren in unter einer Sekunde, produzieren Binärdateien unter 2 MB und laufen ohne Abstürze.

Dieser Beitrag behandelt, was funktioniert, was noch nicht funktioniert und was wir gelernt haben, als wir den Compiler gegen realen Code gedrückt haben.

## Die Projekte

Wir haben diese drei ausgewählt, weil sie verschiedene Formen von TypeScript repräsentieren:

-   **Hono** — Ein leichtgewichtiges Web-Framework (29 Module). Starker Einsatz von Generics, Klassenvererbung, dynamischer Methodenzuweisung und den `Request`/`Response` Web-APIs. Seine Export-Struktur verwendet benannte Re-Exports über Barrel-Dateien.
-   **tRPC** — Ein typsicheres RPC-Framework (52 Module). Tiefe Re-Export-Ketten über 4+ Ebenen, Builder-Pattern mit generischer Typverengung, Klasseninstanziierung auf Modulebene und Streaming über Web Streams.
-   **Strapi** — Ein Headless CMS-Core (4 Module nativ kompiliert, Rest als extern aufgelöst). Monorepo mit Workspace-Paketauflösung, Namespace-Re-Exports (`export * as X`), Service-Container-Pattern mit `Map` und Factory-Funktionen.

## Kompilierungsergebnisse

Alle drei kompilieren zu nativen Binärdateien mit null Kompilierungsfehlern:

| Projekt | Kompilierte Module | Binärgröße | Kompilierzeit |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

Jedes Quellmodul durchläuft die vollständige Pipeline: SWC-Parse, HIR-Lowering, Cranelift-Codegen, Objektdatei-Emission und natives Linken. Die Kompilierzeiten beinhalten alles — vom Parsen bis zum finalen Link.

Zum Kontext: `tsc --noEmit` allein auf tRPC dauert mehrere Sekunden. Perry kompiliert 52 Module zu einer gelinkten nativen Binärdatei in unter einer.

## Was zur Runtime funktioniert

### Cross-Modul-Klasseninstanziierung

Das war der große Meilenstein. Honos Export-Struktur sieht so aus:

hono export chain

// hono/src/hono.ts

export class Hono extends HonoBase { ... }

// hono/src/index.ts

import { Hono } from './hono'

export { Hono }

Dieses `export { Hono }` ist ein benannter Re-Export. In Perrys HIR wird daraus `Export::Named`. Zuvor folgte die Klassenpropagation des Compilers nur `ExportAll`\- und `ReExport`\-Ketten. Jetzt verfolgt Perry `Export::Named` durch die Imports des Moduls zurück, um die ursprüngliche Klassendefinition zu finden und sie zu propagieren.

$ ./perry compile test\_hono.ts -o /tmp/test-hono && /tmp/test-hono

\[1\] Class instantiation through named re-export chain

PASS: new Hono() returned a real object

\[2\] Constructor-initialized fields

PASS: app.router initialized by constructor

PASS: app.router.name = SmartRouter

\[5\] Multiple instances

PASS: second instance created with router

\[6\] Constructor with options

PASS: new Hono({ strict: false }) accepted options

### Multi-Level Re-Export-Auflösung

tRPCs `initTRPC` lebt 4 Ebenen tief:

initTRPC.ts (export const initTRPC = ...)

\-> unstable-core-do-not-import.ts (export \* from './initTRPC')

\-> @trpc/server/index.ts (export { initTRPC } from '../../..')

\-> index.ts (export \* from './@trpc/server')

Das ist `ExportAll` → `Named` → `ExportAll`. Perry löst die vollständige Kette auf.

### Type-Only Export-Filterung

Perry prüft jetzt SWCs `type_only`\-Flag auf `ExportNamed`\-Deklarationen und `is_type_only` auf einzelnen Specifiern und überspringt sie beim HIR-Lowering. Dies eliminierte die Generierung toter Stubs aus Type-Re-Exports über alle drei Projekte.

## Was noch nicht funktioniert

Wir sind hier spezifisch, weil die Lücken genauso viel erzählen wie die Erfolge.

### Dynamische Property-Zuweisung auf `this`

Perry unterstützt `this[variable] = value` noch nicht, daher fehlen Honos HTTP-Methoden wie `app.get`, `app.post`. Das ist die größte einzelne Lücke für Hono.

### Modul-Level Konstruktoraufrufe

`export const initTRPC = new TRPCBuilder()` führt den Konstruktor zur Runtime nicht aus, sodass `initTRPC.create()` `undefined` ist.

### Vererbte Properties

`TRPCError extends Error`, und während `err.code` funktioniert, ist `err.message` (von `Error` geerbt) nicht zugänglich. Die Prototyp-Kette für Property-Lookup ist nicht vollständig implementiert.

### Web API Built-In-Klassen

| Klasse | Anzahl |
| --- | --- |
| Response | 11 |
| TransformStream | 7 |
| ReadableStream | 5 |
| Request | 4 |
| Headers | 3 |
| Proxy | 2 |
| TextEncoderStream | 2 |
| WritableStream | 1 |
| DOMException | 1 |

`Response`, `Request` und `Headers` sind die kritischen für jedes HTTP-Framework. Diese brauchen Built-In-Codegen-Unterstützung ähnlich zu dem, was wir bereits für `Map`, `Set`, `RegExp`, `Buffer`, `AbortController` und andere haben.

## Was uns das zeigt

Die gute Nachricht: Perrys Kompilierungs-Pipeline verarbeitet echten Framework-Code. Die Lücken sind Runtime-Lücken, keine Kompilierungslücken. Die verbleibende Arbeit ist:

1.  **Dynamische Property-Zuweisung** — benötigt für Frameworks, die Methoden programmatisch einrichten
2.  **Modul-Level Init-Ausdrücke** — `export const x = new Foo()` muss den Konstruktor tatsächlich ausführen
3.  **Prototyp-Kette** — vererbte Properties und Methoden
4.  **Web API Built-Ins** — `Response`, `Request`, `Headers` für HTTP-Frameworks

Das sind konkrete, gut abgegrenzte Probleme. Keines davon erfordert architektonische Änderungen — es sind Erweiterungen von Mustern, die bereits für einfachere Fälle funktionieren.

Wir werden weiter daran arbeiten. Das Ziel ist `new Hono().get('/', (c) => c.text('hello'))`, das einen funktionierenden HTTP-Server in einer nativen Binärdatei produziert.
