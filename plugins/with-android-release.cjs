// Release setup for the generated Android project (used by CI, see .github/workflows/ci.yml).
//
// - Signs release builds (.aab / .apk) with the Play upload key when
//   ANDROID_UPLOAD_STORE_FILE is set; otherwise they keep Expo's debug signing,
//   so local and PR builds still work without the key.
// - Sets versionCode from ANDROID_VERSION_CODE, so every CI build gets a higher
//   one, as Google Play requires. versionName stays `expo.version` in app.json.
//
// EAS builds set neither variable, so they are unaffected (EAS manages its own
// versionCode and credentials).
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            if (System.getenv('ANDROID_UPLOAD_STORE_FILE')) {
                storeFile file(System.getenv('ANDROID_UPLOAD_STORE_FILE'))
                storePassword System.getenv('ANDROID_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('ANDROID_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_UPLOAD_KEY_PASSWORD')
            }
        }`;

/** Pure transform of android/app/build.gradle, exported for tests. */
function applyAndroidRelease(gradle, versionCode) {
  let out = gradle;

  if (!out.includes("System.getenv('ANDROID_UPLOAD_STORE_FILE')")) {
    // Point the release build type at the upload key when it is configured.
    // Done before adding signingConfigs.release, so this is the only `release {`.
    const buildType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!buildType.test(out)) {
      throw new Error('with-android-release: release signingConfig not found in app/build.gradle');
    }
    out = out.replace(
      buildType,
      "$1signingConfig System.getenv('ANDROID_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );

    const signingConfigs = /signingConfigs\s*\{/;
    if (!signingConfigs.test(out)) {
      throw new Error('with-android-release: signingConfigs block not found in app/build.gradle');
    }
    out = out.replace(signingConfigs, (match) => match + RELEASE_SIGNING);
  }

  if (versionCode !== undefined) {
    if (!/versionCode\s+\d+/.test(out)) {
      throw new Error('with-android-release: versionCode not found in app/build.gradle');
    }
    out = out.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  }
  return out;
}

function parseVersionCode(raw) {
  if (raw === undefined || raw === '') return undefined;
  const code = Number(raw);
  // Google Play's maximum versionCode is 2100000000.
  if (!Number.isInteger(code) || code < 1 || code > 2100000000) {
    throw new Error(`with-android-release: invalid ANDROID_VERSION_CODE "${raw}"`);
  }
  return code;
}

const withAndroidRelease = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('with-android-release: app/build.gradle must be Groovy');
    }
    cfg.modResults.contents = applyAndroidRelease(
      cfg.modResults.contents,
      parseVersionCode(process.env.ANDROID_VERSION_CODE),
    );
    return cfg;
  });

module.exports = withAndroidRelease;
module.exports.applyAndroidRelease = applyAndroidRelease;
module.exports.parseVersionCode = parseVersionCode;
