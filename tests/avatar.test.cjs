const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadSource, root } = require('./load-source.cjs');
const discordId = '123456789012345678';
const avatarHash = 'a'.repeat(32);
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);

function fixture(options = {}) {
  const writes = [], removed = [], requests = [];
  const load = loadSource({ ...options,
    mocks: { 'node:fs/promises': {
      mkdir: async () => {},
      stat: async () => { if (options.exists) return {}; throw Object.assign(new Error(), { code: 'ENOENT' }); },
      unlink: async file => removed.push(file),
      writeFile: async (file, data) => writes.push([file, data]),
    } },
    fetch: async (url, config) => {
      requests.push([url, config]);
      return new Response(options.body ?? png);
    },
  });
  const api = load('src/lib/discord-avatar.ts');
  const save = overrides => api.persistDiscordAvatar({
    discordId, avatarHash, extension: 'png', sourceUrl: api.buildDiscordAvatarUrl(discordId, avatarHash), ...overrides,
  });
  return { api, save, writes, removed, requests };
}

test('new public avatar filenames are opaque, stable per image, and use only the canonical HTTPS CDN', async () => {
  const { save, writes, removed, requests } = fixture();
  const first = await save();
  const second = await save();
  assert.equal(first.publicPath, second.publicPath);
  assert.match(first.publicPath, /^\/avatars\/discord\/[a-f0-9]{64}\.png$/);
  assert.ok(!first.publicPath.includes(discordId));
  assert.ok(!first.publicPath.includes(avatarHash));
  assert.ok(first.absolutePath.startsWith(path.join(root, 'public', 'avatars', 'discord') + path.sep));
  assert.equal(requests[0][1].redirect, 'error');
  assert.equal(writes.length, 2);
  assert.equal(removed.length, 0);
});

test('existing opaque files are reused without download or deletion', async () => {
  const { save, writes, removed, requests } = fixture({ exists: true });
  await save();
  assert.equal(writes.length + requests.length + removed.length, 0);
});

test('avatar source, path components, extension and bytes are validated before writing', async () => {
  const { save, writes, requests } = fixture();
  for (const override of [{ discordId: '../private' }, { avatarHash: '../../secret' }, { extension: 'svg' },
    { sourceUrl: 'http://127.0.0.1/private' }, { sourceUrl: 'https://evil.test/pixel' }]) {
    await assert.rejects(save(override));
  }
  assert.equal(requests.length + writes.length, 0);
  const invalid = fixture({ body: '<svg onload="alert(1)"></svg>' });
  await assert.rejects(invalid.save(), /Unexpected avatar format/);
  assert.equal(invalid.writes.length, 0);
  const oversized = fixture({ body: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await assert.rejects(oversized.save(), /Avatar too large/);
  assert.equal(oversized.writes.length, 0);
});

test('legacy paths still resolve; traversal and sibling files can never be deleted', async () => {
  const { api, removed } = fixture();
  assert.equal(api.isLocalDiscordAvatar(`/avatars/discord/${discordId}-${avatarHash}.png`), true);
  for (const value of ['/avatars/discord/../../secret.png', '/avatars/discord/x/secret.png', '/private.png']) {
    assert.equal(api.isLocalDiscordAvatar(value), false);
    await api.removeLocalDiscordAvatar(value);
  }
  assert.equal(removed.length, 0);
});

test('animated Discord avatars retain their GIF extension and format', async () => {
  const hash = 'a_' + avatarHash;
  const { api, save, writes } = fixture({ body: 'GIF89aTEST' });
  const result = await save({ avatarHash: hash, extension: 'gif', sourceUrl: api.buildDiscordAvatarUrl(discordId, hash) });
  assert.match(result.publicPath, /\.gif$/);
  assert.equal(writes.length, 1);
});
