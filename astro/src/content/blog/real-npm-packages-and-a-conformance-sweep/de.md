---
title: "Echte npm-Pakete kompilieren jetzt: axios, zod, express — und ein Conformance-Sweep"
excerpt: "Bei den ~270 Releases von v0.5.875 bis v0.5.1146 ging es nicht um ein Benchmark — es ging darum, echte npm-Pakete zum Kompilieren und Laufen zu bringen. axios, zod v4, express, fastify und hono funktionieren jetzt; die test262-Parität sprang (String 60→79 %, Array 61→72 %); Windows wurde mit Mica Fluent; und DatePicker + Drag & Drop landeten auf jeder Plattform."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
Der letzte Beitrag endete bei **v0.5.875** mit der GC-Story — dem Schließen der Lücke, die aya\_kotos Benchmark aufgedeckt hatte. Jener Beitrag handelte vom Gewinnen eines Benchmarks. Dieser handelt von einer anderen Art Arbeit: den etwa **270 Releases zwischen v0.5.875 und v0.5.1146**, gelandet über etwa vier Wochen, von denen fast keines eine Benchmark-Schlagzeile ist. Das Thema verschob sich von „auf einem Microbenchmark schnell sein“ zu **„echtes TypeScript und echte npm-Pakete tatsächlich zum Kompilieren und Laufen bringen“**. Plus eine komplette visuelle Windows-Überholung und einen Haufen neuer Widgets auf dem Weg.

Hier ist, was ausgeliefert wurde, gruppiert danach, wofür es tatsächlich war.

## Echte npm-Pakete kompilieren jetzt

Der größte einzelne Faden durch dieses Fenster ist ein Sweep, um beliebte npm-Pakete zu nativen Binärdateien zu kompilieren und Verhaltenstests bestehen zu lassen — nicht nur „ohne Fehler linken“, sondern laufen und die richtige Ausgabe produzieren. Die Liste, die jetzt über `perry.compilePackages` funktioniert, umfasst **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2 und Colyseus**.

Jedes scheiterte aus seinem eigenen Grund, und jeder Fix ist seine eigene kleine Geschichte:

-   **zod v4** stürzte mit `Cannot read properties of undefined (reading 'onattach')` ab. Grundursache (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `new F()`, wobei `F` eine aus einem anderen Modul importierte Funktion ist, produzierte stillschweigend ein leeres Objekt — der Konstruktor-Body lief nie, sodass jeder `$ZodCheckMinLength`\-artige Check ohne seine `_zod`\-Property zurückkam.
-   **axios + jose** brauchten Crypto und Kompression, die Perry noch nicht hatte: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` für AES-GCM und `randomFillSync` (v0.5.972–976).
-   **fastify** verklemmte sich an einem Eine-Sekunde-Polling-Timeout in `wait_for_promise`; wir ersetzten es durch ein Condvar-Wait und ließen abgelehnte Promises als `HTTP 500` auftauchen, statt zu hängen (v0.5.912).
-   **@hono/node-server** konnte einen POST-Body nicht lesen — `c.req.text()` / `.json()` / `.formData()` gaben bei POST/PUT leer zurück, bis ein Parent-Registration-Fix in v0.5.1142.
-   **chalk, ms, debug, express** trafen alle dieselbe Form: einen *aufrufbaren Wert mit angehängten Properties* (`chalk.red`, `express()` plus `express.Router`). Drei Varianten dieses Musters wurden über v0.5.935 und den umgebenden npm-Sweep gefixt, plus `util.inherits` + ein Stream-Prototype-Scaffold, um express zu entsperren (v0.5.990).
-   **dayjs**, ausgeliefert als minifiziertes Bundle, übte JS-klassischen Prototype-Method-Dispatch (`Class.prototype.m = fn`) aus, den Perry falsch lowerte (v0.5.924/932).

Unter all dem sitzt der Teil, der Pakete, die Perry *nicht* nativ kompilieren kann, trotzdem laufen lässt: Die **V8-Fallback-Runtime** wurde in diesem Fenster real. Ihr ModuleLoader liest jetzt aus einer eingebetteten Modul-Map, sodass eine Fallback-Binärdatei weiterhin **self-contained** ist — keine losen `node_modules` zur Laufzeit (v0.5.994). `createServer` brückt zu einem echten hyper-Server (v0.5.999), und die Web-Fetch-Globals `Response` / `Request` / `Headers` existieren im Fallback-Pfad (v0.5.1006). Und **Compile-Time-dynamisches `import()`** — String-Literal-`await import('./foo.ts')`, zur Build-Zeit aufgelöst — landete endlich (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## Ein test262-Conformance-Sweep

Der andere dominante Faden ist Conformance. Wir liefen fokussierte Passes gegen die test262-Subset-Radars und bewegten die Nadel bei den Built-ins, auf die sich echter Code am stärksten stützt:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

Der String-Sprung kam daher, jeder `String.prototype`\-Methode generischen `this`\-Dispatch zu geben und die `slice`/`substring`\-Index-Coercion zu fixen. Der Array-Sprung war `thisArg` auf den Dense-Array-Callbacks (`forEach`/`map`/`filter`/…), Array-like-`ToLength`, Spec-Operation-Ordering und Zero-Argument-Validierung. Destructuring nahm Parameter-Destructuring über plain, Generator-, Async-Generator-, statische und private Klassen-Methoden auf.

Neben den Schlagzeilen-Zahlen landete ein langer Schwanz an Korrektheit: `JSON.parse` wirft jetzt einen echten `SyntaxError` (kein `TypeError`) und lehnt nachgestellte Tokens ab; sein Reviver läuft über den Spec-`InternalizeJSONProperty`\-Algorithmus; `Object.prototype.toString` brandet korrekt für Typed Arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; `RegExp.prototype.toString` liefert `/source/flags`; Async-Generatoren bekamen ihre `yield`\-awaits-operand-Semantik richtig. Das sind Subset-Radars, nicht die volle Suite — Perry klettert noch immer — aber der Anstieg diesen Monat war steil.

## Windows wird Fluent

Windows bekam eine visuelle Überholung (die [#4681](https://github.com/PerryTS/perry/issues/4681)\-Serie). Perry-Fenster wählen jetzt standardmäßig das moderne DWM-Chrome — **Mica-Backdrop**, abgerundete Ecken und eine theme-bewusste Titelleiste — und die Common Controls rendern durch **comctl32 v6** statt der Defaults aus der Windows-95-Ära. Die Window-Proc handhabt jetzt `WM_DPICHANGED`, sodass ein Fenster gestochen scharf bleibt, wenn du es zwischen Monitoren mit gemischter Skalierung ziehst, statt bitmap-gestreckt zu werden.

Entscheidend ist, dass nichts davon die alte [#1542](https://github.com/PerryTS/perry/issues/1542)\-Regression „schwarzer Bereich nach Resize“ wieder einführte: Der Client-Bereich wird weiterhin opak gemalt, und Full-Frame-Mica/Acrylic-Blur-Through bleibt ein expliziter `app.setVibrancy(...)`\-Opt-in. Es gibt außerdem ein neues `--target windows-winui`\-Backend-Scaffold (WinUI 3) für Apps, die den voll modernen Stack wollen, und einen kleinen, aber echten Fix, der `perry compile main.ts -o main` auf Windows `main.exe` produzieren lässt, damit PowerShell es tatsächlich startet (v0.5.1146).

## Neue Widgets, jede Plattform

Zwei Widgets landeten erst am letzten Tag, und beide spannen über jede UI-Plattform, die Perry targetet:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — ein kompaktes, feld-artiges Datums-Control: `NSDatePicker` auf macOS, `UIDatePicker` (.compact) auf iOS/visionOS, `SysDateTimePick32` auf Windows, `android.widget.DatePicker` auf Android, GTK4 auf Linux. Eine TS-Oberfläche über alle hinweg.
-   **Drag & Drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — jedes Widget kann ein Drop-Ziel und eine Drag-Quelle für Text/Dateien/URLs sein, gemappt auf `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit) und `View.setOnDragListener` (Android).

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Früher im Fenster füllte sich das Widget-Regal auch über Desktop und Mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation und eine swipebare ImageGallery — jedes von dem echten nativen Control auf jeder Plattform gestützt. HarmonyOS (ArkTS) bekam Chart und TreeView (v0.5.893), die letzten zwei Widgets, die es brauchte, um Parität mit den anderen zu erreichen.

## GC, Internals und Stabilität

Die meisten dieser 270 Releases sind keine Schlagzeilen — sie sind Bug-Fixes und Internals, und das ist der Punkt dieser Phase. Ein paar, die hervorzuheben sind:

-   **GC ging weiter.** Die Conditional-Free-List-Arbeit aus dem GC-Beitrag setzte sich weiter, und eine scharfe Bug-Klasse wurde geschlossen: Native-gebrückte Promises werden jetzt **gepinnt, während sie auf einem tokio-Worker in Flight sind**, sodass der GC sie nicht wegfegen kann, bevor die Auflösung landet (v0.5.923). Wenn du ein Async-Fetch unter Last liefest und eine Phantom-Collection sahst, war das das.
-   **Das Memory-Modell ist dokumentiert.** Es gibt jetzt einen `internals/memory-model.md`\-Deep-Dive — NaN-Boxing, den generationellen GC, den Shadow-Stack und Write-Barriers — in die Docs-Site verdrahtet (v0.5.933).
-   **Eine Welle von Codegen-Stabilitäts-Fixes**, aufgetaucht durch den npm-Sweep: Ein Modul-Level-`const`\-Arrow, das innerhalb eines wiederaufgenommenen Async-Steps aufgerufen wird, SIGSEGVt nicht mehr (v0.5.953), `try { await rejected } catch { return X }` hängt nicht mehr ewig (v0.5.870), und eine Handvoll `js_is_truthy` / Raw-Pointer-Range-Crashes, über die echte Bundles stolperten.

## Apple-Hausarbeit

Kleiner, aber echt: `perry setup ios --development` provisioniert jetzt für Development-Builds (v0.5.1023), und der Apple-Cross-Library-Build/Link-Pfad wurde dedupliziert und pointer-width-portabel gemacht (v0.5.1121/1125) — was die npm / Homebrew / APT / winget-Publish-Matrix entsperrte, die festgesteckt hatte.

## Wo das die Dinge hinterlässt

Die Wette hinter Perry war immer, dass „natives TypeScript“ nur dann zählt, wenn *echtes* TypeScript läuft — nicht ein Spielzeug-Subset, sondern die tatsächlichen Pakete, die Leute `npm install`en. Dieser Monat war größtenteils diese Arbeit: weniger eine einzelne Zahl zum Angeben, mehr ein langer, unglamouröser Vorstoß, um die Lücke zwischen „kompiliert“ und „funktioniert“ zu schließen. Die Conformance-Radars und die npm-Paritätstests sind die Anzeigetafel, die wir jetzt beobachten, und wir werden weiter die Zahlen posten — die guten und die noch unvollkommenen.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
