---
title: "Compiling Hono, tRPC, and Strapi to Native Binaries"
excerpt: "Perry now compiles three major TypeScript frameworks — Hono, tRPC, and Strapi — into native ARM64 executables. They compile in under a second, produce binaries under 2 MB, and run without crashes."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry now compiles three major TypeScript frameworks — Hono, tRPC, and Strapi — into native ARM64 executables. They compile in under a second, produce binaries under 2 MB, and run without crashes.

This post covers what works, what doesn't yet, and what we learned pushing the compiler against real-world code.

## The Projects

We picked these three because they represent different shapes of TypeScript:

-   **Hono** — A lightweight web framework (29 modules). Heavy use of generics, class inheritance, dynamic method assignment, and the `Request`/`Response` Web APIs. Its export structure uses named re-exports through barrel files.
-   **tRPC** — A type-safe RPC framework (52 modules). Deep re-export chains across 4+ levels, builder pattern with generic type narrowing, class instantiation at module scope, and streaming via Web Streams.
-   **Strapi** — A headless CMS core (4 modules compiled natively, rest resolved as external). Monorepo with workspace package resolution, namespace re-exports (`export * as X`), service container pattern with `Map`, and factory functions.

## Compilation Results

All three compile to native binaries with zero compilation errors:

| Project | Modules Compiled | Binary Size | Compile Time |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

Every source module goes through the full pipeline: SWC parse, HIR lowering, Cranelift codegen, object file emission, and native linking. The compile times include all of it — parsing through final link.

For context, `tsc --noEmit` on tRPC alone takes several seconds. Perry compiles 52 modules to a linked native binary in under one.

## What Works at Runtime

### Cross-Module Class Instantiation

This was the big milestone. Hono's export structure looks like this:

**hono export chain**

```
// hono/src/hono.ts
export class Hono extends HonoBase { ... }
// hono/src/index.ts
import { Hono } from './hono'
export { Hono }
```

That `export { Hono }` is a named re-export — not `export * from` or `export { Hono } from './hono'`. In Perry's HIR, this becomes `Export::Named`, not `Export::ReExport` or `Export::ExportAll`. Previously, the compiler's class propagation only followed `ExportAll` and `ReExport` chains, so importing `Hono` from `index.ts` silently failed — the class lookup missed, and `new Hono()` returned `undefined`.

Now Perry traces `Export::Named` back through the module's imports to find the original class definition and propagates it. The result:

```
$ ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono
[1] Class instantiation through named re-export chain
PASS: new Hono() returned a real object
[2] Constructor-initialized fields
PASS: app.router initialized by constructor
PASS: app.router.name = SmartRouter
[5] Multiple instances
PASS: second instance created with router
[6] Constructor with options
PASS: new Hono({ strict: false }) accepted options
```

The Hono constructor runs, initializes a `SmartRouter` (which internally creates both a `RegExpRouter` and a `TrieRouter`), and returns a real object. Multiple independent instances work. Constructor options are accepted.

### Multi-Level Re-Export Resolution

tRPC's `initTRPC` lives 4 levels deep:

```
initTRPC.ts                          (export const initTRPC = ...)
-> unstable-core-do-not-import.ts  (export * from './initTRPC')
-> @trpc/server/index.ts           (export { initTRPC } from '../../..')
-> index.ts                        (export * from './@trpc/server')
```

That's `ExportAll` → `Named` → `ExportAll`. Perry resolves the full chain — `initTRPC` is accessible in the compiled binary. Same for `TRPCError`, which follows the same path.

### Cross-Module Class Instantiation with Arguments

```
const err = new TRPCError({ code: 'NOT_FOUND', message: 'resource missing' })
// PASS: new TRPCError() returned object
// PASS: err.code = NOT_FOUND
```

`TRPCError` is defined in one module, re-exported through three intermediate barrel files, imported in the test, and instantiated with an options object. The instance's `code` field is accessible.

### Package Resolution in Monorepos

Strapi uses workspace packages — `@strapi/core` is a sibling package in the monorepo, not an npm dependency. Perry resolves the bare specifier through `package.json` exports fields:

```
"exports": {
".": { "source": "./src/index.ts", "import": "./dist/index.mjs" }
}
```

The `createStrapi` function resolves correctly as a callable function through `export * from '@strapi/core'`.

### Type-Only Export Filtering

TypeScript's `export type { Foo }` syntax has no runtime meaning — but previously Perry lowered these into real `Export::ReExport` entries that propagated through the linker and generated stub symbols. Hono's `index.ts` alone has four `export type` declarations covering dozens of types.

Perry now checks SWC's `type_only` flag on `ExportNamed` declarations and `is_type_only` on individual specifiers, skipping them during HIR lowering. This eliminated dead stub generation from type re-exports across all three projects.

### RegExp Constructor

`new RegExp(pattern, flags)` now compiles to Perry's existing `js_regexp_new` runtime function. This was straightforward — the runtime already supported RegExp — but the `Expr::New` codegen handler had no case for it, so every `new RegExp(...)` fell through to an "Unknown class" warning. Hono's `RegExpRouter` uses this extensively.

## What Doesn't Work Yet

We're being specific here because the gaps tell you as much as the wins.

### Dynamic Property Assignment on `this`

Hono's constructor sets up HTTP method handlers dynamically:

```
const allMethods = ['get', 'post', 'put', 'delete', ...]
allMethods.forEach((method) => {
this[method] = (args1, ...args) => {
// register route
return this
}
})
```

This means `app.get`, `app.post`, etc. are not statically declared — they're assigned at runtime via computed property names. Perry doesn't support `this[variable] = value` yet, so these methods are missing:

```
[4] Dynamic method assignment (this[method] = ...)
INFO: app.get not available
INFO: app.on not available
```

This is the single biggest gap for Hono. The Hono class exists, its router is initialized, but you can't register routes.

### Module-Level Constructor Calls

tRPC defines its entry point as:

```
export const initTRPC = new TRPCBuilder()
```

At runtime, `initTRPC` shows up as `typeof function` rather than `typeof object` — the module-level `new TRPCBuilder()` expression isn't executing the constructor, so what you get is a reference to the class rather than an instance. This means `initTRPC.create()` and `initTRPC.context()` are both `undefined`.

### Inherited Properties

`TRPCError extends Error`, and while `err.code` (defined directly on `TRPCError`) works, `err.message` (inherited from `Error`) is not accessible. The prototype chain for property lookup isn't fully implemented.

### Complex Constructor Chains

Strapi's `createStrapi()` function internally calls `new Strapi(opts)`, which extends `Container` (backed by `Map`), calls `loadConfiguration()`, iterates over providers, and registers services. This deep constructor chain produces a falsy return value — it doesn't crash, but it doesn't produce a usable instance either.

### Web API Built-In Classes

These are the remaining "Unknown class" warnings across the three projects:

| Class | Count |
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

`Response`, `Request`, and `Headers` are the critical ones for any HTTP framework. These need built-in codegen support similar to what we already have for `Map`, `Set`, `RegExp`, `Buffer`, `AbortController`, and others.

## What This Tells Us

The good news: Perry's compilation pipeline handles real framework code. Multi-file projects with complex re-export chains, generics-heavy type signatures, class hierarchies, and monorepo package resolution all make it through to linked binaries.

The gaps are runtime gaps, not compilation gaps. The remaining work is:

1.  **Dynamic property assignment** — needed for frameworks that set up methods programmatically
2.  **Module-level init expressions** — `export const x = new Foo()` needs to actually execute the constructor
3.  **Prototype chain** — inherited properties and methods
4.  **Web API built-ins** — `Response`, `Request`, `Headers` for HTTP frameworks

These are concrete, well-scoped problems. None of them require architectural changes — they're extensions of patterns that already work for simpler cases.

We'll keep pushing on these. The goal is `new Hono().get('/', (c) => c.text('hello'))` producing a working HTTP server in a native binary.
