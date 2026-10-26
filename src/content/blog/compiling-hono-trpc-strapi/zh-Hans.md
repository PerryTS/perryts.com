---
title: "将 Hono、tRPC 和 Strapi 编译为原生二进制文件"
excerpt: "Perry 现在可以将三个主要 TypeScript 框架——Hono、tRPC 和 Strapi——编译为原生 ARM64 可执行文件。编译不到一秒，生成不到 2 MB 的二进制文件，运行零崩溃。"
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry 现在可以将三个主要的 TypeScript 框架 —— Hono、tRPC 和 Strapi —— 编译为原生 ARM64 可执行文件。编译时间不到一秒，生成的二进制文件不到 2 MB，运行不会崩溃。

本文介绍了什么有效、什么还不行，以及我们在将编译器推向真实代码时学到了什么。

## 项目选择

我们选择这三个项目是因为它们代表了不同形态的 TypeScript：

-   **Hono** —— 轻量级 Web 框架（29 个模块）。大量使用泛型、类继承、动态方法赋值， 以及 `Request`/`Response` Web API。 导出结构使用通过 barrel 文件的命名重导出。
-   **tRPC** —— 类型安全的 RPC 框架（52 个模块）。4+ 层深的重导出链、 带泛型类型收窄的构建器模式、模块作用域的类实例化，以及通过 Web Streams 的流式传输。
-   **Strapi** —— 无头 CMS 核心（4 个模块原生编译，其余作为外部解析）。 带有工作区包解析的 monorepo、命名空间重导出 （`export * as X`）、使用`Map` 的服务容器模式，以及工厂函数。

## 编译结果

三个项目都编译为原生二进制文件，零编译错误：

| 项目 | 编译模块数 | 二进制大小 | 编译时间 |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

每个源模块都经过完整管道：SWC 解析、HIR 降低、Cranelift 代码生成、目标文件输出和原生链接。 编译时间包含所有环节 —— 从解析到最终链接。

作为对比，仅 `tsc --noEmit` 在 tRPC 上就要花几秒。 Perry 在不到一秒内将 52 个模块编译为已链接的原生二进制文件。

## 运行时有效的部分

### 跨模块类实例化

这是重大里程碑。Perry 现在能追踪 `Export::Named`通过模块的导入回溯找到原始类定义并传播它。结果：Hono 的构造函数运行，初始化`SmartRouter`，并返回真实对象。

### 多层重导出解析

tRPC 的 `initTRPC` 位于 4 层深处：`ExportAll` → `Named` → `ExportAll`。 Perry 解析了整条链。

### Monorepo 中的包解析

Strapi 使用工作区包。Perry 通过 `package.json` 的 exports 字段解析裸说明符。

## 尚未有效的部分

### `this` 上的动态属性赋值

Hono 的构造函数动态设置 HTTP 方法处理器。Perry 尚不支持`this[variable] = value`，所以这些方法缺失。 这是 Hono 最大的缺口。

### 模块级构造函数调用

`export const initTRPC = new TRPCBuilder()` 在运行时 不执行构造函数，产生的是类引用而不是实例。

### 继承的属性

`err.code` 有效但 `err.message`（从 `Error` 继承）不可访问。原型链的属性查找尚未完全实现。

## 这告诉我们什么

好消息是：Perry 的编译管道能处理真实的框架代码。具有复杂重导出链、重度泛型类型签名、 类层次结构和 monorepo 包解析的多文件项目都能编译为已链接的二进制文件。

缺口在运行时，而非编译。剩余工作是：

1.  **动态属性赋值** —— 以编程方式设置方法的框架需要此功能
2.  **模块级初始化表达式** —— `export const x = new Foo()` 需要实际执行构造函数
3.  **原型链** —— 继承的属性和方法
4.  **Web API 内置类** —— HTTP 框架需要的 `Response`、`Request`、`Headers`

这些都是具体、范围明确的问题。没有一个需要架构变更 —— 它们是已经适用于简单情况的模式的扩展。

我们将继续推进。目标是 `new Hono().get('/', (c) => c.text('hello'))` 在原生二进制文件中产生一个可工作的 HTTP 服务器。
