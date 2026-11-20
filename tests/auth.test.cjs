const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real client code, replacing only native/network boundaries.
function load(file, dependencies = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../src/lib', file);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, Error, console, ...globals,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return exports;
}

const missingEntitlement = new Error("Calling the 'setValueWithKeyAsync' function has failed\n→ Caused by: A required entitlement isn't present.");
function storage({ os = 'ios', isDevice = false, failure = null } = {}) {
  let stored = null;
  let calls = 0;
  const native = async (fn) => { calls++; if (failure) throw failure; return fn(); };
  const { tokenStore } = load('token-store.ts', {
    'expo-device': { isDevice },
    'react-native': { Platform: { OS: os } },
    'expo-secure-store': {
      getItemAsync: () => native(() => stored),
      setItemAsync: (_key, value) => native(() => { stored = value; }),
      deleteItemAsync: () => native(() => { stored = null; }),
    },
  });
  return { tokenStore, calls: () => calls, stored: () => stored };
}

test('simulator entitlement failure supports signup, refresh and logout in memory', async () => {
  const { tokenStore, calls, stored } = storage({ failure: missingEntitlement });
  await tokenStore.set('first');
  assert.equal(await tokenStore.get(), 'first');
  await tokenStore.set('refreshed');
  assert.equal(await tokenStore.get(), 'refreshed');
  await tokenStore.clear();
  assert.equal(await tokenStore.get(), null);
  assert.equal(calls(), 1);
  assert.equal(stored(), null);
});

test('simulator handles entitlement errors during initial restore and clear', async () => {
  for (const operation of ['get', 'clear']) {
    const { tokenStore } = storage({ failure: missingEntitlement });
    await tokenStore[operation]();
    await tokenStore.set('session');
    assert.equal(await tokenStore.get(), 'session');
  }
});

test('simulator memory session does not survive an app restart', async () => {
  await storage({ failure: missingEntitlement }).tokenStore.set('session');
  assert.equal(await storage({ failure: missingEntitlement }).tokenStore.get(), null);
});

test('physical iPhones and Android never downgrade secure storage', async () => {
  for (const options of [{ isDevice: true }, { os: 'android' }]) {
    const { tokenStore } = storage({ ...options, failure: missingEntitlement });
    await assert.rejects(tokenStore.set('secret'), /secure sign-in storage/);
    await assert.rejects(tokenStore.get(), /secure sign-in storage/);
    await assert.rejects(tokenStore.clear(), /secure sign-in storage/);
  }
});

test('unrelated simulator Keychain failures remain errors', async () => {
  const { tokenStore } = storage({ failure: new Error('Device locked') });
  await assert.rejects(tokenStore.set('secret'), /secure sign-in storage/);
});

test('working native storage persists and removes credentials', async () => {
  const { tokenStore, stored } = storage({ isDevice: true });
  await tokenStore.set('secret');
  assert.equal(stored(), 'secret');
  assert.equal(await tokenStore.get(), 'secret');
  await tokenStore.clear();
  assert.equal(stored(), null);
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
const response = (status, body = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const tokens = (id) => ({ accessToken: `access-${id}`, refreshToken: `refresh-${id}` });
function client(fetch, overrides = {}) {
  let stored = null;
  const tokenStore = {
    get: async () => stored,
    set: async (value) => { stored = value; },
    clear: async () => { stored = null; },
    ...overrides,
  };
  return { ...load('api.ts', {
    'expo-file-system': {}, './config': { API_URL: 'https://example.test/api' }, './token-store': { tokenStore },
  }, { fetch }), stored: () => stored };
}

test('failed token storage never exposes a partially signed-in access token', async () => {
  let authorization;
  const c = client(async (_url, init) => {
    authorization = init.headers.Authorization;
    return response(200);
  }, { set: async () => { throw new Error('locked'); } });
  await assert.rejects(c.setTokens(tokens('one')), /locked/);
  await c.api.me.get();
  assert.equal(authorization, undefined);
});

test('sign-out wins over a slow credential write', async () => {
  const started = deferred();
  const release = deferred();
  let stored;
  const c = client(async () => response(200), {
    set: async (value) => { started.resolve(); await release.promise; stored = value; },
    clear: async () => { stored = null; },
  });
  const signingIn = c.setTokens(tokens('one'));
  await started.promise;
  const signingOut = c.setTokens(null);
  release.resolve();
  await Promise.all([signingIn, signingOut]);
  assert.equal(stored, null);
});

test('late refresh cannot resurrect a signed-out session or overwrite a new account', async () => {
  for (const next of [null, tokens('new-account')]) {
    const started = deferred();
    const release = deferred();
    const c = client(async () => { started.resolve(); return release.promise; });
    await c.setTokens(tokens('old'));
    const refreshing = c.refreshTokens();
    await started.promise;
    await c.setTokens(next);
    release.resolve(response(200, tokens('late')));
    assert.equal(await refreshing, false);
    assert.equal(c.stored(), next?.refreshToken ?? null);
  }
});

test('concurrent refresh callers share one request', async () => {
  let requests = 0;
  const c = client(async () => { requests++; return response(200, tokens('new')); });
  await c.setTokens(tokens('old'));
  assert.deepEqual(await Promise.all([c.refreshTokens(), c.refreshTokens()]), [true, true]);
  assert.equal(requests, 1);
  assert.equal(c.stored(), 'refresh-new');
});

test('an expired access token refreshes and retries with the new token', async () => {
  const seen = [];
  const c = client(async (url, init) => {
    if (url.endsWith('/auth/refresh')) return response(200, tokens('new'));
    seen.push(init.headers.Authorization);
    return seen.length === 1 ? response(401) : response(200, { id: 'user' });
  });
  await c.setTokens(tokens('old'));
  assert.equal((await c.api.me.get()).id, 'user');
  assert.deepEqual(seen, ['Bearer access-old', 'Bearer access-new']);
});

test('a late unauthorized request cannot sign out a different account', async () => {
  const started = deferred();
  const release = deferred();
  let signedOut = false;
  const c = client(async () => { started.resolve(); return release.promise; });
  c.setSignedOutHandler(() => { signedOut = true; });
  await c.setTokens(tokens('old'));
  const request = c.api.me.get();
  const rejected = assert.rejects(request, /session changed/);
  await started.promise;
  await c.setTokens(tokens('new'));
  release.resolve(response(401));
  await rejected;
  assert.equal(signedOut, false);
  assert.equal(c.stored(), 'refresh-new');
});

test('temporary refresh errors preserve the session for retry', async () => {
  for (const status of [0, 503]) {
    let signedOut = false;
    const c = client(async (url) => {
      if (!url.endsWith('/auth/refresh')) return response(401);
      if (!status) throw new Error('offline');
      return response(status);
    });
    c.setSignedOutHandler(() => { signedOut = true; });
    await c.setTokens(tokens('one'));
    await assert.rejects(c.api.me.get());
    assert.equal(signedOut, false);
    assert.equal(c.stored(), 'refresh-one');
  }
});

test('expired refresh token clears credentials and signs out', async () => {
  let signedOut = false;
  const c = client(async () => response(401));
  c.setSignedOutHandler(() => { signedOut = true; });
  await c.setTokens(tokens('one'));
  await assert.rejects(c.api.me.get());
  assert.equal(signedOut, true);
  assert.equal(c.stored(), null);
});

test('a second unauthorized response after refresh also signs out', async () => {
  let signedOut = false;
  const c = client(async (url) => url.endsWith('/auth/refresh') ? response(200, tokens('new')) : response(401));
  c.setSignedOutHandler(() => { signedOut = true; });
  await c.setTokens(tokens('one'));
  await assert.rejects(c.api.me.get());
  assert.equal(signedOut, true);
});

test('clearing a session removes all in-memory transcripts and prompts', () => {
  const { sessionStore } = load('session-store.ts');
  sessionStore.stash('session', { transcript: 'private', durationSeconds: 10 });
  sessionStore.setPrompts('session', ['private prompt']);
  sessionStore.clearAll();
  assert.equal(sessionStore.get('session'), undefined);
  assert.equal(sessionStore.getPrompts('session').length, 0);
});
