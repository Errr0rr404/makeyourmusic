// Expo config plugin: enable Android Auto support.
//
// Android Auto for media apps is much lighter than CarPlay:
//   1. Declare automotiveApp metadata pointing to a resource
//   2. Add AndroidManifest entries that flag the app as a media browser
//   3. react-native-track-player exposes MediaBrowserService automatically
//      once these are declared.
//
// Usage:
//   "plugins": ["./plugins/withAndroidAuto"]

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const AUTOMOTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
  <uses name="media"/>
</automotiveApp>
`;

function withAutomotiveMetadata(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) return cfg;

    application['meta-data'] = application['meta-data'] || [];
    const exists = application['meta-data'].some(
      (m) => m.$['android:name'] === 'com.google.android.gms.car.application'
    );
    if (!exists) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application',
          'android:resource': '@xml/automotive_app_desc',
        },
      });
    }
    return cfg;
  });
}

function withAutomotiveResource(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'automotive_app_desc.xml'), AUTOMOTIVE_XML);
      return cfg;
    },
  ]);
}

module.exports = function withAndroidAuto(config) {
  config = withAutomotiveMetadata(config);
  config = withAutomotiveResource(config);
  return config;
};
