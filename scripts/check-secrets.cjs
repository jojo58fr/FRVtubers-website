// Read secrets only in memory. Reports contain filenames/rule names, never
// matching text or credential values. Does not modify files or contact services.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const known = [];
for (const name of fs.readdirSync(root).filter(name => /^\.env(?:\.|$)/.test(name))) {
  if (!fs.statSync(path.join(root, name)).isFile()) continue;
  const content = fs.readFileSync(path.join(root, name), 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || match[1].startsWith('NEXT_PUBLIC_') || !/SECRET|TOKEN|WEBHOOK/.test(match[1])) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    if (value.length >= 12) known.push({ name: match[1], value });
  }
}
const signatures = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['discord-webhook', /https:\/\/(?:discord(?:app)?\.com)\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9_-]{20,}/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
];
const files = new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean));
function addTree(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) addTree(file);
    else files.add(path.relative(root, file));
  }
}
// Production browser chunks are independently checked after a build.
addTree(path.join(root, '.next', 'static'));
let findings = 0, checked = 0, browserChunks = 0;
for (const relative of files) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile() || !/\.(?:[cm]?[jt]sx?|json|md|sql|ya?ml|txt|env)$|(?:^|\/)\.env/.test(relative)) continue;
  const content = fs.readFileSync(file, 'utf8');
  checked++;
  if (relative.replaceAll('\\', '/').startsWith('.next/static/')) browserChunks++;
  const rules = [...signatures.filter(([, regex]) => regex.test(content)).map(([name]) => name),
    ...known.filter(secret => content.includes(secret.value)).map(secret => `local-secret:${secret.name}`)];
  if (relative.replaceAll('\\', '/').startsWith('.next/static/') &&
      ['build-only-discord-secret-placeholder', 'build-only-session-secret-placeholder'].some(value => content.includes(value))) {
    rules.push('server-build-canary-in-browser');
  }
  if (rules.length) {
    findings++;
    console.error(`${relative}: ${Array.from(new Set(rules)).join(', ')}`);
  }
}
// Check known local credential values in reachable Git history, without placing
// values in argv or exposing matching lines. No full entropy scan is claimed.
let historyHits = 0, revisionsChecked = 0;
if (process.argv.includes('--history') && known.length) {
  const revisions = git(['rev-list', '--all']).trim().split(/\r?\n/).filter(Boolean);
  for (const revision of revisions) {
    revisionsChecked++;
    try {
      const hits = execFileSync('git', ['grep', '-I', '-l', '-F', '-f', '-', revision], {
        cwd: root, input: known.map(secret => secret.value).join('\n'), encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024,
      }).trim();
      if (hits) {
        historyHits++;
        console.error(`Known credential in history: ${hits}`);
      }
    } catch (error) {
      if (error.status !== 1) throw new Error('Git history scan failed (details suppressed)');
    }
  }
}
console.log(`Secret scan: ${checked} text files including ${browserChunks} browser chunks; ${findings} current findings; ${revisionsChecked} historical revisions checked; ${historyHits} historical revisions with known credentials.`);
process.exitCode = findings || historyHits ? 1 : 0;
