---
title: "Plugin Systems Are a Performance Tax"
excerpt: "Plugin architectures trade performance for extensibility. But what if extensibility happened at build time instead of runtime? Compile-time composition gives you both — zero overhead, full flexibility."
date: 2026-02-27
tags: ["architecture", "performance", "compiler"]
---
You install VS Code. It's fast. You add 15 extensions. Now it takes 4 seconds to start and the Extension Host eats 800 MB of RAM. What happened?

The pattern repeats everywhere: WordPress, Eclipse, Chrome, Figma, Slack. The app ships fast. Plugins make it slow. Nobody is surprised anymore — we've accepted it as the cost of extensibility.

But plugin systems are not just a performance problem. They're a design philosophy problem. The industry has confused "extensibility" with "runtime dynamism" when often the better answer is compile-time composition. The only performant plugins are the ones that stop being plugins at compile time.

## The Performance Spectrum of Extensibility

Not all extensibility costs the same. There's a spectrum from zero-cost to maximum-cost, and most of the industry has settled at the expensive end:

1.  **Static linking / compile-time modules** — zero overhead. C libraries, Rust crates, Go packages. The module boundary disappears entirely in the final binary.
2.  **Shared libraries loaded at startup** — near-zero. nginx modules, Linux kernel modules. One-time cost at load, then direct function calls.
3.  **Dynamic dispatch via interfaces / vtables** — small overhead. Game engine plugins in C++. One pointer indirection per call.
4.  **Same-process interpreted plugins** — moderate. WordPress PHP plugins, Eclipse OSGi bundles. Every plugin invocation goes through an interpreter.
5.  **Separate-process plugins over IPC** — significant. VS Code extensions, Chrome extensions. Every interaction crosses a process boundary and serializes data.
6.  **Sandboxed plugins over serialized IPC** — heavy. Figma plugins, browser extension content scripts. Serialization, deserialization, and sandbox enforcement on every call.

The key insight: the only performant plugins are the ones that stop being plugins at compile time. Levels 1 and 2 are fast precisely because the "plugin" becomes indistinguishable from the host code in the final artifact.

## The Real-World Damage

### WordPress

Every plugin hooks into the request lifecycle. 30 plugins means 30 layers of function calls per page load. The result: caching plugins exist solely to mitigate the damage of other plugins. Performance plugins to fix the performance problem that plugins created. The meta-irony writes itself.

### VS Code

Extensions share a single Node.js event loop in a separate process. One misbehaving extension blocks all others. The Extension Host regularly shows up as the top CPU consumer on developer machines. Microsoft has built profiling tools, bisect commands, and activation event systems — an entire infrastructure to manage the problem that extensions create.

### Eclipse

The cautionary tale. OSGi bundle resolution, class loading overhead, massive dependency graphs. Once the most popular IDE, now largely abandoned by mainstream developers. The plugin architecture that was supposed to be its greatest strength became its defining weakness.

### Electron Itself

The plugin problem at the platform level. Every Electron app ships a full Chromium + Node.js runtime. VS Code is Electron. Slack is Electron. Discord is Electron. Each one independently consuming 300–500 MB of RAM to render what is essentially a chat window or a text editor. The "plugin" here is the entire web platform, bundled fresh for every application.

## Why the Industry Keeps Choosing Plugins Anyway

If plugins are so expensive, why does everyone keep building them? The reasons are mostly organizational, not technical:

-   **Developer experience** — plugins are easy to write when you don't care about performance. Ship a JS file, hook into some events, done.
-   **Ecosystem growth** — plugins create network effects and community engagement. A marketplace of 30,000 extensions is a powerful moat.
-   **Organizational convenience** — plugins let teams defer design decisions. "Someone will write a plugin for that" is the architecture equivalent of "we'll fix it in post."
-   **Business model** — plugin marketplaces create revenue and lock-in. The platform captures value from the ecosystem.

The uncomfortable truth: plugins are often a way to avoid making hard architectural decisions about what belongs in the core. They let you ship something incomplete and call it "extensible."

## The Alternative: Compile-Time Composition

What if extensibility happened at build time instead of runtime?

This isn't a hypothetical. There are well-proven precedents across systems languages:

-   **Rust proc macros** — arbitrary code that runs at compile time and generates zero-overhead native code. Serde serialization, Tokio async runtime setup, Axum routing — all resolved before your program starts.
-   **Zig comptime** — compile-time execution that eliminates all runtime branching. Generic data structures are monomorphized, configuration is resolved, dead code is eliminated. What remains is exactly what runs.
-   **C++ templates / constexpr** — compile-time polymorphism with zero runtime cost. The STL achieves extraordinary performance because every generic algorithm specializes at compile time.
-   **Tree-shaking in bundlers** — a partial, imperfect version of this idea applied to JavaScript. Webpack and Rollup eliminate unused exports at build time. The limitation is that they can only remove code, not specialize it.

The pattern is consistent: move decisions from runtime to build time. What you don't include doesn't cost anything. What you do include compiles to native code with no indirection. The module boundary becomes a source-level organization tool, not a runtime performance boundary.

## What This Means for TypeScript

TypeScript is the most popular language for building extensible tools — and the worst at runtime performance. The entire TypeScript ecosystem runs on Node.js, which runs on V8, which JIT-compiles JavaScript. Every layer adds overhead: JIT warmup time, garbage collection pauses, dynamic dispatch for every property access, IPC boundaries between processes.

This is where Perry comes in. Perry compiles TypeScript directly to native binaries. No V8, no JIT warmup, no garbage collection pauses, no IPC boundaries.

When your modules compile to native code, "plugins" become just... modules. They compose at build time. The final binary has zero plugin overhead because there are no plugins — just native code. An Express route handler, a middleware function, a utility library — they all compile down to direct function calls in the same binary. No dynamic loading, no serialization, no process boundaries.

```text
# Your app, your dependencies, your "plugins" — one binary
$ perry compile server.ts -o server
Compiling server.ts + 43 modules...
✓ Built executable: server (1.8 MB, 0.7s)
$ ./server
Listening on port 3000
```

This isn't theoretical. Perry already compiles real-world TypeScript frameworks — Hono, tRPC, Strapi — into native ARM64 binaries under 2 MB, in under a second. The modules that make up those frameworks get compiled, linked, and inlined into a single executable. What would be a plugin architecture with runtime overhead in Node.js becomes zero-cost composition in a Perry binary.

## The Extensibility You Actually Need

The objection is obvious: "But I need runtime extensibility. Users need to install plugins without recompiling."

Do they? For most applications, the set of extensions is known at build time. You choose your Express middleware, your database driver, your auth library, your logging framework — and then you deploy. The "extensibility" is in your `package.json`, resolved at `npm install`, not at runtime.

The applications that genuinely need runtime plugin loading — VS Code, WordPress, browsers — are the exception, not the rule. And even those pay a steep price for it. For everything else, compile-time composition gives you the same flexibility with none of the overhead.

The difference is architectural honesty. Instead of pretending every application needs a plugin system, you ask: does this extensibility need to happen at runtime, or can the compiler do the work?

## The Path Forward

The industry's addiction to plugin architectures is a symptom of accepting runtime overhead as inevitable. It isn't. The compiler can do the work. Build-time composition gives you extensibility without the tax.

We're building Perry because we believe TypeScript developers deserve native performance without giving up the language they love. Your modules should compose at build time, compile to direct function calls, and run without the overhead of a runtime that exists only to make "extensibility" possible.

The fastest plugin system is the one that doesn't exist at runtime.
