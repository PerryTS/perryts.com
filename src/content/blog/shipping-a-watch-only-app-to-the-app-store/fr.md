---
title: "Publier une app exclusivement Apple Watch sur l’App Store quand toutes les autres méthodes échouent"
excerpt: "Toutes les méthodes documentées pour envoyer une app watchOS autonome sur l’App Store échouent : altool, iTMSTransporter, xcodebuild et même l’Organizer de Xcode 26 refusent cette plateforme. Voici un contournement non documenté qui fonctionne et conserve arm64_32 pour les anciennes montres : un stub iOS marqué ITSWatchOnlyContainer, envoyé avec iTMSTransporter."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** est un sonomètre pour Apple Watch : une application watchOS autonome sans iPhone, compilé à partir d'un seul fichier TypeScript avec Perry. Le construire et le faire fonctionner sur la montre intelligente était la partie à laquelle nous nous attendions, ce qui serait difficile. La partie qui coûtait en réalité une journée consistait à l'introduire *dans l'App Store*. Chaque chemin de envoi documenté refuse une application watchOS autonome, et la solution de contournement qui fonctionne n'est écrite presque nulle part. Ce message est cette page manquante.

La version courte : pour publier une application réservée aux montres intelligentes, vous l'enveloppez dans un iOS *stub de conteneur* marqué `ITSWatchOnlyContainer` et vous la téléchargez avec `iTMSTransporter` — pas Xcode, pas `altool`. La version longue contient trois mines terrestres qui coûtent chacune un aller-retour vers les serveurs d'Apple pour être découvertes.

## L'application

dB Meter est une application `WKWatchOnly` : elle fonctionne seule sur la montre intelligente, aucune application iPhone couplée n'est requise. Perry compile le TypeScript directement en un binaire natif watchOS et le distribue sous forme de tranche **universelle** — `arm64` pour les séries 9/10/11 et les Ultras, plus `arm64_32` (ILP32 : registres 64 bits, pointeurs 32 bits) pour les séries 4 à 8 et le SE. Cette deuxième tranche est importante : sans elle, tout, de la série 4 au SE 2, ne peut tout simplement pas installer l'application. Garder `arm64_32` en vie s'avère être la contrainte qui exclut la solution de contournement évidente.

## Rien ne permettra de téléverser une application de montre intelligente autonome

Une montre intelligente uniquement `.ipa` est un ensemble dont l'application de niveau supérieur déclare `CFBundleSupportedPlatforms = [WatchOS]`. Les outils de livraison en ligne de commande d'Apple ne savent pas quoi faire avec cela :

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

Vous vous tournez donc vers Xcode. Mais `xcodebuild -exportArchive` avec `method: app-store-connect` échoue lors de l'énumération de la méthode, et la raison est instructive - sur Xcode 26, le registre des méthodes de distribution n'a *aucun App Store du tout* pour une archive watchOS :

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

L'interface graphique de l'Organisateur affiche exactement les mêmes trois vignettes : Test de version, Entreprise, Débogage et "Personnalisé" qui ne mène à rien d'utile. Ad hoc, entreprise, développement. Pas d'App Store. Sur la version de Xcode installée aujourd'hui, il n'existe aucun moyen pris en charge pour pousser une application de montre intelligente autonome vers App Store Connect via les portes d'entrée d'Apple.

## Le piège du compagnon

La solution tentante est de cesser de se limiter aux montres intelligentes. Expédiez une véritable application iOS qui *intègre* l'application pour montre intelligente dans `Payload/YourApp.app/Watch/`, comme les applications pour montre intelligente ont été fournies pendant des années. Cela se télécharge proprement avec `altool --type ios`, car le bundle de niveau supérieur est une application iOS normale.

Cela vous pose également deux problèmes. Tout d'abord, App Store Connect voit désormais une application iPhone et **demande des iPhone** - ainsi qu'une application iPhone qui ne fait rien. mais dire « ouvrez ceci sur votre montre intelligente » est candidat à un rejet de fonctionnalité minimale de 4,2. Deuxièmement, et fatalement pour nous : un binaire iOS *de premier niveau* ne peut pas contenir de tranche `arm64_32`. Le validateur d'Apple le rejette :

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

La structure complémentaire vous oblige donc à supprimer `arm64_32` et à utiliser arm64 uniquement, ce qui supprime toutes les montres intelligentes des séries 4 à 8 et SE, y compris la série 7 sur laquelle nous testions. Le piège compagnon échange la prise en charge de votre ancienne montre intelligente contre un envoi qui fonctionne. Nous ne voulions pas de cet échange.

## Le conteneur réservé aux montres intelligentes

La vraie réponse maintient l'application smartwatch uniquement pour la montre intelligente *et* conserve `arm64_32`. Vous imbriquez l'application de montre intelligente dans un minuscule iOS **stub de conteneur**, et vous marquez le stub afin que App Store Connect traite le tout comme un produit réservé à la montre intelligente. Deux clés Info.plist effectuent le signalement, et elles constituent toute l'astuce :

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` indique à App Store Connect "ce pack iOS n'est qu'un moyen de livraison pour l'application de montre intelligente qu'il contient. Cette clé unique est ce qui fait disparaître l'exigence de capture d'écran pour iPhone : le magasin classe le produit comme étant uniquement une montre intelligente. `LSApplicationLaunchProhibited=true` indique que le stub n'est jamais lancé, il n'est donc pas nécessaire qu'il s'agisse d'une véritable application ; il a juste besoin d'exister pour que la plate-forme de niveau supérieur se lise comme iOS et que les outils de livraison cessent de se plaindre. L'application de montre intelligente à l'intérieur conserve `WKWatchOnly=true` et *no* `WKCompanionAppBundleIdentifier` — ce n'est pas un compagnon du stub, le stub est un wrapper autour de lui.

Les clés Info.plist restantes du stub sont des passe-partout sur lesquels le validateur insiste : `UIDeviceFamily=[1,2]`, les quatre `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]`, et — parce que le stub est arm64 — `UIRequiredDeviceCapabilities=[arm64]`. Le talon ne contient aucune icône ; l'application smartwatch les transporte.

Ensuite, vous téléchargez avec `iTMSTransporter`, dont le mode `-assetFile` est satisfait maintenant que le bundle de niveau supérieur est iOS :

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

La version arrive sur App Store Connect en tant que version watchOS, `arm64_32` intacte, et la version cesse de demander l'iPhone captures d'écran.

## Trois mines terrestres en route

Chacun de ces éléments était un échec de envoi renvoyé par le validateur d'Apple, et non un problème détecté par les outils locaux :

1.  **Le stub ne peut pas être un binaire fraîchement produit par `swiftc`.** Compiler un simple stub UIKit avec le SDK iOS du Xcode installé entraîne un rejet pour *« compilation avec un SDK ou une version de Xcode non pris en charge »* (erreur 90534) : ce SDK est considéré comme une préversion. Nous avions déjà un véritable binaire iOS portant une version de SDK acceptée : la sortie de Perry pour `--target ios`. Perry lie son propre runtime et inscrit une version publiée du SDK ; il a donc passé la validation là où `swiftc` échouait. Le stub est un écran compilé par Perry indiquant « ceci est une app Apple Watch » qui, grâce à `LSApplicationLaunchProhibited`, ne s’exécute jamais.

2.  **Les icônes ont besoin du dict, pas seulement de la clé.** L'application de montre intelligente a échoué à la validation avec *« une valeur pour CFBundleIconName est manquante »* même si `CFBundleIconName` a été défini et `Assets.car` était présent. Le validateur veut la structure complète : `CFBundleIconName` *et* un dictionnaire `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}`. Définissez uniquement la clé de niveau supérieur et cela insiste sur le fait que la clé est manquante.

3.  **`WKWatchOnly` est rejeté sur un enregistrement qui distribue déjà des builds iOS.** Si votre enregistrement App Store a déjà expédié un iOS, un envoi sur montre intelligente uniquement est refusé et vous avez besoin d'un nouvel enregistrement d'application (que l'ASC API ne peut pas créer - `POST /apps` renvoie 403, vous le créez donc dans l'interface utilisateur Web). Un enregistrement avec uniquement une version *non distribuée* convient.


Quelques invariants plus petits : le stub et l'application pour montre intelligente doivent partager le même `CFBundleVersion`, et vous vous connectez à l'envers (l'application pour montre intelligente d'abord, puis le stub) avec `--generate-entitlement-der` et `get-task-allow=false`.

## Pourquoi c'est une histoire de Perry

Aucun élément de plomberie du conteneur n'est Perry ; il s'applique à toute application watchOS autonome, quelle que soit sa construction. Mais Perry est la raison pour laquelle dB Meter est un seul fichier TypeScript qui se compile en premier lieu en binaire natif de montre intelligente, et Perry est ce qui a produit le stub SDK-clean iOS qui a dépassé l'erreur 90534 alors que `swiftc` ne le pouvait pas. La compilation pour `arm64_32` a également éliminé un véritable bug de codegen en cours de route : un champ de chaîne d'objet typé était lu comme un garbage float sur ILP32 car un accès au champ de classe en ligne était intégré à la taille d'en-tête d'objet de 64 bits (24 octets) au lieu de 20 en fonction de la cible. — le genre de chose que l'on ne trouve que lorsque l'on insiste pour soutenir les montres plus anciennes au lieu de les laisser tomber tranquillement.

L'ensemble du pipeline - TypeScript vers une version binaire universelle watchOS vers une version App Store signée et réservée aux montres intelligentes - se trouve désormais dans un script que nous pouvons réexécuter. Si vous publiez une application de montre intelligente autonome et que Xcode vous dit que cela ne peut pas être fait, il peut : l'envelopper, la signaler `ITSWatchOnlyContainer` et la remettre à `iTMSTransporter`.
