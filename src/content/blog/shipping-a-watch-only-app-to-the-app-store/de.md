---
title: "Eine reine Apple-Watch-App im App Store veröffentlichen – wenn alle üblichen Wege scheitern"
excerpt: "Alle dokumentierten Wege zum Upload einer eigenständigen watchOS-App scheitern: altool, iTMSTransporter, xcodebuild und sogar der Organizer von Xcode 26 lehnen die Plattform ab. Dieser undokumentierte Umweg funktioniert und erhält arm64_32 für ältere Uhren: ein mit ITSWatchOnlyContainer gekennzeichneter iOS-Stub, hochgeladen mit iTMSTransporter."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** ist ein Schallpegelmesser für Apple Watch – eine eigenständige watchOS-App ohne iPhone Gegenstück, kompiliert aus einer einzelnen TypeScript-Datei mit Perry. Wir hatten erwartet, dass es schwierig werden würde, es auf der Smartwatch aufzubauen und zum Laufen zu bringen. Der Teil, der tatsächlich einen Tag gekostet hat, war, es *in den App Store* zu bringen. Jeder dokumentierte Upload-Pfad lehnt eine eigenständige watchOS-App ab, und die funktionierende Problemumgehung ist fast nirgends niedergeschrieben. Dieser Beitrag ist die fehlende Seite.

Die Kurzversion: Um eine reine Smartwatch-App zu veröffentlichen, packen Sie sie in einen iOS *Container-Stub* mit der Markierung `ITSWatchOnlyContainer` und laden sie mit `iTMSTransporter` – nicht Xcode, nicht `altool`. In der Langversion gibt es drei Landminen, deren Entdeckung jeweils einen Datenaustausch zu den Servern von Apple erfordert.

## Die App

dB Meter ist eine `WKWatchOnly`-App: Sie läuft selbstständig auf der Smartwatch, es ist keine gekoppelte iPhone-App erforderlich. Perry kompiliert das TypeScript direkt in eine native watchOS-Binärdatei und verteilt es als **universelle** Slice – `arm64` für Serien 9/10/11 und die Ultras, plus `arm64_32` (ILP32: 64-Bit-Register, 32-Bit-Zeiger) für die Serien 4 bis 8 und die SE. Dieser zweite Teil ist wichtig: Ohne ihn kann die App von der Serie 4 bis zum SE 2 einfach nicht installiert werden. `arm64_32` am Leben zu halten, erweist sich als die Einschränkung, die die offensichtliche Problemumgehung ausschließt.

## Eine eigenständige Smartwatch-App wird nicht hochgeladen

Eine reine Smartwatch `.ipa` ist ein Bundle, dessen Top-Level-App `CFBundleSupportedPlatforms = [WatchOS]` deklariert. Die Befehlszeilen-Übermittlungstools von Apple wissen nicht, was sie damit anfangen sollen:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

Sie wenden sich also an Xcode. Aber `xcodebuild -exportArchive` mit `method: app-store-connect` schlägt während der Methodenaufzählung fehl, und der Grund ist aufschlussreich – auf Xcode 26 hat die Distribution-Method-Registrierung *keine App Store-Option überhaupt* für ein watchOS-Archiv:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

Die Organizer-GUI zeigt genau die gleichen drei Kacheln an – Release-Tests, Unternehmen, Debugging und eine „Benutzerdefiniert“, die zu nichts Nützlichem führt. Ad-hoc, Unternehmen, Entwicklung. Kein App Store. In der heute installierten Version von Xcode gibt es keine unterstützte Möglichkeit, eine eigenständige Smartwatch-App über Apples eigene Eingangstüren an App Store Connect zu senden.

## Die Falle der Begleit-App

Der verlockende Ausweg besteht darin, nicht mehr nur auf Smartwatches beschränkt zu sein. Versenden Sie eine echte iOS-App, die zufällig die Smartwatch-App *einbettet* unter `Payload/YourApp.app/Watch/`, so wie Smartwatch-Apps jahrelang bereitgestellt wurden. Das wird mit `altool --type ios` sauber hochgeladen, da das Top-Level-Bundle eine normale iOS-App ist.

Es führt Sie auch in zwei Probleme. Erstens sieht App Store Connect jetzt eine iPhone-App und **verlangt iPhone-Screenshots** – und eine iPhone-App, die nichts anderes tut, als „Öffnen“ zu sagen Dies auf Ihrer Smartwatch“ ist ein Kandidat für eine Ablehnung der Mindestfunktionalität 4,2. Zweitens und fatal für uns: Eine iOS *top-level*-Binärdatei darf kein `arm64_32`-Slice enthalten. Apples Validator lehnt es ab:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

Die Companion-Struktur zwingt Sie also dazu, `arm64_32` zu entfernen und nur noch arm64 zu verwenden, wodurch alle Smartwatches der Serien 4–8 und SE entfallen – einschließlich der Serie 7, die wir getestet haben. Die Falle der Begleit-App tauscht Ihre ältere Smartwatch-Unterstützung gegen einen funktionierenden Upload. Wir wollten diesen Handel nicht.

## Der Nur-Smartwatch-Container

Die eigentliche Antwort behält die Smartwatch-App nur für Smartwatches bei *und* behält `arm64_32` bei. Sie verschachteln die Smartwatch-App in einem winzigen iOS **Container-Stub** und kennzeichnen den Stub, sodass App Store Connect das Ganze als reines Smartwatch-Produkt behandelt. Zwei Info.plist-Schlüssel sorgen für die Kennzeichnung, und sie sind der ganze Trick:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` sagt App Store Connect: „Dieses iOS-Bundle ist nur ein Liefermittel für die darin enthaltene Smartwatch-App.“ Dieser einzelne Schlüssel ist es, der die Anforderung für einen iPhone-Screenshot entfällt – das Geschäft klassifiziert das Produkt als nur für Smartwatches. `LSApplicationLaunchProhibited=true` besagt, dass der Stub nie gestartet wird, es also keine echte App sein muss; Es muss nur vorhanden sein, damit die Plattform der obersten Ebene als iOS angezeigt wird und die Bereitstellungstools sich nicht mehr beschweren. Die darin enthaltene Smartwatch-App behält `WKWatchOnly=true` und *no* `WKCompanionAppBundleIdentifier` bei – es ist kein Begleiter des Stubs, der Stub ist ein Wrapper darum herum.

Die verbleibenden Info.plist-Schlüssel des Stubs sind Standardschlüssel, auf denen der Validator besteht: `UIDeviceFamily=[1,2]`, alle vier `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]` und – da der Stub arm64 ist – `UIRequiredDeviceCapabilities=[arm64]`. Der Stub enthält überhaupt keine Symbole; Die Smartwatch-App trägt sie.

Dann laden Sie mit `iTMSTransporter` hoch, dessen `-assetFile`-Modus nun froh ist, dass das Top-Level-Bundle iOS ist:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

Der Build landet auf App Store Connect als watchOS-Build, `arm64_32` intakt und die Version fragt nicht mehr nach iPhone Screenshots.

## Drei Landminen unterwegs

Bei jedem davon handelte es sich um einen fehlgeschlagenen Upload, der von Apples Validator zurückkam, und nicht etwas, das die lokalen Tools erkannten:

1.  **Der Stub darf kein frisch mit `swiftc` erzeugtes Programm sein.** Ein einfacher UIKit-Stub, der mit dem iOS-SDK des installierten Xcode kompiliert wird, wird als *„mit einem nicht unterstützten SDK oder einer nicht unterstützten Xcode-Version erstellt“* abgelehnt (Fehler 90534). Dieses SDK gilt als Vorabversion. Wir hatten bereits ein echtes iOS-Programm mit akzeptierter SDK-Version: Perrys eigene Ausgabe für `--target ios`. Perry bindet seine Laufzeit ein und trägt eine veröffentlichte SDK-Version ein. Damit bestand es die Prüfung, an der `swiftc` scheiterte. Der Stub ist ein mit Perry kompilierter Bildschirm mit dem Hinweis „Dies ist eine Apple-Watch-App“, der dank `LSApplicationLaunchProhibited` tatsächlich nie ausgeführt wird.

2.  **Symbole benötigen das Diktat, nicht nur den Schlüssel.** Die Smartwatch-App hat die Validierung mit *„ein Wert für CFBundleIconName fehlt“ fehlgeschlagen*, obwohl `CFBundleIconName` festgelegt wurde und `Assets.car` war vorhanden. Der Validator möchte die vollständige Struktur: `CFBundleIconName` *und* ein `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}` Wörterbuch. Legen Sie nur den Schlüssel der obersten Ebene fest und es wird darauf bestanden, dass der Schlüssel fehlt.

3.  **`WKWatchOnly` wird für einen Datensatz abgelehnt, der bereits iOS-Builds verteilt.** Wenn Ihr App Store-Datensatz jemals einen iOS-Build wird ein reiner Smartwatch-Upload abgelehnt und Sie benötigen einen neuen App-Datensatz (den die ASC API nicht erstellen kann – `POST /apps` gibt 403 zurück, Sie erstellen ihn also in der Web-Benutzeroberfläche). Ein Datensatz mit nur einem *nicht verteilten* Build ist in Ordnung.


Ein paar kleinere Invarianten: Der Stub und die Smartwatch-App müssen dieselbe `CFBundleVersion` haben, und Sie signieren von innen nach außen – zuerst die Smartwatch-App, dann den Stub – mit `--generate-entitlement-der` und `get-task-allow=false`.

## Warum dies eine Perry-Geschichte ist

Keine der Containerinstallationen ist Perry-spezifisch – sie gilt für jede eigenständige watchOS-App, unabhängig davon, auf welcher sie basiert. Aber Perry ist der Grund, warum dB Meter eine einzelne 280-zeilige TypeScript-Datei ist, die in erster Linie zu einer nativen Smartwatch-Binärdatei kompiliert wird, und Perry hat das SDK-clean iOS-Stub, der Fehler 90534 überwunden hat, als `swiftc` nicht konnte. Beim Kompilieren für `arm64_32` wurde nebenbei auch ein echter Codegen-Bug behoben – ein typisiertes Objekt-String-Feld wurde als Garbage Float auf ILP32 zurückgelesen, da ein Inline-Klassenfeldzugriff in der 64-Bit-Objekt-Header-Größe (24 Bytes) anstelle der zielbewussten Version erfolgte 20 – so etwas findet man nur, wenn man darauf besteht, die älteren Uhren zu unterstützen, anstatt sie stillschweigend fallen zu lassen.

Die gesamte Pipeline – von TypeScript über eine universelle watchOS-Binärdatei bis hin zu einem signierten, nur für Smartwatches konzipierten App Store-Build – befindet sich jetzt in einem Skript, das wir erneut ausführen können. Wenn Sie eine eigenständige Smartwatch-App veröffentlichen und Xcode Ihnen mitteilt, dass dies nicht möglich ist, können Sie sie wie folgt umschließen, als `ITSWatchOnlyContainer` kennzeichnen und an `iTMSTransporter` übergeben.
