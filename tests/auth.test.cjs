const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./load-source.cjs');

const user = (changes = {}) => ({
  discordId: '123456789012345678', name: 'Test member', email: 'private@example.test',
  accounts: [{ providerAccountId: '123456789012345678' }],
  image: '/avatars/discord/opaque.png', discordAvatar: null,
  theme: 'dark', language: 'fr', adminRole: 'MEMBER',
  discordIsMember: true, discordPending: false, discordRoles: '["vtuber"]',
  discordMemberFetchedAt: new Date(), ...changes,
});

function fixture({ findUnique = async () => user(), update = async () => {}, ...options } = {}) {
  const load = loadSource({ ...options, mocks: {
    '@/lib/prisma': { user: { findUnique, update } },
    '@next-auth/prisma-adapter': { PrismaAdapter: () => ({}) },
    ...options.mocks,
  } });
  return { load, auth: load('src/lib/auth.ts').authOptions };
}

test('production exposes only Discord; scopes, secure OAuth cookies and redirects remain valid', async () => {
  const { auth } = fixture({ env: { NODE_ENV: 'production', NEXTAUTH_ALLOWED_REDIRECTS: 'https://stream.test/login' } });
  assert.deepEqual(Array.from(auth.providers, p => p.id), ['discord']);
  assert.equal(auth.providers[0].options.authorization.params.scope, 'identify email guilds guilds.members.read');
  assert.equal(auth.cookies.sessionToken.options.httpOnly, true);
  assert.equal(auth.cookies.sessionToken.options.secure, true);
  assert.equal(auth.cookies.state.options.maxAge, 900);
  const redirect = url => auth.callbacks.redirect({ url, baseUrl: 'https://site.test' });
  assert.equal(await redirect('/profile'), 'https://site.test/profile');
  assert.equal(await redirect('https://stream.test/login/finish'), 'https://stream.test/login/finish');
  assert.equal(await redirect('https://stream.test/login-evil'), 'https://site.test');
  assert.equal(await redirect('https://evil.test/login'), 'https://site.test');
});

test('valid Discord sign-in preserves membership and refreshes expired tokens without exposing them', async () => {
  const calls = [];
  const { auth } = fixture({ env: { DISCORD_GUILD_ID: 'guild', DISCORD_VTUBER_ROLE_ID: 'vtuber' },
    fetch: async (url, options) => {
      calls.push([url, options]);
      if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 });
      if (url.endsWith('/guilds')) return Response.json([{ id: 'guild' }]);
      return Response.json({ roles: ['vtuber'], pending: false });
    },
  });
  const token = await auth.callbacks.jwt({ token: { sub: 'internal-id', adminRole: 'COMITE' },
    account: { provider: 'discord', access_token: 'expired', refresh_token: 'old-refresh', expires_at: 1 } });
  assert.equal(token.adminRole, 'MEMBER');
  assert.equal(token.discordAccessToken, 'new-access');
  assert.equal(token.discordRefreshToken, 'new-refresh');
  assert.equal(calls.length, 3);
  const session = await auth.callbacks.session({ session: { expires: 'future', user: {} }, token });
  assert.equal(session.user.id, 'internal-id');
  assert.equal(session.user.discordId, '123456789012345678');
  assert.equal(session.hasVtuberRole, true);
  assert.equal(session.isGuildMember, true);
  assert.doesNotMatch(JSON.stringify(session), /new-access|new-refresh|expired|accountVerified/);
});

test('pending Discord membership with no roles survives the database cache read', async () => {
  const { auth } = fixture({
    findUnique: async () => user({ discordRoles: '[]', discordPending: true }),
    env: { DISCORD_GUILD_ID: 'guild' },
  });
  const token = await auth.callbacks.jwt({ token: {
    sub: 'existing-id', discordAccessToken: 'still-valid', discordAccessTokenExpires: Date.now() + 60_000,
  } });
  const session = await auth.callbacks.session({ session: { expires: 'future' }, token });
  assert.equal(session.user.id, 'existing-id');
  assert.equal(session.isGuildMember, true);
  assert.equal(session.discordMember.pending, true);
  assert.equal(session.discordMember.roles.length, 0);
});

test('legacy Discord JWT without new verification fields keeps identity, preferences and cached roles', async () => {
  const { auth } = fixture({ env: { DISCORD_GUILD_ID: 'guild', DISCORD_VTUBER_ROLE_ID: 'vtuber' } });
  const token = await auth.callbacks.jwt({ token: {
    sub: 'existing-id', name: 'Old name', discordAccessToken: 'still-valid',
    discordRefreshToken: 'still-valid-refresh', discordAccessTokenExpires: Date.now() + 60_000,
  } });
  const session = await auth.callbacks.session({ session: { expires: 'future' }, token });
  assert.equal(session.user.id, 'existing-id');
  assert.equal(session.preferences.theme, 'dark');
  assert.equal(session.hasVtuberRole, true);
  assert.equal(token.discordAccessToken, 'still-valid');
  assert.equal(token.discordRefreshToken, 'still-valid-refresh');
});

for (const status of [403, 404, 500, 503]) {
  test(`incomplete Discord member response (${status}) withholds candidature rights without deleting login`, async () => {
    const { auth } = fixture({
      findUnique: async () => user({ discordMemberFetchedAt: new Date(0) }),
      env: { DISCORD_GUILD_ID: 'guild', DISCORD_VTUBER_ROLE_ID: 'vtuber' },
      fetch: async url => url.endsWith('/guilds') ? Response.json([{ id: 'guild' }]) : new Response(null, { status }),
    });
    const token = await auth.callbacks.jwt({ token: { sub: 'existing-id', discordAccessToken: 'valid' } });
    const session = await auth.callbacks.session({ session: { expires: 'future' }, token });
    assert.equal(session.user.id, 'existing-id');
    assert.equal(session.isGuildMember, undefined);
    assert.equal(session.hasVtuberRole, false);
  });
}

test('malformed roles returned by Discord cannot become authoritative membership', async () => {
  for (const detail of [{ roles: 'vtuber' }, { roles: [42] }, { roles: ['vtuber'], pending: 'false' }]) {
    const { auth } = fixture({
      findUnique: async () => user({ discordMemberFetchedAt: new Date(0) }),
      env: { DISCORD_GUILD_ID: 'guild' },
      fetch: async url => Response.json(url.endsWith('/guilds') ? [{ id: 'guild' }] : detail),
    });
    const token = await auth.callbacks.jwt({ token: { sub: 'id', discordAccessToken: 'valid' } });
    assert.equal(token.discordIsMember, undefined);
    assert.equal(token.discordMember, undefined);
  }
});

for (const state of ['deleted', 'database failure', 'no identity']) {
  test(`session fails closed: ${state}, including old staff JWT and preference update`, async () => {
    let writes = 0;
    const { auth, load } = fixture({
      findUnique: async () => { if (state === 'database failure') throw new Error('private profile, cookie=secret'); return null; },
      update: async () => { writes++; },
      env: { ADMIN_DISCORD_IDS: 'internal-id' },
      mocks: { 'next-auth': { getServerSession: async () => null }, 'next/navigation': {} },
    });
    const token = await auth.callbacks.jwt({
      token: { sub: state === 'no identity' ? undefined : 'internal-id', adminRole: 'COMITE', discordAccessToken: 'secret', accountVerified: true },
      trigger: 'update', session: { preferences: { theme: 'dark' }, adminRole: 'COMITE' },
    });
    const session = await auth.callbacks.session({ session: { expires: 'future', user: { id: 'internal-id' } }, token });
    const roles = load('src/lib/admin-auth.ts');
    assert.equal(session.user, undefined);
    assert.equal(roles.isModeratorSession(session), false);
    assert.equal(roles.isComiteSession(session), false);
    assert.equal(writes, 0);
    assert.doesNotMatch(JSON.stringify(token), /secret|COMITE/);
  });
}

test('client session updates cannot change identity, staff role, membership or Discord tokens', async () => {
  const writes = [];
  const { auth } = fixture({ update: async data => writes.push(data) });
  const token = await auth.callbacks.jwt({ token: { sub: 'internal-id', adminRole: 'COMITE' },
    trigger: 'update', session: { user: { id: 'other' }, adminRole: 'COMITE',
      discordAccessToken: 'injected', discordMember: { roles: ['staff'] }, preferences: { theme: 'light', language: 'en' } } });
  assert.equal(token.sub, 'internal-id');
  assert.equal(token.adminRole, 'MEMBER');
  assert.equal(token.discordAccessToken, undefined);
  assert.equal(token.userPreferences.language, 'en');
  assert.equal(writes.length, 1);
  assert.deepEqual(Object.keys(writes[0].data).sort(), ['language', 'theme']);
});

test('old demo JWTs without a linked Discord account and non-Discord sign-ins are rejected', async () => {
  const { auth } = fixture({ findUnique: async () => user({ accounts: [], adminRole: 'COMITE' }) });
  const token = await auth.callbacks.jwt({ token: { sub: '1', adminRole: 'COMITE', accountVerified: true } });
  assert.equal(Object.keys(token).length, 0);
  assert.equal(Object.keys(await auth.callbacks.jwt({ token: { sub: '1' }, account: { provider: 'credentials' } })).length, 0);
});

test('missing/failed Discord refresh clears OAuth credentials and never logs raw provider data', async () => {
  const logs = [];
  const { auth } = fixture({ fetch: async () => { throw new Error('access_token=private email@example.test'); },
    console: { info: (...a) => logs.push(a), warn: (...a) => logs.push(a), error: (...a) => logs.push(a) },
    env: { NEXTAUTH_VERBOSE_LOG: 'true', NEXTAUTH_LOG_REDIRECTS: 'true' },
  });
  const token = await auth.callbacks.jwt({ token: { sub: 'id', discordAccessToken: 'private', discordRefreshToken: 'refresh', discordAccessTokenExpires: 1 } });
  assert.equal(token.discordAccessToken, undefined);
  assert.equal(token.discordRefreshToken, undefined);
  auth.logger.error('OAUTH_CALLBACK_ERROR', { token: 'private', email: 'email@example.test' });
  auth.logger.debug('private', { cookie: 'refresh' });
  await auth.callbacks.redirect({ url: '/?token=private', baseUrl: 'https://site.test' });
  assert.ok(logs.length >= 3);
  assert.doesNotMatch(JSON.stringify(logs), /private|refresh"|email@example|cookie|token=/);
});

test('Discord profile event stores opaque URL, emits no profile and never deletes historical avatars', async () => {
  const logs = [], writes = [];
  let deleted = false;
  const { auth } = fixture({ update: async data => writes.push(data),
    console: { info: (...a) => logs.push(a), warn: (...a) => logs.push(a), error: (...a) => logs.push(a), log: (...a) => logs.push(a) },
    mocks: { '@/lib/discord-avatar': {
      getDiscordAvatarExtension: () => 'png',
      buildDiscordAvatarUrl: () => 'https://cdn.discordapp.com/avatars/canonical.png?size=256',
      persistDiscordAvatar: async () => ({ publicPath: '/avatars/discord/opaque.png' }),
      removeLocalDiscordAvatar: async () => { deleted = true; },
    } },
  });
  await auth.events.signIn({ user: { id: 'internal-id' }, account: { provider: 'discord' },
    profile: { id: '123456789012345678', avatar: 'a'.repeat(32), email: 'private@example.test' } });
  assert.equal(deleted, false);
  assert.equal(writes[0].data.discordAvatar, 'https://site.test/avatars/discord/opaque.png');
  assert.doesNotMatch(JSON.stringify(logs), /private@example|123456789012345678|opaque.png/);
});
