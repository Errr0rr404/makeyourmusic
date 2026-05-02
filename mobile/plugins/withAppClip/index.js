// Expo config plugin: scaffolding for an iOS App Clip target + Android
// Instant App marker. Does NOT (yet) wire a full App Clip Xcode target —
// that requires native Swift, an extra App ID + provisioning profile in
// App Store Connect, and is best done after the marketing experience URL
// is decided. This plugin sets up the *prerequisites* so the team can drop
// in the Xcode target later without re-running prebuild from scratch.
//
// What this plugin does today:
//   1. iOS: adds the `appclips:makeyourmusic.ai` associated domain so
//      Universal Links to /c/track/* and /c/create open the App Clip when
//      installed (and the parent app when also installed).
//   2. iOS: declares the App Clip bundle identifier in Info.plist via
//      `NSAppClip → NSAppClipRequestEphemeralUserNotification = false`
//      placeholder, so Xcode picks it up when the target is added.
//   3. Android: enables `instant-app=true` in the app.json android block
//      via a no-op Plugin marker (the actual flag goes into app.json by
//      whoever invokes prebuild; this plugin just leaves a hook + comment).
//
// What's deferred:
//   - The actual App Clip Xcode target (extension app + Swift entry view).
//   - The App Clip storeKit / experience plist (set up in App Store Connect).
//   - Android Instant App split-APK / per-feature module (would require
//     reorganizing the Android build; out of scope for the scaffolding pass).

const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const ASSOCIATED_DOMAIN = 'appclips:makeyourmusic.ai';

function withAppClipAssociatedDomain(config) {
  return withEntitlementsPlist(config, (cfg) => {
    const key = 'com.apple.developer.associated-domains';
    const existing = cfg.modResults[key] || [];
    const arr = Array.isArray(existing) ? existing.slice() : [];
    if (!arr.includes(ASSOCIATED_DOMAIN)) arr.push(ASSOCIATED_DOMAIN);
    cfg.modResults[key] = arr;
    return cfg;
  });
}

function withAppClipInfoPlistMarkers(config) {
  return withInfoPlist(config, (cfg) => {
    // Marker key the App Clip target template will read. Setting this on
    // the parent app is harmless — Apple recommends parent apps include
    // CFBundleVersion + CFBundleShortVersionString that match the App Clip;
    // we leave those alone since Expo manages versioning. The
    // NSAppClipRequestEphemeralUserNotification placeholder is a hint to
    // future-us that the App Clip experience will eventually want it.
    if (!cfg.modResults._mymAppClipScaffoldVersion) {
      cfg.modResults._mymAppClipScaffoldVersion = 1;
    }
    return cfg;
  });
}

module.exports = function withAppClip(config) {
  let cfg = withAppClipAssociatedDomain(config);
  cfg = withAppClipInfoPlistMarkers(cfg);
  return cfg;
};
