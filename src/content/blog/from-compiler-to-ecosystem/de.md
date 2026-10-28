---
title: "Vom Compiler zum Ökosystem: React, Datenbanken und Cloud-Builds"
excerpt: "Perry wächst vom Compiler zum vollständigen Ökosystem. perry/ui im Kern, Prisma-kompatible ORMs für MySQL/PostgreSQL/SQLite, universelle Push-Benachrichtigungen, verteilte Builds mit App-Store-Veröffentlichung und eine React-Kompatibilitätsschicht — alles in einer Woche."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Vor einer Woche war Perry ein Compiler mit einem UI-Toolkit. Man konnte TypeScript schreiben, es zu einer nativen Binärdatei kompilieren und auf sechs Plattformen ausliefern. Das war die Geschichte. Heute ist die Geschichte größer: Perry wird zu einem Ökosystem. Drei Datenbank-ORMs, universelle Push-Benachrichtigungen, verteilte Builds mit App Store und Play Store-Veröffentlichung, eine React-Kompatibilitätsschicht und automatisierte App-Verifizierung — alles in der letzten Woche gelandet.

Dieser Beitrag behandelt, was ausgeliefert wurde, warum es wichtig ist und wie der Code aussieht.

## perry/ui: Das Fundament

Bevor wir zu den neuen Bibliotheken kommen, lohnt es sich zu betonen, was im Zentrum von allem steht: `perry/ui`. Das ist Perrys eigenes natives UI-Toolkit — über 20 Widgets, die direkt zu plattform-nativen Komponenten auf allen sechs Zielen kompilieren. Es ist kein Wrapper, keine Abstraktionsschicht, keine Web View. Jeder `Button` wird zu einem `NSButton` auf macOS, einem `UIButton` auf iOS, einem `GtkButton` auf Linux, einem `android.widget.Button` auf Android und einem `CreateWindowEx`\-Steuerelement auf Windows.

`perry/ui` ist Perrys primäre und fortschrittlichste UI-Oberfläche. Es umfasst reaktives State Management, Layout-Container (VStack, HStack, ZStack, SplitView), ein hardwarebeschleunigtes Canvas, Table Views mit Spaltensortierung, das `perry/system`\-Modul für Dateidialoge, Keychain-Zugriff, Benachrichtigungen und Multi-Window — alles aus TypeScript, alles kompiliert zu direkten Plattform-API-Aufrufen. Jeder andere UI-Ansatz in Perry, einschließlich der React-Kompatibilitätsschicht, baut auf `perry/ui` auf und bildet auf dessen Widgets zurück.

**app.ts**

```typescript
import { Window, VStack, Button, Text, State } from 'perry/ui';
const count = new State(0);
const window = new Window({ title: "Counter" });
window.setContent(
  new VStack({ children: [
    new Text({ text: count }),
    new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),
  ] })
);
```

Das reaktive `State`\-Objekt ist die Schlüssel-Primitive. Wenn sich ein State-Wert ändert, aktualisieren sich nur die an diesen State gebundenen Widgets — kein Virtual DOM Diffing, keine vollständigen Baum-Rerenders, kein Reconciliation-Pass. Es ist der direkteste Weg von TypeScript zu nativer Plattform-UI, der existiert.

## React-Kompatibilität: Eine dünne Schicht auf perry/ui

Für Entwickler, die von React kommen, bietet `perry-react` eine Kompatibilitätsschicht, die Reacts Komponentenmodell auf `perry/ui`\-Widgets abbildet. Du kannst `useState`, `useRef`, `useReducer` und JSX verwenden — und Perry kompiliert es zu denselben nativen Widgets darunter. Es ist eine Komfortbrücke, keine separate Rendering-Engine.

**counter.tsx**

```tsx
import React, { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

Unter der Haube bildet jedes JSX-Element auf ein `perry/ui`\-Widget ab: `<div>` wird zu einem VStack, `<button>` wird zu einem Button, `useState` wird durch Perrys reaktiven State gestützt. Es ist früh — Phase 1 mit Full-Tree-Rerenders und globalem Hook-Storage — aber es beweist, dass bestehender React-Code über Perry native Plattformen ansprechen kann. Wir erkunden auch Angular- und Ionic-Kompatibilität entlang ähnlicher Linien.

## Drei Datenbank-ORMs: Prisma-API, native Performance

Wenn du einen Server oder eine Desktop-App baust, die mit einer Datenbank kommuniziert, hat Perry dich jetzt mit drei Prisma-kompatiblen ORMs abgedeckt: `perry-prisma` (MySQL), `perry-sqlite` (SQLite) und `perry-postgres` (PostgreSQL). Alle drei sind Drop-in-Ersatz für `@prisma/client`. Dieselbe API, dieselben Query-Muster, aber kompiliert zu nativem Code mit direktem Datenbank-FFI — kein Prisma-Engine, kein Node.js.

**database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Dieselbe Prisma-API — kompiliert zu nativem SQL via Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

Unter der Haube ist jedes ORM ein TypeScript-Frontend, gestützt durch eine Rust-FFI-Schicht mit `sqlx`. Der Query-Flow: TypeScript serialisiert die Query zu JSON, übergibt sie über die FFI-Grenze, Rust baut parametrisiertes SQL, führt es über den Connection Pool aus und serialisiert das Ergebnis zurück. Das Prisma-Schema wird zur Build-Zeit gelesen — null Runtime-Parsing.

Die drei Implementierungen teilen ~95 % ihres Codes. Die Unterschiede sind, was man erwarten würde: Identifier-Quoting (`` `col` `` vs `"col"`), Placeholder-Syntax (`?` vs `$1, $2`) und Transaktionssemantik. Alle drei unterstützen die vollständige Prisma-CRUD-Oberfläche: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — plus Raw SQL, Transaktionen und über 10 WHERE-Filteroperatoren.

## perry-push: Universelle Push-Benachrichtigungen

`perry-push` ist eine einzelne Bibliothek, die Push-Benachrichtigungen über jede Plattform hinweg handhabt: APNs (iOS/macOS), FCM (Android), Web Push (Browser) und WNS (Windows). Jeder Provider ist ein Rust-FFI-Modul mit genau drei Funktionen: `*_provider_new`, `*_provider_close` und `*_send`.

**notify.ts**

```typescript
import { ApnProvider } from 'perry-push/apn';
import { FcmProvider } from 'perry-push/fcm';
const apn = new ApnProvider({ teamId, keyId, key });
const fcm = new FcmProvider({ serviceAccount });
// Einheitlicher Ergebnistyp für alle Provider
const result = await apn.send({
  deviceToken: token,
  title: "New message",
  body: "You have a new reply",
});
```

Kryptografie wird von `ring` gehandhabt — ES256 JWTs für APNs und VAPID, RS256 für FCM-Servicekonten, AES-GCM für Web Push-Payload-Verschlüsselung. Alles kompiliert zu nativem Code. Kein `node-gyp`, keine OpenSSL-Abhängigkeit.

## Perry Hub + Builders: Verteilte Cloud-Builds

Das ist der Infrastruktur-Play. `perry-hub` ist ein Build-Orchestrierungsserver — selbst von Perry aus TypeScript kompiliert — der einen Pool von Build-Workern verwaltet. Du pushst dein Projekt, der Hub verteilt es an den richtigen Worker basierend auf der Zielplattform, und der Worker kompiliert, signiert und veröffentlicht optional deine App.

Heute existieren zwei Worker: ein macOS-Builder (behandelt macOS, iOS und Android-Ziele) und ein Linux-Builder (behandelt Linux und Android). Beide sind Rust-Binärdateien, die sich über WebSocket mit dem Hub verbinden, Source-Tarballs herunterladen, den Perry-Compiler ausführen und Artefakte zurück hochladen.

-   **Code-Signierung** — Apple-Notarisierung für macOS, Provisioning-Profile für iOS, Android-Keystore-Signierung
-   **App Store-Veröffentlichung** — direkter Upload zu App Store Connect und Google Play Store
-   **Artefakt-Management** — gebaute Binärdateien mit TTL-basierter Bereinigung zum Hub hochgeladen
-   **Lizenz-Management** — Rate-Limits pro Lizenz, Prioritäts-Queuing (Pro-Stufe bekommt Priorität)

Der Hub selbst ist eine faszinierende Fallstudie. Es ist eine ~1.500-Zeilen TypeScript-Datei, kompiliert zu einer 2 MB nativen Binärdatei von Perry. Er läuft Fastify auf Port 3456 für HTTP und `ws` auf Port 3457 für WebSocket. Aller State ist im Speicher mit JSON-Persistenz — keine externe Datenbank. Es ist die Art von Server, die man mit `scp` und einer systemd-Unit-Datei deployen kann.

## perry-verify: Automatisierte App-Verifizierung

`perry-verify` ist ein eigenständiger HTTP-Service, der eine kompilierte Binärdatei und eine Konfiguration nimmt, eine Verifizierungs-Pipeline ausführt und strukturierte Pass/Fail-Ergebnisse mit Screenshots zurückgibt. Er startet die App, führt Authentifizierungsflows aus (deterministisch oder KI-gestützt), prüft den State und erfasst Beweise.

Plattform-Adapter existieren für macOS (über Accessibility APIs), Linux (AT-SPI) und Stubs für iOS Simulator und Android Emulator. Die KI-Schicht verwendet Claude für Fallback-Authentifizierung und State-Verifizierung, wenn deterministische Checks nicht möglich sind. Es ist designed, sich in die Build-Pipeline des Hubs als Post-Build-Schritt einzufügen: Kompilieren, Signieren, Verifizieren, Veröffentlichen.

## Pry ist überall verfügbar

[Pry](/de/blog/building-pry/), der native JSON-Viewer, den wir als Perry-Showcase gebaut haben, ist jetzt auf fünf Plattformen verfügbar. Er ist im [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) und [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry), mit nativen Binärdateien für Linux und Windows. Dieselbe TypeScript-Codebasis, fünf plattformspezifische Einstiegspunkte, fünf native Binärdateien. Es ist der konkreteste Beweis, dass dieser gesamte Ansatz von Ende zu Ende funktioniert — vom TypeScript-Quellcode zum App Store-Eintrag.

## Was das alles bedeutet

Ein Compiler ist interessant. Ein Ökosystem ist nützlich. In der letzten Woche ging Perry von "du kannst TypeScript zu nativem Code kompilieren" zu "du kannst eine vollständige App mit nativer UI, einer Prisma-Datenbank, Push-Benachrichtigungen und Builds bauen, die automatisch im App Store veröffentlichen."

Die Teile beginnen sich zu verbinden:

-   **perry/ui** ist der direkteste Weg von TypeScript zu nativer Plattform-UI — reaktiver State, über 20 Widgets, null Abstraktionsschichten
-   **perry-prisma/sqlite/postgres** bedeutet, bestehender Datenbankcode portiert mit minimalen Änderungen
-   **perry-push** bedeutet native Push-Benachrichtigungen ohne plattformspezifische Bibliotheken
-   **perry-hub + builders** bedeutet, man kann von `perry publish` zum App Store in einem Schritt gelangen
-   **perry-verify** bedeutet automatisiertes Testen der kompilierten Ausgabe, nicht nur des Quellcodes
-   **perry-react** bedeutet, React-Entwickler können Perry mit vertrauten Mustern nutzen, alles auf perry/ui darunter abgebildet

Das ist nicht theoretisch. Jede hier aufgeführte Bibliothek hat funktionierenden Code, Tests und Dokumentation. Mehrere werden bereits in Produktion verwendet — die Perry-Landingpage selbst läuft auf einem Perry-kompilierten Fastify-Server, und Pry ist in zwei App Stores live.

## Was kommt als Nächstes

Die unmittelbare Roadmap:

-   **perry/ui-Erweiterung** — Drag and Drop, Barrierefreiheitslabels, benutzerdefinierte Kontextmenüs, mehr Layout-Primitive
-   **perry-verify-Integration** — automatisierte Verifizierung in der Build-Pipeline
-   **Framework-Kompatibilität** — Verbesserung der React-, Angular- und Ionic-Schichten als Einstieg in perry/ui
-   **Vollständige Regex-Unterstützung** — ECMAScript-kompatible Regex-Engine kompiliert zu nativem Code

Verfolge den Fortschritt auf [GitHub](https://github.com/PerryTS/perry), oder sieh dir die [Roadmap](/de/roadmap/) für das vollständige Bild an.
