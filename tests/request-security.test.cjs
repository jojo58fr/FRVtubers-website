const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./load-source.cjs');
const { NextRequest } = require('next/server');

test('the public image optimizer is disabled as containment without removing original images', () => {
  const config = loadSource()('next.config.ts').default;
  assert.equal(config.images.unoptimized, true);
});

test('an expiry-only invalidated session never counts as a signed-in client identity', () => {
  const { hasSessionIdentity } = loadSource()('src/lib/session-identity.ts');
  for (const session of [undefined, null, {}, { expires: 'future' }, { user: {} }, { user: { id: '' } }]) {
    assert.equal(hasSessionIdentity(session), false);
  }
  assert.equal(hasSessionIdentity({ user: { id: 'existing-user' } }), true);
});

test('private cache headers do not grant new CORS access to staff or preference endpoints', () => {
  const { middleware } = loadSource()('middleware.ts');
  for (const pathname of ['/api/admin/users', '/api/user/preferences']) {
    const response = middleware(new NextRequest('https://site.test' + pathname, {
      headers: { Origin: 'https://stream.frvtubers.com' },
    }));
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
});

test('mutation origins are exact; configured applications and server clients still work', () => {
  const load = loadSource({ env: { NEXTAUTH_CORS_ALLOWED_ORIGINS: 'https://stream.test, https://resources.test' } });
  const { isTrustedMutation } = load('src/lib/request-security.ts');
  const check = headers => isTrustedMutation(new Request('https://site.test/api/private', { method: 'POST', headers }));
  assert.equal(check({ Origin: 'https://site.test' }), true);
  assert.equal(check({ Origin: 'https://stream.test' }), true);
  assert.equal(check({ Origin: 'https://resources.test' }), true);
  assert.equal(check({}), true); // existing non-browser cookie clients
  for (const origin of ['null', 'https://site.test.evil.test', 'https://unlisted.site.test', 'http://site.test']) {
    assert.equal(check({ Origin: origin }), false);
  }
  assert.equal(check({ 'sec-fetch-site': 'cross-site' }), false);
  assert.equal(check({ 'sec-fetch-site': 'same-site' }), false);
});

test('bounded JSON parser rejects excessive bytes, primitives, arrays and malformed requests', async () => {
  const { readJsonObject } = loadSource()('src/lib/request-security.ts');
  const request = body => new Request('https://site.test', { method: 'POST', body });
  assert.equal((await readJsonObject(request('{"theme":"dark"}'))).theme, 'dark');
  for (const body of ['null', '[]', '42', '"hello"', '{bad']) {
    await assert.rejects(readJsonObject(request(body)));
  }
  await assert.rejects(readJsonObject(request('é'.repeat(5000))), /Body too large/);
});

test('webhook failure logs include only event and status, never response content or secrets', async () => {
  const logs = [];
  const sent = [];
  const load = loadSource({ env: { DISCORD_RESOURCES_WEBHOOK_URL: 'https://discord.test/private-token' },
    fetch: async (_url, options) => {
      sent.push(JSON.parse(options.body));
      return new Response('private-token email@example.test', { status: 403 });
    },
    console: { warn: (...a) => logs.push(a), error: (...a) => logs.push(a) },
  });
  await load('src/lib/resources-webhook.ts').notifyResourcePublished({ id: 'id', assetTitle: 'Private name', assetUrl: 'https://asset.test' });
  assert.match(JSON.stringify(logs), /discord.webhook_failed/);
  assert.match(JSON.stringify(logs), /403/);
  assert.doesNotMatch(JSON.stringify(logs), /private-token|email@example|Private name/);
  assert.deepEqual(sent[0].allowed_mentions, { parse: [] });
  assert.equal(sent[0].components[0].allowed_mentions, undefined);
  assert.equal(sent[0].components[0].components[0].url, 'https://asset.test');
});
