const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('react');
const { JSDOM, requestInterceptor } = require('jsdom');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadSource } = require('./load-source.cjs');
const { createConsentManager, CONSENT_KEY, CONSENT_DAYS, LEGACY_CONSENT_KEY } = loadSource()('src/lib/twitch-consent.ts');
const librarySource = fs.readFileSync(require.resolve('vanilla-cookieconsent'), 'utf8');
const embedUrl = 'https://player.twitch.tv/?channel=frvtubers&parent=localhost&muted=true';

// Actual npm library in an isolated DOM, not a browser/network measurement.
function fixture(entries = new Map()) {
  let clock = Date.now();
  let nextTimer = 0;
  const timers = new Map();
  const requests = [];
  const storage = { getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  const dom = new JSDOM('<!doctype html><html lang="fr"><head></head><body><button id="opener">Préférences</button></body></html>', {
    url: 'https://site.test', runScripts: 'outside-only', pretendToBeVisual: true,
    resources: { interceptors: [requestInterceptor(request => {
      requests.push(request.url); return new Response('', { status: 451 });
    })] },
  });
  const RealDate = dom.window.Date;
  dom.window.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  };
  Object.defineProperty(dom.window, 'localStorage', { value: storage });
  dom.window.eval(librarySource);
  const api = dom.window.CookieConsent;
  let loads = 0;
  const manager = createConsentManager({ load: async () => { loads++; return api; }, storage: () => storage,
    now: () => clock,
    schedule: (callback, delay) => {
      assert.ok(delay > 0 && delay <= 2_147_483_647);
      const id = ++nextTimer; timers.set(id, { callback, due: clock + delay }); return id;
    }, cancel: id => timers.delete(id),
  });
  return { dom, api, manager, entries, storage, requests, timers,
    loads: () => loads,
    tick(ms) { clock += ms; },
    async runDueTimers() { for (const [id, timer] of [...timers]) if (timer.due <= clock) {
      timers.delete(id); timer.callback();
    } await manager.refresh(); },
    close() { manager.dispose(); dom.window.close(); },
  };
}

test('real library initializes once in opt-in mode without recording a choice or loading a third party', async () => {
  const f = fixture();
  try {
    await Promise.all([f.manager.initialize(), f.manager.initialize()]);
    assert.equal(f.loads(), 1);
    assert.equal(f.api.getConfig('mode'), 'opt-in');
    assert.equal(f.api.getConfig('autoShow'), false);
    assert.equal(f.api.getConfig('manageScriptTags'), false);
    assert.equal(f.api.getConfig('autoClearCookies'), false);
    assert.equal(f.manager.getSnapshot(), 'unknown');
    assert.equal(f.entries.size, 0);
    f.dom.window.document.cookie = 'next-auth.csrf-token=synthetic; path=/';
    await f.manager.choose('denied');
    assert.match(f.dom.window.document.cookie, /next-auth.csrf-token=synthetic/);
    assert.equal(f.dom.window.document.querySelector('iframe'), null);
    assert.equal(f.requests.length, 0);
  } finally { f.close(); }
});

for (const choice of ['granted', 'denied']) {
  test(`real library persists ${choice} for 180 days, restores it without renewal, and expires`, async () => {
    const entries = new Map();
    const first = fixture(entries);
    try {
      await first.manager.choose(choice);
      assert.equal(first.manager.getSnapshot(), choice);
      assert.equal(first.api.acceptedService('twitch', 'media'), choice === 'granted');
      const raw = entries.get(CONSENT_KEY);
      const record = JSON.parse(raw);
      assert.ok(record.consentId);
      assert.equal(record.expirationTime - Date.parse(record.lastConsentTimestamp), CONSENT_DAYS * 86_400_000);
      const second = fixture(entries);
      try {
        await second.manager.initialize();
        assert.equal(second.manager.getSnapshot(), choice);
        assert.equal(entries.get(CONSENT_KEY), raw);
        let notified = 0;
        second.manager.subscribe(() => notified++);
        second.tick(181 * 86_400_000);
        assert.equal(second.manager.getSnapshot(), 'unknown', 'block before a new subscription');
        await second.runDueTimers();
        assert.equal(second.manager.getSnapshot(), 'unknown');
        assert.ok(notified > 0, 'expiry notifies React to remove the player');
        assert.equal(entries.has(CONSENT_KEY), false);
      } finally { second.close(); }
    } finally { first.close(); }
  });
}

test('migration ignores/removes old acceptance and invalid/revised records never authorize Twitch', async () => {
  const good = fixture();
  let valid;
  try { await good.manager.choose('granted'); valid = JSON.parse(good.entries.get(CONSENT_KEY)); }
  finally { good.close(); }
  for (const raw of ['{', '{}', JSON.stringify({ ...valid, revision: 999 }),
    JSON.stringify({ ...valid, expirationTime: Date.now() - 1 }),
    JSON.stringify({ ...valid, expirationTime: Date.now() + 365 * 86_400_000 }),
  ]) {
    const f = fixture(new Map([[LEGACY_CONSENT_KEY, '{"choice":"granted"}'], [CONSENT_KEY, raw]]));
    try {
      await f.manager.initialize();
      assert.notEqual(f.manager.getSnapshot(), 'granted');
      assert.equal(f.entries.has(LEGACY_CONSENT_KEY), false);
      await f.manager.choose('granted');
      assert.equal(f.manager.getSnapshot(), 'granted', 'a fresh explicit choice recovers from an invalid record');
    } finally { f.close(); }
  }
});

test('withdrawal through the real preferences modal updates the adapter and the other tab', async () => {
  const entries = new Map();
  const first = fixture(entries);
  const second = fixture(entries);
  try {
    await first.manager.choose('granted');
    await second.manager.initialize();
    assert.equal(second.manager.getSnapshot(), 'granted');
    await first.manager.openPreferences();
    const dialog = first.dom.window.document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    const reject = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Tout refuser');
    assert.ok(reject);
    const changed = new Promise(resolve => first.dom.window.addEventListener('cc:onChange', resolve, { once: true }));
    reject.click();
    await Promise.race([changed, new Promise((_, reject) => setTimeout(() => reject(new Error('Missing change event')), 1000))]);
    assert.equal(first.manager.getSnapshot(), 'denied');
    assert.notEqual(second.manager.getSnapshot(), 'granted', 'storage mismatch immediately blocks stale permission');
    await second.manager.refresh();
    assert.equal(second.manager.getSnapshot(), 'denied');
    assert.equal(first.requests.length, 0);
    assert.equal(second.requests.length, 0);
  } finally { first.close(); second.close(); }
});

test('real preferences language follows the selected language and explicit services can be enabled', async () => {
  const f = fixture();
  try {
    await f.manager.openPreferences();
    await f.manager.setLanguage('en');
    assert.match(f.dom.window.document.body.textContent, /Privacy settings/);
    f.api.acceptService('twitch', 'media');
    assert.equal(f.manager.getSnapshot(), 'granted');
    await f.manager.choose('denied');
    assert.equal(f.manager.getSnapshot(), 'denied');
  } finally { f.close(); }
});

test('latest refusal wins while the library is loading, and failed loading never grants permission', async () => {
  const f = fixture();
  try {
    const allow = f.manager.choose('granted');
    const refuse = f.manager.choose('denied');
    assert.notEqual(f.manager.getSnapshot(), 'granted');
    await Promise.all([allow, refuse]);
    assert.equal(f.manager.getSnapshot(), 'denied');
  } finally { f.close(); }
  const unavailable = createConsentManager({ load: async () => { throw new Error('unavailable'); },
    storage: () => ({ getItem: () => null, removeItem: () => {} }) });
  try { await unavailable.choose('granted'); assert.equal(unavailable.getSnapshot(), 'unknown'); }
  finally { unavailable.dispose(); }
});

test('storage write failures preserve an explicit choice only in memory and withdrawal blocks the player', async () => {
  const f = fixture();
  try {
    f.storage.setItem = () => { throw new Error('blocked'); };
    f.dom.window.console.warn = () => {};
    await f.manager.choose('granted');
    assert.equal(f.manager.getSnapshot(), 'granted');
    assert.equal(f.entries.size, 0);
    await f.manager.choose('denied');
    assert.equal(f.manager.getSnapshot(), 'denied');
  } finally { f.close(); }
});

test('real player handlers mount only after agreement and remove the iframe after refusal', async () => {
  const f = fixture();
  try {
    const load = loadSource({ mocks: { './useTwitchConsent': { useTwitchConsent: () => ({
      choice: f.manager.getSnapshot(), allow: () => f.manager.choose('granted'), deny: () => f.manager.choose('denied'),
    }) } } });
    const Player = load('src/components/privacy/TwitchPlayer.tsx').default;
    const render = () => Player({ embedUrl });
    const buttons = node => !node || typeof node !== 'object' ? [] : node.type === 'button' ? [node]
      : React.Children.toArray(node.props?.children).flatMap(buttons);
    assert.doesNotMatch(renderToStaticMarkup(render()), /<iframe/);
    await buttons(render())[0].props.onClick();
    assert.match(renderToStaticMarkup(render()), /<iframe[^>]+src="https:\/\/player.twitch.tv/);
    assert.equal(buttons(render()).length, 0, 'active player has no consent buttons underneath');
    await f.manager.choose('denied'); // Withdrawal remains available in the footer/settings.
    assert.doesNotMatch(renderToStaticMarkup(render()), /<iframe/);
    assert.equal(buttons(render()).length, 1, 'blocked player offers only the activation button');
  } finally { f.close(); }
});

test('SSR keeps Twitch blocked without a resource hint; public settings and footer expose the manager', () => {
  const load = loadSource({ mocks: { '@/components/home/SiteHeader': () => React.createElement('header') } });
  const Player = load('src/components/privacy/TwitchPlayer.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Player, { embedUrl }));
  assert.doesNotMatch(html, /<iframe|<img|<script|rel="(?:preconnect|dns-prefetch|preload|prefetch)"|src="https:/);
  assert.match(html, /Autoriser Twitch et afficher le lecteur/);
  assert.doesNotMatch(html, /Continuer sans Twitch/);
  const Page = load('src/app/parametres-confidentialite/page.tsx').default;
  const settings = renderToStaticMarkup(React.createElement(Page));
  assert.match(settings, /Ouvrir le gestionnaire de cookies/);
  assert.match(settings, /Gérer mes cookies/);
  assert.match(settings, /ne supprime pas les cookies/);
  assert.doesNotMatch(settings, /<iframe|non validé pour publication/);
});

test('Open Collective donations retain an outgoing link without embedding the provider', () => {
  const load = loadSource({ mocks: { '../../components/home/SiteHeader': () => React.createElement('header') } });
  const Page = load('src/app/dons/page.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.doesNotMatch(html, /<iframe|src="https:\/\/opencollective.com/);
  assert.match(html, /href="https:\/\/opencollective.com\/frvtubers"/);
});
