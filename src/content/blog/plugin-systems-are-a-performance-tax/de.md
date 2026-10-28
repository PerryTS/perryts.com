---
title: "Plugin-Systeme sind eine Performance-Steuer"
excerpt: "Plugin-Architekturen tauschen Performance gegen Erweiterbarkeit. Doch was, wenn Erweiterbarkeit zur Build-Zeit statt zur Laufzeit stattfände? Compile-Time-Komposition bietet beides — null Overhead, volle Flexibilität."
date: 2026-02-27
tags: ["architecture", "performance", "compiler"]
---
Du installierst VS Code. Es ist schnell. Du fügst 15 Erweiterungen hinzu. Jetzt dauert der Start 4 Sekunden und der Extension Host verbraucht 800 MB RAM. Was ist passiert?

Das Muster wiederholt sich überall: WordPress, Eclipse, Chrome, Figma, Slack. Die App wird schnell ausgeliefert. Plugins machen sie langsam. Niemand ist mehr überrascht — wir haben es als Preis der Erweiterbarkeit akzeptiert.

Aber Plugin-Systeme sind nicht nur ein Performance-Problem. Sie sind ein Problem der Designphilosophie. Die Branche hat "Erweiterbarkeit" mit "Runtime-Dynamik" verwechselt, obwohl die bessere Antwort oft Compile-Time-Komposition ist. Die einzig performanten Plugins sind die, die zur Kompilierzeit aufhören, Plugins zu sein.

## Das Performance-Spektrum der Erweiterbarkeit

Nicht jede Erweiterbarkeit kostet gleich viel. Es gibt ein Spektrum von Null-Kosten bis Maximum-Kosten, und der Großteil der Branche hat sich am teuren Ende angesiedelt:

1.  **Statisches Linken / Compile-Time-Module** — null Overhead. C-Bibliotheken, Rust-Crates, Go-Pakete. Die Modulgrenze verschwindet vollständig in der finalen Binärdatei.
2.  **Shared Libraries beim Start geladen** — nahezu null. nginx-Module, Linux-Kernelmodule. Einmalige Kosten beim Laden, danach direkte Funktionsaufrufe.
3.  **Dynamischer Dispatch über Interfaces / VTables** — kleiner Overhead. Game-Engine-Plugins in C++. Eine Pointer-Indirektion pro Aufruf.
4.  **Same-Process interpretierte Plugins** — moderater Overhead. WordPress PHP-Plugins, Eclipse OSGi-Bundles. Jeder Plugin-Aufruf geht durch einen Interpreter.
5.  **Separate-Process-Plugins über IPC** — signifikant. VS Code-Erweiterungen, Chrome-Erweiterungen. Jede Interaktion überquert eine Prozessgrenze und serialisiert Daten.
6.  **Sandboxed Plugins über serialisiertes IPC** — schwer. Figma-Plugins, Browser-Extension Content Scripts. Serialisierung, Deserialisierung und Sandbox-Durchsetzung bei jedem Aufruf.

Die zentrale Erkenntnis: die einzig performanten Plugins sind die, die zur Kompilierzeit aufhören, Plugins zu sein. Die Stufen 1 und 2 sind schnell, gerade weil das "Plugin" im finalen Artefakt nicht mehr vom Host-Code unterscheidbar ist.

## Der reale Schaden

### WordPress

Jedes Plugin hängt sich in den Request-Lifecycle ein. 30 Plugins bedeuten 30 Schichten von Funktionsaufrufen pro Seitenaufruf. Das Ergebnis: Caching-Plugins existieren einzig, um den Schaden anderer Plugins abzumildern. Performance-Plugins, um das Performance-Problem zu beheben, das Plugins verursacht haben. Die Meta-Ironie schreibt sich selbst.

### VS Code

Erweiterungen teilen sich eine einzige Node.js Event Loop in einem separaten Prozess. Eine fehlverhaltende Erweiterung blockiert alle anderen. Der Extension Host taucht regelmäßig als größter CPU-Verbraucher auf Entwicklermaschinen auf. Microsoft hat Profiling-Tools, Bisect-Befehle und Activation-Event-Systeme gebaut — eine ganze Infrastruktur, um das Problem zu verwalten, das Erweiterungen schaffen.

### Eclipse

Die warnende Geschichte. OSGi-Bundle-Auflösung, Class-Loading-Overhead, massive Abhängigkeitsgraphen. Einst die beliebteste IDE, jetzt weitgehend von Mainstream-Entwicklern verlassen. Die Plugin-Architektur, die ihre größte Stärke sein sollte, wurde zu ihrer definierenden Schwäche.

### Electron selbst

Das Plugin-Problem auf Plattformebene. Jede Electron-App liefert eine vollständige Chromium + Node.js Runtime. VS Code ist Electron. Slack ist Electron. Discord ist Electron. Jedes davon verbraucht unabhängig 300–500 MB RAM, um zu rendern, was im Wesentlichen ein Chat-Fenster oder ein Texteditor ist. Das "Plugin" hier ist die gesamte Web-Plattform, frisch gebündelt für jede Anwendung.

## Warum die Branche trotzdem immer wieder Plugins wählt

Wenn Plugins so teuer sind, warum baut sie jeder weiterhin? Die Gründe sind meist organisatorischer, nicht technischer Natur:

-   **Entwicklererfahrung** — Plugins sind einfach zu schreiben, wenn man sich nicht um Performance kümmert. Eine JS-Datei ausliefern, ein paar Events hoooken, fertig.
-   **Ökosystem-Wachstum** — Plugins erzeugen Netzwerkeffekte und Community-Engagement. Ein Marktplatz mit 30.000 Erweiterungen ist ein mächtiger Burggraben.
-   **Organisatorische Bequemlichkeit** — Plugins lassen Teams Designentscheidungen aufschieben. "Jemand wird ein Plugin dafür schreiben" ist das Architekturäquivalent von "Wir fixen das in der Postproduktion."
-   **Geschäftsmodell** — Plugin-Marktplätze schaffen Umsatz und Lock-in. Die Plattform schöpft Wert aus dem Ökosystem ab.

Die unbequeme Wahrheit: Plugins sind oft ein Weg, harte architektonische Entscheidungen darüber zu vermeiden, was in den Kern gehört. Sie lassen dich etwas Unvollständiges ausliefern und es "erweiterbar" nennen.

## Die Alternative: Compile-Time-Komposition

Was, wenn Erweiterbarkeit zur Build-Zeit statt zur Runtime stattfinden würde?

Das ist keine Hypothese. Es gibt bewährte Präzedenzfälle in Systemsprachen:

-   **Rust proc macros** — beliebiger Code, der zur Kompilierzeit läuft und Zero-Overhead nativen Code generiert. Serde-Serialisierung, Tokio-Async-Runtime-Setup, Axum-Routing — alles aufgelöst, bevor dein Programm startet.
-   **Zig comptime** — Compile-Time-Ausführung, die alle Runtime-Verzweigungen eliminiert. Generische Datenstrukturen werden monomorphisiert, Konfiguration wird aufgelöst, toter Code wird eliminiert. Was bleibt, ist genau das, was läuft.
-   **C++ Templates / constexpr** — Compile-Time-Polymorphismus mit null Runtime-Kosten. Die STL erreicht außergewöhnliche Performance, weil jeder generische Algorithmus zur Kompilierzeit spezialisiert wird.
-   **Tree-Shaking in Bundlern** — eine partielle, unvollkommene Version dieser Idee, angewandt auf JavaScript. Webpack und Rollup eliminieren ungenutzte Exporte zur Build-Zeit. Die Einschränkung ist, dass sie nur Code entfernen, nicht spezialisieren können.

Das Muster ist konsistent: Entscheidungen von der Runtime zur Build-Zeit verschieben. Was du nicht einschließt, kostet nichts. Was du einschließt, kompiliert zu nativem Code ohne Indirektion. Die Modulgrenze wird zum Source-Level-Organisationswerkzeug, nicht zur Runtime-Performance-Grenze.

## Was das für TypeScript bedeutet

TypeScript ist die beliebteste Sprache für den Bau erweiterbarer Tools — und die schlechteste bei Runtime-Performance. Das gesamte TypeScript-Ökosystem läuft auf Node.js, das auf V8 läuft, das JavaScript JIT-kompiliert. Jede Schicht fügt Overhead hinzu: JIT-Aufwärmzeit, Garbage-Collection-Pausen, dynamischer Dispatch für jeden Property-Zugriff, IPC-Grenzen zwischen Prozessen.

Hier kommt Perry ins Spiel. Perry kompiliert TypeScript direkt zu nativen Binärdateien. Kein V8, kein JIT-Aufwärmen, keine Garbage-Collection-Pausen, keine IPC-Grenzen.

Wenn deine Module zu nativem Code kompilieren, werden "Plugins" einfach... Module. Sie komponieren zur Build-Zeit. Die finale Binärdatei hat null Plugin-Overhead, weil es keine Plugins gibt — nur nativen Code. Ein Express-Route-Handler, eine Middleware-Funktion, eine Utility-Bibliothek — sie alle kompilieren zu direkten Funktionsaufrufen in derselben Binärdatei. Kein dynamisches Laden, keine Serialisierung, keine Prozessgrenzen.

```text
# Deine App, deine Abhängigkeiten, deine "Plugins" — eine Binärdatei
$ perry compile server.ts -o server
Compiling server.ts + 43 modules...
✓ Built executable: server (1.8 MB, 0.7s)
$ ./server
Listening on port 3000
```

Das ist nicht theoretisch. Perry kompiliert bereits reale TypeScript-Frameworks — Hono, tRPC, Strapi — zu nativen ARM64-Binärdateien unter 2 MB, in weniger als einer Sekunde. Die Module, die diese Frameworks ausmachen, werden kompiliert, gelinkt und in eine einzelne ausführbare Datei inlined. Was in Node.js eine Plugin-Architektur mit Runtime-Overhead wäre, wird in einer Perry-Binärdatei zur Zero-Cost-Komposition.

## Die Erweiterbarkeit, die du tatsächlich brauchst

Der Einwand ist offensichtlich: "Aber ich brauche Runtime-Erweiterbarkeit. Benutzer müssen Plugins installieren können, ohne neu zu kompilieren."

Müssen sie das? Für die meisten Anwendungen ist der Satz von Erweiterungen zur Build-Zeit bekannt. Du wählst deine Express-Middleware, deinen Datenbanktreiber, deine Auth-Bibliothek, dein Logging-Framework — und dann deployest du. Die "Erweiterbarkeit" steckt in deiner `package.json`, aufgelöst bei `npm install`, nicht zur Runtime.

Die Anwendungen, die wirklich Runtime-Plugin-Laden brauchen — VS Code, WordPress, Browser — sind die Ausnahme, nicht die Regel. Und selbst diese zahlen einen hohen Preis dafür. Für alles andere gibt Compile-Time-Komposition dieselbe Flexibilität ohne den Overhead.

Der Unterschied ist architektonische Ehrlichkeit. Statt so zu tun, als bräuchte jede Anwendung ein Plugin-System, fragst du: Muss diese Erweiterbarkeit zur Runtime passieren, oder kann der Compiler die Arbeit erledigen?

## Der Weg nach vorn

Die Sucht der Branche nach Plugin-Architekturen ist ein Symptom davon, Runtime-Overhead als unvermeidlich zu akzeptieren. Das ist er nicht. Der Compiler kann die Arbeit erledigen. Build-Time-Komposition gibt dir Erweiterbarkeit ohne die Steuer.

Wir bauen Perry, weil wir glauben, dass TypeScript-Entwickler native Performance verdienen, ohne die Sprache aufzugeben, die sie lieben. Deine Module sollten zur Build-Zeit komponieren, zu direkten Funktionsaufrufen kompilieren und ohne den Overhead einer Runtime laufen, die nur existiert, um "Erweiterbarkeit" möglich zu machen.

Das schnellste Plugin-System ist das, das zur Runtime nicht existiert.
