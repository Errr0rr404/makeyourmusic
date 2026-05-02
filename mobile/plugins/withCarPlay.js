// Expo config plugin: enable CarPlay audio for the iOS target.
//
// Adds:
//   1. com.apple.developer.carplay-audio entitlement (requires Apple's
//      separate CarPlay capability grant — apply at:
//      https://developer.apple.com/contact/carplay/)
//   2. UIBackgroundModes already includes "audio" in app.json — kept here as
//      a sanity merge in case it gets removed.
//
// Usage in app.config.js / app.json:
//   "plugins": ["./plugins/withCarPlay"]
//
// Then run `npx expo prebuild --clean && eas build -p ios`.
//
// Notes:
//   - react-native-track-player auto-discovers the CarPlay scene via
//     MPPlayableContentManager. No additional Swift code required for the
//     audio category — it inherits the now-playing info already published.
//   - For a custom CarPlay UI (browse/search), implement a CPTemplateApplicationSceneDelegate
//     in mobile/ios/<App>/SceneDelegate. We're not doing that here because
//     the simple now-playing template covers 95% of music app needs.
//
// Phase 4 — voice-controlled creation in CarPlay:
//   The backend already has POST /api/ai/voice-create which transcribes +
//   generates in one shot. To wire this to a CarPlay button:
//     1. Add a CPListTemplate item "🎙 Make a song with my voice" to the
//        CarPlay scene delegate.
//     2. On tap, present a CPListItem → Siri intent that records ~10s and
//        POSTs the audio multipart to /api/ai/voice-create with the user's
//        bearer token (already on file via SecureStore).
//     3. When the response arrives, enqueue the resulting MusicGeneration
//        audioUrl onto react-native-track-player's queue and start playback.
//   The native CPListTemplate scene delegate is invasive and gated on
//   Apple's CarPlay capability grant (apply at the URL above). The
//   endpoint + the in-app voice button are shipped; CarPlay polish is a
//   follow-up that needs the Apple grant.

const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

function withCarPlayEntitlements(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.carplay-audio'] = true;
    return cfg;
  });
}

function withCarPlayInfoPlist(config) {
  return withInfoPlist(config, (cfg) => {
    const existing = cfg.modResults.UIBackgroundModes || [];
    if (!existing.includes('audio')) {
      cfg.modResults.UIBackgroundModes = [...existing, 'audio'];
    }
    // Hint to the OS that the app supports CarPlay so it shows in the
    // CarPlay app picker. Optional but improves UX for the user.
    cfg.modResults.UIApplicationSceneManifest = cfg.modResults.UIApplicationSceneManifest || {
      UIApplicationSupportsMultipleScenes: true,
      UISceneConfigurations: {},
    };
    return cfg;
  });
}

module.exports = function withCarPlay(config) {
  config = withCarPlayEntitlements(config);
  config = withCarPlayInfoPlist(config);
  return config;
};
