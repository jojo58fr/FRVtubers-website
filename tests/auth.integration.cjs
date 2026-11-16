// Optional HTTP smoke test of the built application. Requires Node >=22.13.
// Uses a new synthetic SQLite database; never connects to the real database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { DatabaseSync } = require('node:sqlite');
const { encode } = require('next-auth/jwt');
const root = path.resolve(__dirname, '..');

async function main() {
  // Exercise the generated deployment manifests, not just the config spelling.
  const buildDir = path.join(root, '.next');
  const traces = fs.readdirSync(buildDir, { recursive: true }).filter(file => file.endsWith('.nft.json'));
  assert.ok(traces.length > 0, 'Build file traces exist');
  for (const trace of traces) {
    const filename = path.join(buildDir, trace);
    const files = JSON.parse(fs.readFileSync(filename, 'utf8')).files;
    for (const file of files) {
      const resolved = path.relative(root, path.resolve(path.dirname(filename), file)).replaceAll('\\', '/');
      assert.ok(!resolved.startsWith('docs/'), 'Private reports are absent from deployment traces');
    }
  }
  const dbName = `security-smoke-${randomUUID()}.db`;
  const db = new DatabaseSync(path.join(root, 'prisma', dbName));
  for (const dir of fs.readdirSync(path.join(root, 'prisma/migrations')).sort()) {
    const file = path.join(root, 'prisma/migrations', dir, 'migration.sql');
    if (fs.existsSync(file)) db.exec(fs.readFileSync(file, 'utf8'));
  }
  const addUser = db.prepare('INSERT INTO User (id, name, discordId, adminRole, createdAt, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
  const addAccount = db.prepare('INSERT INTO Account (id, userId, type, provider, providerAccountId) VALUES (?, ?, ?, ?, ?)');
  for (const [i, role] of ['MEMBER', 'MODERATOR', 'COMITE'].entries()) {
    const id = `smoke-${role}`;
    const discordId = `10000000000000000${i}`;
    addUser.run(id, 'Synthetic fixture', discordId, role);
    addAccount.run(id, id, 'oauth', 'discord', discordId);
  }
  db.close();
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const secret = randomUUID() + randomUUID();
  const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      DATABASE_URL: `file:./${dbName}`, DISCORD_GUILD_ID: '',
      DISCORD_CLIENT_ID: 'synthetic-client', DISCORD_CLIENT_SECRET: 'synthetic-secret',
      NEXTAUTH_SECRET: secret, NEXTAUTH_URL: origin, NEXTAUTH_URL_INTERNAL: origin,
      ADMIN_DISCORD_IDS: '', NEXTAUTH_COOKIE_DOMAIN: '',
    },
  });
  // Drain output without printing provider/DB internals on test failure.
  server.stdout.resume();
  server.stderr.resume();
  const exited = new Promise(resolve => server.once('exit', resolve));
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw new Error('Local test server exited');
      try { if ((await fetch(origin + '/api/auth/providers')).ok) { ready = true; break; } } catch { /* startup */ }
      await delay(250);
    }
    assert.ok(ready, 'Local server started');
    const providers = await (await fetch(origin + '/api/auth/providers')).json();
    assert.deepEqual(Object.keys(providers), ['discord']);
    // Benign local image: assert the vulnerable optimizer route is closed,
    // without sending crafted content or causing an external image fetch.
    assert.equal((await fetch(origin + '/_next/image?url=%2Ficon.png&w=64&q=75')).status, 404);
    const homeResponse = await fetch(origin + '/');
    assert.equal(homeResponse.headers.get('x-dns-prefetch-control'), 'off');
    const home = await homeResponse.text();
    assert.match(home, /Autoriser Twitch et afficher le lecteur/);
    assert.match(home, /Gérer mes cookies/);
    assert.doesNotMatch(home, /<(?:iframe|img|script)[^>]+(?:src|srcset)=["'][^"']*(?:twitch\.tv|ttvnw\.net|jtvnw\.net)/i);
    assert.doesNotMatch(homeResponse.headers.get('link') ?? '', /(?:twitch\.tv|ttvnw\.net|jtvnw\.net)/i);
    for (const [, attributes] of home.matchAll(/<link\b([^>]+)>/gi)) {
      if (/rel=["'](?:preconnect|dns-prefetch|preload|prefetch)["']/i.test(attributes)) {
        assert.doesNotMatch(attributes, /(?:twitch\.tv|ttvnw\.net|jtvnw\.net)/i);
      }
    }
    for (const route of ['/dons', '/parametres-confidentialite']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.doesNotMatch(html, /<iframe\b/);
      assert.match(html, /href="\/parametres-confidentialite"/);
      if (route === '/dons') assert.match(html, /href="https:\/\/opencollective.com\/frvtubers"/);
      else assert.match(html, /Retirer|Refuser Twitch/);
    }
    assert.doesNotMatch(home, /<img[^>]+src=["']\/_next\/image/);
    const localImage = home.match(/src=["'](\/_next\/static\/media\/[^"']+)["']/);
    assert.ok(localImage, 'Original local logo remains in the HTML');
    assert.equal((await fetch(origin + localImage[1])).status, 200);
    for (const [route, title] of [['/confidentialite', 'Politique de confidentialité'], ['/mentions-legales', 'Mentions légales']]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(title));
      assert.ok(html.includes('[À COMPLÉTER]'));
      assert.ok(html.includes('non validé pour publication'));
      assert.match(html, /name="robots" content="noindex, nofollow"/);
      assert.match(html, /href="\/confidentialite"/);
      assert.match(html, /href="\/mentions-legales"/);
      assert.match(html, /href="#legal-content"/);
      assert.match(html, /<main[^>]+id="legal-content"[^>]+tabindex="-1"[^>]+aria-labelledby="legal-title"/i);
      const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]));
      for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
        assert.ok(ids.has(target), `Rendered legal anchor exists: ${target}`);
      }
      if (route === '/confidentialite') {
        for (const target of ['contact', 'candidatures', 'connexion-discord', 'droits']) {
          assert.ok(ids.has(target), `Notice destination exists: ${target}`);
        }
      }
      assert.doesNotMatch(html, /<iframe\b|src="https:\/\/(?:player\.twitch\.tv|opencollective\.com)/);
    }
    for (const route of ['/contact', '/login']) {
      const html = await (await fetch(origin + route)).text();
      assert.match(html, /aria-label="Information sur les données personnelles"/);
      assert.match(html, /href="\/confidentialite#/);
      assert.doesNotMatch(html, /type="checkbox"[^>]*required/);
    }
    for (const role of ['MEMBER', 'MODERATOR', 'COMITE', 'deleted']) {
      const jwt = await encode({ token: { sub: `smoke-${role}`, adminRole: 'COMITE' }, secret, maxAge: 600 });
      const headers = { Cookie: `__Secure-next-auth.session-token=${jwt}`, Origin: origin };
      const expectedContent = ['MODERATOR', 'COMITE'].includes(role) ? 200 : 401;
      const expectedUsers = role === 'COMITE' ? 200 : 401;
      assert.equal((await fetch(origin + '/api/admin/resources', { headers })).status, expectedContent, role);
      assert.equal((await fetch(origin + '/api/admin/users', { headers })).status, expectedUsers, role);
      const sync = await fetch(origin + '/api/v1/auth/sync', { method: 'POST', headers });
      assert.equal(sync.status, role === 'deleted' ? 401 : 200, role);
      if (role !== 'deleted') {
        const body = await sync.json();
        assert.equal(body.session.adminRole, role);
        assert.doesNotMatch(JSON.stringify(body), /access_token|refresh_token|discordAccessToken|discordRefreshToken/);
        assert.equal(sync.headers.get('cache-control'), 'private, no-store');
      }
      if (role === 'MEMBER') {
        assert.equal((await fetch(origin + '/admin/users', { headers, redirect: 'manual' })).status, 307);
        const onboarding = await (await fetch(origin + '/onboarding', { headers })).text();
        assert.match(onboarding, /Candidature pour devenir/);
        assert.match(onboarding, /href="\/confidentialite"/);
      }
    }
    const legacyJwt = await encode({ token: { sub: 'smoke-MEMBER' }, secret, maxAge: 600 });
    const midpoint = Math.floor(legacyJwt.length / 2);
    const chunkedHeaders = { Origin: origin, Cookie:
      `__Secure-next-auth.session-token.0=${legacyJwt.slice(0, midpoint)}; __Secure-next-auth.session-token.1=${legacyJwt.slice(midpoint)}` };
    const legacySession = await (await fetch(origin + '/api/auth/session', { headers: chunkedHeaders })).json();
    assert.equal(legacySession.user.id, 'smoke-MEMBER');
    assert.equal((await fetch(origin + '/api/user/preferences', { method: 'PUT', headers: {
      ...chunkedHeaders, 'Content-Type': 'application/json',
    }, body: JSON.stringify({ theme: 'dark', language: 'en' }) })).status, 200);
    const updatedSession = await (await fetch(origin + '/api/auth/session', { headers: chunkedHeaders })).json();
    assert.equal(updatedSession.preferences.theme, 'dark');
    assert.equal(updatedSession.preferences.language, 'en');
    const expired = await encode({ token: { sub: 'smoke-COMITE' }, secret, maxAge: -60 });
    for (const cookie of ['malformed', expired]) {
      assert.equal((await fetch(origin + '/api/admin/users', { headers: {
        Cookie: `__Secure-next-auth.session-token=${cookie}`,
      } })).status, 401);
    }
    const oldStaffJwt = await encode({ token: { sub: 'smoke-COMITE', adminRole: 'COMITE' }, secret, maxAge: 600 });
    const fixtureDb = new DatabaseSync(path.join(root, 'prisma', dbName));
    fixtureDb.prepare('UPDATE User SET adminRole = ? WHERE id = ?').run('MEMBER', 'smoke-COMITE');
    fixtureDb.close();
    assert.equal((await fetch(origin + '/api/admin/users', { headers: {
      Cookie: `__Secure-next-auth.session-token=${oldStaffJwt}`,
    } })).status, 401);
    console.log('HTTP smoke: Discord-only providers; real cookie/SQLite access matrix and deleted-account rejection passed.');
    console.log('Consolidation: optimizer disabled; legacy/chunked JWT, preferences, malformed/expired cookies and staff downgrade passed.');
    console.log('Legal pages: public routes, draft status, noindex, privacy notices, footer and authenticated onboarding passed.');
    console.log('Third parties: initial HTTP markup has no Twitch iframe/resource hint; donation link and privacy settings passed. Network requests were not observed in a browser.');
  } finally {
    server.kill();
    await Promise.race([exited, delay(5000)]);
  }
}
main().catch(() => {
  console.error('HTTP smoke failed; provider output suppressed. Inspect isolated fixtures and local test server.');
  process.exitCode = 1;
});
