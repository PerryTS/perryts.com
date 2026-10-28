---
title: "从编译器到生态系统：React、数据库和云构建"
excerpt: "Perry 从编译器成长为完整的生态系统。perry/ui 作为核心，兼容 Prisma 的 MySQL/PostgreSQL/SQLite ORM，通用推送通知，带 App Store 发布的分布式构建，以及 React 兼容层——全部在一周内完成。"
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
一周前，Perry 还是一个带有 UI 工具包的编译器。你可以编写 TypeScript，将其编译 为原生二进制文件，并在六个平台上发布。这就是全部。今天故事更大了：Perry 正在成为一个生态系统。三个数据库 ORM、通用推送通知、 带有 App Store 和 Play Store 发布的分布式构建、React 兼容层， 以及自动化应用验证 —— 全部在上周发布。

这篇文章介绍了发布的内容、其重要性以及代码的样子。

## perry/ui：基础

在了解新库之前，有必要强调一下一切的核心内容：`perry/ui`。这是 Perry 自己的本机 UI 工具包 — 20 多个小部件，可在所有六个目标上直接编译为平台本机组件。它不是包装器，不是抽象层，也不是 Web 视图。每个 `Button` 在 macOS 上成为 `NSButton`，在 iOS 上成为 `UIButton`，在 `GtkButton`、Android 上的 `android.widget.Button` 以及 Windows 上的 `CreateWindowEx` 控件。

`perry/ui` 是 Perry 的主要且最高级的 UI 界面。它包括反应式状态管理、布局容器（VStack、HStack、ZStack、SplitView）、硬件加速的Canvas、带有列排序的 Table 视图、用于文件对话框、钥匙串访问、通知和多窗口的 `perry/system` 模块 — 全部来自 TypeScript，全部编译为直接平台 API 调用。 Perry 中的所有其他 UI 方法（包括 React 兼容层）都构建在 `perry/ui` 之上，并映射回其小部件。

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

反应式 `State` 对象是关键原语。当 State 值更改时，只有绑定到该状态的小部件会更新 - 没有虚拟 DOM 比较，没有全树重新渲染，没有协调过程。这是从 TypeScript 到现有原生平台 UI 的最直接路径。

## React 兼容：perry/ui 上的薄层

对于来自 React 的开发人员，`perry-react` 提供了一个兼容性层，将 React 的组件模型映射到 `perry/ui` 小部件。您可以使用 `useState`、`useRef`、`useReducer` 和 JSX — 并且 Perry 将其编译为下面相同的本机小部件。它是一个便利的桥梁，而不是一个单独的渲染引擎。

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

在底层，每个 JSX 元素都映射到一个 `perry/ui` 组件：`<div>` 对应 VStack，`<button>` 对应 Button，`useState` 由 Perry 的响应式 State 支持。这还处于早期阶段——第 1 阶段采用整棵树重新渲染和全局 hook 存储——但已经证明，现有 React 代码可以通过 Perry 面向原生平台。我们也在沿着类似方向探索 Angular 和 Ionic 兼容性。

## 三个数据库 ORM：Prisma API，原生性能

如果您正在构建与数据库交互的服务器或桌面应用，Perry 现在可以为您提供三种与 Prisma 兼容的 ORM：`perry-prisma` (MySQL)、`perry-sqlite` (SQLite) 和 `perry-postgres` (PostgreSQL)。这三个都是 `@prisma/client` 的直接替代品。相同的 API，相同的查询模式，但使用直接数据库 FFI 编译为本机代码 — 没有 Prisma 引擎，没有 Node.js。

**database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Same Prisma API — compiled to native SQL via Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

在底层，每个 ORM 都是一个 TypeScript 前端，由使用 `sqlx` 的 Rust FFI 层支持。查询流程： TypeScript 将查询序列化为 JSON，将其跨过 FFI 边界传递，Rust 构建参数化 SQL，通过连接池执行它，并序列化结果返回。 Prisma 架构在构建时读取 - 零运行时解析。

这三个实现共享大约 95% 的代码。差异如您所料：标识符引用（`` `col` `` 与 `"col"`）、占位符语法（`?` 与 `$1, $2`）以及事务语义。这三个工具都支持完整的 Prisma CRUD 界面：findMany、findFirst、findUnique、create、createMany、update、updateMany、upsert、delete、deleteMany、count — 以及原始 SQL、事务和 10 多个 WHERE 过滤运算符。

## perry-push：通用推送通知

`perry-push` 是一个单一库，可处理各个平台的推送通知：APNs (iOS/macOS)、FCM (Android)、Web 推送（浏览器）和 WNS (Windows)。每个提供程序都是一个 Rust FFI 模块，具有三个功能：`*_provider_new`、`*_provider_close` 和 `*_send`。

**notify.ts**

```typescript
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
```

加密由 `ring` 处理 - 用于 APNs 和 VAPID 的 ES256 JWT、用于 FCM 服务帐户的 RS256、用于 Web 推送负载加密的 AES-GCM。全部编译为本机代码。没有 `node-gyp`，没有 OpenSSL 依赖项。

## Perry Hub + Builder：分布式云构建

这是基础设施的游戏。 `perry-hub` 是一个构建编排服务器 - 本身由 Perry 从 TypeScript 编译而来 - 管理构建工作人员池。您推送您的项目，集线器根据目标平台将其分派给正确的工作人员，然后工作人员编译、签名并可选择发布您的应用程序。

目前有两个工作人员：一个 macOS 构建器（处理 macOS、iOS 和 Android 目标）和一个 Linux 构建器（处理 Linux 和 Android）。两者都是 Rust 二进制文件，通过 WebSocket 连接到集线器，下载源 tarball，运行 Perry 编译器，然后上传回工件。

-   **代码签名** — 针对 macOS 的 Apple 公证、针对 iOS 的配置文件、Android 密钥库签名
-   **App Store 发布** — 直接上传到 App Store Connect 和 Google Play 商店
-   **工件管理** - 通过基于 TTL 的清理将构建的二进制文件上传到中心
-   **许可证管理** — 每个许可证的速率限制、优先级队列（专业级优先）

该中心本身就是一个引人入胜的案例研究。这是一个约 1,500 行的 TypeScript 文件，由 Perry 编译为 2 MB 本机二进制文件。它在端口 3456 上针对 HTTP 运行 Fastify，在端口 3457 上针对 WebSocket 运行 `ws`。所有状态都位于内存中，并具有 JSON 持久性 — 无需外部数据库。您可以使用 `scp` 和 systemd 单元文件来部署这种服务器。

## perry-verify：自动化应用验证

`perry-verify` 是一项独立的 HTTP 服务，它采用已编译的二进制文件和配置、运行验证管道并返回带有屏幕截图的结构化通过/失败结果。它启动应用程序，运行身份验证流程（确定性或人工智能辅助），检查状态并捕获证据。

存在适用于 macOS（通过辅助 API）、Linux (AT-SPI) 的平台适配器以及适用于 iOS 模拟器和 Android 模拟器的存根。当无法进行确定性检查时，AI 层使用 Claude 进行后备身份验证和状态验证。它旨在作为构建后步骤插入集线器的构建管道中：编译、签名、验证、发布。

## Pry 全面上线

[Pry](/zh-Hans/blog/building-pry/) 是我们作为 Perry 展示而构建的原生 JSON 查看器，现在在五个平台上分发。它位于 [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) 和 [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry)，带有适用于 Linux 和 Windows 的本机二进制文件。相同的 TypeScript 代码库、五个特定于平台的入口点、五个本机二进制文件。这是整个方法端到端工作的最具体证据 - 从 TypeScript 源到 App Store 列表。

## 这一切意味着什么

编译器很有趣。生态系统是有用的。上周，Perry 从“您可以将 TypeScript 编译为本机”变为“您可以使用本机 UI、Prisma 数据库、推送通知以及自动发布到 App Store。"

各部分开始连接：

-   **perry/ui** 是从 TypeScript 到本机平台 UI 的最直接路径 — 响应式状态、20 多个小部件、零抽象层
-   **perry-prisma/sqlite/postgres** 表示现有数据库代码端口，只需进行最少的更改
-   **perry-push** 表示没有每个平台库的原生推送通知
-   **perry-hub + builders** 意味着您可以一步从 `perry publish` 到 App Store
-   **perry-verify** 意味着对编译输出进行自动测试，而不仅仅是源代码
-   **perry-react** 意味着 React 开发人员可以使用熟悉的模式轻松使用 Perry，所有这些都映射到下面的 perry/ui

这些都不是理论上的。此处列出的每个库都有工作代码、测试和文档。其中一些已经在生产中使用 - Perry 登陆站点本身运行在 Perry 编译的 Fastify 服务器上，并且 Pry 在两个应用商店中上线。

## 下一步

近期路线图：

-   **perry/ui 扩展** — 拖放、辅助功能标签、自定义上下文菜单、更多布局基元
-   **perry-verify 集成** - 构建管道中的自动验证
-   **框架兼容性** — 改进 React、Angular 和 Ionic 层作为 perry/ui 的入口
-   **完整的正则表达式支持** - ECMAScript 兼容的正则表达式引擎编译为本机

关注 [GitHub](https://github.com/PerryTS/perry) 上的进展，或查看[路线图](/zh-Hans/roadmap/)以了解完整情况。
