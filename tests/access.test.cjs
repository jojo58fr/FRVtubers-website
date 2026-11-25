const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./load-source.cjs');

function fixture(role, options = {}) {
  const calls = [];
  const session = role === null ? null : role === 'invalid' ? { expires: 'future', adminRole: 'COMITE' } : {
    user: { id: 'current-user', discordId: '123456789012345678' },
    adminRole: role, isGuildMember: true, hasVtuberRole: false, ...options.session,
  };
  const operation = name => async arg => {
    calls.push([name, arg]);
    if (name.endsWith('.findMany')) return [];
    if (name.endsWith('.count')) return 2;
    return { id: 'target', adminRole: 'MEMBER', status: 'PENDING', updatedAt: new Date(), ...arg?.data };
  };
  const prisma = Object.fromEntries(['user', 'resourceSubmission', 'resourceTag', 'magazine'].map(model => [model,
    Object.fromEntries(['findMany', 'findUnique', 'update', 'delete', 'create', 'count'].map(method => [method, operation(`${model}.${method}`)])),
  ]));
  const load = loadSource({ ...options, mocks: {
    '@/lib/auth': { authOptions: {} }, '@/lib/prisma': prisma,
    'next-auth': { getServerSession: async () => session },
    'next/navigation': { redirect: url => { throw new Error(`REDIRECT:${url}`); } },
    'next/cache': { revalidatePath() {} },
    'next/headers': { headers: async () => new Headers({ Origin: 'https://site.test' }) },
    ...options.mocks,
  } });
  return { load, calls, session };
}
const request = (url, method = 'GET', body, origin = 'https://site.test') => new Request(`https://site.test${url}`, {
  method, headers: { Origin: origin, 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
});
const params = { params: Promise.resolve({ id: 'target' }) };

for (const role of [null, 'invalid', 'MEMBER', 'MODERATOR', 'COMITE']) {
  test(`API staff access matrix: ${role ?? 'anonymous'}`, async () => {
    const { load, calls } = fixture(role);
    const allowedContent = ['MODERATOR', 'COMITE'].includes(role);
    const allowedUsers = role === 'COMITE';
    for (const [file, allowed] of [
      ['src/app/api/admin/users/route.ts', allowedUsers],
      ['src/app/api/admin/users/[id]/route.ts', allowedUsers],
      ['src/app/api/admin/resources/route.ts', allowedContent],
    ]) {
      const route = load(file);
      const response = await route.GET(request('/api/admin/test'), params);
      assert.equal(response.status, allowed ? 200 : 401, file);
    }
    const users = load('src/app/api/admin/users/[id]/route.ts');
    const update = await users.PATCH(request('/api/admin/users/target', 'PATCH', { adminRole: 'MODERATOR' }), params);
    assert.equal(update.status, allowedUsers ? 200 : 401);
    const resources = load('src/app/api/admin/resources/[id]/route.ts');
    assert.equal((await resources.PATCH(request('/api/admin/resources/target', 'PATCH', { status: 'REJECTED' }), params)).status,
      allowedContent ? 200 : 401);
    assert.equal((await resources.DELETE(request('/api/admin/resources/target', 'DELETE'), params)).status,
      allowedContent ? 200 : 401);
    if (!allowedContent && !allowedUsers) assert.equal(calls.length, 0, 'no database access on denial');
  });
}

test('staff mutations reject cross-site cookie requests before accessing data', async () => {
  const { load, calls } = fixture('COMITE');
  for (const [file, method, body] of [
    ['src/app/api/admin/users/[id]/route.ts', 'PATCH', { adminRole: 'COMITE' }],
    ['src/app/api/admin/resources/[id]/route.ts', 'PATCH', { status: 'APPROVED' }],
    ['src/app/api/admin/resources/[id]/route.ts', 'DELETE'],
  ]) {
    assert.equal((await load(file)[method](request('/api/admin/target', method, body, 'https://evil.test'), params)).status, 403);
  }
  assert.equal(calls.length, 0);
});

test('configured committee exceptions require a current identity; legacy internal IDs remain supported', () => {
  const { load } = fixture('MEMBER', { env: { ADMIN_DISCORD_IDS: 'trusted-discord,legacy-internal' } });
  const { isComiteSession } = load('src/lib/admin-auth.ts');
  assert.equal(isComiteSession({ adminRole: 'COMITE' }), false);
  assert.equal(isComiteSession({ user: { id: 'other', discordId: 'unlisted' }, adminRole: 'MEMBER' }), false);
  assert.equal(isComiteSession({ user: { id: 'other', discordId: 'trusted-discord' }, adminRole: 'MEMBER' }), true);
  assert.equal(isComiteSession({ user: { id: 'legacy-internal' }, adminRole: 'MEMBER' }), true);
});

const actionFiles = {
  'src/app/admin/magazines/page.tsx': ['createMagazineAction', 'updateMagazineAction', 'deleteMagazineAction'],
  'src/app/admin/ressources/page.tsx': ['updateStatusAction', 'toggleFeaturedAction', 'deleteResourceAction',
    'createResourceAction', 'updateResourceAction', 'createTagAction', 'deleteTagAction', 'updateTagAction', 'updateTagsAction'],
};

test('all staff Server Actions reject Origin:null before any database mutation', async () => {
  const { load, calls } = fixture('COMITE', { expose: actionFiles, mocks: {
    'next/headers': { headers: async () => new Headers({ Origin: 'null' }) },
  } });
  for (const [file, actions] of Object.entries(actionFiles)) {
    const loaded = load(file);
    for (const action of actions) {
      await assert.rejects(loaded[action](new FormData()), /Origine non autorisée/, action);
    }
  }
  assert.equal(calls.length, 0);
});

test('trusted staff actions retain the existing content/committee role hierarchy', async () => {
  for (const role of ['MODERATOR', 'COMITE']) {
    const { load } = fixture(role);
    const allowed = await load('src/lib/admin-auth.ts').requireAdminAction();
    assert.equal(allowed.adminRole, role);
  }
});

for (const role of [null, 'invalid', 'MEMBER']) {
  test(`pages and server actions reject direct access for ${role ?? 'anonymous'}`, async () => {
    const { load, calls } = fixture(role, { expose: actionFiles });
    for (const [file, actions] of Object.entries(actionFiles)) {
      const loaded = load(file);
      await assert.rejects(loaded.default({ searchParams: Promise.resolve({}) }), /REDIRECT:/);
      for (const action of actions) {
        assert.equal(typeof loaded[action], 'function', action);
        await assert.rejects(loaded[action](new FormData()), /REDIRECT:/, action);
      }
    }
    const users = load('src/app/admin/users/page.tsx');
    await assert.rejects(users.default(), /REDIRECT:/);
    assert.equal(calls.length, 0);
  });
}

test('moderator can edit content but cannot open account administration', async () => {
  const { load, calls } = fixture('MODERATOR');
  await assert.rejects(load('src/app/admin/users/page.tsx').default(), /REDIRECT:/);
  assert.equal(calls.length, 0);
});

test('preferences only update the current verified account; no JWT cookie rewrite or privilege fields', async () => {
  const { load, calls } = fixture('MEMBER');
  const route = load('src/app/api/user/preferences/route.ts');
  const response = await route.PUT(request('/api/user/preferences', 'PUT', {
    theme: 'dark', language: 'en', userId: 'victim', adminRole: 'COMITE', discordId: 'spoofed',
  }));
  assert.equal(response.status, 200);
  assert.equal(calls[0][1].where.id, 'current-user');
  assert.deepEqual(Object.keys(calls[0][1].data).sort(), ['language', 'theme']);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await route.PUT(request('/api/user/preferences', 'PUT', {}, 'https://evil.test'))).status, 403);
});

for (const role of [null, 'invalid']) {
  test(`private endpoints deny ${role ?? 'anonymous'} sessions`, async () => {
    const { load, calls } = fixture(role);
    assert.equal((await load('src/app/api/v1/auth/sync/route.ts').POST()).status, 401);
    const preferences = load('src/app/api/user/preferences/route.ts');
    assert.equal((await preferences.GET()).status, 401);
    assert.equal((await preferences.PUT(request('/api/user/preferences', 'PUT', {}))).status, 401);
    assert.equal(calls.length, 0);
  });
}

const validApplication = { vtuberType: 'VtuberFR', pseudo: 'Test', platforms: 'Twitch', links: 'https://twitch.tv/test' };
test('candidature enforces server permissions, JSON limits, verified Discord ID and disabled mentions', async () => {
  const sent = [];
  const options = { env: { DISCORD_APPLICATION_WEBHOOK_URL: 'https://discord.test/webhook-secret' },
    fetch: async (url, config) => { sent.push(JSON.parse(config.body)); return new Response(null, { status: 204 }); } };
  for (const [role, session, expected] of [[null, {}, 401], ['invalid', {}, 401], ['MEMBER', { isGuildMember: false }, 403],
    ['MEMBER', { discordMember: { roles: [], pending: true } }, 403],
    ['MEMBER', { hasVtuberRole: true }, 409]]) {
    const { load } = fixture(role, { ...options, session });
    assert.equal((await load('src/app/api/onboarding/application/route.ts').POST(request('/api/onboarding/application', 'POST', validApplication))).status, expected);
  }
  const { load } = fixture('MEMBER', options);
  const post = (body, origin) => load('src/app/api/onboarding/application/route.ts').POST(request('/api/onboarding/application', 'POST', body, origin));
  assert.equal((await post(validApplication, 'https://evil.test')).status, 403);
  assert.equal((await post('null')).status, 400);
  assert.equal((await post('{broken')).status, 400);
  assert.equal((await post({ ...validApplication, pseudo: 123 })).status, 400);
  assert.equal((await post({ ...validApplication, links: 'a'.repeat(9000) })).status, 413);
  assert.equal(sent.length, 0);
  assert.equal((await post({ ...validApplication, pseudo: '@everyone', socials: '<@123>' })).status, 200);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].allowed_mentions, { parse: [] });
  assert.match(sent[0].content, /<@123456789012345678>/);
  assert.doesNotMatch(sent[0].content, /current-user|webhook-secret/);
});
