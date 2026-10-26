---
title: "Introducing Perry"
excerpt: "Perry compiles supported TypeScript to standalone native executables with its runtime and GC linked in, without requiring an external Node.js installation or JavaScript engine."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
We're excited to introduce Perry — a native TypeScript compiler written in Rust that compiles your TypeScript directly to standalone executables. No Node.js runtime, no Electron wrapper, no compromises. Just your code, compiled to a native binary that starts instantly and runs anywhere.

Perry represents a fundamental rethinking of what TypeScript can be. Instead of treating it as a superset of JavaScript that must run through a JS engine, Perry treats TypeScript as a systems language — one that happens to have a syntax millions of developers already know and love.

## Why We Built Perry

TypeScript has become the lingua franca of modern software development. It's the language behind most web frontends, a growing share of backends, and increasingly the choice for tooling, scripting, and automation. But it has always carried a fundamental limitation: it compiles to JavaScript, and JavaScript requires a runtime.

That runtime — whether it's Node.js, Deno, or Bun — comes with trade-offs. Cold start times measured in tens or hundreds of milliseconds. Memory overhead from the JIT compiler and garbage collector. Binary distributions that either bundle the entire runtime or require the user to install one. And for GUI applications, the only option has been Electron, which ships an entire Chromium browser with your app.

We asked: what if TypeScript didn't have to go through JavaScript at all? What if you could compile it directly to native machine code, the same way you compile Rust, Go, or C++?

## How Perry Works

Perry's compilation pipeline has three stages:

1.  **Parsing** — Perry uses SWC (the Rust-based TypeScript/JavaScript parser) to parse your TypeScript source into an AST. SWC is the same parser used by Next.js, and it's extremely fast.
2.  **Type-directed compilation** — Perry walks the AST with full type information. Unlike a JS engine that must handle dynamic types at runtime, Perry knows every type at compile time. This enables monomorphization of generics, static dispatch of method calls, and direct memory layout optimization.
3.  **Code generation** — Perry generates native machine code using Cranelift, the same code generator used by Wasmtime and parts of the Firefox JIT. Cranelift produces efficient native code for x86\_64 and ARM64.

The result is a standalone executable — typically 2–5 MB for a CLI tool — that starts instantly with zero warm-up time.

terminal

$ perry build app.ts

Parsing app.ts...

Compiling (cranelift, arm64)...

Linking...

✓ Built executable: app (2.3 MB)

$ ./app

Hello from native TypeScript!

$ file app

app: Mach-O 64-bit executable arm64

## What TypeScript Features Are Supported

Perry supports a broad and growing subset of TypeScript. The goal is full compatibility with the language as developers actually use it. Today, that includes:

-   **All primitive types** — string, number, boolean, null, undefined, bigint, symbol
-   **Interfaces and type aliases** — including union types, intersection types, and mapped types
-   **Generics** — compiled via monomorphization, so `Array<number>` and `Array<string>` generate distinct optimized code paths
-   **Classes** — with inheritance, private fields (`#field`), static members, getters/setters, and decorators
-   **Async/await and Promises** — compiled to a state machine, similar to how Rust handles async
-   **Generators and iterators** — `function*` and `for...of` loops
-   **Closures** — with proper capture semantics
-   **Destructuring** — arrays, objects, nested patterns, and rest elements
-   **Template literals** — including tagged templates
-   **Modules** — ESM imports/exports resolved at compile time

## Cross-Platform Native UI

Perry isn't limited to CLI tools and server-side applications. It ships with native UI frameworks for six platforms:

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField, and more)
-   **iOS** — UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (same API as iOS, with iPad-specific adaptations)
-   **Android** — JNI + Android Views (Activity, View, Button, RecyclerView)
-   **Linux** — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreateWindowEx, common controls, GDI)

The key insight is that Perry maps a common TypeScript API to each platform's native widget toolkit at compile time. There's no bridge layer, no web view, and no custom rendering engine. Your app uses real platform widgets, rendered by the OS itself. Read more in our deep dive: [Cross-Platform Native UI from TypeScript](/en/blog/cross-platform-native-ui/).

## 27+ Native npm Package Implementations

One of the biggest practical challenges of a new compiler is ecosystem compatibility. Developers don't just write code from scratch — they use packages. Perry addresses this with native implementations of 27+ popular npm packages:

-   **Databases** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** — axios, express, ws (WebSockets)
-   **Security** — bcrypt, jsonwebtoken, crypto
-   **Utilities** — uuid, chalk, dotenv, lodash (partial), moment
-   **System** — fs-extra, glob, chokidar, commander

These aren't thin wrappers around Node.js modules. They're compiled directly into your binary using native system libraries — libpq for PostgreSQL, OpenSSL for crypto, libcurl for HTTP. The API surface matches what you'd expect from the npm package, so migration is straightforward.

## Optional V8 Compatibility Layer

For npm packages that don't have native Perry implementations yet, Perry offers an optional V8 embedding mode. When enabled, Perry bundles a V8 runtime and can execute standard JavaScript npm packages alongside your compiled TypeScript. This is a pragmatic escape hatch that lets you adopt Perry incrementally — compile the hot paths to native code while still accessing the full npm ecosystem for everything else.

## Cross-Compilation

Perry supports cross-compilation out of the box. From your macOS development machine, you can compile for Linux (x86\_64 and ARM64) and iOS. This means you can build your CI/CD pipeline on macOS and produce binaries for all your deployment targets without needing dedicated build machines for each platform.

\# Build for Linux from macOS

$ perry build app.ts --target linux-x86\_64

✓ Built executable: app (3.1 MB)

\# Build for iOS from macOS

$ perry build app.ts --target ios-arm64

✓ Built executable: app (4.8 MB)

## Performance

Perry-compiled binaries are fast. Because there's no JIT warm-up, no interpreter overhead, and no garbage collector pauses, performance is predictable and consistent from the first invocation.

In our benchmarks:

-   **Startup time** — effectively 0 ms (native process launch)
-   **Binary size** — 2–5 MB for typical CLI tools (vs 50+ MB for bundled Node.js)
-   **Memory usage** — 5–10x lower than equivalent Node.js applications
-   **Throughput** — competitive with hand-written C for compute-bound workloads

You can see live benchmarks at [demo.perryts.com](https://demo.perryts.com), which compares Perry-compiled executables against Node.js and Bun in real time.

## Current Status

Perry is in active development. The compiler is stable with 62 out of 62 tests passing across the test suite. All six platform UI backends are functional. The core language features are solid and expanding.

We're actively working on expanding the UI widget library, improving string and object performance, completing full regex support, and building the Stream module. Longer term, we're planning WASM compilation targets, multi-threading, a VS Code extension, and package manager integration.

Check out the full [roadmap](/en/roadmap/) for details on what's shipped, what's in progress, and what's coming next.

## Get Started

Perry is open source. You can clone the repo, build from source, and start compiling TypeScript today:

$ git clone https://github.com/PerryTS/perry.git

$ cd perry

$ cargo build --release

\# Compile your first TypeScript file

$ ./target/release/perry build hello.ts

✓ Built executable: hello (2.1 MB)

$ ./hello

Hello, world!

Browse the source on [GitHub](https://github.com/PerryTS/perry), check out the [showcase](/en/showcase/) to see what's being built with Perry, or jump straight into the code. We can't wait to see what you build.
