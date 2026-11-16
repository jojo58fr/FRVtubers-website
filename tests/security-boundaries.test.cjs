const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { root } = require('./load-source.cjs');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}

test('client import graph never reaches server-only auth, secrets, Prisma or filesystem modules', () => {
  const files = sourceFiles(path.join(root, 'src'));
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /import ['"]server-only['"]/, path.relative(root, file));
    assert.doesNotMatch(text, /process\.env\.(?:NEXTAUTH_SECRET|DISCORD_CLIENT_SECRET|DISCORD_\w*WEBHOOK_URL)/, path.relative(root, file));
    const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    for (const node of tree.statements) {
      if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly) continue;
      const specifier = node.moduleSpecifier.text;
      assert.ok(!specifier.startsWith('node:fs') && specifier !== '@prisma/client', specifier);
      if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue;
      const base = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
      const target = [base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate));
      if (target) visit(target);
    }
  }
  for (const file of files) {
    if (/^\s*['"]use client['"]/.test(fs.readFileSync(file, 'utf8'))) visit(file);
  }
  assert.ok(visited.size > 10);
});

test('sensitive library modules declare the Next.js server-only boundary', () => {
  for (const file of ['auth', 'prisma', 'discord-avatar', 'security-log', 'request-security']) {
    assert.match(fs.readFileSync(path.join(root, 'src/lib', file + '.ts'), 'utf8'), /import 'server-only'/);
  }
});
