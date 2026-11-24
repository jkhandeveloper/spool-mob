const assert = require('node:assert/strict');
const { test } = require('node:test');
const { applyAndroidRelease, parseVersionCode } = require('../plugins/with-android-release.cjs');

// Shape of the release section in Expo's generated android/app/build.gradle.
const GRADLE = `android {
    defaultConfig {
        applicationId 'net.spoolapp.spool'
        versionCode 1
        versionName "1.0.0"
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

test('release builds use the upload key when configured, debug otherwise', () => {
  const out = applyAndroidRelease(GRADLE);
  assert.match(out, /release \{\s+if \(System\.getenv\('ANDROID_UPLOAD_STORE_FILE'\)\)/);
  assert.match(out, /signingConfig System\.getenv\('ANDROID_UPLOAD_STORE_FILE'\) \? signingConfigs\.release : signingConfigs\.debug/);
  // The debug build type keeps debug signing.
  assert.match(out, /debug \{\s+signingConfig signingConfigs\.debug\s+\}/);
  assert.match(out, /versionCode 1\n/);
});

test('sets versionCode and is idempotent', () => {
  const once = applyAndroidRelease(GRADLE, 42);
  assert.match(once, /versionCode 42\n/);
  assert.equal(applyAndroidRelease(once, 42), once);
});

test('fails loudly when the template changes', () => {
  assert.throws(() => applyAndroidRelease('android { }'), /release signingConfig not found/);
});

test('validates ANDROID_VERSION_CODE', () => {
  assert.equal(parseVersionCode(undefined), undefined);
  assert.equal(parseVersionCode(''), undefined);
  assert.equal(parseVersionCode('57'), 57);
  assert.throws(() => parseVersionCode('abc'), /invalid/);
  assert.throws(() => parseVersionCode('0'), /invalid/);
});
