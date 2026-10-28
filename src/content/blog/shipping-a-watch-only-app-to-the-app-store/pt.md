---
title: "Publicar uma app exclusiva do Apple Watch na App Store quando todos os outros métodos falham"
excerpt: "Todos os métodos documentados para enviar uma app watchOS autónoma para a App Store falham: altool, iTMSTransporter, xcodebuild e até o Organizer do Xcode 26 rejeitam a plataforma. Esta solução não documentada funciona e preserva arm64_32 para relógios mais antigos: um stub iOS marcado como ITSWatchOnlyContainer, enviado com iTMSTransporter."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
O **dB Meter** é um medidor de nível de som para o Apple Watch, um aplicativo watchOS independente, sem iPhone, compilado a partir de um único arquivo TypeScript com Perry. Fazer com que ele fosse construído e executado no smartwatch era a parte que esperávamos que fosse difícil. A parte que realmente custou um dia foi colocá-lo *na App Store*. Cada caminho de upload documentado recusa um aplicativo watchOS independente, e a solução alternativa que funciona não é escrita em quase lugar nenhum. Esta postagem é aquela página que faltava.

A versão resumida: para lançar um aplicativo somente para smartwatch, você o envolve em um iOS *container stub* sinalizado como `ITSWatchOnlyContainer` e carrega-o com `iTMSTransporter` — não Xcode, não `altool`. A versão longa tem três minas terrestres que custam uma viagem de ida e volta aos servidores da Apple para serem descobertas.

## O aplicativo

O dB Meter é um aplicativo `WKWatchOnly`: ele roda sozinho no smartwatch, não é necessário nenhum aplicativo iPhone emparelhado. Perry compila o TypeScript diretamente em um binário watchOS e o distribui como uma fatia **universal** — `arm64` para as séries 9/10/11 e Ultras, mais `arm64_32` (ILP32: registros de 64 bits, ponteiros de 32 bits) para as séries 4 a 8 e SE. Essa segunda fatia é importante: sem ela, tudo, desde o Series 4 até o SE 2, simplesmente não consegue instalar o aplicativo. Manter `arm64_32` vivo acaba sendo a restrição que exclui a solução alternativa óbvia.

## Nada carregará um aplicativo smartwatch independente

Um `.ipa` exclusivo para smartwatch é um pacote cujo aplicativo de nível superior declara `CFBundleSupportedPlatforms = [WatchOS]`. As ferramentas de entrega de linha de comando da Apple não sabem o que fazer com isso:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

Então você recorre ao Xcode. Mas `xcodebuild -exportArchive` com `method: app-store-connect` falha durante a enumeração do método, e o motivo é instrutivo - no Xcode 26 o registro do método de distribuição não tem *nenhum App Store* para um arquivo watchOS:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

A GUI do Organizer mostra exatamente os mesmos três blocos: Teste de Liberação, Empresarial, Depuração e um “Personalizado” que não leva a nada útil. Ad hoc, empresa, desenvolvimento. Não há App Store. Na versão do Xcode instalada hoje, não há nenhuma maneira compatível de enviar um aplicativo smartwatch independente para o App Store Connect pelas portas da própria Apple.

## A armadilha complementar

A saída de escape tentadora é deixar de ser apenas smartwatch. Envie um aplicativo iOS real que *incorpore* o aplicativo smartwatch em `Payload/YourApp.app/Watch/`, da mesma forma que os aplicativos smartwatch foram entregues durante anos. Isso carrega de forma limpa com `altool --type ios`, porque o pacote de nível superior é um aplicativo iOS normal.

Isso também leva você a dois problemas. Primeiro, o App Store Connect agora vê um aplicativo para iPhone e **exige capturas de tela do iPhone** — e um aplicativo para iPhone que não faz nada além de dizer “abra isto no seu smartwatch” é um candidato para uma rejeição de funcionalidade mínima de 4,2. Em segundo lugar, e fatalmente para nós: um binário iOS *nível superior* não pode conter uma fatia `arm64_32`. O validador da Apple rejeita:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

Portanto, a estrutura complementar força você a retirar o `arm64_32` e usar apenas o arm64, que descarta todos os smartwatches Série 4–8 e SE — incluindo o Série 7 que estávamos testando. A armadilha complementar troca o suporte do seu smartwatch antigo por um upload que funciona. Não queríamos essa troca.

## O contêiner somente para smartwatch

A verdadeira resposta mantém o aplicativo smartwatch apenas para smartwatch *e* mantém `arm64_32`. Você aninha o aplicativo smartwatch dentro de um pequeno iOS **stub de contêiner** e sinaliza o stub para que o App Store Connect trate tudo como um produto exclusivo para smartwatch. Duas chaves Info.plist fazem a sinalização e são o truque completo:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` informa ao App Store Connect “este pacote iOS é apenas um veículo de entrega para o aplicativo smartwatch dentro dele." Essa única chave é o que faz com que o requisito de captura de tela do iPhone desapareça – a loja classifica o produto como somente smartwatch. `LSApplicationLaunchProhibited=true` diz que o stub nunca é iniciado, portanto não precisa ser um aplicativo real; ela só precisa existir para que a plataforma de nível superior seja lida como iOS e as ferramentas de entrega parem de reclamar. O aplicativo smartwatch interno mantém `WKWatchOnly=true` e *no* `WKCompanionAppBundleIdentifier` — não é um complemento do stub, o stub é um invólucro em torno dele.

As chaves Info.plist restantes do stub são clichês que o validador insiste em: `UIDeviceFamily=[1,2]`, todos os quatro `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]`, e — como o stub é arm64 — `UIRequiredDeviceCapabilities=[arm64]`. O stub não contém nenhum ícone; o aplicativo smartwatch os carrega.

Então você faz upload com o `iTMSTransporter`, cujo modo `-assetFile` está satisfeito agora que o pacote de nível superior é iOS:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

A versão chega ao App Store Connect como uma versão watchOS, `arm64_32` intacta, e a versão para de solicitar o iPhone capturas de tela.

## Três minas terrestres a caminho

Cada um deles foi uma falha no upload que voltou do validador da Apple, e não algo que a ferramenta local detectou:

1.  **O stub não pode ser um novo stub `swiftc`.** Compilando um stub trivial do UIKit com o Xcode do iOS SDK é rejeitado como *“construído com um SDK ou versão de Xcode que não é compatível”* (erro 90534) — isso O SDK do Xcode é tratado como pré-lançamento. Já tínhamos um binário SDK-limpo iOS disponível: a saída `--target ios` do próprio Perry. Perry vincula seu próprio tempo de execução e carimba uma versão de lançamento do SDK, então ele navegou por onde `swiftc` não o fez. O stub é uma tela compilada por Perry “esta é uma tela do aplicativo Apple Watch que, graças ao `LSApplicationLaunchProhibited`, nunca é realmente executada.

2.  **Os ícones precisam do dict, não apenas da chave.** O aplicativo smartwatch falhou na validação com *“um valor para CFBundleIconName está faltando”* mesmo que `CFBundleIconName` tenha sido definido e `Assets.car` estava presente. O validador deseja a estrutura completa: `CFBundleIconName` *e* um dicionário `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}`. Defina apenas a chave de nível superior e ele insistirá que a chave está faltando.

3.  **`WKWatchOnly` é rejeitado em um registro que já distribui compilações da iOS.** Se o seu registro da App Store já enviou um iOS, um upload somente para smartwatch é recusado e você precisa de um novo registro de aplicativo (que a API do ASC não pode criar — `POST /apps` retorna 403, então você faz isso na UI da web). Um registro com apenas uma compilação *não distribuída* é adequado.


Algumas invariantes menores: o stub e o aplicativo smartwatch devem compartilhar a mesma `CFBundleVersion`, e você assina de dentro para fora — primeiro o aplicativo smartwatch, depois o stub — com `--generate-entitlement-der` e `get-task-allow=false`.

## Por que esta é uma história de Perry

Nenhum encanamento do contêiner é específico do Perry — ele se aplica a qualquer aplicativo watchOS independente, independentemente do que o tenha construído. Mas Perry é o motivo pelo qual o dB Meter é um único arquivo TypeScript de 280 linhas que compila para um binário nativo do smartwatch em primeiro lugar, e Perry foi o que produziu o stub SDK-clean iOS que superou o erro 90534 quando `swiftc` não conseguiu. A compilação para `arm64_32` também eliminou um bug real do codegen ao longo do caminho - um campo de string de objeto digitado estava sendo lido como um lixo flutuante em ILP32 porque um acesso de campo de classe embutido foi incorporado no tamanho do cabeçalho do objeto de 64 bits (24 bytes) em vez do reconhecimento de alvo 20 – o tipo de coisa que você só encontra quando insiste em apoiar os relógios mais antigos em vez de descartá-los silenciosamente.

Todo o pipeline — TypeScript para um binário universal watchOS até uma versão assinada da App Store exclusiva para smartwatch - agora reside em um script que podemos executar novamente. Se você estiver lançando um aplicativo smartwatch independente e o Xcode estiver dizendo que isso não pode ser feito, ele pode: embrulhar, sinalizar `ITSWatchOnlyContainer` e entregá-lo ao `iTMSTransporter`.
