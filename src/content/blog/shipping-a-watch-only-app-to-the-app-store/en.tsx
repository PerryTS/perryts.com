export default function Content() {
  return (
    <>
      <p>
        <strong>dB Meter</strong> is a sound-level meter for Apple Watch — a standalone watchOS app with no iPhone counterpart, compiled from a single TypeScript file with Perry. Getting it to build and run on the watch was the part we expected to be hard. The part that actually cost a day was getting it <em>into the App Store</em>. Every documented upload path refuses a standalone watchOS app, and the workaround that does work is written down almost nowhere. This post is that missing page.
      </p>
      <p>
        The short version: to ship a watch-only app you wrap it in an iOS <em>container stub</em> flagged <code>ITSWatchOnlyContainer</code>, and upload it with <code>iTMSTransporter</code> — not Xcode, not <code>altool</code>. The long version has three landmines that each cost a round-trip to Apple&apos;s servers to discover.
      </p>

      <h2>The app</h2>
      <p>
        dB Meter is a <code>WKWatchOnly</code> app: it runs on the watch by itself, no paired iPhone app required. Perry compiles the TypeScript straight to a native watchOS binary and ships it as a <strong>universal</strong> slice — <code>arm64</code> for Series 9/10/11 and the Ultras, plus <code>arm64_32</code> (ILP32: 64-bit registers, 32-bit pointers) for Series 4 through 8 and the SE. That second slice matters: without it, everything from the Series 4 to the SE 2 simply can&apos;t install the app. Keeping <code>arm64_32</code> alive turns out to be the constraint that rules out the obvious workaround.
      </p>

      <h2>Nothing will upload a standalone watch app</h2>
      <p>
        A watch-only <code>.ipa</code> is a bundle whose top-level app declares <code>CFBundleSupportedPlatforms = [WatchOS]</code>. Apple&apos;s command-line delivery tools do not know what to do with that:
      </p>
      <pre><code>{`# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS`}</code></pre>
      <p>
        So you turn to Xcode. But <code>xcodebuild -exportArchive</code> with <code>method: app-store-connect</code> fails during method enumeration, and the reason is instructive — on Xcode 26 the distribution-method registry has <em>no App Store option at all</em> for a watchOS archive:
      </p>
      <pre><code>{`Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect`}</code></pre>
      <p>
        The Organizer GUI shows the exact same three tiles — Release Testing, Enterprise, Debugging, and a &ldquo;Custom&rdquo; that leads nowhere useful. Ad hoc, enterprise, development. No App Store. On the version of Xcode installed today, there is no supported way to push a standalone watch app to App Store Connect through Apple&apos;s own front doors.
      </p>

      <h2>The companion trap</h2>
      <p>
        The tempting escape hatch is to stop being watch-only. Ship a real iOS app that happens to <em>embed</em> the watch app at <code>Payload/YourApp.app/Watch/</code>, the way watch apps were delivered for years. That uploads cleanly with <code>altool --type ios</code>, because the top-level bundle is a normal iOS app.
      </p>
      <p>
        It also walks you into two problems. First, App Store Connect now sees an iPhone app and <strong>demands iPhone screenshots</strong> — and an iPhone app that does nothing but say &ldquo;open this on your Watch&rdquo; is a candidate for a 4.2 minimum-functionality rejection. Second, and fatally for us: an iOS <em>top-level</em> binary may not contain an <code>arm64_32</code> slice. Apple&apos;s validator rejects it:
      </p>
      <pre><code>{`Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.`}</code></pre>
      <p>
        So the companion structure forces you to strip <code>arm64_32</code> and go arm64-only, which drops every Series 4–8 and SE watch — including the Series 7 we were testing on. The companion trap trades your older-watch support for an upload that works. We didn&apos;t want that trade.
      </p>

      <h2>The watch-only container</h2>
      <p>
        The real answer keeps the watch app watch-only <em>and</em> keeps <code>arm64_32</code>. You nest the watch app inside a tiny iOS <strong>container stub</strong>, and you flag the stub so App Store Connect treats the whole thing as a watch-only product. Two Info.plist keys do the flagging, and they are the entire trick:
      </p>
      <pre><code>{`Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true`}</code></pre>
      <p>
        <code>ITSWatchOnlyContainer=true</code> tells App Store Connect &ldquo;this iOS bundle is only a delivery vehicle for the watch app inside it.&rdquo; That single key is what makes the iPhone-screenshot requirement disappear — the store classifies the product as watch-only. <code>LSApplicationLaunchProhibited=true</code> says the stub is never launched, so it doesn&apos;t need to be a real app; it just needs to exist so the top-level platform reads as iOS and the delivery tools stop complaining. The watch app inside keeps <code>WKWatchOnly=true</code> and <em>no</em> <code>WKCompanionAppBundleIdentifier</code> — it is not a companion to the stub, the stub is a wrapper around it.
      </p>
      <p>
        The stub&apos;s remaining Info.plist keys are boilerplate that the validator insists on: <code>UIDeviceFamily=[1,2]</code>, all four <code>UISupportedInterfaceOrientations</code>, <code>CFBundleSupportedPlatforms=[iPhoneOS]</code>, and — because the stub is arm64 — <code>UIRequiredDeviceCapabilities=[arm64]</code>. The stub carries no icons at all; the watch app carries them.
      </p>
      <p>
        Then you upload with <code>iTMSTransporter</code>, whose <code>-assetFile</code> mode is happy now that the top-level bundle is iOS:
      </p>
      <pre><code>{`xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \\
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully`}</code></pre>
      <p>
        The build lands on App Store Connect as a watchOS build, <code>arm64_32</code> intact, and the version stops asking for iPhone screenshots.
      </p>

      <h2>Three landmines on the way</h2>
      <p>
        Each of these was a failed upload that came back from Apple&apos;s validator, not something the local tooling caught:
      </p>
      <ol>
        <li>
          <p>
            <strong>The stub can&apos;t be a fresh <code>swiftc</code> binary.</strong> Compiling a trivial UIKit stub with the installed Xcode&apos;s iOS SDK gets it rejected as <em>&ldquo;built with an SDK or version of Xcode that isn&apos;t supported&rdquo;</em> (error 90534) — that Xcode&apos;s SDK is treated as pre-release. We already had a real, SDK-clean iOS binary lying around: Perry&apos;s own <code>--target ios</code> output. Perry links its own runtime and stamps a shipping SDK version, so it sailed through where <code>swiftc</code> did not. The stub is a Perry-compiled &ldquo;this is an Apple Watch app&rdquo; screen that, thanks to <code>LSApplicationLaunchProhibited</code>, never actually runs.
          </p>
        </li>
        <li>
          <p>
            <strong>Icons need the dict, not just the key.</strong> The watch app failed validation with <em>&ldquo;a value for CFBundleIconName is missing&rdquo;</em> even though <code>CFBundleIconName</code> was set and <code>Assets.car</code> was present. The validator wants the full structure: <code>CFBundleIconName</code> <em>and</em> a <code>CFBundleIcons → CFBundlePrimaryIcon → &#123;CFBundleIconName, CFBundleIconFiles&#125;</code> dictionary. Set only the top-level key and it insists the key is missing.
          </p>
        </li>
        <li>
          <p>
            <strong><code>WKWatchOnly</code> is rejected on a record that already distributes iOS builds.</strong> If your App Store record has ever shipped an iOS build, a watch-only upload to it is refused, and you need a fresh app record (which the ASC API can&apos;t create — <code>POST /apps</code> returns 403, so you make it in the web UI). A record with only an <em>un-distributed</em> build is fine.
          </p>
        </li>
      </ol>
      <p>
        A couple of smaller invariants: the stub and the watch app must share the same <code>CFBundleVersion</code>, and you sign inside-out — the watch app first, then the stub — with <code>--generate-entitlement-der</code> and <code>get-task-allow=false</code>.
      </p>

      <h2>Why this is a Perry story</h2>
      <p>
        None of the container plumbing is Perry-specific — it applies to any standalone watchOS app, whatever built it. But Perry is why dB Meter is a single 280-line TypeScript file that compiles to a native watch binary in the first place, and Perry is what produced the SDK-clean iOS stub that got past error 90534 when <code>swiftc</code> couldn&apos;t. Compiling for <code>arm64_32</code> also shook out a real codegen bug along the way — a typed-object string field was reading back as a garbage float on ILP32 because an inline class-field access baked in the 64-bit object-header size (24 bytes) instead of the target-aware 20 — the kind of thing you only find when you insist on supporting the older watches instead of quietly dropping them.
      </p>
      <p>
        The whole pipeline — TypeScript to a universal watchOS binary to a signed, watch-only App Store build — now lives in a script we can re-run. If you&apos;re shipping a standalone watch app and Xcode is telling you it can&apos;t be done, it can: wrap it, flag it <code>ITSWatchOnlyContainer</code>, and hand it to <code>iTMSTransporter</code>.
      </p>
    </>
  );
}
