---
title: "Shipping a Watch-Only App to the App Store (When Nothing Else Will)"
excerpt: "Every documented way to upload a standalone watchOS app to the App Store fails — altool, iTMSTransporter, xcodebuild, even Xcode 26's Organizer all refuse the watchOS platform. Here's the undocumented workaround that works and keeps arm64_32 for older watches: an ITSWatchOnlyContainer iOS stub, uploaded with iTMSTransporter."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** is a sound-level meter for Apple Watch — a standalone watchOS app with no iPhone counterpart, compiled from a single TypeScript file with Perry. Getting it to build and run on the watch was the part we expected to be hard. The part that actually cost a day was getting it *into the App Store*. Every documented upload path refuses a standalone watchOS app, and the workaround that does work is written down almost nowhere. This post is that missing page.

The short version: to ship a watch-only app you wrap it in an iOS *container stub* flagged `ITSWatchOnlyContainer`, and upload it with `iTMSTransporter` — not Xcode, not `altool`. The long version has three landmines that each cost a round-trip to Apple's servers to discover.

## The app

dB Meter is a `WKWatchOnly` app: it runs on the watch by itself, no paired iPhone app required. Perry compiles the TypeScript straight to a native watchOS binary and ships it as a **universal** slice — `arm64` for Series 9/10/11 and the Ultras, plus `arm64_32` (ILP32: 64-bit registers, 32-bit pointers) for Series 4 through 8 and the SE. That second slice matters: without it, everything from the Series 4 to the SE 2 simply can't install the app. Keeping `arm64_32` alive turns out to be the constraint that rules out the obvious workaround.

## Nothing will upload a standalone watch app

A watch-only `.ipa` is a bundle whose top-level app declares `CFBundleSupportedPlatforms = [WatchOS]`. Apple's command-line delivery tools do not know what to do with that:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

So you turn to Xcode. But `xcodebuild -exportArchive` with `method: app-store-connect` fails during method enumeration, and the reason is instructive — on Xcode 26 the distribution-method registry has *no App Store option at all* for a watchOS archive:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

The Organizer GUI shows the exact same three tiles — Release Testing, Enterprise, Debugging, and a “Custom” that leads nowhere useful. Ad hoc, enterprise, development. No App Store. On the version of Xcode installed today, there is no supported way to push a standalone watch app to App Store Connect through Apple's own front doors.

## The companion trap

The tempting escape hatch is to stop being watch-only. Ship a real iOS app that happens to *embed* the watch app at `Payload/YourApp.app/Watch/`, the way watch apps were delivered for years. That uploads cleanly with `altool --type ios`, because the top-level bundle is a normal iOS app.

It also walks you into two problems. First, App Store Connect now sees an iPhone app and **demands iPhone screenshots** — and an iPhone app that does nothing but say “open this on your Watch” is a candidate for a 4.2 minimum-functionality rejection. Second, and fatally for us: an iOS *top-level* binary may not contain an `arm64_32` slice. Apple's validator rejects it:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

So the companion structure forces you to strip `arm64_32` and go arm64-only, which drops every Series 4–8 and SE watch — including the Series 7 we were testing on. The companion trap trades your older-watch support for an upload that works. We didn't want that trade.

## The watch-only container

The real answer keeps the watch app watch-only *and* keeps `arm64_32`. You nest the watch app inside a tiny iOS **container stub**, and you flag the stub so App Store Connect treats the whole thing as a watch-only product. Two Info.plist keys do the flagging, and they are the entire trick:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` tells App Store Connect “this iOS bundle is only a delivery vehicle for the watch app inside it.” That single key is what makes the iPhone-screenshot requirement disappear — the store classifies the product as watch-only. `LSApplicationLaunchProhibited=true` says the stub is never launched, so it doesn't need to be a real app; it just needs to exist so the top-level platform reads as iOS and the delivery tools stop complaining. The watch app inside keeps `WKWatchOnly=true` and *no* `WKCompanionAppBundleIdentifier` — it is not a companion to the stub, the stub is a wrapper around it.

The stub's remaining Info.plist keys are boilerplate that the validator insists on: `UIDeviceFamily=[1,2]`, all four `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]`, and — because the stub is arm64 — `UIRequiredDeviceCapabilities=[arm64]`. The stub carries no icons at all; the watch app carries them.

Then you upload with `iTMSTransporter`, whose `-assetFile` mode is happy now that the top-level bundle is iOS:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

The build lands on App Store Connect as a watchOS build, `arm64_32` intact, and the version stops asking for iPhone screenshots.

## Three landmines on the way

Each of these was a failed upload that came back from Apple's validator, not something the local tooling caught:

1.  **The stub can't be a fresh `swiftc` binary.** Compiling a trivial UIKit stub with the installed Xcode's iOS SDK gets it rejected as *“built with an SDK or version of Xcode that isn't supported”* (error 90534) — that Xcode's SDK is treated as pre-release. We already had a real, SDK-clean iOS binary lying around: Perry's own `--target ios` output. Perry links its own runtime and stamps a shipping SDK version, so it sailed through where `swiftc` did not. The stub is a Perry-compiled “this is an Apple Watch app” screen that, thanks to `LSApplicationLaunchProhibited`, never actually runs.
    
2.  **Icons need the dict, not just the key.** The watch app failed validation with *“a value for CFBundleIconName is missing”* even though `CFBundleIconName` was set and `Assets.car` was present. The validator wants the full structure: `CFBundleIconName` *and* a `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}` dictionary. Set only the top-level key and it insists the key is missing.
    
3.  **`WKWatchOnly` is rejected on a record that already distributes iOS builds.** If your App Store record has ever shipped an iOS build, a watch-only upload to it is refused, and you need a fresh app record (which the ASC API can't create — `POST /apps` returns 403, so you make it in the web UI). A record with only an *un-distributed* build is fine.
    

A couple of smaller invariants: the stub and the watch app must share the same `CFBundleVersion`, and you sign inside-out — the watch app first, then the stub — with `--generate-entitlement-der` and `get-task-allow=false`.

## Why this is a Perry story

None of the container plumbing is Perry-specific — it applies to any standalone watchOS app, whatever built it. But Perry is why dB Meter is a single 280-line TypeScript file that compiles to a native watch binary in the first place, and Perry is what produced the SDK-clean iOS stub that got past error 90534 when `swiftc` couldn't. Compiling for `arm64_32` also shook out a real codegen bug along the way — a typed-object string field was reading back as a garbage float on ILP32 because an inline class-field access baked in the 64-bit object-header size (24 bytes) instead of the target-aware 20 — the kind of thing you only find when you insist on supporting the older watches instead of quietly dropping them.

The whole pipeline — TypeScript to a universal watchOS binary to a signed, watch-only App Store build — now lives in a script we can re-run. If you're shipping a standalone watch app and Xcode is telling you it can't be done, it can: wrap it, flag it `ITSWatchOnlyContainer`, and hand it to `iTMSTransporter`.
