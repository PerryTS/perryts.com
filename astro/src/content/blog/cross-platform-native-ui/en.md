---
title: "Cross-Platform Native UI from TypeScript"
excerpt: "How Perry maps one TypeScript codebase to platform widgets across its documented targets, including the platform-specific limitations and prerequisites."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
One of Perry's most ambitious goals is delivering truly native GUI applications from a single TypeScript codebase. Not web views wrapped in a native shell. Not a custom rendering engine drawing its own pixels. Real native widgets, rendered by each platform's own UI framework, compiled from TypeScript at build time.

This post explains how it works — the architecture, the platform mapping, the trade-offs, and where we are today.

## The Problem with Current Approaches

Cross-platform GUI development has been a hard problem for decades. Every major framework has made a different set of compromises:

### Electron / Tauri (Web-based)

Electron bundles Chromium and Node.js, giving you a web browser as your app shell. You get full access to the web platform, but your "native" app is a 150+ MB download that uses hundreds of megabytes of RAM just to show a window. Tauri replaces Chromium with the OS web view, reducing size dramatically, but your UI is still HTML/CSS rendered in a web view — not native widgets.

### React Native (Bridge-based)

React Native runs your JavaScript in a JS engine (Hermes or V8) and bridges to native widgets through a serialized message queue. You get real native widgets, but the bridge adds latency, especially for gestures and animations. Complex interactions require dropping down to native code (Swift/Kotlin), defeating the single-codebase promise.

### Flutter (Custom renderer)

Flutter compiles Dart to native code and draws everything with its own Skia-based rendering engine. Performance is excellent, but your widgets aren't native — they're pixel-perfect replicas. This means platform conventions (scroll physics, text selection, accessibility behaviors) have to be reimplemented rather than inherited. And on desktop, the differences become more noticeable.

### KMP + Compose Multiplatform (Partial native)

Kotlin Multiplatform compiles to JVM on Android and native on iOS, but shared UI through Compose Multiplatform uses a custom Skia-based renderer — same trade-off as Flutter. For truly native UI, you're back to writing platform-specific code.

## Perry's Approach: Compile to Native Toolkits

Perry takes a fundamentally different approach. Instead of running your code in a runtime and bridging to native widgets, or drawing custom pixels, Perry compiles your TypeScript UI code directly into calls to each platform's native toolkit at build time.

The key difference: **there is no runtime layer between your code and the platform SDK.** The compiled binary calls AppKit, UIKit, Android Views, GTK4, or Win32 directly, exactly like an app written in Swift, Kotlin, or C++ would.

## The Unified UI API

Perry provides a common TypeScript API for building user interfaces. This API is deliberately high-level — you describe what your UI should contain and how it should behave, and Perry maps it to the appropriate native constructs.

counter.ts

import { App, Text, Button, VStack, State } from "perry/ui";

const count = new State(0);

const app = new App("Counter", { width: 400, height: 300 });

app.body(() => {

return VStack({ spacing: 16, alignment: "center" }, \[

Text(\`Count: ${count.value}\`, { fontSize: 32 }),

Button("Increment", () => count.value++),

Button("Reset", () => count.value = 0),

\]);

});

app.run();

This same code compiles to native UI on all six platforms. No `#ifdef`, no platform checks, no conditional imports.

## Platform Mapping in Detail

Here's how Perry maps the unified API to each platform's native framework:

### macOS — AppKit

On macOS, Perry generates code that creates and manages AppKit objects directly. An `App` becomes an `NSApplication` with an `NSWindow`. `Text` becomes `NSTextField` (with editing disabled). `Button` becomes `NSButton` with a target-action pattern wired to your callback. `VStack` becomes an `NSStackView` with vertical orientation. Layout uses Auto Layout constraints.

The compiled binary links against the AppKit framework and calls Objective-C runtime functions directly. It's the same thing Xcode-compiled Swift would do.

### iOS & iPadOS — UIKit

On iOS, the mapping is similar but targets UIKit. `App` becomes a `UIApplication` with a `UIWindow` and root `UIViewController`. `Text` maps to `UILabel`. `Button` maps to `UIButton`. Layout uses `UIStackView` and Auto Layout. Touch events are handled through UIKit's responder chain.

### Android — JNI + Views

On Android, Perry generates a native library loaded via JNI (Java Native Interface). `App` maps to an `Activity`. `Text` becomes a `TextView`. `Button` becomes an `android.widget.Button` with an `OnClickListener`. `VStack` maps to a vertical `LinearLayout`. The native code calls back into the Android framework through JNI, creating and manipulating real Android views.

### Linux — GTK4

On Linux, Perry targets GTK4. `App` becomes a `GtkApplication` with a `GtkApplicationWindow`. `Text` maps to `GtkLabel`. `Button` maps to `GtkButton` with a signal handler. `VStack` maps to a `GtkBox` with vertical orientation. GTK's CSS theming means your app automatically follows the user's desktop theme.

### Windows — Win32

On Windows, Perry generates Win32 API calls. `App` creates a window class, registers it, and runs a message loop. `Button` becomes a `BUTTON` control created with `CreateWindowEx`. `Text` maps to a `STATIC` control. Events are handled through the Win32 message pump (`WM_COMMAND`, `WM_NOTIFY`, etc.).

## State Management

Perry's `State<T>` primitive provides reactive state management that compiles to platform-native update mechanisms. When a state value changes, Perry triggers a UI update through the platform's own invalidation system — `setNeedsDisplay` on macOS/iOS, `invalidate()` on Android, `gtk_widget_queue_draw` on Linux.

There's no virtual DOM diffing, no reconciliation pass, no serialization. State changes propagate directly to the native widget that displays the value.

## Why Not SwiftUI / Jetpack Compose Syntax?

You might wonder why Perry doesn't use a declarative syntax similar to SwiftUI or Jetpack Compose. The answer is pragmatic: Perry compiles TypeScript, and TypeScript has its own idioms. Rather than inventing a DSL that looks foreign to TypeScript developers, Perry uses a builder-style API that feels natural in TypeScript — constructors, method calls, callbacks, and closures. It's the same patterns you already use when working with Express, React hooks, or any other TypeScript library.

## What's Available Today

All six platform backends are implemented and stable. The current widget set includes:

-   **Layout** — VStack, HStack, Spacer, ScrollView, Divider
-   **Display** — Text, Image
-   **Input** — Button, TextField, Toggle, Slider
-   **Navigation** — NavigationView, TabView, List
-   **Containers** — TreeView, SearchBar, StatusBar
-   **State** — State<T> for reactive updates

## What's Coming

We're actively expanding the widget library. Next up:

-   `SecureField` — password input with platform-native secure text entry
-   `ProgressView` — determinate and indeterminate progress indicators
-   `Alert` — native alert dialogs with buttons and text fields
-   `DatePicker` — platform-native date/time selection
-   `Menu` — native menu bars and context menus

The goal is full GUI framework parity across all platforms — every widget, layout, gesture, and animation available everywhere. See the [roadmap](/en/roadmap/) for the complete picture.

## Try It

The best way to understand Perry's native UI is to see it in action. [Pry](/en/showcase/pry/) is a native JSON viewer built entirely in TypeScript with Perry — a real app with tree navigation, search, and keyboard shortcuts, compiled to native binaries on macOS, iOS, and Android. Read the [full walkthrough](/en/blog/building-pry/) of how it was built.
