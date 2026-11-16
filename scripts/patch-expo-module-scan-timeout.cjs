const fs = require('node:fs');
const path = require('node:path');

// Expo SDK 58 scans every linked Swift package while generating the iOS modules
// provider. Its built-in 5-second limit is too short on a cold GitHub macOS
// runner and leaves required modules out of the provider, which makes Xcode fail.
const autolinkingPackagePath = require.resolve('expo-modules-autolinking/package.json');
const scannerPath = path.join(
  path.dirname(autolinkingPackagePath),
  'build',
  'platforms',
  'apple',
  'moduleScanner.js'
);

const originalTimeout = /timeout:\s*5000\b/;
const patchedTimeout = 'timeout: 60000';
const scannerSource = fs.readFileSync(scannerPath, 'utf8');

if (scannerSource.includes(patchedTimeout)) {
  console.log('Expo iOS module scan timeout is already 60 seconds.');
  process.exit(0);
}

if (!originalTimeout.test(scannerSource)) {
  throw new Error(
    `Could not find Expo's 5-second module scan timeout in ${scannerPath}. ` +
      'Review this patch when upgrading expo-modules-autolinking.'
  );
}

fs.writeFileSync(scannerPath, scannerSource.replace(originalTimeout, patchedTimeout));
console.log('Raised Expo iOS module scan timeout from 5 to 60 seconds.');
