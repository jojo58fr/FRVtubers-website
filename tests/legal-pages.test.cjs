const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadSource, root } = require('./load-source.cjs');

const load = () => loadSource({ mocks: {
  // Isolate the shared legal content from session/router context. Actual
  // header navigation and public routing are also checked over HTTP.
  '@/components/home/SiteHeader': () => React.createElement('header', null,
    React.createElement('a', { href: '/' }, 'FRVtubers')),
} });
const renderPage = file => renderToStaticMarkup(React.createElement(load()(file).default));

test('legal notices use supplied editor/controller/hosting facts and keep unknown legal details explicit', () => {
  const html = renderPage('src/app/mentions-legales/page.tsx');
  assert.match(html, /Joachim Miens/);
  assert.match(html, /particulier/);
  assert.match(html, /href="mailto:contact@joachim-miens.com"/);
  assert.match(html, /href="https:\/\/www.joachim-miens.com"/);
  assert.match(html, /OVH/);
  assert.match(html, /2 rue Kellermann, 59100 Roubaix/);
  assert.match(html, /href="https:\/\/www.ovh.com"/);
  assert.match(html, /Entité contractante exacte[^<]+<strong>\[À COMPLÉTER\]/);
  const privacy = renderPage('src/app/confidentialite/page.tsx');
  assert.match(privacy, /Responsable du traitement[^<]+<strong>FRVtubers, porté par Joachim Miens, particulier/);
  assert.match(privacy, /href="mailto:frvtubers@gmail.com"/);
  assert.match(privacy, /href="https:\/\/opencollective.com\/frvtubers"/);
  assert.doesNotMatch(privacy, /Identification juridique/);
});

for (const [route, title] of [['confidentialite', 'Politique de confidentialité'], ['mentions-legales', 'Mentions légales']]) {
  test(`${route}: public draft has a single named main/title, French language and working skip/contents links`, () => {
    const file = `src/app/${route}/page.tsx`;
    const html = renderPage(file);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1);
    assert.match(html, /lang="fr"/);
    assert.match(html, /<main[^>]+id="legal-content"[^>]+tabindex="-1"[^>]+aria-labelledby="legal-title"/i);
    assert.ok(html.includes(title));
    assert.match(html, /href="#legal-content"/);
    assert.match(html, /non validé pour publication/);
    assert.ok(html.includes('[À COMPLÉTER]'));
    assert.doesNotMatch(html, /<iframe\b|<form\b/);
    const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), item => item[1]);
    assert.equal(new Set(ids).size, ids.length, 'no duplicate IDs');
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(ids.includes(id), `anchor target exists: ${id}`);
    }
    const metadata = load()(file).metadata;
    assert.equal(metadata.robots.index, false);
    assert.equal(metadata.robots.follow, false);
  });
}

test('privacy information covers real flows and links to CNIL without inventing final legal decisions', () => {
  const html = renderPage('src/app/confidentialite/page.tsx');
  for (const term of ['Discord', 'EmailJS', 'Twitch', 'Wikimedia', 'Open Collective', 'Google Drive',
    'transferts', 'conservation', 'effacement', 'portabilité', 'sauvegardes', 'Bases légales proposées']) {
    assert.ok(html.toLocaleLowerCase('fr').includes(term.toLocaleLowerCase('fr')), term);
  }
  assert.match(html, /href="https:\/\/www\.cnil\.fr\/fr\/plaintes"/);
  assert.match(html, /premier mois/);
  assert.match(html, /aucun export ou effacement automatique global/i);
});

for (const kind of ['contact', 'application', 'discord']) {
  test(`notice ${kind}: short information links to the relevant policy section and rights without consent checkbox`, () => {
    const Notice = load()('src/components/legal/PrivacyNotice.tsx').default;
    const html = renderToStaticMarkup(React.createElement(Notice, { kind }));
    const policy = renderPage('src/app/confidentialite/page.tsx');
    assert.match(html, /aria-label="Information sur les données personnelles"/);
    assert.ok(html.includes('[À COMPLÉTER]'));
    assert.doesNotMatch(html, /<input|<form/);
    assert.match(html, /href="\/confidentialite#droits"/);
    for (const [, id] of html.matchAll(/href="\/confidentialite#([^"]+)"/g)) {
      assert.ok(policy.includes(`id="${id}"`), `policy section exists: ${id}`);
    }
  });
}

test('contact and candidature render notice before submission and add no mandatory consent', () => {
  for (const [file, props] of [
    ['src/components/contact/ContactForm.tsx', {}],
    ['src/components/onboarding/OnboardingForm.tsx', { hasVtuberRole: false }],
  ]) {
    const Component = load()(file).default;
    const html = renderToStaticMarkup(React.createElement(Component, props));
    assert.ok(html.indexOf('Information sur les données personnelles') < html.indexOf('type="submit"'));
    assert.doesNotMatch(html, /type="checkbox"/);
    assert.match(html, /href="\/confidentialite#/);
  }
});

test('Discord notice is presented before the login button, while legal pages remain accessible', () => {
  const Login = load()('src/app/login/page.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Login));
  assert.ok(html.indexOf('Information sur les données personnelles') < html.indexOf('Se connecter avec Discord'));
  assert.match(html, /href="\/mentions-legales"/);
  assert.match(html, /href="\/confidentialite#connexion-discord"/);
});

test('shared footer exposes named legal navigation and both routes', () => {
  const Footer = load()('src/components/home/SiteFooter.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Footer));
  assert.match(html, /<footer[^>]+lang="fr"/);
  assert.match(html, /aria-label="Informations légales"/);
  assert.match(html, /href="\/confidentialite"/);
  assert.match(html, /href="\/mentions-legales"/);
});

test('legal links and labels use readable theme colors in the existing light and dark palettes', () => {
  const css = fs.readFileSync(path.join(root, 'src/app/globals.scss'), 'utf8');
  const legalStyles = fs.readFileSync(path.join(root, 'src/components/legal/LegalPage.module.scss'), 'utf8');
  const linkColor = legalStyles.match(/\ba\s*\{\s*color:\s*var\((--[\w-]+)\)/)[1];
  const kickerColor = legalStyles.match(/\.kicker\s*\{\s*color:\s*var\((--[\w-]+)\)/)[1];
  function luminance(color, background) {
    const base = background.slice(1).match(/../g).map(value => parseInt(value, 16));
    const components = color.startsWith('#')
      ? color.slice(1).match(/../g).map(value => parseInt(value, 16))
      : color.match(/[\d.]+/g).map(Number);
    const alpha = components[3] ?? 1;
    const rgb = components.slice(0, 3).map((value, i) => (value * alpha + base[i] * (1 - alpha)) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  for (const selector of [':root', '.dark']) {
    const block = css.slice(css.indexOf(selector)).split('}')[0];
    const colors = Object.fromEntries(Array.from(block.matchAll(/(--[\w-]+):\s*([^;]+);/g), match => [match[1], match[2]]));
    for (const foreground of [linkColor, kickerColor, '--text-secondary']) {
      const background = colors['--background'];
      const levels = [luminance(colors[foreground], background), luminance(background, background)].sort((a, b) => a - b);
      assert.ok((levels[1] + 0.05) / (levels[0] + 0.05) >= 4.5, `${selector}: ${foreground}`);
    }
  }
});
