# Native Expo Config Plugins

Three plugins are wired into `app.json`:

| Plugin | What it does | Apple-gated? |
|---|---|---|
| `withCarPlay` | iOS CarPlay audio entitlement + UIBackgroundModes | **YES** — needs CarPlay capability grant from Apple (apply at https://developer.apple.com/contact/carplay/) |
| `withAndroidAuto` | Android Auto media-browser metadata + automotive XML | No — ships immediately |
| `withShareExtension` | iOS "Make a song about this" Share Extension target with App Group | Partial — needs App Group ID created in App Store Connect |

## How to ship

```bash
cd mobile
npx expo prebuild --clean
eas build -p ios   # iOS bits
eas build -p android  # Android Auto
```

After the iOS prebuild, open `ios/<App>.xcworkspace` once and confirm the
`Share` target appears with the right entitlements file. EAS handles
provisioning profiles automatically on first build.

## Apple Developer prerequisites

**For CarPlay:**
1. Apply for CarPlay capability at https://developer.apple.com/contact/carplay/
   (Apple grants this case-by-case; "music apps" is one of the allowed categories.)
2. After approval, enable CarPlay in App Store Connect → Identifiers → your bundle ID → Capabilities.

**For the Share Extension:**
1. App Store Connect → Identifiers → App Groups → "+" → name it `group.com.worldofz.makeyourmusic`.
2. Enable that App Group on the main app's bundle ID.
3. (No separate ID needed for the extension — `eas build` creates one automatically.)

## What the plugins do NOT do

- Apply for CarPlay on your behalf (Apple does this manually)
- Create App Groups in App Store Connect (you do this once, in the web portal)
- Wire up the JS-side native bridge for reading the share-extension payload — `services/sharePayloadService.ts` references a `ShareGroupModule` that needs to be implemented as an iOS native module post-prebuild. Without it, share-extension payloads still land in the App Group container; the host app just won't auto-route to /create.
