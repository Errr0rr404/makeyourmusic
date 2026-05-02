// Expo config plugin: scaffolding for an Apple Watch companion app target.
//
// Apple Watch companion apps are a separate Xcode target paired with the
// parent iOS app via the WKCompanionAppBundleIdentifier Info.plist key on
// the watch side and the matching watch-app embed on the iOS side. Setting
// up the actual native target requires running prebuild then adding the
// target through Xcode; this plugin sets up the prerequisites so a native
// developer can drop in the WatchKit target without re-running prebuild.
//
// What this plugin does today:
//   1. iOS: declares the watch entitlements in the parent app's Info.plist
//      so push tokens registered against the parent are reusable from the
//      watch (transport play/pause/skip via background notifications).
//   2. iOS: marks `_mymWatchScaffoldVersion = 1` on Info.plist so the
//      eventual WatchKit target template knows scaffolding is in place.
//   3. iOS: adds the `WKWatchOnly = false` declaration so the watch app is
//      coupled to the parent rather than acting as a standalone app.
//
// What's deferred (requires native Xcode work):
//   - The actual WatchKit Extension Xcode target (Swift entrypoint, app
//     icon, ComplicationController).
//   - WatchConnectivity session wiring on the iOS side (the watch will
//     send `requestPlay` / `requestPause` / `requestSkip` messages; the
//     iOS app needs a WCSessionDelegate to forward those to the audio
//     player).
//   - Now-playing fetch on watch launch (calls /api/tracks/me/current via
//     the parent's auth token shared via the watch app's app group).

const { withInfoPlist } = require('@expo/config-plugins');

function withAppleWatchInfoPlistMarkers(config) {
  return withInfoPlist(config, (cfg) => {
    // Scaffolding version marker — the WatchKit target template reads this
    // to detect that the iOS-side prerequisites are in place.
    if (!cfg.modResults._mymWatchScaffoldVersion) {
      cfg.modResults._mymWatchScaffoldVersion = 1;
    }
    // The companion app is paired (not standalone). When we add the
    // WatchKit target this becomes meaningful; setting it now keeps the
    // parent Info.plist consistent.
    cfg.modResults.WKWatchOnly = false;
    return cfg;
  });
}

module.exports = function withAppleWatch(config) {
  return withAppleWatchInfoPlistMarkers(config);
};
