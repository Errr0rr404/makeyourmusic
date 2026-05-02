# withAppleWatch

Expo config plugin that scaffolds the iOS-side prerequisites for an Apple
Watch companion app. The actual WatchKit Extension target is added via Xcode
after running `expo prebuild`.

## What this ships now

- `WKWatchOnly = false` in the parent Info.plist (signals coupled rather
  than standalone watch app).
- `_mymWatchScaffoldVersion = 1` marker so the WatchKit target template
  knows the iOS-side wiring is in place.

## What requires native work next

1. **WatchKit Extension Xcode target.** In Xcode after prebuild:
   File → New → Target → "Watch App for iOS App". Bundle id pattern:
   `<parent-bundle-id>.watchkitapp`.
2. **WatchConnectivity** on iOS:
   - Add `WCSession` delegate that responds to `play`, `pause`, `skip` messages
     by forwarding them to the React-Native audio player (post a notification
     into the JS bridge or call the existing `expo-av` AudioModule directly).
   - On iOS app foreground, push current `nowPlaying` state to the paired
     watch via `WCSession.default.updateApplicationContext(...)`.
3. **Watch UI** (Swift):
   - One screen showing artwork + title + transport (play/pause/prev/next).
   - Wired to `WCSession.default.sendMessage` for transport actions.
   - Optional: complication on the modular face showing current-playing
     badge. Update via `CLKComplicationServer.sharedInstance().reloadTimeline`.

## Testing locally

```
expo prebuild --platform ios
# then in Xcode add the WatchKit target as described above
```
