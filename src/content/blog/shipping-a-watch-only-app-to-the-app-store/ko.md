---
title: "다른 방법이 모두 실패했을 때 Apple Watch 전용 앱을 App Store에 출시하기"
excerpt: "독립형 watchOS 앱을 App Store에 업로드하는 문서화된 방법은 모두 실패했습니다. altool, iTMSTransporter, xcodebuild와 Xcode 26의 Organizer도 watchOS 플랫폼을 거부합니다. 구형 Watch용 arm64_32를 유지하면서 성공한 비공식 해결책은 ITSWatchOnlyContainer로 표시한 iOS 스텁으로 앱을 감싸고 iTMSTransporter로 업로드하는 것입니다."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter**는 Apple Watch용 소음 측정기입니다. 이는 watchOS 대응 앱이 없는 독립형 iPhone 앱으로, Perry가 포함된 단일 TypeScript 파일. 스마트워치에서 이를 구축하고 실행하는 것은 우리가 어려울 것으로 예상했던 부분이었습니다. 실제로 하루에 드는 비용은 *App Store*에 다운로드하는 것이었습니다. 문서화된 모든 업로드 경로는 독립형 watchOS 앱을 거부하며 제대로 작동하는 해결 방법은 거의 어디에도 기록되어 있지 않습니다. 이 게시물이 누락된 페이지입니다.

짧은 버전: 스마트워치 전용 앱을 출시하려면 해당 앱을 iOS *컨테이너 스텁*에 플래그가 표시된 `ITSWatchOnlyContainer`로 래핑하고 `iTMSTransporter`로 업로드하세요. Xcode, `altool` 아님. 긴 버전에는 세 개의 지뢰가 있으며 각 지뢰를 발견하려면 Apple 서버까지 왕복해야 합니다.

## 앱

dB Meter는 `WKWatchOnly` 앱입니다. 스마트시계에서 자체적으로 실행되며 페어링된 iPhone 앱이 필요하지 않습니다. Perry는 TypeScript를 기본 watchOS 바이너리로 직접 컴파일하고 **범용** 슬라이스로 배포합니다 — 시리즈용 `arm64` 2011년 9월 10일 및 Ultras, Series 4~8 및 SE용 `arm64_32`(ILP32: 64비트 레지스터, 32비트 포인터). 두 번째 부분이 중요합니다. 이 부분이 없으면 Series 4부터 SE 2까지 모든 제품이 앱을 설치할 수 없습니다. `arm64_32`를 활성 상태로 유지하는 것은 명백한 해결 방법을 배제하는 제약임이 밝혀졌습니다.

## 독립형 스마트워치 앱은 아무것도 업로드되지 않습니다.

스마트워치 전용 `.ipa`는 최상위 앱이 `CFBundleSupportedPlatforms = [WatchOS]`를 선언하는 번들입니다. Apple의 명령줄 전달 도구는 이에 대해 무엇을 해야할지 모릅니다.

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

그래서 Xcode를 시도하게 됩니다. 하지만 `method: app-store-connect`를 지정한 `xcodebuild -exportArchive`도 배포 방식 열거 단계에서 실패합니다. 그 이유가 중요합니다. Xcode 26의 배포 방식 레지스트리에는 watchOS 아카이브용 *App Store 옵션이 아예 없습니다*:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

Organization GUI에는 릴리스 테스트, 엔터프라이즈, 디버깅 및 아무 쓸모가 없는 "사용자 정의"라는 정확히 동일한 세 개의 타일이 표시됩니다. 임시, 기업, 개발. App Store가 없습니다. 현재 설치된 Xcode 버전에서는 독립형 스마트워치 앱을 Apple 자체 현관을 통해 App Store Connect에 푸시하는 지원 방법이 없습니다.

## 컴패니언 트랩

유혹적인 탈출구는 스마트워치 전용이 되는 것을 중단하는 것입니다. 수년간 스마트워치 앱이 제공되었던 방식대로 `Payload/YourApp.app/Watch/`에 스마트워치 앱을 *삽입*하는 실제 iOS 앱을 출시하세요. 최상위 번들은 일반 iOS 앱이기 때문에 `altool --type ios`를 사용하면 깔끔하게 업로드됩니다.

또한 두 가지 문제에 직면하게 됩니다. 첫째, App Store Connect는 이제 iPhone 앱을 확인하고 **iPhone 스크린샷**을 요구합니다. 그리고 iPhone 앱은 "스마트시계에서 이 앱을 열어 보세요"라고만 말할 뿐입니다. 4.2 최소 기능 거부 후보입니다. 둘째, 우리에게 치명적입니다. iOS *최상위* 바이너리는 `arm64_32` 슬라이스를 포함하지 않을 수 있습니다. Apple의 유효성 검사기가 이를 거부합니다:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

따라서 컴패니언 구조는 `arm64_32`를 제거하고 arm64 전용으로 전환하도록 강제합니다. 이는 우리가 테스트 중인 Series 7을 포함하여 모든 Series 4~8 및 SE 스마트워치를 제공합니다. 컴패니언 트랩은 작동하는 업로드를 위해 기존 스마트워치 지원을 교환합니다. 우리는 그런 거래를 원하지 않았습니다.

## 스마트워치 전용 컨테이너

실제 해결책은 Watch 앱을 Watch 전용으로 유지하는 것과 `arm64_32`를 유지하는 것을 *동시에* 충족합니다. 작은 iOS **컨테이너 스텁** 안에 Watch 앱을 넣고, App Store Connect가 전체 패키지를 Watch 전용 제품으로 취급하도록 스텁에 표시합니다. 이 표시를 담당하는 Info.plist 키 두 개가 해결책의 전부입니다:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true`는 App Store Connect에 "이 iOS 번들은 그 안에 들어 있는 스마트워치 앱을 전달하는 수단일 뿐입니다."라고 알려줍니다. 이 단일 키 덕분에 iPhone 스크린샷 요구 사항이 사라지고 매장에서는 해당 제품을 스마트워치 전용으로 분류합니다. `LSApplicationLaunchProhibited=true`는 스텁이 실행되지 않으므로 실제 앱일 필요가 없다고 말합니다. 최상위 플랫폼이 iOS로 읽혀지고 전달 도구가 더 이상 불평하지 않도록 존재하기만 하면 됩니다. 내부의 스마트워치 앱은 `WKWatchOnly=true` 및 *no* `WKCompanionAppBundleIdentifier`를 유지합니다. 이는 스텁의 동반자가 아니며 스텁은 스텁을 둘러싼 래퍼입니다.

스텁의 나머지 Info.plist 키는 유효성 검사기가 요구하는 상용구입니다: `UIDeviceFamily=[1,2]`, 4개 모두 `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]`, 그리고 — 스텁이 arm64이기 때문에 — `UIRequiredDeviceCapabilities=[arm64]`. 스텁에는 아이콘이 전혀 없습니다. 스마트워치 앱이 이를 운반합니다.

그런 다음 `iTMSTransporter`로 업로드합니다. 해당 `-assetFile` 모드는 이제 최상위 번들이 iOS이므로 만족합니다.

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

빌드가 watchOS 빌드로 `arm64_32` 그대로 App Store Connect에 착륙하며 버전에서 iPhone 스크린샷 요구가 중단됩니다.

## 3개의 지뢰가 오는 중

이들 각각은 로컬 도구가 포착한 것이 아니라 Apple의 유효성 검사기에서 돌아온 실패한 업로드였습니다.

1.  **스텁에는 `swiftc`로 새로 만든 바이너리를 사용할 수 없습니다.** 설치된 Xcode의 iOS SDK로 단순한 UIKit 스텁을 컴파일하면 *‘지원되지 않는 SDK 또는 Xcode 버전으로 빌드됨’* 이라는 이유로 거부됩니다(오류 90534). 해당 SDK가 사전 릴리스 버전으로 취급되기 때문입니다. 우리에게는 이미 허용되는 SDK 버전이 기록된 실제 iOS 바이너리가 있었습니다. 바로 Perry의 `--target ios` 출력입니다. Perry는 자체 런타임을 링크하고 정식 출시된 SDK 버전을 기록하므로 `swiftc`가 실패한 검증을 통과했습니다. 스텁은 ‘이것은 Apple Watch 앱입니다’라는 화면을 Perry로 컴파일한 것이지만, `LSApplicationLaunchProhibited` 덕분에 실제로 실행되지는 않습니다.

2.  **아이콘에는 키뿐 아니라 딕셔너리도 필요합니다.** `CFBundleIconName`을 설정했고 `Assets.car`도 존재했지만, Watch 앱은 *‘CFBundleIconName 값이 없음’* 이라는 오류로 검증에 실패했습니다. 검증기가 요구하는 것은 전체 구조입니다. `CFBundleIconName` *그리고* `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}` 딕셔너리가 필요합니다. 최상위 키만 설정하면 여전히 키가 없다고 판단합니다.

3.  **`WKWatchOnly`는 이미 iOS 빌드를 배포한 기록에서 거부되었습니다.** App Store 기록이 iOS를 출시한 적이 있는 경우 빌드, 스마트워치 전용 업로드가 거부되고 새로운 앱 기록이 필요합니다(ASC API는 생성할 수 없습니다. `POST /apps`는 403을 반환하므로 웹 UI에서 생성합니다). *배포되지 않은* 빌드만 있는 레코드도 괜찮습니다.


몇 가지 더 작은 불변 사항: 스텁과 스마트워치 앱은 동일한 `CFBundleVersion`을 공유해야 하며 `--generate-entitlement-der` 및 `get-task-allow=false`.

## 이것이 Perry 이야기인 이유

컨테이너 배관 중 어느 것도 Perry에만 국한되지 않습니다. 이는 어떤 독립형 watchOS 앱을 개발했든 상관없이 적용됩니다. 하지만 Perry가 dB Meter가 애초에 기본 스마트워치 바이너리로 컴파일되는 단일 280라인 TypeScript 파일인 이유는 무엇이며, Perry가 SDK-clean iOS 스텁은 `swiftc`가 실패했을 때 오류 90534를 겪었습니다. `arm64_32`에 대한 컴파일은 도중에 실제 codegen 버그를 제거했습니다. 인라인 클래스 필드 액세스가 대상 인식 20 대신 64비트 개체 헤더 크기(24바이트)로 구워졌기 때문에 입력된 개체 문자열 필드가 ILP32에서 가비지 부동 소수점으로 다시 읽혀졌습니다. 조용히 시계를 떨어뜨리는 대신 오래된 시계를 고집할 때만 찾으세요.

전체 파이프라인(TypeScript에서 범용 watchOS 바이너리, 서명된 스마트워치 전용 App Store 빌드)이 이제 다시 실행할 수 있는 스크립트에 포함됩니다. 독립형 스마트시계 앱을 출시하려고 하는데 Xcode에서 실행할 수 없다고 표시되면 앱을 래핑하고 `ITSWatchOnlyContainer`에 플래그를 지정하고 `iTMSTransporter`에 전달할 수 있습니다.
