---
title: "Publicar una app exclusiva de Apple Watch en el App Store cuando todo lo demás falla"
excerpt: "Todas las vías documentadas para subir una app independiente de watchOS al App Store fallan: altool, iTMSTransporter, xcodebuild e incluso Organizer de Xcode 26 rechazan la plataforma. Esta solución no documentada funciona y conserva arm64_32 para relojes antiguos: un stub de iOS marcado como ITSWatchOnlyContainer y enviado con iTMSTransporter."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** es un sonómetro para Apple Watch: una aplicación watchOS independiente sin iPhone homólogo, compilado a partir de un único archivo TypeScript con Perry. Lograr que se compilara y ejecutara en el reloj inteligente era la parte que esperábamos que fuera difícil. La parte que realmente costó un día fue llevarlo *al App Store*. Cada ruta de carga documentada rechaza una aplicación watchOS independiente, y la solución alternativa que funciona no está escrita en casi ninguna parte. Esta publicación es esa página que falta.

La versión corta: para lanzar una aplicación exclusiva para reloj inteligente, debe envolverla en un iOS *contenedor stub* marcado como `ITSWatchOnlyContainer` y cargarlo con `iTMSTransporter`, no Xcode, no `altool`. La versión larga tiene tres minas terrestres, cada una de las cuales cuesta un viaje de ida y vuelta a los servidores de Apple para descubrirlas.

## La aplicación

dB Meter es una aplicación `WKWatchOnly`: se ejecuta en el reloj inteligente por sí sola, no se requiere una aplicación iPhone emparejada. Perry compila el binario TypeScript directamente en un binario nativo watchOS y lo distribuye como un segmento **universal**: `arm64` para las Series 9/10/11 y Ultras, más `arm64_32` (ILP32: registros de 64 bits, punteros de 32 bits) para las Series 4 a 8 y SE. Ese segundo segmento es importante: sin él, todos, desde el Serie 4 hasta el SE 2, simplemente no pueden instalar la aplicación. Mantener vivo `arm64_32` resulta ser la restricción que descarta la solución obvia.

## No se cargará nada en una aplicación de reloj inteligente independiente

Un `.ipa` exclusivo para relojes inteligentes es un paquete cuya aplicación de nivel superior declara `CFBundleSupportedPlatforms = [WatchOS]`. Las herramientas de entrega de línea de comandos de Apple no saben qué hacer con eso:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

Así que recurres a Xcode. Pero `xcodebuild -exportArchive` con `method: app-store-connect` falla durante la enumeración de métodos, y el motivo es instructivo: en Xcode 26, el registro del método de distribución no tiene *no App Store* para un archivo watchOS:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

La GUI del Organizador muestra exactamente los mismos tres mosaicos: Prueba de lanzamiento, Empresa, Depuración y "Personalizado" que no lleva a ninguna parte útil. Ad hoc, empresa, desarrollo. No hay App Store. En la versión de Xcode instalada hoy, no existe una forma compatible de enviar una aplicación de reloj inteligente independiente a App Store Connect a través de las puertas de entrada de Apple.

## La trampa del compañero

La tentadora salida de escape es dejar de ser un reloj inteligente únicamente. Envíe una aplicación iOS real que *integre* la aplicación de reloj inteligente en `Payload/YourApp.app/Watch/`, la forma en que se entregaron las aplicaciones de reloj inteligente durante años. Eso se carga limpiamente con `altool --type ios`, porque el paquete de nivel superior es una aplicación iOS normal.

También te lleva a dos problemas. En primer lugar, App Store Connect ahora ve una aplicación iPhone y **exige iPhone capturas de pantalla** y un iPhone La aplicación que no hace más que decir "abre esto en tu reloj inteligente" es candidata para un rechazo de funcionalidad mínima 4.2. En segundo lugar, y fatalmente para nosotros: un binario iOS *nivel superior* puede no contener una porción `arm64_32`. El validador de Apple lo rechaza:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

Entonces, la estructura complementaria te obliga a eliminar `arm64_32` y usar solo arm64, lo que descarta todos los relojes inteligentes Series 4–8 y SE, incluido el Series 7 en el que estábamos probando. La trampa complementaria cambia el soporte de su reloj inteligente más antiguo por una carga que funciona. No queríamos ese intercambio.

## El contenedor exclusivo para relojes inteligentes

La respuesta real mantiene la aplicación de reloj inteligente solo para relojes inteligentes *y* mantiene `arm64_32`. Anida la aplicación de reloj inteligente dentro de un pequeño iOS **stub contenedor** y marca el stub para que App Store Connect trate todo como un producto exclusivo de reloj inteligente. Dos claves de Info.plist marcan y son el truco completo:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` le dice a App Store Connect "este paquete iOS es solo un vehículo de entrega para la aplicación de reloj inteligente que contiene". Esa única clave es lo que hace que desaparezca el requisito de captura de pantalla del iPhone: la tienda clasifica el producto como solo reloj inteligente. `LSApplicationLaunchProhibited=true` dice que el código auxiliar nunca se inicia, por lo que no es necesario que sea una aplicación real; solo necesita existir para que la plataforma de nivel superior se lea como iOS y las herramientas de entrega dejen de quejarse. La aplicación de reloj inteligente interna mantiene `WKWatchOnly=true` y *no* `WKCompanionAppBundleIdentifier`; no es un complemento del código auxiliar, el código auxiliar es un envoltorio que lo envuelve.

Las claves Info.plist restantes del código auxiliar son repetitivas en las que el validador insiste: `UIDeviceFamily=[1,2]`, las cuatro `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]` y, debido a que el código auxiliar es arm64, `UIRequiredDeviceCapabilities=[arm64]`. El talón no lleva ningún ícono; la aplicación del reloj inteligente los lleva.

Luego, subes con `iTMSTransporter`, cuyo modo `-assetFile` está contento ahora que el paquete de nivel superior es iOS:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

La compilación aterriza en App Store Connect como una compilación watchOS, `arm64_32` intacta y la versión deja de solicitar iPhone capturas de pantalla.

## Tres minas terrestres en camino

Cada uno de estos fue una carga fallida que regresó del validador de Apple, no algo que las herramientas locales detectaron:

1.  **El stub no puede ser un binario recién generado con `swiftc`.** Compilar un stub trivial de UIKit con el SDK de iOS del Xcode instalado provoca el rechazo *«creado con un SDK o una versión de Xcode no compatible»* (error 90534): ese SDK se considera una versión preliminar. Ya teníamos un binario iOS real con una versión de SDK aceptada: la propia salida de Perry para `--target ios`. Perry enlaza su runtime e indica una versión publicada del SDK, así que pasó la validación donde `swiftc` no pudo. El stub es una pantalla compilada con Perry que dice «esta es una app de Apple Watch» y que, gracias a `LSApplicationLaunchProhibited`, nunca llega a ejecutarse.

2.  **Los íconos necesitan el dictado, no solo la clave.** La aplicación de reloj inteligente falló en la validación con *“falta un valor para CFBundleIconName”* a pesar de que se configuró `CFBundleIconName` y `Assets.car` estaba presente. El validador quiere la estructura completa: `CFBundleIconName` *y* un diccionario `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}`. Configure solo la clave de nivel superior e insiste en que falta la clave.

3.  **`WKWatchOnly` se rechaza en un registro que ya distribuye compilaciones de iOS.** si su registro App Store alguna vez envió un iOS, se rechaza una carga solo para reloj inteligente y necesita un nuevo registro de aplicación (que el ASC API no puede crear; `POST /apps` devuelve 403, por lo que se crea en la interfaz de usuario web). Un registro con solo una compilación *no distribuida* está bien.


Un par de invariantes más pequeñas: el código auxiliar y la aplicación de reloj inteligente deben compartir la misma `CFBundleVersion`, y usted inicia sesión de adentro hacia afuera (primero la aplicación de reloj inteligente, luego el código auxiliar) con `--generate-entitlement-der` y `get-task-allow=false`.

## Por qué esta es una historia de Perry

Ninguno de los componentes del contenedor es específico de Perry: se aplica a cualquier aplicación watchOS independiente, independientemente de lo que la haya creado. Pero Perry es la razón por la que dB Meter es un único archivo TypeScript de 280 líneas que se compila en un binario nativo de reloj inteligente en primer lugar, y Perry es lo que produjo el código auxiliar SDK-clean iOS que superó el error 90534 cuando `swiftc` no pudo. La compilación para `arm64_32` también eliminó un error real de codegen en el camino: un campo de cadena de objeto escrito se leía como un flotador de basura en ILP32 debido a un acceso de campo de clase en línea creado en el tamaño de encabezado de objeto de 64 bits (24 bytes) en lugar de 20 para el objetivo. — el tipo de cosas que sólo encuentras cuando insistes en apoyar los relojes más antiguos en lugar de abandonarlos silenciosamente.

Todo el proceso (desde TypeScript hasta un binario universal watchOS y una compilación App Store firmada y exclusiva para relojes inteligentes) ahora reside en un script que podemos volver a ejecutar. Si está lanzando una aplicación de reloj inteligente independiente y Xcode le dice que no se puede hacer, puede: empaquetarla, marcarla como `ITSWatchOnlyContainer` y entregársela a `iTMSTransporter`.
