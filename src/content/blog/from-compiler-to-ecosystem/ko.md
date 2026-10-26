---
title: "컴파일러에서 생태계로: React, 데이터베이스, 클라우드 빌드"
excerpt: "Perry가 컴파일러에서 완전한 생태계로 성장했습니다. perry/ui를 핵심으로, MySQL/PostgreSQL/SQLite용 Prisma 호환 ORM, 유니버설 푸시 알림, App Store 배포와 분산 빌드, React 호환 레이어 — 모두 1주일 만에."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
일주일 전, Perry는 UI 툴킷을 갖춘 컴파일러였습니다. TypeScript를 작성하고, 네이티브 바이너리로 컴파일하고, 6개 플랫폼에 배포할 수 있었습니다. 그것이 이야기였습니다. 오늘 이야기는 더 커졌습니다: Perry는 에코시스템으로 진화하고 있습니다. 3개의 데이터베이스 ORM, 유니버설 푸시 알림, App Store와 Play Store 게시를 포함한 분산 빌드, React 호환 레이어, 그리고 자동화된 앱 검증 — 모두 지난 한 주 동안 출시되었습니다.

이 글에서는 출시된 내용, 그것이 중요한 이유, 그리고 코드가 어떻게 보이는지 다룹니다.

## perry/ui: 기반

새로운 라이브러리를 살펴보기 전에, 모든 것의 중심에 있는 것을 강조할 필요가 있습니다:`perry/ui`. 이것은 Perry 자체의 네이티브 UI 툴킷으로, 6개 모든 타겟에서 플랫폼 네이티브 컴포넌트로 직접 컴파일되는 20개 이상의 위젯을 포함합니다. 래퍼가 아니고, 추상화 레이어가 아니며, 웹 뷰가 아닙니다. 모든 `Button`은 macOS에서 `NSButton`이 되고, iOS에서 `UIButton`이 되고, Linux에서 `GtkButton`이 되고, Android에서 `android.widget.Button`이 되며, Windows에서 `CreateWindowEx` 컨트롤이 됩니다.

`perry/ui`는 Perry의 주요하고 가장 진보된 UI 서피스입니다. 리액티브 상태 관리, 레이아웃 컨테이너(VStack, HStack, ZStack, SplitView), 하드웨어 가속 Canvas, 컬럼 정렬이 있는 Table 뷰, 파일 다이얼로그, 키체인 접근, 알림, 멀티 윈도우를 위한 `perry/system` 모듈을 포함합니다 — 모두 TypeScript에서, 모두 플랫폼 API 직접 호출로 컴파일됩니다. React 호환 레이어를 포함한 Perry의 다른 모든 UI 접근 방식은`perry/ui` 위에 구축되어 그 위젯으로 매핑됩니다.

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

리액티브 `State` 객체가 핵심 프리미티브입니다. State 값이 변경되면, 해당 상태에 바인딩된 위젯만 업데이트됩니다 — 가상 DOM 비교 없음, 전체 트리 재렌더링 없음, 재조정 패스 없음. TypeScript에서 네이티브 플랫폼 UI로의 가장 직접적인 경로입니다.

## React 호환성: perry/ui 위의 얇은 레이어

React에서 오는 개발자를 위해, `perry-react` 는 React의 컴포넌트 모델을 `perry/ui` 위젯에 매핑하는 호환 레이어를 제공합니다. `useState`, `useRef`, `useReducer`, 그리고 JSX를 사용할 수 있으며 — Perry가 동일한 네이티브 위젯으로 컴파일합니다. 이것은 편의를 위한 브릿지이지, 별도의 렌더링 엔진이 아닙니다.

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

내부적으로 모든 JSX 요소는 `perry/ui` 위젯에 매핑됩니다: `<div>`는 VStack이 되고, `<button>`는 Button이 되며, `useState`는 Perry의 리액티브 State로 구현됩니다. 아직 초기 단계입니다 — 전체 트리 재렌더링과 전역 훅 스토리지의 페이즈 1이지만, 기존 React 코드가 Perry를 통해 네이티브 플랫폼을 타겟으로 할 수 있음을 증명합니다. 유사한 방식으로 Angular과 Ionic 호환성도 탐색 중입니다.

## 3개의 데이터베이스 ORM: Prisma API, 네이티브 성능

데이터베이스와 통신하는 서버나 데스크톱 앱을 구축하고 있다면, Perry는 이제 Prisma 호환 3개의 ORM으로 지원합니다: `perry-prisma` (MySQL), `perry-sqlite` (SQLite), `perry-postgres` (PostgreSQL). 3개 모두`@prisma/client`의 드롭인 대체품입니다. 같은 API, 같은 쿼리 패턴이지만, 데이터베이스 직접 FFI를 가진 네이티브 코드로 컴파일됩니다 — Prisma 엔진 없음, Node.js 없음.

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

내부적으로 각 ORM은 `sqlx`를 사용하는 Rust FFI 레이어로 지원되는 TypeScript 프론트엔드입니다. 쿼리 흐름: TypeScript가 쿼리를 JSON으로 직렬화하고, FFI 경계를 통해 전달하고, Rust가 매개변수화된 SQL을 구축하고, 커넥션 풀을 통해 실행하고, 결과를 직렬화하여 반환합니다. Prisma 스키마는 빌드 시에 읽힙니다 — 런타임 파싱 제로.

3개의 구현은 코드의 약 95%를 공유합니다. 차이점은 예상대로입니다: 식별자 인용(`` `col` `` vs `"col"`), 플레이스홀더 구문( `?` vs `$1, $2`), 트랜잭션 의미론. 3개 모두 전체 Prisma CRUD 서피스를 지원합니다: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — 더불어 raw SQL, 트랜잭션, 10개 이상의 WHERE 필터 연산자.

## perry-push: 유니버설 푸시 알림

`perry-push`는 모든 플랫폼에서 푸시 알림을 처리하는 단일 라이브러리입니다: APNs (iOS/macOS), FCM (Android), Web Push (브라우저), WNS (Windows). 각 프로바이더는 정확히 3개의 함수를 가진 Rust FFI 모듈입니다: `*_provider_new`, `*_provider_close`, `*_send`.

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

암호화는 `ring`으로 처리됩니다 — APNs와 VAPID용 ES256 JWT, FCM 서비스 계정용 RS256, Web Push 페이로드 암호화용 AES-GCM. 모두 네이티브 코드로 컴파일됩니다.`node-gyp` 없음, OpenSSL 의존성 없음.

## Perry Hub + 빌더: 분산 클라우드 빌드

이것이 인프라 플레이입니다. `perry-hub`는 빌드 오케스트레이션 서버로 — Perry 자체에 의해 TypeScript에서 컴파일된 — 빌드 워커 풀을 관리합니다. 프로젝트를 푸시하면, 허브가 타겟 플랫폼에 따라 적절한 워커에 디스패치하고, 워커가 컴파일, 서명, 그리고 선택적으로 앱을 게시합니다.

현재 2개의 워커가 존재합니다: macOS 빌더(macOS, iOS, Android 타겟 처리)와 Linux 빌더(Linux와 Android 처리). 둘 다 WebSocket을 통해 허브에 연결하고, 소스 tarball을 다운로드하고, Perry 컴파일러를 실행하고, 아티팩트를 업로드하는 Rust 바이너리입니다.

-   **코드 서명** — macOS용 Apple 공증, iOS용 프로비저닝 프로파일, Android 키스토어 서명
-   **App Store 게시** — App Store Connect와 Google Play Store에 직접 업로드
-   **아티팩트 관리** — 빌드된 바이너리가 TTL 기반 정리와 함께 허브에 업로드
-   **라이선스 관리** — 라이선스별 속도 제한, 우선순위 큐잉(프로 티어 우선)

허브 자체는 흥미로운 사례 연구입니다. 약 1,500줄의 TypeScript 파일이 Perry에 의해 2 MB 네이티브 바이너리로 컴파일됩니다. HTTP용으로 포트 3456에서 Fastify를, WebSocket용으로 포트 3457에서 `ws`를 실행합니다. 모든 상태는 JSON 영속성을 가진 인메모리입니다 — 외부 데이터베이스 없음. `scp`와 systemd 유닛 파일로 배포할 수 있는 종류의 서버입니다.

## perry-verify: 자동화된 앱 검증

`perry-verify`는 컴파일된 바이너리와 설정을 받아 검증 파이프라인을 실행하고, 스크린샷과 함께 구조화된 pass/fail 결과를 반환하는 독립형 HTTP 서비스입니다. 앱을 실행하고, 인증 플로우(결정적 또는 AI 지원)를 실행하고, 상태를 확인하고, 증거를 캡처합니다.

macOS(접근성 API를 통해), Linux(AT-SPI), iOS Simulator와 Android Emulator용 스텁의 플랫폼 어댑터가 존재합니다. AI 레이어는 결정적 검사가 불가능할 때 폴백 인증과 상태 검증을 위해 Claude를 사용합니다. 허브의 빌드 파이프라인에 포스트 빌드 단계로 삽입되도록 설계되었습니다: 컴파일, 서명, 검증, 게시.

## Pry, 어디서나 출시

Perry 쇼케이스로 구축한 네이티브 JSON 뷰어인 [Pry](/ko/blog/building-pry/)가 이제 5개 플랫폼에서 출시됩니다. [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) 와 [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry)에 있으며, Linux와 Windows용 네이티브 바이너리도 있습니다. 같은 TypeScript 코드베이스, 5개의 플랫폼별 엔트리 포인트, 5개의 네이티브 바이너리. 이 전체 접근 방식이 처음부터 끝까지 작동한다는 가장 구체적인 증거입니다 — TypeScript 소스에서 App Store 등록까지.

## 이것이 의미하는 바

컴파일러는 흥미롭습니다. 에코시스템은 유용합니다. 지난 한 주 동안 Perry는 "TypeScript를 네이티브로 컴파일할 수 있다"에서 "네이티브 UI, Prisma 데이터베이스, 푸시 알림, App Store에 자동 게시하는 빌드를 갖춘 풀 앱을 만들 수 있다"로 진화했습니다.

조각들이 연결되기 시작하고 있습니다:

-   **perry/ui**는 TypeScript에서 네이티브 플랫폼 UI로의 가장 직접적인 경로 — 리액티브 상태, 20개 이상의 위젯, 추상화 레이어 제로
-   **perry-prisma/sqlite/postgres**는 기존 데이터베이스 코드가 최소한의 변경으로 이식됨을 의미합니다
-   **perry-push**는 플랫폼별 라이브러리 없이 네이티브 푸시 알림을 의미합니다
-   **perry-hub + 빌더**는 `perry publish`에서 App Store까지 한 단계로 갈 수 있음을 의미합니다
-   **perry-verify**는 소스뿐만 아니라 컴파일된 출력의 자동화된 테스트를 의미합니다
-   **perry-react**는 React 개발자가 익숙한 패턴을 사용하여 Perry에 쉽게 진입할 수 있으며, 모두 내부적으로 perry/ui에 매핑됨을 의미합니다

이것들은 이론적인 것이 아닙니다. 여기 나열된 모든 라이브러리에는 작동하는 코드, 테스트, 문서가 있습니다. 여러 개는 이미 프로덕션에서 사용되고 있습니다 — Perry 랜딩 사이트 자체가 Perry로 컴파일된 Fastify 서버에서 실행되며, Pry는 2개의 앱 스토어에서 라이브입니다.

## 다음 단계

즉각적인 로드맵:

-   **perry/ui 확장** — 드래그 앤 드롭, 접근성 레이블, 커스텀 컨텍스트 메뉴, 더 많은 레이아웃 프리미티브
-   **perry-verify 통합** — 빌드 파이프라인에서의 자동화된 검증
-   **프레임워크 호환성** — perry/ui로의 온램프로서 React, Angular, Ionic 레이어 개선
-   **완전한 정규표현식 지원** — 네이티브로 컴파일되는 ECMAScript 호환 정규표현식 엔진

진행 상황은 [GitHub](https://github.com/PerryTS/perry)에서 팔로우하거나, [로드맵](/ko/roadmap/) 에서 전체 그림을 확인하세요.
