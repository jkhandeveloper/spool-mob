const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const { outputText } = ts.transpileModule(
  readFileSync(path.join(__dirname, '../src/lib/ios-speech.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
);
const moduleExports = {};
vm.runInNewContext(outputText, { exports: moduleExports });
const { prepareIOSRecording } = moduleExports;

test('iOS asks for microphone permission before checking offline capability', async () => {
  const calls = [];
  const result = await prepareIOSRecording({
    requestMicrophonePermissionsAsync: async () => { calls.push('microphone'); return { granted: true }; },
    supportsOnDeviceRecognition: () => { calls.push('offline'); return true; },
    isRecognitionAvailable: () => { throw new Error('Online service availability must not gate offline speech'); },
    requestPermissionsAsync: () => { throw new Error('Offline speech must not request online permission'); },
  }, true, () => false);
  assert.equal(result.state, 'ready');
  assert.deepEqual(calls, ['microphone', 'offline']);
});

test('denied microphone is reported as permission denial, not unsupported speech', async () => {
  const result = await prepareIOSRecording({
    requestMicrophonePermissionsAsync: async () => ({ granted: false }),
    supportsOnDeviceRecognition: () => { throw new Error('Must not run after denial'); },
  }, true, () => false);
  assert.equal(result.state, 'denied');
});

test('leaving or discarding during the permission prompt cannot start recording', async () => {
  let cancelled = false;
  const result = await prepareIOSRecording({
    requestMicrophonePermissionsAsync: async () => { cancelled = true; return { granted: true }; },
    supportsOnDeviceRecognition: () => { throw new Error('Must not run after cancellation'); },
  }, true, () => cancelled);
  assert.equal(result.state, 'cancelled');
});

test('missing native module and unsupported simulator get actionable messages', async () => {
  const missing = await prepareIOSRecording(null, true, () => false);
  assert.equal(missing.state, 'unsupported');
  assert.match(missing.message, /native iPhone build/);
  const simulator = await prepareIOSRecording({
    requestMicrophonePermissionsAsync: async () => ({ granted: true }),
    supportsOnDeviceRecognition: () => false,
  }, false, () => false);
  assert.equal(simulator.state, 'unsupported');
  assert.match(simulator.message, /Appetize.*does not support microphone/);
});

test('offline-unavailable iPhones never silently switch to network recognition', async () => {
  const result = await prepareIOSRecording({
    requestMicrophonePermissionsAsync: async () => ({ granted: true }),
    supportsOnDeviceRecognition: () => false,
  }, true, () => false);
  assert.equal(result.state, 'unsupported');
  assert.match(result.message, /offline speech/);
});
