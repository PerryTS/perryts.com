---
title: "Hono, tRPC, Strapi를 네이티브 바이너리로 컴파일"
excerpt: "Perry는 이제 세 가지 주요 TypeScript 프레임워크 — Hono, tRPC, Strapi — 를 네이티브 ARM64 실행 파일로 컴파일합니다. 1초 이내에 컴파일되고, 2 MB 미만의 바이너리를 생성하며, 충돌 없이 실행됩니다."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry는 이제 세 가지 주요 TypeScript 프레임워크 — Hono, tRPC, Strapi — 를 네이티브 ARM64 실행 파일로 컴파일합니다. 1초 미만으로 컴파일하고, 2 MB 미만의 바이너리를 생성하며, 크래시 없이 실행됩니다.

이 글에서는 무엇이 작동하는지, 아직 작동하지 않는 것은 무엇인지, 그리고 실제 코드에 대해 컴파일러를 시험하면서 배운 것을 다룹니다.

## 프로젝트

TypeScript의 다양한 형태를 대표하기 때문에 이 세 가지를 선택했습니다:

-   **Hono** — 경량 웹 프레임워크(29개 모듈). 제네릭, 클래스 상속, 동적 메서드 할당,`Request`/`Response` Web API를 많이 사용. 배럴 파일을 통한 이름 지정 재수출을 사용하는 내보내기 구조.
-   **tRPC** — 타입 안전 RPC 프레임워크(52개 모듈). 4단계 이상의 깊은 재수출 체인, 제네릭 타입 축소를 사용하는 빌더 패턴, 모듈 스코프에서의 클래스 인스턴스화, Web Streams를 통한 스트리밍.
-   **Strapi** — 헤드리스 CMS 코어(4개 모듈이 네이티브 컴파일, 나머지는 외부로 해석). 워크스페이스 패키지 해석을 포함한 모노레포, 네임스페이스 재수출 (`export * as X`), `Map`을 사용한 서비스 컨테이너 패턴, 팩토리 함수.

## 컴파일 결과

세 가지 모두 컴파일 오류 없이 네이티브 바이너리로 컴파일됩니다:

| 프로젝트 | 컴파일된 모듈 | 바이너리 크기 | 컴파일 시간 |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

모든 소스 모듈이 전체 파이프라인을 거칩니다: SWC 파싱, HIR 로워링, Cranelift 코드 생성, 오브젝트 파일 출력, 네이티브 링킹. 컴파일 시간에는 파싱부터 최종 링크까지 모두 포함됩니다.

참고로, tRPC만의 `tsc --noEmit`에 수초가 걸립니다. Perry는 52개 모듈을 링크된 네이티브 바이너리로 1초 미만에 컴파일합니다.

## 런타임에서 작동하는 것

### 크로스 모듈 클래스 인스턴스화

이것이 큰 이정표였습니다. Hono의 내보내기 구조:

hono export chain

// hono/src/hono.ts

export class Hono extends HonoBase { ... }

// hono/src/index.ts

import { Hono } from './hono'

export { Hono }

이 `export { Hono }`는 이름 지정 재수출입니다 —`export * from`도 `export { Hono } from './hono'`도 아닙니다. Perry의 HIR에서 이것은 `Export::Named`가 되며,`Export::ReExport`나 `Export::ExportAll`이 아닙니다. 이전에 컴파일러의 클래스 전파는`ExportAll`과 `ReExport`체인만 따라갔기 때문에, `index.ts`에서 `Hono`를 가져오면 조용히 실패하여 `new Hono()`가 `undefined`를 반환했습니다.

이제 Perry는 `Export::Named`를 모듈의 import를 거슬러 원래 클래스 정의를 찾아 전파합니다. 결과:

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

Hono 생성자가 실행되고, `SmartRouter`(내부에서 `RegExpRouter`와 `TrieRouter` 모두를 생성)를 초기화하고, 실제 객체를 반환합니다. 독립적인 여러 인스턴스가 작동합니다. 생성자 옵션도 수락됩니다.

### 다중 레벨 재수출 해석

tRPC의 `initTRPC`는 4단계 깊이에 있습니다:

initTRPC.ts (export const initTRPC = ...)

\-> unstable-core-do-not-import.ts (export \* from './initTRPC')

\-> @trpc/server/index.ts (export { initTRPC } from '../../..')

\-> index.ts (export \* from './@trpc/server')

`ExportAll` → `Named` → `ExportAll`입니다. Perry는 전체 체인을 해석합니다 — `initTRPC`는 컴파일된 바이너리에서 접근 가능합니다. 같은 경로를 따르는 `TRPCError`도 마찬가지입니다.

### 인수가 있는 크로스 모듈 클래스 인스턴스화

const err = new TRPCError({ code: 'NOT\_FOUND', message: 'resource missing' })

// PASS: new TRPCError() returned object

// PASS: err.code = NOT\_FOUND

`TRPCError`는 하나의 모듈에서 정의되고, 세 개의 중간 배럴 파일을 통해 재수출되며, 테스트에서 가져와 옵션 객체로 인스턴스화됩니다. 인스턴스의 `code` 필드에 접근 가능합니다.

### 모노레포에서의 패키지 해석

Strapi는 워크스페이스 패키지를 사용합니다 — `@strapi/core`는 모노레포 내 형제 패키지이며, npm 의존성이 아닙니다. Perry는 `package.json` exports 필드를 통해 베어 지정자를 해석합니다:

"exports": {

".": { "source": "./src/index.ts", "import": "./dist/index.mjs" }

}

`createStrapi` 함수는 `export * from '@strapi/core'`를 통해 호출 가능한 함수로 올바르게 해석됩니다.

### 타입 전용 내보내기 필터링

TypeScript의 `export type { Foo }` 문법은 런타임에서 의미가 없지만, 이전에 Perry는 이것들을 실제 `Export::ReExport` 항목으로 변환하여 링커를 통해 전파하고 스텁 심볼을 생성했습니다. Hono의 `index.ts`만으로도 수십 개의 타입을 포함하는 4개의 `export type` 선언이 있습니다.

이제 Perry는 `ExportNamed` 선언의 SWC `type_only` 플래그와 개별 지정자의 `is_type_only`를 확인하여 HIR 로워링 중 건너뜁니다. 이로써 세 프로젝트 모두에서 타입 재수출으로 인한 데드 스텁 생성이 제거되었습니다.

### RegExp 생성자

`new RegExp(pattern, flags)`는 이제 Perry의 기존 `js_regexp_new` 런타임 함수로 컴파일됩니다. 런타임은 이미 RegExp를 지원했지만, `Expr::New` 코드 생성 핸들러에 해당 케이스가 없어서 모든 `new RegExp(...)`가 "Unknown class" 경고로 빠졌습니다. Hono의 `RegExpRouter`가 이를 광범위하게 사용합니다.

## 아직 작동하지 않는 것

갭은 성공만큼이나 중요한 정보를 전달하므로 구체적으로 설명합니다.

### `this`에 대한 동적 프로퍼티 할당

Hono의 생성자는 HTTP 메서드 핸들러를 동적으로 설정합니다:

const allMethods = \['get', 'post', 'put', 'delete', ...\]

allMethods.forEach((method) => {

this\[method\] = (args1, ...args) => {

// register route

return this

}

})

`app.get`, `app.post`등은 정적으로 선언되지 않으며, 계산된 프로퍼티 이름을 통해 런타임에 할당됩니다. Perry는 아직 `this[variable] = value`를 지원하지 않으므로 이 메서드들이 누락됩니다:

\[4\] Dynamic method assignment (this\[method\] = ...)

INFO: app.get not available

INFO: app.on not available

Hono에 대한 가장 큰 단일 갭입니다. Hono 클래스는 존재하고 라우터가 초기화되지만, 라우트를 등록할 수 없습니다.

### 모듈 수준 생성자 호출

tRPC는 진입점을 다음과 같이 정의합니다:

export const initTRPC = new TRPCBuilder()

런타임에서 `initTRPC`는 `typeof object`가 아닌 `typeof function`으로 나타납니다 — 모듈 수준의 `new TRPCBuilder()` 표현식이 생성자를 실행하지 않으므로 인스턴스가 아닌 클래스에 대한 참조를 얻습니다. 따라서 `initTRPC.create()`와 `initTRPC.context()`는 모두 `undefined`입니다.

### 상속된 프로퍼티

`TRPCError extends Error`에서 `TRPCError`에 직접 정의된 `err.code`는 작동하지만, `Error`에서 상속된 `err.message`에는 접근할 수 없습니다. 프로퍼티 조회를 위한 프로토타입 체인이 완전히 구현되지 않았습니다.

### 복잡한 생성자 체인

Strapi의 `createStrapi()` 함수는 내부적으로 `new Strapi(opts)`를 호출하며, 이는 `Container`(`Map`으로 지원)를 상속하고, `loadConfiguration()`을 호출하고, 프로바이더를 순회하며 서비스를 등록합니다. 이 깊은 생성자 체인은 거짓 값을 반환합니다 — 크래시하지는 않지만 사용 가능한 인스턴스도 생성하지 않습니다.

### Web API 내장 클래스

세 프로젝트에서 남아있는 "Unknown class" 경고:

| 클래스 | 횟수 |
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

`Response`, `Request`,`Headers`가 모든 HTTP 프레임워크에 중요합니다. `Map`, `Set`, `RegExp`, `Buffer`, `AbortController` 등에 이미 있는 것과 유사한 내장 코드 생성 지원이 필요합니다.

## 이것이 알려주는 것

좋은 소식: Perry의 컴파일 파이프라인이 실제 프레임워크 코드를 처리합니다. 복잡한 재수출 체인, 제네릭이 많은 타입 시그니처, 클래스 계층 구조, 모노레포 패키지 해석을 가진 다중 파일 프로젝트가 모두 링크된 바이너리까지 도달합니다.

갭은 컴파일 갭이 아니라 런타임 갭입니다. 남은 작업:

1.  **동적 프로퍼티 할당** — 메서드를 프로그래밍적으로 설정하는 프레임워크에 필요
2.  **모듈 수준 초기화 표현식** — `export const x = new Foo()`가 실제로 생성자를 실행해야 함
3.  **프로토타입 체인** — 상속된 프로퍼티와 메서드
4.  **Web API 내장** — HTTP 프레임워크를 위한 `Response`, `Request`, `Headers`

이들은 구체적이고 범위가 명확한 문제입니다. 아키텍처 변경이 필요한 것은 없습니다 — 더 간단한 경우에 이미 작동하는 패턴의 확장입니다.

계속 작업하겠습니다. 목표는 `new Hono().get('/', (c) => c.text('hello'))`가 네이티브 바이너리에서 작동하는 HTTP 서버를 생성하는 것입니다.
