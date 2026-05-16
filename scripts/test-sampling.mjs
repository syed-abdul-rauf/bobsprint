#!/usr/bin/env node
/**
 * Verify Smart Code Sampling against real GitHub repos.
 *
 * Mirrors the production picker logic from lib/github.ts so we can validate
 * category quotas + perFolder limits + workflow-cap end-to-end. Pass a repo
 * URL as the first argument or default to fastapi/fastapi.
 *
 *   node scripts/test-sampling.mjs                          # fastapi/fastapi
 *   node scripts/test-sampling.mjs vercel/next.js           # next.js
 */

const repoArg = process.argv[2] || 'fastapi/fastapi';
const [owner, repo] = repoArg.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '').replace(/\.git$/, '').split('/');
if (!owner || !repo) {
  console.error('Usage: node scripts/test-sampling.mjs <owner/repo>');
  process.exit(1);
}

const SKIP_PATH_RE =
  /(^|\/)(\.git|node_modules|\.next|\.nuxt|\.svelte-kit|\.turbo|\.cache|\.parcel-cache|dist|build|out|target|vendor|coverage|__pycache__|\.venv|venv|env|bin|obj|\.idea|\.vscode|\.pytest_cache|\.mypy_cache)(\/|$)/;

const SKIP_EXT = new Set([
  'png','jpg','jpeg','gif','webp','svg','ico','bmp','tiff','tif','avif','heic','heif',
  'mp4','mov','avi','webm','mkv','m4v','flv','wmv','mpg','mpeg',
  'mp3','wav','ogg','flac','m4a','aac',
  'ttf','otf','woff','woff2','eot',
  'pdf','doc','docx','xls','xlsx','ppt','pptx','rtf','odt','ods','odp',
  'zip','tar','gz','tgz','bz2','7z','rar','xz',
  'exe','dll','so','dylib','a','o','obj','class','jar','war','ear','wasm','bin','pyc','pyo',
  'psd','ai','sketch','fig','blend','dmg','iso','apk','ipa','msi','deb','rpm',
]);

const filterUseful = (paths) => paths.filter((p) => {
  if (SKIP_PATH_RE.test(p)) return false;
  const lastDot = p.lastIndexOf('.');
  const lastSlash = p.lastIndexOf('/');
  if (lastDot > lastSlash) {
    const ext = p.slice(lastDot + 1).toLowerCase();
    if (SKIP_EXT.has(ext)) return false;
  }
  return true;
});

const SAMPLE_CATEGORY_BUDGETS = { identity: 6, source: 10, tests: 5, docs: 4, devops: 3 };
const TOTAL = 25;

const RULES = [
  { c: 'identity', r: 'Project README',                       t: (p) => /^README(\.md|\.rst|\.txt)?$/i.test(p) },
  { c: 'identity', r: 'Project metadata and dependencies',    t: (p) => /^pyproject\.toml$/i.test(p) },
  { c: 'identity', r: 'Project metadata and dependencies',    t: (p) => /^package\.json$/i.test(p) },
  { c: 'identity', r: 'Python requirements',                  t: (p) => /^requirements(-[\w]+)?\.txt$/i.test(p) },
  { c: 'identity', r: 'Python setup',                         t: (p) => /^(setup\.py|setup\.cfg)$/i.test(p) },
  { c: 'identity', r: 'TypeScript configuration',             t: (p) => /^tsconfig(\.[\w-]+)?\.json$/i.test(p) },
  { c: 'identity', r: 'Documentation site config',            t: (p) => /^mkdocs\.ya?ml$/i.test(p) },
  { c: 'identity', r: 'Documentation entry',                  t: (p) => /^docs?\/(index|README)\.(md|mdx|rst)$/i.test(p) },
  { c: 'identity', r: 'Tailwind configuration',               t: (p) => /^tailwind\.config\.(m?js|ts)$/i.test(p) },
  { c: 'identity', r: 'Next.js configuration',                t: (p) => /^next\.config\.(m?js|ts)$/i.test(p) },
  { c: 'identity', r: 'Vite configuration',                   t: (p) => /^vite\.config\.(m?js|ts)$/i.test(p) },
  { c: 'identity', r: 'License',                              t: (p) => /^LICEN[SC]E(\.md|\.txt)?$/i.test(p) },
  { c: 'identity', r: 'Contributing guide',                   t: (p) => /^CONTRIBUTING(\.md|\.rst)?$/i.test(p) },
  { c: 'identity', r: 'Environment template',                 t: (p) => /^\.env\.(example|sample)$/i.test(p) },

  { c: 'source',   r: 'Main package entry point',             t: (p) => /^[^/]+\/__init__\.py$/i.test(p), pf: 1 },
  { c: 'source',   r: 'Core framework source (applications)', t: (p) => /^[^/]+\/applications?\.py$/i.test(p) },
  { c: 'source',   r: 'Routing/API behavior',                 t: (p) => /^[^/]+\/routing\.py$/i.test(p) },
  { c: 'source',   r: 'Routing/API behavior',                 t: (p) => /^[^/]+\/router\.py$/i.test(p) },
  { c: 'source',   r: 'Exception handling',                   t: (p) => /^[^/]+\/exceptions?\.py$/i.test(p) },
  { c: 'source',   r: 'Dependency injection',                 t: (p) => /(^|\/)dependencies\/[^/]+\.py$/i.test(p), pf: 2 },
  { c: 'source',   r: 'Middleware logic',                     t: (p) => /(^|\/)middleware\/[^/]+\.py$/i.test(p), pf: 2 },
  { c: 'source',   r: 'Security logic',                       t: (p) => /(^|\/)security\/[^/]+\.py$/i.test(p), pf: 2 },
  { c: 'source',   r: 'OpenAPI generation',                   t: (p) => /(^|\/)openapi\/[^/]+\.py$/i.test(p), pf: 2 },
  { c: 'source',   r: 'API route handler',                    t: (p) => /(^|\/)(routers|api)\/[^/]+\.py$/i.test(p), pf: 2 },
  { c: 'source',   r: 'API route handler',                    t: (p) => /(^|\/)(app|src)\/api\/.*\/route\.(t|j)sx?$/i.test(p), pf: 2 },
  { c: 'source',   r: 'Service module',                       t: (p) => /(^|\/)services?\/[^/]+\.py$/i.test(p), pf: 2 },
  { c: 'source',   r: 'Service module',                       t: (p) => /(^|\/)services?\/[^/]+\.(t|j)sx?$/i.test(p), pf: 2 },
  { c: 'source',   r: 'Domain model',                         t: (p) => /(^|\/)models\/[^/]+\.py$/i.test(p), pf: 2 },
  { c: 'source',   r: 'App router root layout',               t: (p) => /^app\/layout\.(t|j)sx?$/i.test(p) },
  { c: 'source',   r: 'App router root page',                 t: (p) => /^app\/page\.(t|j)sx?$/i.test(p) },
  { c: 'source',   r: 'Vite/CRA app entry',                   t: (p) => /^src\/(main|App|index)\.(t|j)sx?$/i.test(p) },
  { c: 'source',   r: 'Backend entry (Python)',               t: (p) => /^(backend\/)?(app\/)?main\.py$/i.test(p) },
  { c: 'source',   r: 'Backend entry (Node)',                 t: (p) => /^(server|src\/server)\.(t|j)sx?$/i.test(p) },
  { c: 'source',   r: 'Domain library',                       t: (p) => /^lib\/[^/]+\.(t|j)sx?$/i.test(p), pf: 2 },
  { c: 'source',   r: 'Prisma schema',                        t: (p) => /(^|\/)prisma\/schema\.prisma$/i.test(p) },

  { c: 'tests',    r: 'Test configuration',                   t: (p) => /(^|\/)conftest\.py$/i.test(p) },
  { c: 'tests',    r: 'Test coverage example',                t: (p) => /(^|\/)tests?\/test_[^/]+\.py$/i.test(p), pf: 2 },
  { c: 'tests',    r: 'Test coverage example',                t: (p) => /(^|\/)tests?\/[^/]+\.(t|j)sx?$/i.test(p), pf: 2 },
  { c: 'tests',    r: 'Test coverage example',                t: (p) => /\.(test|spec)\.(t|j)sx?$/i.test(p), pf: 2 },

  { c: 'docs',     r: 'Documentation tutorial',               t: (p) => /^docs_src\/[^/]+\/tutorial[^/]*\.py$/i.test(p), pf: 1 },
  { c: 'docs',     r: 'Documentation example',                t: (p) => /^docs_src\/.*\.py$/i.test(p), pf: 1 },
  { c: 'docs',     r: 'Examples',                             t: (p) => /^examples?\/.*\.(py|ts|tsx|js|jsx)$/i.test(p), pf: 1 },
  { c: 'docs',     r: 'Documentation entry',                  t: (p) => /^docs?\/[^/]+\.(md|mdx|rst)$/i.test(p), pf: 2 },

  { c: 'devops',   r: 'Container build',                      t: (p) => /^Dockerfile$/i.test(p) },
  { c: 'devops',   r: 'Container compose',                    t: (p) => /^docker-compose(\.[\w-]+)?\.ya?ml$/i.test(p) },
  { c: 'devops',   r: 'CI test workflow',                     t: (p) => /^\.github\/workflows\/(test|tests|ci|build|main|test-redistribute)\.ya?ml$/i.test(p) },
];

function pick(paths, max = TOTAL) {
  const seen = new Set();
  const by = { identity: [], source: [], tests: [], docs: [], devops: [] };
  for (const rule of RULES) {
    if (by[rule.c].length >= SAMPLE_CATEGORY_BUDGETS[rule.c]) continue;
    const folderCounts = new Map();
    for (const p of paths) {
      if (by[rule.c].length >= SAMPLE_CATEGORY_BUDGETS[rule.c]) break;
      if (seen.has(p)) continue;
      if (!rule.t(p)) continue;
      if (rule.pf !== undefined) {
        const folder = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
        const cnt = folderCounts.get(folder) ?? 0;
        if (cnt >= rule.pf) continue;
        folderCounts.set(folder, cnt + 1);
      }
      by[rule.c].push({ path: p, reason: rule.r, category: rule.c });
      seen.add(p);
    }
  }
  // Pass 2: source fallback
  if (by.source.length < 5) {
    const fb = [
      { t: (p) => /\.py$/i.test(p) && !/(^|\/)(tests?|docs?|docs_src|examples?)\//i.test(p), r: 'Python source module' },
      { t: (p) => /\.(ts|tsx)$/i.test(p) && !/\.d\.ts$/i.test(p) && !/\.(test|spec)\./i.test(p) && !/(^|\/)(tests?|docs?|examples?)\//i.test(p), r: 'TypeScript source module' },
      { t: (p) => /\.(js|mjs|cjs|jsx)$/i.test(p) && !/\.(test|spec)\./i.test(p) && !/(^|\/)(tests?|docs?|examples?)\//i.test(p), r: 'JavaScript source module' },
      { t: (p) => /\.(go|rs|rb|java|kt|swift)$/i.test(p) && !/(^|\/)(tests?|docs?|examples?)\//i.test(p), r: 'Source module' },
    ];
    const fc = new Map();
    for (const f of fb) {
      if (by.source.length >= SAMPLE_CATEGORY_BUDGETS.source) break;
      for (const p of paths) {
        if (by.source.length >= SAMPLE_CATEGORY_BUDGETS.source) break;
        if (seen.has(p)) continue;
        if (!f.t(p)) continue;
        const folder = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
        const cnt = fc.get(folder) ?? 0;
        if (cnt >= 2) continue;
        fc.set(folder, cnt + 1);
        by.source.push({ path: p, reason: f.r, category: 'source' });
        seen.add(p);
      }
    }
  }
  const order = ['identity', 'source', 'tests', 'docs', 'devops'];
  const all = [];
  for (const cat of order) {
    for (const pk of by[cat]) {
      if (all.length >= max) break;
      all.push(pk);
    }
    if (all.length >= max) break;
  }
  return { all, by };
}

(async () => {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'BobSprint-test' };
  const meta = await (await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })).json();
  const branch = meta.default_branch;
  const tree = await (await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers })).json();
  const blobPaths = (tree.tree || []).filter((n) => n.type === 'blob').map((n) => n.path);
  const useful = filterUseful(blobPaths).sort();
  const truncated = !!tree.truncated;

  const { all, by } = pick(useful);

  console.log(`\nRepo: ${meta.full_name} @ ${branch}`);
  console.log(`Total blobs: ${blobPaths.length.toLocaleString()}  ·  Useful: ${useful.length.toLocaleString()}  ·  Truncated by GitHub: ${truncated}\n`);

  console.log('=== Sampling result by category ===');
  for (const cat of ['identity', 'source', 'tests', 'docs', 'devops']) {
    const cap = SAMPLE_CATEGORY_BUDGETS[cat];
    console.log(`\n[${cat}]  ${by[cat].length}/${cap}`);
    for (const x of by[cat]) console.log(`  ${x.path}  —  ${x.reason}`);
  }
  console.log(`\nTotal picked: ${all.length} / ${TOTAL}`);

  // Validate user's specific concerns
  const wfCount = by.devops.filter((p) => /\.github\/workflows/.test(p.path)).length;
  const sourceCount = by.source.length;
  const hasReadme = useful.some((p) => /^README(\.md|\.rst|\.txt)?$/i.test(p));
  const hasTests = useful.some((p) => /(^|\/)tests?\//i.test(p) || /\.(test|spec)\./i.test(p));

  console.log('\n=== Quality gates ===');
  console.log(`  workflows in sample:     ${wfCount}        (expected ≤ 3)         ${wfCount <= 3 ? '✓' : '✗'}`);
  console.log(`  source files sampled:    ${sourceCount}        (expected ≥ 5)        ${sourceCount >= 5 ? '✓' : '✗'}`);
  console.log(`  README detected in tree: ${hasReadme}    (false positive guard) ${hasReadme ? '✓' : '—'}`);
  console.log(`  tests detected in tree:  ${hasTests}    (false positive guard) ${hasTests ? '✓' : '—'}`);
})();
