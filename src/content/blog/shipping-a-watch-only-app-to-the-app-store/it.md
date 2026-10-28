---
title: "Pubblicare un’app solo per Apple Watch sull’App Store quando tutti gli altri metodi falliscono"
excerpt: "Tutti i metodi documentati per caricare un’app watchOS autonoma sull’App Store falliscono: altool, iTMSTransporter, xcodebuild e persino Organizer di Xcode 26 rifiutano la piattaforma. Ecco una soluzione non documentata che funziona e conserva arm64_32 per gli orologi meno recenti: uno stub iOS contrassegnato ITSWatchOnlyContainer, caricato con iTMSTransporter."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** è un fonometro per Apple Watch, un'app watchOS autonoma senza controparte iPhone, compilato da un singolo file TypeScript con Perry. Costruirlo ed eseguirlo sullo smartwatch era la parte che ci aspettavamo fosse difficile. La parte che in realtà è costata una giornata è stata inserirlo *nell'App Store*. Ogni percorso di caricamento documentato rifiuta un'app watchOS autonoma e la soluzione alternativa che funziona non è scritta quasi da nessuna parte. Questo post è la pagina mancante.

La versione breve: per rilasciare un'app solo per smartwatch, inseriscila in un iOS *container stub* contrassegnato con `ITSWatchOnlyContainer` e caricala con `iTMSTransporter` — non Xcode, non `altool`. La versione lunga contiene tre mine terrestri, la cui scoperta costa ciascuna un viaggio di andata e ritorno fino ai server Apple.

## L'app

dB Meter è un'app `WKWatchOnly`: funziona da sola sullo smartwatch, non è richiesta alcuna app iPhone associata. Perry compila il TypeScript direttamente in un binario nativo watchOS e lo distribuisce come una porzione **universale** — `arm64` per Series 9/10/11 e Ultras, più `arm64_32` (ILP32: registri a 64 bit, puntatori a 32 bit) per le serie dalla 4 alla 8 e SE. Questa seconda fetta è importante: senza di essa, tutti i dispositivi, dalla Serie 4 all'SE 2, semplicemente non possono installare l'app. Mantenere in vita `arm64_32` risulta essere il vincolo che esclude l'ovvia soluzione alternativa.

## Niente caricherà un'app standalone per smartwatch

Un `.ipa` solo per smartwatch è un bundle la cui app di livello superiore dichiara `CFBundleSupportedPlatforms = [WatchOS]`. Gli strumenti di consegna da riga di comando di Apple non sanno cosa farne:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

Quindi ti rivolgi a Xcode. Ma `xcodebuild -exportArchive` con `method: app-store-connect` fallisce durante l'enumerazione del metodo e il motivo è istruttivo: su Xcode 26 il registro del metodo di distribuzione non ha *nessun App Store opzione* per un archivio watchOS:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

La GUI dell'Organizzatore mostra esattamente gli stessi tre riquadri: Test di rilascio, Enterprise, Debug e "Personalizzato" che non portano a nulla di utile. Ad hoc, impresa, sviluppo. Nessun App Store. Nella versione di Xcode installata oggi, non esiste un modo supportato per inviare un'app standalone per smartwatch a App Store Connect attraverso le porte principali di Apple.

## La trappola del compagno

La soluzione allettante è smettere di utilizzare solo smartwatch. Spedisci una vera app iOS che *incorpora* l'app per smartwatch su `Payload/YourApp.app/Watch/`, nello stesso modo in cui le app per smartwatch sono state fornite per anni. Il caricamento avviene in modo pulito con `altool --type ios`, perché il bundle di livello superiore è una normale app iOS.

Ti mette anche di fronte a due problemi. Innanzitutto, App Store Connect ora vede un'app iPhone e **richiede screenshot di iPhone** e un'app iPhone che non fa altro che dire "apri questo sul tuo smartwatch” è candidato al rifiuto di funzionalità minima 4.2. In secondo luogo, e fatale per noi: un file binario iOS *di livello superiore* potrebbe non contenere una slice `arm64_32`. Il validatore di Apple lo rifiuta:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

Quindi la struttura complementare ti costringe a rimuovere `arm64_32` e passare solo a arm64, il che elimina tutti gli smartwatch Serie 4–8 e SE, inclusa la Serie 7 su cui stavamo testando. La trappola complementare scambia il supporto del tuo vecchio smartwatch con un caricamento che funziona. Non volevamo quello scambio.

## Il contenitore solo per smartwatch

La vera risposta mantiene l'app per smartwatch solo per smartwatch *e* mantiene `arm64_32`. Nidifica l'app per smartwatch all'interno di un piccolo iOS **container stub** e contrassegni lo stub in modo che App Store Connect tratti il ​​tutto come un prodotto solo per smartwatch. Due tasti Info.plist eseguono la segnalazione e rappresentano l'intero trucco:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` dice a App Store Connect "questo pacchetto iOS è solo un veicolo di consegna per l'app per smartwatch al suo interno." Questa singola chiave è ciò che fa sparire il requisito dello screenshot dell'iPhone: il negozio classifica il prodotto solo come smartwatch. `LSApplicationLaunchProhibited=true` dice che lo stub non viene mai avviato, quindi non è necessario che sia un'app reale; deve solo esistere in modo che la piattaforma di primo livello venga letta come iOS e gli strumenti di distribuzione smettano di lamentarsi. L'app per smartwatch all'interno mantiene `WKWatchOnly=true` e *no* `WKCompanionAppBundleIdentifier`: non è un compagno dello stub, lo stub è un wrapper attorno ad esso.

Le chiavi Info.plist rimanenti dello stub sono boilerplate su cui il validatore insiste: `UIDeviceFamily=[1,2]`, tutti e quattro `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]` e, poiché lo stub è arm64, `UIRequiredDeviceCapabilities=[arm64]`. Lo stub non contiene alcuna icona; l'app per smartwatch li trasporta.

Quindi carichi con `iTMSTransporter`, la cui modalità `-assetFile` è felice ora che il pacchetto di livello superiore è iOS:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

La build arriva su App Store Connect come build watchOS, `arm64_32` intatto e la versione smette di richiedere screenshot di iPhone.

## Tre mine in arrivo

Ognuno di questi era un caricamento non riuscito restituito dal validatore di Apple, non qualcosa rilevato dagli strumenti locali:

1.  **Lo stub non può essere un binario appena generato con `swiftc`.** Compilare un semplice stub UIKit con l’SDK iOS dello Xcode installato provoca il rifiuto perché *«creato con un SDK o una versione di Xcode non supportati»* (errore 90534): quell’SDK viene considerato una versione preliminare. Avevamo già un vero binario iOS con una versione dell’SDK accettata: l’output di Perry per `--target ios`. Perry collega il proprio runtime e dichiara una versione pubblicata dell’SDK, superando così la verifica dove `swiftc` falliva. Lo stub è una schermata compilata con Perry che dice «questa è un’app per Apple Watch» e che, grazie a `LSApplicationLaunchProhibited`, non viene mai eseguita.

2.  **Le icone hanno bisogno del dict, non solo della chiave.** L'app per smartwatch non ha superato la convalida con *"manca un valore per CFBundleIconName"* anche se `CFBundleIconName` era impostato e `Assets.car` era presente. Il validatore vuole la struttura completa: `CFBundleIconName` *e* un dizionario `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}`. Imposta solo la chiave di livello superiore e insiste che manca la chiave.

3.  **`WKWatchOnly` è stato rifiutato su un record che già distribuisce build iOS.** Se il tuo record App Store ha mai spedito un iOS, un caricamento solo per smartwatch viene rifiutato e hai bisogno di un nuovo record dell'app (che l'ASC API non può creare - `POST /apps` restituisce 403, quindi lo fai nell'interfaccia utente web). Un record con solo una build *non distribuita* va bene.


Un paio di invarianti più piccole: lo stub e l'app per smartwatch devono condividere lo stesso `CFBundleVersion` e accedi al rovescio (prima l'app per smartwatch, poi lo stub) con `--generate-entitlement-der` e `get-task-allow=false`.

## Perché questa è una storia di Perry

Nessuno dei componenti idraulici del container è specifico di Perry: si applica a qualsiasi app watchOS autonoma, qualunque sia la sua creazione. Ma Perry è il motivo per cui dB Meter è un singolo file TypeScript da 280 righe che viene compilato in un binario nativo dello smartwatch in primo luogo, e Perry è ciò che ha prodotto SDK-clean iOS stub che ha superato l'errore 90534 mentre `swiftc` non poteva. La compilazione per `arm64_32` ha anche fatto emergere un vero bug di codegen lungo il percorso: un campo stringa di oggetto digitato veniva riletto come un float spazzatura su ILP32 perché un accesso in linea al campo di classe veniva inserito nella dimensione dell'intestazione dell'oggetto a 64 bit (24 byte) invece che nel 20 in grado di riconoscere il target. - il genere di cose che trovi solo quando insisti a sostenere gli orologi più vecchi invece di lasciarli cadere silenziosamente.

L'intera pipeline, da TypeScript a una build universale watchOS a un file binario firmato, solo per smartwatch App Store, ora risiede in uno script che possiamo rieseguire. Se stai rilasciando un'app standalone per smartwatch e Xcode ti dice che non è possibile farlo, può: avvolgerlo, contrassegnarlo `ITSWatchOnlyContainer` e consegnarlo a `iTMSTransporter`.
