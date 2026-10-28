---
title: "其他方法都失败后，如何将 Apple Watch 专用应用发布到 App Store"
excerpt: "所有文档中介绍的独立 watchOS 应用上传方式都失败了：altool、iTMSTransporter、xcodebuild，甚至 Xcode 26 的 Organizer 都拒绝 watchOS 平台。本文介绍一个未被文档记录、但确实可行且能为旧款 Watch 保留 arm64_32 的方法：用标记为 ITSWatchOnlyContainer 的 iOS 存根包裹应用，再通过 iTMSTransporter 上传。"
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** 是一款适用于 Apple Watch 的声级计 — 一款独立的 watchOS 应用，无需 iPhone对应的，从单个 TypeScript 文件与 Perry 编译。我们预计让它在智能手表上构建并运行是困难的部分。实际花费一天时间的部分是将其*放入App Store*。每个记录的上传路径都拒绝独立的 watchOS 应用程序，并且几乎没有写出有效的解决方法。这篇文章就是那个缺失的页面。

简短版本：要发布仅智能手表的应用程序，您将其包装在标记为 `ITSWatchOnlyContainer` 的 iOS *容器存根* 中，并使用 `iTMSTransporter` 上传 - 而不是Xcode，而不是 `altool`。长版本包含三个地雷，每个地雷都需要往返苹果服务器才能发现。

## 应用程序

dB Meter 是一款 `WKWatchOnly` 应用程序：它单独在智能手表上运行，无需配对的 iPhone 应用程序。 Perry 将 TypeScript 直接编译为本机 watchOS 二进制文件，并将其作为**通用**切片进行分发 — 用于 Series 的 `arm64` 2011 年 9 月 10 日和 Ultras，以及适用于系列 4 至系列 8 和 SE 的 `arm64_32`（ILP32：64 位寄存器、32 位指针）。第二片很重要：没有它，从 Series 4 到 SE 2 的所有设备都无法安装该应用程序。事实证明，保持 `arm64_32` 处于活动状态是排除明显解决方法的约束。

## 没有任何东西会上传独立的智能手表应用

仅限智能手表的 `.ipa` 是一个捆绑包，其顶级应用声明 `CFBundleSupportedPlatforms = [WatchOS]`。 Apple 的命令行交付工具不知道该怎么办：

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

于是你转向 Xcode。但指定 `method: app-store-connect` 的 `xcodebuild -exportArchive` 也会在枚举分发方式时失败。原因很能说明问题：在 Xcode 26 中，分发方式注册表为 watchOS 归档提供的选项里，*根本没有 App Store*：

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

组织者 GUI 显示完全相同的三个图块 — 发布测试、企业、调试和无用的“自定义”。特设、企业、发展。没有App Store。在今天安装的 Xcode 版本中，不支持通过 Apple 自己的前门将独立智能手表应用推送到 App Store Connect。

## 同伴陷阱

诱人的逃生口是停止仅使用智能手表。发布一个真正的 iOS 应用程序，该应用程序恰好*嵌入*在 `Payload/YourApp.app/Watch/` 处的智能手表应用程序，这是多年来智能手表应用程序的交付方式。使用 `altool --type ios` 可以干净地上传，因为顶级捆绑包是一个普通的 iOS 应用程序。

它还会让您遇到两个问题。首先，App Store Connect 现在会看到一个 iPhone 应用程序和 **要求 iPhone 屏幕截图** - 以及一个 iPhone 应用程序，除了说“打开这个”之外什么也不做在你的智能手表上”是 4.2 最低功能拒绝的候选者。其次，对我们来说也是致命的：iOS *顶级*二进制文件可能不包含 `arm64_32` 切片。 Apple 的验证器拒绝它：

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

因此，配套结构迫使您剥离 `arm64_32` 并仅使用 arm64，这会丢弃所有 Series 4-8 和 SE 智能手表 - 包括我们正在测试的 Series 7。伴侣陷阱会用旧智能手表的支持来换取有效的上传。我们不想要这样的交易。

## 仅智能手表的容器

真正的答案是保留智能手表应用仅智能手表*并*保留`arm64_32`。您将智能手表应用程序嵌套在一个微小的 iOS **容器存根**中，并标记该存根，以便 App Store Connect 将整个产品视为仅限智能手表的产品。两个 Info.plist 键可以进行标记，它们就是整个技巧：

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` 告诉 App Store Connect “这个 iOS 捆绑包只是其中智能手表应用程序的交付工具。”正是这个按键使得 iPhone 屏幕截图要求消失了——商店将该产品归类为仅限智能手表。 `LSApplicationLaunchProhibited=true` 表示存根从未启动，因此它不需要是一个真正的应用程序；它只需要存在，以便顶级平台读取为 iOS 并且交付工具不再抱怨。内部的智能手表应用程序保留 `WKWatchOnly=true` 和 *no* `WKCompanionAppBundleIdentifier` — 它不是存根的伴侣，存根是它的包装器。

存根的其余 Info.plist 键是验证器坚持使用的样板：`UIDeviceFamily=[1,2]`、所有四个 `UISupportedInterfaceOrientations`、`CFBundleSupportedPlatforms=[iPhoneOS]`，并且 - 因为存根是 arm64 - `UIRequiredDeviceCapabilities=[arm64]`。存根根本没有任何图标；智能手表应用程序携带它们。

然后您使用 `iTMSTransporter` 上传，其 `-assetFile` 模式现在很高兴，因为顶级捆绑包是 iOS：

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

该版本作为 watchOS 版本登陆 App Store Connect，`arm64_32` 完好无损，并且该版本不再要求 iPhone 屏幕截图。

## 三枚地雷即将到来

其中每一个都是从 Apple 验证器返回的失败上传，而不是本地工具捕获的内容：

1.  **存根不能是刚用 `swiftc` 生成的二进制文件。** 用已安装 Xcode 的 iOS SDK 编译一个简单的 UIKit 存根，会被以 *“使用了不受支持的 SDK 或 Xcode 版本构建”* 为由拒绝（错误 90534），因为该 SDK 被视为预发布版本。我们手头已经有一个真正的、SDK 版本符合要求的 iOS 二进制文件：Perry 自己的 `--target ios` 输出。Perry 链接自己的运行时，并记录已发布的 SDK 版本，因此通过了 `swiftc` 未能通过的验证。这个存根是用 Perry 编译的“这是一个 Apple Watch 应用”提示界面，但由于设置了 `LSApplicationLaunchProhibited`，它实际上从不运行。

2.  **图标需要完整的字典，而不仅仅是一个键。** 即使设置了 `CFBundleIconName`，而且 `Assets.car` 也存在，Watch 应用仍因 *“缺少 CFBundleIconName 的值”* 而未通过验证。验证器要求完整结构：`CFBundleIconName` *以及* `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}` 字典。只设置顶层键，它仍会报告该键缺失。

3.  **`WKWatchOnly` 在已分发 iOS 版本的记录上被拒绝。** 如果您的 App Store 记录曾经发布过 iOS 版本，仅限智能手表的上传会被拒绝，并且您需要一个新的应用程序记录（ASC API 无法创建该记录 - `POST /apps` 返回 403，因此您在 Web UI 中进行记录）。仅具有*非分布式*构建的记录就可以了。


一些较小的不变量：存根和智能手表应用必须共享相同的 `CFBundleVersion`，并且您使用 `--generate-entitlement-der` 和 `get-task-allow=false`。

## 为什么这是一个Perry的故事

容器管道都不是 Perry 特定的 — 它适用于任何独立的 watchOS 应用程序，无论它是由什么构建的。但是 Perry 就是为什么 dB Meter 是一个 280 行 TypeScript 文件，首先编译为本机智能手表二进制文件，而 Perry 是生成SDK - 清理 iOS 存根，该存根在 `swiftc` 无法解决时解决了错误 90534。编译 `arm64_32` 过程中也消除了一个真正的代码生成错误 - 类型化对象字符串字段在 ILP32 上作为垃圾浮点读回，因为内联类字段访问以 64 位对象头大小（24 字节）而不是目标感知的 20 大小进行烘焙 - 类似于只有当您坚持支持旧手表而不是悄悄丢弃它们时，您才会发现这一点。

整个管道 — TypeScript 到通用 watchOS 二进制文件，再到经过签名的智能手表 App Store 构建 — 现在位于我们可以重新运行的脚本中。如果您要发布独立的智能手表应用，并且 Xcode 告诉您无法完成，它可以：包装它、标记它 `ITSWatchOnlyContainer`，然后将其交给 `iTMSTransporter`。
