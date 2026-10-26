---
title: "Từ trình biên dịch đến hệ sinh thái: React, cơ sở dữ liệu và build trên đám mây"
excerpt: "Perry phát triển từ trình biên dịch thành hệ sinh thái hoàn chỉnh. perry/ui làm cốt lõi, ORM tương thích Prisma cho MySQL/PostgreSQL/SQLite, thông báo đẩy toàn cầu, build phân tán kèm xuất bản App Store và lớp tương thích React — tất cả trong một tuần."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Một tuần trước, Perry là một trình biên dịch với bộ công cụ UI. Bạn có thể viết TypeScript, biên dịch nó thành binary native, và phân phối trên sáu nền tảng. Đó là câu chuyện. Hôm nay câu chuyện lớn hơn: Perry đang trở thành một hệ sinh thái. Ba ORM cơ sở dữ liệu, push notification đa nền tảng, build phân tán với xuất bản App Store và Play Store, lớp tương thích React, và xác minh ứng dụng tự động — tất cả đã ra mắt trong tuần qua.

This post covers what shipped, why it matters, and what the code looks like.

## perry/ui: Nền tảng

Before getting into the new libraries, it's worth emphasizing what sits at the center of everything: `perry/ui`. This is Perry's own native UI toolkit — 20+ widgets that compile directly to platform-native components on all six targets. It's not a wrapper, not an abstraction layer, not a web view. Every `Button` becomes an `NSButton` on macOS, a `UIButton` on iOS, a `GtkButton` on Linux, an `android.widget.Button` on Android, and a `CreateWindowEx` control on Windows.

`perry/ui` is Perry's primary and most advanced UI surface. It includes reactive state management, layout containers (VStack, HStack, ZStack, SplitView), a hardware-accelerated Canvas, Table views with column sorting, the `perry/system` module for file dialogs, keychain access, notifications, and multi-window — all from TypeScript, all compiled to direct platform API calls. Every other UI approach in Perry, including the React compatibility layer, is built on top of `perry/ui` and maps back to its widgets.

app.ts

import { Window, VStack, Button, Text, State } from 'perry/ui';

const count = new State(0);

const window = new Window({ title: "Counter" });

window.setContent(

new VStack({ children: \[

new Text({ text: count }),

new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),

\] })

);

The reactive `State` object is the key primitive. When a State value changes, only the widgets bound to that state update — no virtual DOM diffing, no full-tree re-renders, no reconciliation pass. It's the most direct path from TypeScript to native platform UI that exists.

## Tương thích React: Một lớp mỏng trên perry/ui

For developers coming from React, `perry-react` provides a compatibility layer that maps React's component model to `perry/ui` widgets. You can use `useState`, `useRef`, `useReducer`, and JSX — and Perry compiles it to the same native widgets underneath. It's a convenience bridge, not a separate rendering engine.

counter.tsx

import React, { useState } from 'react';

function Counter() {

const \[count, setCount\] = useState(0);

return (

<div\>

<h1\>{count}</h1\>

<button onClick\={() => setCount(count + 1)}\>+1</button\>

</div\>

);

}

Under the hood, every JSX element maps to a `perry/ui` widget: `<div>` becomes a VStack, `<button>` becomes a Button, `useState` is backed by Perry's reactive State. It's early — Phase 1 with full-tree re-renders and global hook storage — but it proves that existing React code can target native platforms through Perry. We're also exploring Angular and Ionic compatibility along similar lines.

## Ba ORM Cơ sở dữ liệu: API Prisma, Hiệu năng Native

If you're building a server or a desktop app that talks to a database, Perry now has you covered with three Prisma-compatible ORMs: `perry-prisma` (MySQL), `perry-sqlite` (SQLite), and `perry-postgres` (PostgreSQL). All three are drop-in replacements for `@prisma/client`. Same API, same query patterns, but compiled to native code with direct database FFI — no Prisma engine, no Node.js.

database.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Same Prisma API — compiled to native SQL via Rust FFI

const users = await prisma.user.findMany({

where: { email: { contains: "@perry.dev" } },

orderBy: { createdAt: "desc" },

take: 10,

});

await prisma.post.create({

data: { title: "Hello", authorId: users\[0\].id },

});

Under the hood, each ORM is a TypeScript front-end backed by a Rust FFI layer using `sqlx`. The query flow: TypeScript serializes the query to JSON, passes it across the FFI boundary, Rust builds parameterized SQL, executes it via the connection pool, and serializes the result back. The Prisma schema is read at build time — zero runtime parsing.

The three implementations share ~95% of their code. The differences are what you'd expect: identifier quoting (`` `col` `` vs `"col"`), placeholder syntax ( `?` vs `$1, $2`), and transaction semantics. All three support the full Prisma CRUD surface: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — plus raw SQL, transactions, and 10+ WHERE filter operators.

## perry-push: Push Notification đa nền tảng

`perry-push` is a single library that handles push notifications across every platform: APNs (iOS/macOS), FCM (Android), Web Push (browsers), and WNS (Windows). Each provider is a Rust FFI module with exactly three functions: `*_provider_new`, `*_provider_close`, and `*_send`.

notify.ts

import { ApnProvider } from 'perry-push/apn';

import { FcmProvider } from 'perry-push/fcm';

const apn = new ApnProvider({ teamId, keyId, key });

const fcm = new FcmProvider({ serviceAccount });

// Unified result type for all providers

const result = await apn.send({

deviceToken: token,

title: "New message",

body: "You have a new reply",

});

Cryptography is handled by `ring` — ES256 JWTs for APNs and VAPID, RS256 for FCM service accounts, AES-GCM for Web Push payload encryption. All compiled to native code. No `node-gyp`, no OpenSSL dependency.

## Perry Hub + Builder: Build đám mây phân tán

This is the infrastructure play. `perry-hub` is a build orchestration server — itself compiled from TypeScript by Perry — that manages a pool of build workers. You push your project, the hub dispatches it to the right worker based on target platform, and the worker compiles, signs, and optionally publishes your app.

Two workers exist today: a macOS builder (handles macOS, iOS, and Android targets) and a Linux builder (handles Linux and Android). Both are Rust binaries that connect to the hub over WebSocket, download source tarballs, run the Perry compiler, and upload artifacts back.

-   **Code signing** — Apple notarization for macOS, provisioning profiles for iOS, Android keystore signing
-   **App Store publishing** — direct upload to App Store Connect and Google Play Store
-   **Artifact management** — built binaries uploaded to the hub with TTL-based cleanup
-   **License management** — per-license rate limits, priority queuing (pro tier gets priority)

The hub itself is a fascinating case study. It's a ~1,500-line TypeScript file compiled to a 2 MB native binary by Perry. It runs Fastify on port 3456 for HTTP and `ws` on port 3457 for WebSocket. All state is in-memory with JSON persistence — no external database. It's the kind of server you can deploy with `scp` and a systemd unit file.

## perry-verify: Xác minh ứng dụng tự động

`perry-verify` is a standalone HTTP service that takes a compiled binary and a configuration, runs a verification pipeline, and returns structured pass/fail results with screenshots. It launches the app, runs authentication flows (deterministic or AI-assisted), checks state, and captures evidence.

Platform adapters exist for macOS (via accessibility APIs), Linux (AT-SPI), and stubs for iOS Simulator and Android Emulator. The AI layer uses Claude for fallback authentication and state verification when deterministic checks aren't possible. It's designed to slot into the hub's build pipeline as a post-build step: compile, sign, verify, publish.

## Pry ra mắt khắp nơi

[Pry](/vi/blog/building-pry/), the native JSON viewer we built as a Perry showcase, now ships on five platforms. It's on the [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) and [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry), with native binaries for Linux and Windows. Same TypeScript codebase, five platform-specific entry points, five native binaries. It's the most concrete proof that this whole approach works end to end — from TypeScript source to App Store listing.

## Tất cả điều này có ý nghĩa gì

A compiler is interesting. An ecosystem is useful. In the last week, Perry went from "you can compile TypeScript to native" to "you can build a full app with native UI, a Prisma database, push notifications, and builds that auto-publish to the App Store."

The pieces are starting to connect:

-   **perry/ui** is the most direct path from TypeScript to native platform UI — reactive state, 20+ widgets, zero abstraction layers
-   **perry-prisma/sqlite/postgres** means existing database code ports with minimal changes
-   **perry-push** means native push notifications without per-platform libraries
-   **perry-hub + builders** means you can go from `perry publish` to App Store in one step
-   **perry-verify** means automated testing of the compiled output, not just the source
-   **perry-react** means React developers can ease into Perry using familiar patterns, all mapping to perry/ui underneath

These aren't theoretical. Every library listed here has working code, tests, and documentation. Several are already used in production — the Perry landing site itself runs on a Perry-compiled Fastify server, and Pry is live in two app stores.

## Tiếp theo là gì

The immediate roadmap:

-   **perry/ui expansion** — drag and drop, accessibility labels, custom context menus, more layout primitives
-   **perry-verify integration** — automated verification in the build pipeline
-   **Framework compatibility** — improving React, Angular, and Ionic layers as on-ramps to perry/ui
-   **Full regex support** — ECMAScript-compatible regex engine compiled to native

Follow the progress on [GitHub](https://github.com/PerryTS/perry), or check the [roadmap](/vi/roadmap/) for the full picture.
