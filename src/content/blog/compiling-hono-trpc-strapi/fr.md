---
title: "Compiler Hono, tRPC et Strapi en binaires natifs"
excerpt: "Perry compile désormais trois frameworks TypeScript majeurs — Hono, tRPC et Strapi — en exécutables ARM64 natifs. Ils se compilent en moins d'une seconde, produisent des binaires de moins de 2 Mo et fonctionnent sans plantage."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry compile désormais trois frameworks TypeScript majeurs — Hono, tRPC et Strapi — en exécutables natifs ARM64. Ils compilent en moins d'une seconde, produisent des binaires de moins de 2 Mo et s'exécutent sans crash.

Cet article couvre ce qui fonctionne, ce qui ne fonctionne pas encore et ce que nous avons appris en poussant le compilateur contre du code réel.

## Les projets

Nous avons choisi ces trois parce qu'ils représentent différentes formes de TypeScript :

-   **Hono** — Un framework web léger (29 modules). Usage intensif de génériques, héritage de classes, assignation dynamique de méthodes et des APIs web `Request`/`Response`. Sa structure d'export utilise des ré-exports nommés à travers des fichiers barrel.
-   **tRPC** — Un framework RPC typé (52 modules). Chaînes de ré-export profondes sur 4+ niveaux, pattern builder avec rétrécissement de type générique, instanciation de classes au niveau module et streaming via Web Streams.
-   **Strapi** — Un cœur de CMS headless (4 modules compilés nativement, le reste résolu comme externe). Monorepo avec résolution de packages workspace, ré-exports de namespace (`export * as X`), pattern de conteneur de services avec `Map` et fonctions factory.

## Résultats de compilation

Les trois compilent en binaires natifs avec zéro erreur de compilation :

| Projet | Modules compilés | Taille du binaire | Temps de compilation |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 Mo | 0.59s |
| tRPC | 52 | 1.8 Mo | 0.97s |
| Strapi | 4 | 1.9 Mo | 0.80s |

Chaque module source passe par le pipeline complet : analyse SWC, abaissement HIR, codegen Cranelift, émission de fichier objet et liaison native. Les temps de compilation incluent tout — de l'analyse à la liaison finale.

Pour contexte, `tsc --noEmit` seul sur tRPC prend plusieurs secondes. Perry compile 52 modules en un binaire natif lié en moins d'une.

## Ce qui fonctionne à l'exécution

### Instanciation de classes inter-modules

C'était le grand jalon. La structure d'export de Hono ressemble à :

hono export chain

// hono/src/hono.ts

export class Hono extends HonoBase { ... }

// hono/src/index.ts

import { Hono } from './hono'

export { Hono }

Cet `export { Hono }` est un ré-export nommé — pas `export * from` ni `export { Hono } from './hono'`. Dans la HIR de Perry, cela devient `Export::Named`. Auparavant, la propagation de classes du compilateur ne suivait que les chaînes `ExportAll` et `ReExport`. Désormais Perry trace `Export::Named` à travers les imports du module pour trouver la définition de classe originale et la propager.

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

### Résolution de ré-export multi-niveaux

Le `initTRPC` de tRPC vit à 4 niveaux de profondeur :

initTRPC.ts (export const initTRPC = ...)

\-> unstable-core-do-not-import.ts (export \* from './initTRPC')

\-> @trpc/server/index.ts (export { initTRPC } from '../../..')

\-> index.ts (export \* from './@trpc/server')

C'est `ExportAll` → `Named` → `ExportAll`. Perry résout la chaîne complète.

### Filtrage des exports type-only

Perry vérifie désormais le flag `type_only` de SWC sur les déclarations `ExportNamed` et `is_type_only` sur les spécificateurs individuels, les sautant lors de l'abaissement HIR. Cela a éliminé la génération de stubs morts à partir des ré-exports de types dans les trois projets.

## Ce qui ne fonctionne pas encore

Nous sommes précis ici car les lacunes en disent autant que les succès.

### Assignation dynamique de propriétés sur `this`

Perry ne supporte pas encore `this[variable] = value`, donc les méthodes HTTP de Hono comme `app.get`, `app.post` ne sont pas disponibles. C'est la plus grande lacune pour Hono.

### Appels de constructeur au niveau module

`export const initTRPC = new TRPCBuilder()` n'exécute pas le constructeur à l'exécution, donc `initTRPC.create()` est `undefined`.

### Propriétés héritées

`TRPCError extends Error`, et bien que `err.code` fonctionne, `err.message` (hérité de `Error`) n'est pas accessible. La chaîne de prototypes pour la recherche de propriétés n'est pas entièrement implémentée.

### Classes built-in de l'API Web

| Classe | Nombre |
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

`Response`, `Request` et `Headers` sont les éléments critiques pour tout framework HTTP. Ceux-ci ont besoin d'un support codegen built-in similaire à ce que nous avons déjà pour `Map`, `Set`, `RegExp`, `Buffer`, `AbortController` et autres.

## Ce que cela nous apprend

La bonne nouvelle : le pipeline de compilation de Perry gère du vrai code de framework. Les lacunes sont des lacunes d'exécution, pas de compilation. Le travail restant est :

1.  **Assignation dynamique de propriétés** — nécessaire pour les frameworks qui configurent des méthodes programmatiquement
2.  **Expressions d'initialisation au niveau module** — `export const x = new Foo()` doit réellement exécuter le constructeur
3.  **Chaîne de prototypes** — propriétés et méthodes héritées
4.  **Built-ins de l'API Web** — `Response`, `Request`, `Headers` pour les frameworks HTTP

Ce sont des problèmes concrets et bien délimités. Aucun ne nécessite de changements architecturaux — ce sont des extensions de patterns qui fonctionnent déjà pour des cas plus simples.

Nous continuerons à travailler dessus. L'objectif est que `new Hono().get('/', (c) => c.text('hello'))` produise un serveur HTTP fonctionnel dans un binaire natif.
