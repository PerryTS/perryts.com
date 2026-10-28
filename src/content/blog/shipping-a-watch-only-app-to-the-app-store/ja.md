---
title: "ほかの方法がすべて失敗しても、Apple Watch 専用アプリを App Store に公開する"
excerpt: "独立した watchOS アプリを App Store にアップロードするための文書化された方法は、すべて失敗しました。altool、iTMSTransporter、xcodebuild、Xcode 26 の Organizer も watchOS を受け付けません。古い Watch 向けの arm64_32 を維持したまま使える解決策は、ITSWatchOnlyContainer を指定した iOS スタブで包み、iTMSTransporter でアップロードすることです。"
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** は、Apple Watch 用の騒音レベル メーターです。スタンドアロンの watchOS アプリであり、iPhone に対応するものはありません。 Perry を使用して、単一の TypeScript ファイルから作成しました。これをスマートウォッチ上で構築して実行するのは、難しいと予想されていた部分でした。実際に 1 日かかったのは、*App Store* にそれを登録する作業でした。文書化されたアップロード パスはすべて、スタンドアロンの watchOS アプリを拒否しており、機能する回避策はほとんどどこにも記載されていません。この投稿はその欠けているページです。

短いバージョン: スマートウォッチ専用アプリをリリースするには、それを iOS フラグが付けられた *コンテナ スタブ*で `ITSWatchOnlyContainer` でラップし、`iTMSTransporter` でアップロードします。 — Xcode や `altool` ではありません。ロングバージョンには 3 つの地雷があり、それぞれを発見するには Apple のサーバーまで往復する必要があります。

## アプリ

dB Meter は `WKWatchOnly` アプリです。スマートウォッチ上で単独で実行され、ペアリングされた iPhone アプリは必要ありません。 Perry は、TypeScript をネイティブの watchOS バイナリに直接コンパイルし、それを**ユニバーサル** スライス (シリーズ用の `arm64`) として配布します。 9/10/11 および Ultras、さらにシリーズ 4 ～ 8 および SE 用の `arm64_32` (ILP32: 64 ビット レジスタ、32 ビット ポインタ)。この 2 番目のスライスが重要です。これがないと、Series 4 から SE 2 に至るまですべての製品にアプリをインストールできません。 `arm64_32` を存続させることが、明白な回避策を排除する制約であることが判明しました。

## スタンドアロンのスマートウォッチ アプリはアップロードされません

スマートウォッチ専用の `.ipa` は、トップレベル アプリが `CFBundleSupportedPlatforms = [WatchOS]` を宣言するバンドルです。 Apple のコマンドライン配信ツールでは、これをどうすればよいのかわかりません。

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

そこで、Xcode に目を向けます。しかし、`xcodebuild -exportArchive` と `method: app-store-connect` はメソッドの列挙中に失敗します。その理由は有益です。Xcode 26 では、配布メソッドのレジストリに *no watchOS アーカイブの App Store オプション*:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

オーガナイザー GUI には、リリース テスト、エンタープライズ、デバッグ、そして何の役にも立たない「カスタム」というまったく同じ 3 つのタイルが表示されます。アドホック、エンタープライズ、開発。 App Store はありません。現在インストールされている Xcode のバージョンでは、Apple 独自のフロント ドアを介してスタンドアロン スマートウォッチ アプリを App Store Connect にプッシュする方法はサポートされていません。

## コンパニオン トラップ

魅力的な脱出手段は、スマートウォッチのみをやめることです。実際の iOS アプリを出荷します。このアプリは、スマートウォッチ アプリが長年配信されてきた方法である `Payload/YourApp.app/Watch/` にスマートウォッチ アプリを*埋め込み*ます。トップレベルのバンドルは通常の iOS アプリであるため、`altool --type ios` を使用するときれいにアップロードされます。

また、2 つの問題にも直面します。まず、App Store Connect は iPhone アプリを認識し、**iPhone のスクリーンショット**を要求します。また、「開く」と言うだけの iPhone アプリも表示されます。これをあなたのスマートウォッチに」は、4.2 の最小限の機能の拒否の候補です。次に、これは私たちにとって致命的ですが、iOS の*トップレベル*バイナリには、`arm64_32` スライスが含まれていない可能性があります。 Apple のバリデーターはそれを拒否します:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

そのため、コンパニオン構造により、`arm64_32` を削除して arm64 のみにする必要があり、これにより、テスト対象の Series 7 を含むすべての Series 4 ～ 8 および SE スマートウォッチが削除されます。コンパニオン トラップは、古いスマートウォッチのサポートと引き換えに、機能するアップロードを提供します。私たちはその取引を望んでいませんでした。

## スマートウォッチ専用コンテナ

本当の答えは、スマートウォッチ アプリをスマートウォッチ専用に*維持し、*`arm64_32` を維持することです。スマートウォッチ アプリを小さな iOS の**コンテナ スタブ**内にネストし、そのスタブにフラグを立てて、App Store Connect が全体をスマートウォッチ専用製品として扱うようにします。 2 つの Info.plist キーがフラグを設定します。これらがすべてのトリックです。

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` は、App Store Connect に「この iOS バンドルは、その中に含まれるスマートウォッチ アプリの配信手段にすぎません。」と伝えます。この 1 つのキーにより、iPhone のスクリーンショット要件がなくなりました。ストアではこの製品をスマートウォッチ専用として分類しています。 `LSApplicationLaunchProhibited=true` は、スタブが起動されないことを示しているため、実際のアプリである必要はありません。トップレベルのプラットフォームが iOS として読み取られ、配信ツールが文句を言わなくなるように存在するだけで十分です。内部のスマートウォッチ アプリは、`WKWatchOnly=true` と *no* `WKCompanionAppBundleIdentifier` を保持します。これはスタブのコンパニオンではなく、スタブはそのラッパーです。

スタブの残りの Info.plist キーは、バリデーターが要求するボイラープレートです: `UIDeviceFamily=[1,2]`、4 つすべての `UISupportedInterfaceOrientations`、`CFBundleSupportedPlatforms=[iPhoneOS]`、および — スタブが arm64 であるため — `UIRequiredDeviceCapabilities=[arm64]`。スタブにはアイコンがまったく含まれていません。スマートウォッチ アプリにはそれらが含まれています。

次に、`iTMSTransporter` を使用してアップロードします。トップレベルのバンドルが iOS であるため、その `-assetFile` モードは満足です。

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

ビルドは watchOS ビルド、`arm64_32` としてそのまま App Store Connect に配信され、バージョンは iPhone の要求を停止します。スクリーンショット。

## 途中に 3 つの地雷

これらはそれぞれ、Apple のバリデーターから返された失敗したアップロードであり、ローカル ツールが検出したものではありません。

1.  **スタブに、`swiftc` で新しく生成したバイナリは使えません。** インストール済み Xcode の iOS SDK で単純な UIKit スタブをコンパイルすると、*「未対応の SDK または Xcode のバージョンでビルドされている」* として拒否されます（エラー 90534）。その SDK がプレリリース版と見なされるためです。私たちには、受け入れられる SDK バージョンを持つ本物の iOS バイナリがすでにありました。Perry の `--target ios` 出力です。Perry は独自のランタイムをリンクし、リリース済みの SDK バージョンを記録するため、`swiftc` では通らなかった検証を通過しました。スタブは「これは Apple Watch アプリです」と表示する Perry 製の画面ですが、`LSApplicationLaunchProhibited` により実際には一度も起動しません。

2.  **アイコンにはキーだけでなく辞書も必要です。** `CFBundleIconName` を設定し、`Assets.car` も存在していたのに、Watch アプリは *「CFBundleIconName の値がありません」* として検証に失敗しました。検証側が要求するのは完全な構造、つまり `CFBundleIconName` *と* `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}` 辞書です。トップレベルのキーだけを設定しても、キーがないと判定されます。

3.  **`WKWatchOnly` は、iOS ビルドをすでに配布しているレコードでは拒否されます。** App Store レコードが iOS ビルドでは、スマートウォッチのみのアップロードが拒否され、新しいアプリ レコードが必要になります (ASC API では作成できません。`POST /apps` は 403 を返すため、Web UI で作成します)。 *未配布*のビルドのみを含むレコードは問題ありません。


いくつかの小さな不変条件: スタブとスマートウォッチ アプリは同じ `CFBundleVersion` を共有する必要があり、`--generate-entitlement-der` と `get-task-allow=false`.

## これが Perry の物語である理由

コンテナの配管はどれも Perry 固有のものではありません。これは、スタンドアロンの watchOS アプリ、それを構築したものに適用されます。しかし、Perry のおかげで、dB Meter が最初にネイティブ スマートウォッチ バイナリにコンパイルされる単一の 280 行の TypeScript ファイルになり、Perry がSDK - `swiftc` が失敗したときにエラー 90534 を回避できた iOS スタブをクリーンアップします。 `arm64_32` 用のコンパイルでは、途中で実際の codegen のバグも発生しました。インライン クラス フィールド アクセスが、ターゲットを認識する 20 ビットではなく 64 ビットのオブジェクト ヘッダー サイズ (24 バイト) でベイクされたため、型指定されたオブジェクト文字列フィールドが ILP32 上でガベージ フロートとして読み戻されていました。それは、古い時計を黙って捨てるのではなく、サポートすることを主張したときにのみ見つかるものです。

パイプライン全体 (TypeScript からユニバーサル watchOS バイナリ、署名付きスマートウォッチ専用 App Store ビルド) は、再実行できるスクリプト内に存在します。スタンドアロンのスマートウォッチ アプリをリリースしていて、Xcode がそれは実行できないと言っている場合は、ラップして `ITSWatchOnlyContainer` のフラグを立てて、`iTMSTransporter` に渡すことができます。
