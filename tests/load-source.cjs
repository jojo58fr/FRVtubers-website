// Run the actual TS/TSX modules with node:test and the existing TypeScript
// compiler. Each loader has isolated modules, environment and I/O doubles.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loadSource({ mocks = {}, env = {}, fetch, expose = {}, console: output, globals = {} } = {}) {
  const cache = new Map();
  const context = vm.createContext({
    Buffer, URL, URLSearchParams, Request, Response, Headers, AbortSignal, TextDecoder,
    Uint8Array, FormData, File, setTimeout, clearTimeout,
    process: { env: {
      NODE_ENV: 'test', DISCORD_CLIENT_ID: 'test-client',
      DISCORD_CLIENT_SECRET: 'test-client-secret', NEXTAUTH_SECRET: 'test-session-secret',
      NEXTAUTH_URL: 'https://site.test', ...env,
    }, cwd: () => root },
    console: output ?? { info() {}, warn() {}, error() {}, log() {} },
    fetch: fetch ?? (() => { throw new Error('Unexpected network access in test'); }),
    ...globals,
  });
  function load(filename) {
    filename = path.resolve(root, filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} };
    cache.set(filename, mod);
    const nativeRequire = createRequire(filename);
    function resolve(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier === 'server-only') return {};
      if (/\.(scss|png|webp|jpg)$/.test(specifier)) return {};
      if (specifier.startsWith('@/') || specifier.startsWith('.')) {
        const base = specifier.startsWith('@/')
          ? path.join(root, 'src', specifier.slice(2))
          : path.resolve(path.dirname(filename), specifier);
        for (const candidate of [base, base + '.ts', base + '.tsx']) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return load(candidate);
        }
      }
      return nativeRequire(specifier);
    }
    const relative = path.relative(root, filename).replaceAll('\\', '/');
    let source = fs.readFileSync(filename, 'utf8');
    // Exercise private server actions without changing their production exports.
    if (expose[relative]) source += `\nexport { ${expose[relative].join(', ')} };\n`;
    const { outputText } = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    const wrapper = new vm.Script(`(function(exports, require, module, __filename, __dirname) {\n${outputText}\n})`, { filename });
    wrapper.runInContext(context)(mod.exports, resolve, mod, filename, path.dirname(filename));
    return mod.exports;
  }
  return load;
}
module.exports = { loadSource, root };
