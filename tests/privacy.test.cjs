const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadSource } = require('./load-source.cjs');

test('staff resource list never embeds a depositor-controlled preview, but keeps an explicit protected link', () => {
  const Manager = loadSource()('src/app/admin/ressources/ResourcesManager.tsx').default;
  const action = async () => {};
  const html = renderToStaticMarkup(React.createElement(Manager, {
    resources: [{ id: 'fixture', status: 'PENDING', assetTitle: 'Synthetic asset', creatorName: 'Creator',
      assetUrl: 'https://example.test/resource', previewImageUrl: 'https://image.example.test/pixel',
      languages: ['FR'], tags: [], price: 0, featured: false, submitterName: 'Fixture',
      createdAt: '2026-11-16', updatedAt: '2026-11-16' }],
    availableTags: [], updateStatusAction: action, toggleFeaturedAction: action, deleteAction: action,
    updateTagsAction: action, createResourceAction: action, updateResourceAction: action,
    createTagAction: action, deleteTagAction: action, updateTagAction: action,
  }));
  assert.doesNotMatch(html, /<(?:img|iframe)\b|rel="(?:preload|prefetch)"/);
  assert.match(html, /href="https:\/\/image\.example\.test\/pixel"[^>]+rel="noopener noreferrer"[^>]+referrerPolicy="no-referrer"/i);
  assert.match(html, /adresse IP/);
});
