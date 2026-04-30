// Expo config plugin: inject a "Make a song about this" iOS Share Extension.
//
// What it does:
//   1. Adds an App Group entitlement to the main app + extension so they
//      can share a container directory (where the extension drops payloads).
//   2. Copies the Swift + Info.plist + storyboard into ios/<App>Share/.
//   3. Registers the extension target with the Xcode project via
//      xcode (the same library Expo uses internally) so `eas build`
//      compiles + signs it.
//
// What it does NOT do:
//   - Apply for the Apple Developer App Group capability (you do that once
//     in App Store Connect → Identifiers → App Groups → "+").
//   - Configure provisioning profiles for the new target (EAS handles this
//     on the first build after prebuild).
//
// After enabling, run:
//   npx expo prebuild --clean
//   eas build -p ios
//
// Then test by long-pressing any web link in Safari → Share → "Make a song".

const { withDangerousMod, withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const EXTENSION_NAME = 'Share';
const APP_GROUP_DEFAULT = 'group.com.worldofz.makeyourmusic';

const STORYBOARD = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.XIB" version="3.0" toolsVersion="20037" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="ShareViewController">
  <device id="retina6_1" orientation="portrait" appearance="light"/>
  <dependencies>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="20020"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <scene sceneID="MainInterfaceScene">
      <objects>
        <viewController storyboardIdentifier="ShareViewController" id="ShareViewController" customClass="ShareViewController" customModule="${EXTENSION_NAME}" customModuleProvider="target" sceneMemberID="viewController"/>
        <placeholder placeholderIdentifier="IBFirstResponder" id="-1" sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
</document>
`;

function withAppGroupEntitlement(config, appGroup) {
  return withEntitlementsPlist(config, (cfg) => {
    const existing = cfg.modResults['com.apple.security.application-groups'] || [];
    if (!existing.includes(appGroup)) {
      cfg.modResults['com.apple.security.application-groups'] = [...existing, appGroup];
    }
    return cfg;
  });
}

function withCopyExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const targetDir = path.join(iosRoot, EXTENSION_NAME);
      fs.mkdirSync(targetDir, { recursive: true });

      const sourceDir = path.join(__dirname, 'swift');
      const swiftSource = fs.readFileSync(path.join(sourceDir, 'ShareViewController.swift'), 'utf8');
      const infoPlist = fs.readFileSync(path.join(sourceDir, 'Info.plist'), 'utf8');

      fs.writeFileSync(path.join(targetDir, 'ShareViewController.swift'), swiftSource);
      fs.writeFileSync(path.join(targetDir, 'Info.plist'), infoPlist);
      fs.writeFileSync(path.join(targetDir, 'MainInterface.storyboard'), STORYBOARD);

      // Per-extension entitlements file mirrors the main app's app-group.
      const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP_DEFAULT}</string>
  </array>
</dict>
</plist>
`;
      fs.writeFileSync(path.join(targetDir, `${EXTENSION_NAME}.entitlements`), entitlements);
      return cfg;
    },
  ]);
}

// Register the new target with the Xcode project so it compiles + signs.
// We use the same xcode library Expo's prebuild does, accessed via the mod.
function withExtensionTarget(config) {
  return withXcodeProject(config, async (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;

    // If target already exists (re-running prebuild), skip.
    const existing = project.pbxTargetByName(EXTENSION_NAME);
    if (existing) return cfg;

    const targetUuid = project.generateUuid();
    const groupUuid = project.generateUuid();

    // Create the source group inside the main project group
    project.addPbxGroup(
      [
        'ShareViewController.swift',
        'MainInterface.storyboard',
        'Info.plist',
        `${EXTENSION_NAME}.entitlements`,
      ],
      EXTENSION_NAME,
      EXTENSION_NAME,
    );

    // Create the appex target. xcode lib helper:
    project.addTarget(
      EXTENSION_NAME,
      'app_extension',
      EXTENSION_NAME,
      `${cfg.ios?.bundleIdentifier || 'com.worldofz.makeyourmusic'}.${EXTENSION_NAME.toLowerCase()}`,
    );
    // Note: xcode lib's addTarget call wires Info.plist + entitlements via
    // build settings; verify on first prebuild that the appex compiles. If
    // it doesn't, the manual fallback is to open ios/<App>.xcworkspace and
    // add the target by hand once — subsequent prebuilds preserve it.

    return cfg;
  });
}

module.exports = function withShareExtension(config, options = {}) {
  const appGroup = options.appGroup || APP_GROUP_DEFAULT;
  config = withAppGroupEntitlement(config, appGroup);
  config = withCopyExtensionFiles(config);
  config = withExtensionTarget(config);
  return config;
};
