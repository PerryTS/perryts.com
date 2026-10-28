---
title: "Du compilateur à l'écosystème : React, bases de données et builds cloud"
excerpt: "Perry passe d'un compilateur à un écosystème complet. perry/ui au cœur, des ORMs compatibles Prisma pour MySQL/PostgreSQL/SQLite, des notifications push universelles, des builds distribués avec publication sur l'App Store et une couche de compatibilité React — le tout en une semaine."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Il y a une semaine, Perry était un compilateur avec un toolkit d'interface. Vous pouviez écrire du TypeScript, le compiler en binaire natif et le distribuer sur six plateformes. C'était l'histoire. Aujourd'hui l'histoire est plus grande : Perry devient un écosystème. Trois ORMs de base de données, des notifications push universelles, des compilations distribuées avec publication sur l'App Store et le Play Store, une couche de compatibilité React et une vérification automatisée des apps — tout cela a atterri la semaine dernière.

Cet article couvre ce qui a été livré, pourquoi c'est important et à quoi ressemble le code.

## perry/ui : La fondation

Avant d'aborder les nouvelles bibliothèques, il vaut la peine de souligner ce qui est au centre de tout : `perry/ui`. C'est le toolkit d'interface natif propre à Perry — plus de 20 widgets qui compilent directement en composants natifs de plateforme sur les six cibles. Ce n'est pas un wrapper, pas une couche d'abstraction, pas une vue web. Chaque `Button` devient un `NSButton` sur macOS, un `UIButton` sur iOS, un `GtkButton` sur Linux, un `android.widget.Button` sur Android et un contrôle `CreateWindowEx` sur Windows.

`perry/ui` est la surface d'interface primaire et la plus avancée de Perry. Elle inclut la gestion d'état réactive, les conteneurs de disposition (VStack, HStack, ZStack, SplitView), un Canvas accéléré matériellement, des vues Table avec tri de colonnes, le module `perry/system` pour les dialogues de fichiers, l'accès au trousseau, les notifications et le multi-fenêtres — le tout depuis TypeScript, le tout compilé en appels directs aux APIs de la plateforme. Chaque autre approche d'interface dans Perry, y compris la couche de compatibilité React, est construite sur `perry/ui` et se mappe vers ses widgets.

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

L'objet réactif `State` est la primitive clé. Quand une valeur State change, seuls les widgets liés à cet état se mettent à jour — pas de diffing de DOM virtuel, pas de re-rendus complets de l'arbre, pas de passe de réconciliation. C'est le chemin le plus direct de TypeScript vers l'interface native de plateforme qui existe.

## Compatibilité React : Une couche mince sur perry/ui

Pour les développeurs venant de React, `perry-react` fournit une couche de compatibilité qui mappe le modèle de composants de React vers les widgets `perry/ui`. Vous pouvez utiliser `useState`, `useRef`, `useReducer` et JSX — et Perry les compile vers les mêmes widgets natifs en dessous. C'est un pont de commodité, pas un moteur de rendu séparé.

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

Sous le capot, chaque élément JSX correspond à un widget `perry/ui` : `<div>` devient un VStack, `<button>` devient un Button, `useState` est soutenu par le State réactif de Perry. C'est précoce — Phase 1 avec des re-rendus complets de l'arbre et un stockage global des hooks — mais cela prouve que du code React existant peut cibler des plateformes natives via Perry. Nous explorons également la compatibilité Angular et Ionic sur des lignes similaires.

## Trois ORMs de base de données : API Prisma, performance native

Si vous construisez un serveur ou une app bureau qui communique avec une base de données, Perry vous couvre désormais avec trois ORMs compatibles Prisma : `perry-prisma` (MySQL), `perry-sqlite` (SQLite) et `perry-postgres` (PostgreSQL). Les trois sont des remplacements directs de `@prisma/client`. Même API, mêmes patterns de requêtes, mais compilés en code natif avec FFI direct vers la base de données — pas de moteur Prisma, pas de Node.js.

**database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Même API Prisma — compilée en SQL natif via Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

Sous le capot, chaque ORM est un frontend TypeScript soutenu par une couche FFI Rust utilisant `sqlx`. Le flux de requête : TypeScript sérialise la requête en JSON, la passe à travers la frontière FFI, Rust construit du SQL paramétré, l'exécute via le pool de connexions et sérialise le résultat de retour. Le schéma Prisma est lu au moment de la compilation — zéro parsing à l'exécution.

Les trois implémentations partagent ~95 % de leur code. Les différences sont ce à quoi vous vous attendez : quotation d'identifiants (`` `col` `` vs `"col"`), syntaxe des placeholders (`?` vs `$1, $2`) et sémantique des transactions. Les trois supportent toute la surface CRUD Prisma : findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — plus le SQL brut, les transactions et plus de 10 opérateurs de filtre WHERE.

## perry-push : Notifications push universelles

`perry-push` est une bibliothèque unique qui gère les notifications push sur toutes les plateformes : APNs (iOS/macOS), FCM (Android), Web Push (navigateurs) et WNS (Windows). Chaque fournisseur est un module FFI Rust avec exactement trois fonctions : `*_provider_new`, `*_provider_close` et `*_send`.

**notify.ts**

```typescript
import { ApnProvider } from 'perry-push/apn';
import { FcmProvider } from 'perry-push/fcm';
const apn = new ApnProvider({ teamId, keyId, key });
const fcm = new FcmProvider({ serviceAccount });
// Type de résultat unifié pour tous les fournisseurs
const result = await apn.send({
  deviceToken: token,
  title: "New message",
  body: "You have a new reply",
});
```

La cryptographie est gérée par `ring` — ES256 JWTs pour APNs et VAPID, RS256 pour les comptes de service FCM, AES-GCM pour le chiffrement de payload Web Push. Le tout compilé en code natif. Pas de `node-gyp`, pas de dépendance OpenSSL.

## Perry Hub + Builders : Compilations cloud distribuées

C'est le volet infrastructure. `perry-hub` est un serveur d'orchestration de compilations — lui-même compilé depuis TypeScript par Perry — qui gère un pool de workers de compilation. Vous poussez votre projet, le hub le dispatche au bon worker en fonction de la plateforme cible, et le worker compile, signe et publie optionnellement votre app.

Deux workers existent aujourd'hui : un builder macOS (gère les cibles macOS, iOS et Android) et un builder Linux (gère Linux et Android). Les deux sont des binaires Rust qui se connectent au hub via WebSocket, téléchargent les archives source, exécutent le compilateur Perry et téléversent les artefacts en retour.

-   **Signature de code** — notarisation Apple pour macOS, profils de provisionnement pour iOS, signature keystore Android
-   **Publication App Store** — téléversement direct vers App Store Connect et Google Play Store
-   **Gestion des artefacts** — binaires compilés téléversés vers le hub avec nettoyage basé sur le TTL
-   **Gestion des licences** — limites de débit par licence, file d'attente prioritaire (le niveau pro obtient la priorité)

Le hub lui-même est une étude de cas fascinante. C'est un fichier TypeScript d'environ 1 500 lignes compilé en un binaire natif de 2 Mo par Perry. Il exécute Fastify sur le port 3456 pour HTTP et `ws` sur le port 3457 pour WebSocket. Tout l'état est en mémoire avec persistance JSON — pas de base de données externe. C'est le type de serveur que vous pouvez déployer avec `scp` et un fichier d'unité systemd.

## perry-verify : Vérification automatisée des apps

`perry-verify` est un service HTTP autonome qui prend un binaire compilé et une configuration, exécute un pipeline de vérification et retourne des résultats structurés réussi/échoué avec des captures d'écran. Il lance l'app, exécute des flux d'authentification (déterministes ou assistés par IA), vérifie l'état et capture les preuves.

Des adaptateurs de plateforme existent pour macOS (via les APIs d'accessibilité), Linux (AT-SPI) et des stubs pour iOS Simulator et Android Emulator. La couche IA utilise Claude pour l'authentification de repli et la vérification d'état quand les vérifications déterministes ne sont pas possibles. Il est conçu pour s'insérer dans le pipeline de compilation du hub comme étape post-compilation : compiler, signer, vérifier, publier.

## Pry est partout

[Pry](/fr/blog/building-pry/), le visualiseur JSON natif que nous avons construit comme vitrine de Perry, est désormais sur cinq plateformes. Il est sur le [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) et [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry), avec des binaires natifs pour Linux et Windows. La même base de code TypeScript, cinq points d'entrée spécifiques à la plateforme, cinq binaires natifs. C'est la preuve la plus concrète que toute cette approche fonctionne de bout en bout — du code source TypeScript à la fiche App Store.

## Ce que tout cela signifie

Un compilateur est intéressant. Un écosystème est utile. La semaine dernière, Perry est passé de "vous pouvez compiler TypeScript en natif" à "vous pouvez construire une app complète avec une interface native, une base de données Prisma, des notifications push et des compilations qui publient automatiquement sur l'App Store."

Les pièces commencent à se connecter :

-   **perry/ui** est le chemin le plus direct de TypeScript vers l'interface native de plateforme — état réactif, plus de 20 widgets, zéro couche d'abstraction
-   **perry-prisma/sqlite/postgres** signifie que le code de base de données existant se porte avec des changements minimaux
-   **perry-push** signifie des notifications push natives sans bibliothèques par plateforme
-   **perry-hub + builders** signifie que vous pouvez passer de `perry publish` à l'App Store en une étape
-   **perry-verify** signifie des tests automatisés de la sortie compilée, pas seulement du code source
-   **perry-react** signifie que les développeurs React peuvent adopter Perry avec des patterns familiers, le tout mappé vers perry/ui en dessous

Ce n'est pas théorique. Chaque bibliothèque listée ici a du code fonctionnel, des tests et de la documentation. Plusieurs sont déjà utilisées en production — le site de Perry lui-même tourne sur un serveur Fastify compilé par Perry, et Pry est en ligne sur deux magasins d'apps.

## Et ensuite

La feuille de route immédiate :

-   **Extension de perry/ui** — glisser-déposer, labels d'accessibilité, menus contextuels personnalisés, plus de primitives de disposition
-   **Intégration de perry-verify** — vérification automatisée dans le pipeline de compilation
-   **Compatibilité de frameworks** — amélioration des couches React, Angular et Ionic comme rampes d'accès vers perry/ui
-   **Support complet des regex** — moteur regex compatible ECMAScript compilé en natif

Suivez la progression sur [GitHub](https://github.com/PerryTS/perry), ou consultez la [feuille de route](/fr/roadmap/) pour le tableau complet.
