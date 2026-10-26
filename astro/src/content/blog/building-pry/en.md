---
title: "Building Pry: A Native JSON Viewer in TypeScript"
excerpt: "A walkthrough of building Pry, a native JSON viewer compiled from TypeScript to machine code with the Perry runtime and GC linked in and no webview."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry is a native JSON viewer built entirely in TypeScript and compiled with Perry. It's not a tech demo — it's a real tool we use every day to inspect API responses, configuration files, and data dumps. This post walks through how it was built, how it compiles, and what the developer experience looks like when your TypeScript compiles to a native app.

## What Pry Does

Pry reads a JSON file (or accepts JSON from stdin) and renders it as an interactive, navigable tree in a native window. If you've used macOS's built-in Quick Look for JSON, imagine that — but faster, searchable, and with keyboard-driven navigation.

The feature set:

-   **Tree view** — collapsible nodes for objects and arrays, with depth indicators and expand/collapse all
-   **Search** — full-text search across keys and values with real-time highlighting and match navigation
-   **Keyboard shortcuts** — arrow keys to navigate, enter to expand/collapse, slash to search, `⌘C` to copy
-   **Clipboard** — copy any node or subtree as formatted JSON
-   **Syntax coloring** — strings in green, numbers in orange, booleans in purple, null in red
-   **Status bar** — shows total node count, current depth, file size, and parse time

## The Source Code

Pry is written in standard TypeScript. There's no special syntax, no macros, no build-time code generation. It uses Perry's UI API, which provides native widgets that compile to platform-specific code.

Here's the entry point (simplified for clarity):

pry.ts

import { App, VStack, TreeView, SearchBar, StatusBar, State }

from "perry/ui";

import { readFile, readStdin } from "perry/fs";

// Read input from file arg or stdin

const input = process.argv\[2\]

? readFile(process.argv\[2\])

: readStdin();

const startTime = Date.now();

const data = JSON.parse(input);

const parseMs = Date.now() - startTime;

// Reactive state

const searchQuery = new State("");

const matchCount = new State(0);

// Build the app

const app = new App("Pry", {

width: 800,

height: 600,

minWidth: 400,

minHeight: 300,

});

app.body(() => {

return VStack({ spacing: 0 }, \[

SearchBar({

placeholder: "Search keys and values...",

onSearch: (q) => searchQuery.value = q,

}),

TreeView(data, {

collapsible: true,

syntaxHighlight: true,

searchQuery: searchQuery,

onMatchCount: (n) => matchCount.value = n,

copyOnClick: true,

}),

StatusBar(\[

\`${countNodes(data)} nodes\`,

\`Parsed in ${parseMs}ms\`,

\`${matchCount.value} matches\`,

\]),

\]);

});

app.registerShortcut("/", () => app.focusSearchBar());

app.registerShortcut("Escape", () => {

searchQuery.value = "";

app.focusTree();

});

app.run();

That's the core of a native application. No framework boilerplate, no build configuration, no platform-specific files. One TypeScript file.

### The Helper Functions

Pry also includes a `countNodes` utility that recursively counts all nodes in the JSON tree, and a `formatBytes` helper for displaying file sizes. These are standard TypeScript functions — nothing Perry-specific about them. They compile to native code just like everything else.

utils.ts

export function countNodes(data: unknown): number {

if (data === null || typeof data !== "object") {

return 1;

}

if (Array.isArray(data)) {

return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);

}

const values = Object.values(data as Record<string, unknown\>);

return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);

}

## Compiling Pry

Compiling Pry with Perry is a single command. No Xcode project, no Gradle configuration, no webpack config. Just point Perry at the entry file and specify your target.

### macOS (ARM64)

$ perry build pry.ts --target macos-arm64

Parsing pry.ts...

Resolving imports: perry/ui, perry/fs

Compiling (cranelift, arm64)...

Linking with AppKit.framework...

✓ Built executable: pry (48 MB)

$ file pry

pry: Mach-O 64-bit executable arm64

$ otool -L pry | head -5

pry:

/System/Library/Frameworks/AppKit.framework/AppKit

/System/Library/Frameworks/Foundation.framework/Foundation

/usr/lib/libSystem.B.dylib

The binary is 48 MB because it includes the full AppKit UI stack — tree view rendering, search highlighting, syntax coloring, and keyboard handling. For comparison, the same app in Electron would be 200+ MB. A CLI-only Perry app compiles to 2–5 MB.

### iOS

$ perry build pry.ts --target ios-arm64

✓ Built executable: pry (52 MB)

The iOS build links against UIKit instead of AppKit. Perry maps the same `TreeView` API to `UITableView` with expandable sections, `SearchBar` to `UISearchBar`, and touch events replace mouse events. The iOS build can be deployed to physical devices and simulators.

### Android

$ perry build pry.ts --target android-arm64

✓ Built: pry.apk

The Android build generates a native library loaded through JNI, packaged into an APK. `TreeView` maps to a `RecyclerView` with expandable view holders, `SearchBar` maps to an `EditText` with a `TextWatcher`, and the status bar maps to a `TextView` at the bottom of the layout.

## What Happens Under the Hood

When Perry compiles Pry, it goes through several phases:

1.  **Parse** — SWC parses the TypeScript source into an AST. Imports from `perry/ui` and `perry/fs` are resolved to Perry's built-in module implementations.
2.  **Type analysis** — Perry resolves all types, including the generic `State<string>` and `State<number>`, monomorphizing them into concrete types.
3.  **Platform resolution** — Based on the target flag, Perry selects the appropriate UI backend. Each `TreeView`, `SearchBar`, and `Button` call is resolved to the platform-specific implementation.
4.  **IR generation** — Perry generates an intermediate representation that includes native API calls — Objective-C message sends for macOS/iOS, JNI calls for Android, C function calls for GTK4/Win32.
5.  **Code generation** — Cranelift compiles the IR to native machine code for the target architecture.
6.  **Linking** — The native code is linked against the platform frameworks (AppKit, UIKit, Android NDK, GTK4, or Win32) to produce the final executable.

## No Runtime, No Web Views

This is worth emphasizing because it's the core difference between Perry and every other TypeScript-to-native approach. The compiled Pry binary has:

-   **No JavaScript engine** — no V8, no Hermes, no JavaScriptCore
-   **No web views** — no Chromium, no WebKit, no WKWebView
-   **No bridge layer** — no serialized messages between JS and native
-   **No framework runtime** — no React, no Flutter engine, no Dart VM

The binary calls platform APIs directly. On macOS, it calls `objc_msgSend` to interact with AppKit objects. On Android, it calls JNI functions to create and manipulate Views. It's the same thing a native Swift or Kotlin app would do.

The practical consequence: Pry launches instantly. There's no VM startup, no JIT warm-up, no script parsing. The process starts, the window appears, the JSON is rendered. Memory usage is a fraction of what an Electron equivalent would consume.

## Developer Experience

Building Pry felt remarkably similar to building any TypeScript application. The workflow is:

1.  Write TypeScript in your editor (VS Code, Zed, Neovim, whatever you prefer)
2.  Run `perry compile pry.ts`
3.  Execute `./pry test.json`
4.  Iterate

No Xcode project to configure. No Android Studio to install. No Gradle build that takes 45 seconds. The Perry compiler itself is fast — parsing and compiling Pry takes a few seconds, and we're actively working on making it faster.

The TypeScript you write is standard TypeScript. Your editor's type checking, autocomplete, and refactoring tools all work. You can extract functions, create modules, use generics — all the TypeScript patterns you already know.

## What We Learned

Building Pry taught us a lot about what the Perry UI API needs to support. Some lessons:

-   **Tree views are complex.** Expanding, collapsing, search highlighting, keyboard navigation, and clipboard integration all need to be coordinated. Perry's `TreeView` widget handles this internally, but we had to ensure the native implementation was consistent across all three platforms.
-   **Keyboard shortcuts need platform conventions.** On macOS, it's `⌘C` to copy. On Linux and Android, it's `Ctrl+C`. Perry's shortcut system abstracts this, but it took careful implementation to get right.
-   **Status bars are surprisingly non-trivial.** Each platform has a different convention for where and how to display status information. AppKit uses the window's bottom bar, UIKit uses a toolbar, Android uses a bottom view in the layout. Perry's `StatusBar` maps to each correctly.
-   **Stdin support required platform awareness.** On macOS and Linux, reading from stdin is straightforward. On iOS and Android, "stdin" doesn't really exist in the same way, so Pry uses file selection instead on mobile platforms. Perry's `readStdin` handles this transparently.

## Performance

Pry handles large JSON files comfortably. In our testing:

-   A 1 MB JSON file (10,000+ nodes) parses and renders in under 50 ms
-   A 10 MB JSON file renders in under 200 ms
-   Search across 10,000 nodes returns results as you type, with no visible lag
-   Memory usage stays under 50 MB even for large files

This is the advantage of native compilation. JSON parsing in Perry is compiled to tight native loops with no GC pauses. Tree rendering uses the platform's own virtualized list views (NSOutlineView, UITableView, RecyclerView), which are battle-tested for performance.

## Source and Downloads

Pry is open source. You can browse the full source, build it yourself, or just look at the code to understand how a Perry native UI app is structured.

-   [GitHub repo](https://github.com/perryts/pry) — full source code and build instructions
-   [Showcase page](/en/showcase/pry/) — screenshots, feature list, and platform details

If you're building something with Perry, we'd love to hear about it. Open an issue on the [Perry repo](https://github.com/PerryTS/perry) or start a discussion. We're building Perry in the open and feedback from real users building real apps is invaluable.
