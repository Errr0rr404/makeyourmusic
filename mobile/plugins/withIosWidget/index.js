// Expo config plugin: scaffolding for iOS WidgetKit targets — home-screen,
// lock-screen, and Live Activities (Dynamic Island) for currently-playing
// tracks. Like the Apple Watch / App Clip plugins, the actual Xcode target
// is added via Xcode after `expo prebuild`; this plugin sets up the iOS
// prerequisites so the Widget Extension target can read the parent app's
// state via App Group shared storage.
//
// What this plugin does today:
//   1. iOS: declares an App Group identifier so the widget can read
//      `nowPlaying` written by the parent app. The app group id pattern
//      is `group.<bundle id>.widget` (override via APP_GROUP_ID env at
//      prebuild time).
//   2. iOS: declares Live Activities support
//      (NSSupportsLiveActivities=true) so the eventual ActivityKit target
//      is granted by Apple.
//   3. iOS: marks _mymWidgetScaffoldVersion = 1 on Info.plist so the
//      Widget Extension template knows the iOS-side prerequisites are
//      complete.
//
// What's deferred (requires native Xcode + Swift work):
//   - The actual Widget Extension Xcode target (SwiftUI views, timeline
//     provider, Intent handler for "tap to make a song").
//   - The Live Activity ActivityAttributes + Lock-Screen / Dynamic Island
//     SwiftUI views.
//   - The bridge module on the JS side that writes nowPlaying state into
//     the App Group container (use `react-native-shared-group-preferences`
//     or roll a small Swift bridge).

const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

function appGroupId() {
  const override = process.env.APP_GROUP_ID;
  if (override && override.startsWith('group.')) return override;
  // Default pattern. Production deployments should override via env.
  return 'group.ai.makeyourmusic.widget';
}

function withWidgetEntitlements(config) {
  return withEntitlementsPlist(config, (cfg) => {
    const key = 'com.apple.security.application-groups';
    const existing = cfg.modResults[key] || [];
    const arr = Array.isArray(existing) ? existing.slice() : [];
    const groupId = appGroupId();
    if (!arr.includes(groupId)) arr.push(groupId);
    cfg.modResults[key] = arr;
    return cfg;
  });
}

function withWidgetInfoPlist(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    if (!cfg.modResults._mymWidgetScaffoldVersion) {
      cfg.modResults._mymWidgetScaffoldVersion = 1;
    }
    return cfg;
  });
}

module.exports = function withIosWidget(config) {
  let cfg = withWidgetEntitlements(config);
  cfg = withWidgetInfoPlist(cfg);
  return cfg;
};
