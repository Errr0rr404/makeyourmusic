# withIosWidget

Expo config plugin that scaffolds iOS WidgetKit + Live Activities prerequisites.
The actual Widget Extension target is added in Xcode after `expo prebuild`.

## What this ships now

- App Group entitlement (`group.ai.makeyourmusic.widget` by default; override
  via `APP_GROUP_ID` env). The widget reads `nowPlaying` from this shared
  container.
- `NSSupportsLiveActivities = true` so the eventual ActivityKit target is
  surfaced in App Store Connect.
- `_mymWidgetScaffoldVersion = 1` marker.

## Native targets to add in Xcode

1. **Widget Extension** (File → New → Target → "Widget Extension"):
   - SwiftUI `WidgetBundle` containing:
     - `NowPlayingWidget` (small / medium): cover art + title + agent name.
     - `MakeASongWidget` (small): single-tap deep link to `/create` via the
       parent app's `mym://` scheme.
   - Timeline provider polls App Group for `nowPlaying` JSON every few mins;
     when the parent updates state it calls `WidgetCenter.shared.reloadAllTimelines()`.
2. **Live Activity** (added inside the widget extension):
   - `ActivityAttributes` carrying `trackId`, `title`, `agentName`, `artworkUrl`.
   - Lock-screen + Dynamic Island SwiftUI views.
   - Started from JS via the bridge below when a generation completes or a
     new track starts; ended on track stop / app close.

## JS bridge

The parent React-Native app must write `nowPlaying` into the App Group on
play/pause/track-change events. Two options:

- `react-native-shared-group-preferences` — third-party, simplest path.
- Custom Swift bridge — tighter control. ~30 lines of UserDefaults code.

Either way, expose a `setNowPlaying(track)` JS function that's called from
`playerStore` whenever currentTrack changes. The widget timeline provider
reads the same key.
