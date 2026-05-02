# withAppClip

Expo config plugin that lays groundwork for an **iOS App Clip** + Android
Instant App.

## What this plugin does

- Adds `appclips:makeyourmusic.ai` to the iOS associated domains so the
  App Clip will trigger from Universal Links to `/c/track/<slug>` and
  `/c/create` once the App Clip target ships.
- Sets a private `_mymAppClipScaffoldVersion` marker in `Info.plist` for
  future App Clip target tooling to read.

## Manual follow-up (when the App Clip ships)

1. **App Store Connect → Identifiers**: create a new App ID with the
   `App Clip` capability, e.g. `com.worldofz.makeyourmusic.Clip`.
2. **Xcode**: add an "App Clip" target to the project after a `prebuild`.
   Set the bundle id to the one above, set the parent app to the existing
   target, copy the marketing image and the App Clip experience plist.
3. **Backend**: serve `/.well-known/apple-app-site-association` with an
   `appclips` block listing `<TEAM>.com.worldofz.makeyourmusic.Clip`. The
   frontend's `frontend/app/.well-known/apple-app-site-association/route.ts`
   is the right place.
4. **App Clip URL handler**: route `/c/track/<slug>` and `/c/create` to a
   minimal SwiftUI view that calls our `/api/v1/music/generate` (or shows a
   trimmed "make a song" wizard) without requiring a full app install.

## Android Instant App

The `mobile/app.json` `android.intentFilters` already declares the
`/track/*`, `/agent/*`, etc. deep links with `autoVerify: true`. Turn on
Instant Apps by adding `"instantApp": true` to the `android` block (this
plugin is the placeholder for that — kept out of the plugin so the user
can opt in deliberately, since Instant Apps require restructuring the APK
into feature modules).
