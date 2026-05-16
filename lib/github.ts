// Real GitHub repository loader for BobSprint.
// Uses the public REST API (no token, no clone) plus opt-in
// "Smart Code Sampling" via raw.githubusercontent.com for a small,
// curated set of important files. All processing stays in the browser.

import type { CodeSample, SampleCategory } from './types';

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  url: string;
}

export interface GitHubRepoMeta {
  name: string;
  full_name: string;
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  size: number;
  html_url: string;
}

export interface GitHubTreeResult {
  paths: string[];
  totalRaw: number;
  totalUseful: number;
  truncatedByGitHub: boolean;
  truncatedByApp: boolean;
  meta: GitHubRepoMeta;
}

export type GitHubErrorCode =
  | 'INVALID_URL'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'FORBIDDEN'
  | 'NETWORK_ERROR'
  | 'EMPTY_REPO'
  | 'API_ERROR';

export class GitHubError extends Error {
  code: GitHubErrorCode;
  status?: number;
  constructor(code: GitHubErrorCode, message?: string, status?: number) {
    super(message ?? code);
    this.code = code;
    this.status = status;
    this.name = 'GitHubError';
  }
}

const SKIP_PATH_RE =
  /(^|\/)(\.git|node_modules|\.next|\.nuxt|\.svelte-kit|\.turbo|\.cache|\.parcel-cache|dist|build|out|target|vendor|coverage|__pycache__|\.venv|venv|env|bin|obj|\.idea|\.vscode|\.pytest_cache|\.mypy_cache)(\/|$)/;

const SKIP_EXT = new Set([
  // images
  'png','jpg','jpeg','gif','webp','svg','ico','bmp','tiff','tif','avif','heic','heif',
  // video
  'mp4','mov','avi','webm','mkv','m4v','flv','wmv','mpg','mpeg',
  // audio
  'mp3','wav','ogg','flac','m4a','aac',
  // fonts
  'ttf','otf','woff','woff2','eot',
  // documents
  'pdf','doc','docx','xls','xlsx','ppt','pptx','rtf','odt','ods','odp',
  // archives
  'zip','tar','gz','tgz','bz2','7z','rar','xz',
  // compiled
  'exe','dll','so','dylib','a','o','obj','class','jar','war','ear','wasm','bin','pyc','pyo',
  // misc binary
  'psd','ai','sketch','fig','blend','dmg','iso','apk','ipa','msi','deb','rpm',
]);

/**
 * Parse a user-supplied URL into { owner, repo }.
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch
 *   git@github.com:owner/repo.git
 *   owner/repo
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let path: string | null = null;

  const httpsMatch = trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/(.+)$/i);
  if (httpsMatch) path = httpsMatch[1];

  if (!path) {
    const sshMatch = trimmed.match(/^git@github\.com:(.+)$/i);
    if (sshMatch) path = sshMatch[1];
  }

  if (!path && /^[\w.-]+\/[\w.-]+$/i.test(trimmed)) {
    path = trimmed;
  }

  if (!path) return null;

  // Drop trailing .git, query string, and any tree/branch suffix.
  const cleanPath = path.replace(/\.git\/?$/, '').split(/[?#]/)[0];
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const [owner, repo] = parts;
  if (!owner || !repo) return null;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;

  return { owner, repo, url: trimmed };
}

/**
 * Filter raw GitHub paths down to "useful" code/config/doc paths only.
 * Drops noise directories and binary file extensions.
 */
export function filterUsefulRepoPaths(paths: string[]): string[] {
  return paths.filter((p) => {
    if (!p) return false;
    if (SKIP_PATH_RE.test(p)) return false;
    const lastDot = p.lastIndexOf('.');
    const lastSlash = p.lastIndexOf('/');
    if (lastDot > lastSlash) {
      const ext = p.slice(lastDot + 1).toLowerCase();
      if (SKIP_EXT.has(ext)) return false;
    }
    return true;
  });
}

interface FetchOptions {
  maxPaths?: number; // default 2000
  signal?: AbortSignal;
}

/**
 * Load the real file tree of a public GitHub repo.
 * Two API calls: repo metadata (for default_branch), then recursive tree.
 * No file contents are downloaded.
 */
export async function fetchGitHubRepoTree(
  url: string,
  opts: FetchOptions = {},
): Promise<GitHubTreeResult> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new GitHubError('INVALID_URL', 'Invalid GitHub repository URL.');
  }

  const { owner, repo } = parsed;
  const headers: HeadersInit = { Accept: 'application/vnd.github+json' };

  // Step 1 — repo metadata for default_branch.
  let metaRes: Response;
  try {
    metaRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers,
      signal: opts.signal,
    });
  } catch (e) {
    throw new GitHubError('NETWORK_ERROR', 'Network error contacting GitHub.');
  }

  if (metaRes.status === 404) {
    throw new GitHubError('NOT_FOUND', 'Repository not found or not public.', 404);
  }
  if (metaRes.status === 403 || metaRes.status === 429) {
    const remaining = metaRes.headers.get('X-RateLimit-Remaining');
    if (remaining === '0' || metaRes.status === 429) {
      throw new GitHubError('RATE_LIMITED', 'GitHub API rate limit reached.', metaRes.status);
    }
    throw new GitHubError('FORBIDDEN', 'GitHub denied access to this repository.', metaRes.status);
  }
  if (!metaRes.ok) {
    throw new GitHubError('API_ERROR', `GitHub returned ${metaRes.status}.`, metaRes.status);
  }

  const meta = (await metaRes.json()) as GitHubRepoMeta;
  if (!meta.default_branch) {
    throw new GitHubError('EMPTY_REPO', 'Repository has no default branch.');
  }

  // Step 2 — recursive tree.
  let treeRes: Response;
  try {
    treeRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`,
      { headers, signal: opts.signal },
    );
  } catch (e) {
    throw new GitHubError('NETWORK_ERROR', 'Network error contacting GitHub.');
  }

  if (treeRes.status === 404) {
    throw new GitHubError('EMPTY_REPO', 'Repository tree not available.', 404);
  }
  if (treeRes.status === 403 || treeRes.status === 429) {
    throw new GitHubError('RATE_LIMITED', 'GitHub API rate limit reached.', treeRes.status);
  }
  if (!treeRes.ok) {
    throw new GitHubError('API_ERROR', `GitHub returned ${treeRes.status}.`, treeRes.status);
  }

  const tree = (await treeRes.json()) as {
    tree?: Array<{ path: string; type: 'blob' | 'tree' }>;
    truncated?: boolean;
  };

  const allPaths = (tree.tree ?? []).map((n) => n.path).filter(Boolean);
  const useful = filterUsefulRepoPaths(allPaths).sort((a, b) => a.localeCompare(b));

  // Default cap is 10,000 — large enough that fastapi (~3k), next.js (~10k), and
  // most repos are kept fully. Keeps artifact detection accurate; downstream
  // prompts compress this list before sending to IBM Bob.
  const maxPaths = opts.maxPaths ?? 10_000;
  const truncatedByApp = useful.length > maxPaths;
  const finalPaths = truncatedByApp ? useful.slice(0, maxPaths) : useful;

  return {
    paths: finalPaths,
    totalRaw: allPaths.length,
    totalUseful: useful.length,
    truncatedByGitHub: !!tree.truncated,
    truncatedByApp,
    meta,
  };
}

export const SAMPLE_REPOS: Array<{ url: string; label: string }> = [
  { url: 'https://github.com/vercel/next.js', label: 'vercel/next.js' },
  { url: 'https://github.com/remix-run/remix', label: 'remix-run/remix' },
  { url: 'https://github.com/tailwindlabs/tailwindcss', label: 'tailwindlabs/tailwindcss' },
  { url: 'https://github.com/fastapi/fastapi', label: 'fastapi/fastapi' },
  { url: 'https://github.com/prisma/prisma', label: 'prisma/prisma' },
];

// ─── Smart Code Sampling ────────────────────────────────────────────────────

export const SAMPLING_LIMITS = {
  maxFiles: 25,
  perFileBytes: 256 * 1024,            // 256 KB
  totalBudgetBytes: 1.5 * 1024 * 1024, // 1.5 MB
};

// Per-category budgets — guarantees variety. Workflows are capped at 3 so a
// repo with 19 GitHub Actions files (e.g. fastapi/fastapi) doesn't drown the
// sample list. Source budget of 10 means real code dominates.
export const SAMPLE_CATEGORY_BUDGETS: Record<SampleCategory, number> = {
  identity: 6,
  source: 10,
  tests: 5,
  docs: 4,
  devops: 3,
};

interface CategoryRule {
  category: SampleCategory;
  reason: string;
  test: (path: string) => boolean;
  // Cap matches per parent folder to encourage variety.
  perFolder?: number;
}

const CATEGORY_RULES: CategoryRule[] = [
  // identity / config / metadata
  { category: 'identity', reason: 'Project README',                          test: (p) => /^README(\.md|\.rst|\.txt)?$/i.test(p) },
  { category: 'identity', reason: 'Project metadata and dependencies',       test: (p) => /^pyproject\.toml$/i.test(p) },
  { category: 'identity', reason: 'Project metadata and dependencies',       test: (p) => /^package\.json$/i.test(p) },
  { category: 'identity', reason: 'Python requirements',                     test: (p) => /^requirements(-[\w]+)?\.txt$/i.test(p) },
  { category: 'identity', reason: 'Python setup',                            test: (p) => /^(setup\.py|setup\.cfg)$/i.test(p) },
  { category: 'identity', reason: 'TypeScript configuration',                test: (p) => /^tsconfig(\.[\w-]+)?\.json$/i.test(p) },
  { category: 'identity', reason: 'Documentation site config',               test: (p) => /^mkdocs\.ya?ml$/i.test(p) },
  { category: 'identity', reason: 'Documentation entry',                     test: (p) => /^docs?\/(index|README)\.(md|mdx|rst)$/i.test(p) },
  { category: 'identity', reason: 'Tailwind configuration',                  test: (p) => /^tailwind\.config\.(m?js|ts)$/i.test(p) },
  { category: 'identity', reason: 'Next.js configuration',                   test: (p) => /^next\.config\.(m?js|ts)$/i.test(p) },
  { category: 'identity', reason: 'Vite configuration',                      test: (p) => /^vite\.config\.(m?js|ts)$/i.test(p) },
  { category: 'identity', reason: 'License',                                 test: (p) => /^LICEN[SC]E(\.md|\.txt)?$/i.test(p) },
  { category: 'identity', reason: 'Contributing guide',                      test: (p) => /^CONTRIBUTING(\.md|\.rst)?$/i.test(p) },
  { category: 'identity', reason: 'Environment template',                    test: (p) => /^\.env\.(example|sample)$/i.test(p) },

  // source — Python framework patterns first, then Node/TS app patterns.
  { category: 'source',   reason: 'Main package entry point',                test: (p) => /^[^/]+\/__init__\.py$/i.test(p), perFolder: 1 },
  { category: 'source',   reason: 'Core framework source (applications)',    test: (p) => /^[^/]+\/applications?\.py$/i.test(p) },
  { category: 'source',   reason: 'Routing/API behavior',                    test: (p) => /^[^/]+\/routing\.py$/i.test(p) },
  { category: 'source',   reason: 'Routing/API behavior',                    test: (p) => /^[^/]+\/router\.py$/i.test(p) },
  { category: 'source',   reason: 'Exception handling',                      test: (p) => /^[^/]+\/exceptions?\.py$/i.test(p) },
  { category: 'source',   reason: 'Dependency injection',                    test: (p) => /(^|\/)dependencies\/[^/]+\.py$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'Middleware logic',                        test: (p) => /(^|\/)middleware\/[^/]+\.py$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'Security logic',                          test: (p) => /(^|\/)security\/[^/]+\.py$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'OpenAPI generation',                      test: (p) => /(^|\/)openapi\/[^/]+\.py$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'API route handler',                       test: (p) => /(^|\/)(routers|api)\/[^/]+\.py$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'API route handler',                       test: (p) => /(^|\/)(app|src)\/api\/.*\/route\.(t|j)sx?$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'Service module',                          test: (p) => /(^|\/)services?\/[^/]+\.py$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'Service module',                          test: (p) => /(^|\/)services?\/[^/]+\.(t|j)sx?$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'Domain model',                            test: (p) => /(^|\/)models\/[^/]+\.py$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'App router root layout',                  test: (p) => /^app\/layout\.(t|j)sx?$/i.test(p) },
  { category: 'source',   reason: 'App router root page',                    test: (p) => /^app\/page\.(t|j)sx?$/i.test(p) },
  { category: 'source',   reason: 'Vite/CRA app entry',                      test: (p) => /^src\/(main|App|index)\.(t|j)sx?$/i.test(p) },
  { category: 'source',   reason: 'Backend entry (Python)',                  test: (p) => /^(backend\/)?(app\/)?main\.py$/i.test(p) },
  { category: 'source',   reason: 'Backend entry (Node)',                    test: (p) => /^(server|src\/server)\.(t|j)sx?$/i.test(p) },
  { category: 'source',   reason: 'Domain library',                          test: (p) => /^lib\/[^/]+\.(t|j)sx?$/i.test(p), perFolder: 2 },
  { category: 'source',   reason: 'Prisma schema',                           test: (p) => /(^|\/)prisma\/schema\.prisma$/i.test(p) },

  // tests
  { category: 'tests',    reason: 'Test configuration',                      test: (p) => /(^|\/)conftest\.py$/i.test(p) },
  { category: 'tests',    reason: 'Test coverage example',                   test: (p) => /(^|\/)tests?\/test_[^/]+\.py$/i.test(p), perFolder: 2 },
  { category: 'tests',    reason: 'Test coverage example',                   test: (p) => /(^|\/)tests?\/[^/]+\.(t|j)sx?$/i.test(p), perFolder: 2 },
  { category: 'tests',    reason: 'Test coverage example',                   test: (p) => /\.(test|spec)\.(t|j)sx?$/i.test(p), perFolder: 2 },

  // docs / examples
  { category: 'docs',     reason: 'Documentation tutorial',                  test: (p) => /^docs_src\/[^/]+\/tutorial[^/]*\.py$/i.test(p), perFolder: 1 },
  { category: 'docs',     reason: 'Documentation example',                   test: (p) => /^docs_src\/.*\.py$/i.test(p), perFolder: 1 },
  { category: 'docs',     reason: 'Examples',                                test: (p) => /^examples?\/.*\.(py|ts|tsx|js|jsx)$/i.test(p), perFolder: 1 },
  { category: 'docs',     reason: 'Documentation entry',                     test: (p) => /^docs?\/[^/]+\.(md|mdx|rst)$/i.test(p), perFolder: 2 },

  // devops — keep small; prefer test/ci/build over labeling/translation
  { category: 'devops',   reason: 'Container build',                         test: (p) => /^Dockerfile$/i.test(p) },
  { category: 'devops',   reason: 'Container compose',                       test: (p) => /^docker-compose(\.[\w-]+)?\.ya?ml$/i.test(p) },
  { category: 'devops',   reason: 'CI test workflow',                        test: (p) => /^\.github\/workflows\/(test|tests|ci|build|main|test-redistribute)\.ya?ml$/i.test(p) },
];

export interface ImportantFilePick {
  path: string;
  reason: string;
  category: SampleCategory;
}

/**
 * Pick a balanced, variety-aware set of important files for sampling.
 * Honours per-category budgets and per-folder caps. If real source code
 * exists in the tree but specific framework rules didn't pick enough,
 * tops up with a generic source fallback.
 */
export function pickImportantFiles(
  paths: string[],
  maxTotal = SAMPLING_LIMITS.maxFiles,
): ImportantFilePick[] {
  const seen = new Set<string>();
  const byCategory: Record<SampleCategory, ImportantFilePick[]> = {
    identity: [],
    source: [],
    tests: [],
    docs: [],
    devops: [],
  };

  // Pass 1: structured rules.
  for (const rule of CATEGORY_RULES) {
    const budget = SAMPLE_CATEGORY_BUDGETS[rule.category];
    if (byCategory[rule.category].length >= budget) continue;

    const folderCounts = new Map<string, number>();
    for (const p of paths) {
      if (byCategory[rule.category].length >= budget) break;
      if (seen.has(p)) continue;
      if (!rule.test(p)) continue;
      if (rule.perFolder !== undefined) {
        const folder = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
        const count = folderCounts.get(folder) ?? 0;
        if (count >= rule.perFolder) continue;
        folderCounts.set(folder, count + 1);
      }
      byCategory[rule.category].push({ path: p, reason: rule.reason, category: rule.category });
      seen.add(p);
    }
  }

  // Pass 2: if real source files exist but our specific rules picked < 5,
  // backfill with a generic source pattern (max 2 per folder for variety).
  if (byCategory.source.length < 5) {
    const fallbacks: Array<{ test: (p: string) => boolean; reason: string }> = [
      { test: (p) => /\.py$/i.test(p) && !/(^|\/)(tests?|docs?|docs_src|examples?)\//i.test(p), reason: 'Python source module' },
      { test: (p) => /\.(ts|tsx)$/i.test(p) && !/\.d\.ts$/i.test(p) && !/\.(test|spec)\./i.test(p) && !/(^|\/)(tests?|docs?|examples?)\//i.test(p), reason: 'TypeScript source module' },
      { test: (p) => /\.(js|mjs|cjs|jsx)$/i.test(p) && !/\.(test|spec)\./i.test(p) && !/(^|\/)(tests?|docs?|examples?)\//i.test(p), reason: 'JavaScript source module' },
      { test: (p) => /\.(go|rs|rb|java|kt|swift)$/i.test(p) && !/(^|\/)(tests?|docs?|examples?)\//i.test(p), reason: 'Source module' },
    ];
    const folderCounts = new Map<string, number>();
    for (const fb of fallbacks) {
      if (byCategory.source.length >= SAMPLE_CATEGORY_BUDGETS.source) break;
      for (const p of paths) {
        if (byCategory.source.length >= SAMPLE_CATEGORY_BUDGETS.source) break;
        if (seen.has(p)) continue;
        if (!fb.test(p)) continue;
        const folder = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
        const c = folderCounts.get(folder) ?? 0;
        if (c >= 2) continue;
        folderCounts.set(folder, c + 1);
        byCategory.source.push({ path: p, reason: fb.reason, category: 'source' });
        seen.add(p);
      }
    }
  }

  // Combine in deterministic order, capped at total budget.
  const ORDER: SampleCategory[] = ['identity', 'source', 'tests', 'docs', 'devops'];
  const all: ImportantFilePick[] = [];
  for (const cat of ORDER) {
    for (const pick of byCategory[cat]) {
      if (all.length >= maxTotal) break;
      all.push(pick);
    }
    if (all.length >= maxTotal) break;
  }
  return all;
}

// Backward-compat thin wrapper for older callers that don't need the category.
export function selectImportantFiles(
  paths: string[],
  max = SAMPLING_LIMITS.maxFiles,
): Array<{ path: string; reason: string }> {
  return pickImportantFiles(paths, max).map(({ path, reason }) => ({ path, reason }));
}

interface SampleOptions {
  maxFiles?: number;
  perFileBytes?: number;
  totalBudgetBytes?: number;
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Read the contents of selected important files via raw.githubusercontent.com.
 * Public repos only. Honours per-file and total byte budgets. Skips on any
 * fetch/parse error so one bad file never blocks the rest.
 */
export async function sampleRepoCode(
  parsed: ParsedGitHubUrl,
  branch: string,
  paths: string[],
  opts: SampleOptions = {},
): Promise<CodeSample[]> {
  const max = opts.maxFiles ?? SAMPLING_LIMITS.maxFiles;
  const perFileBudget = opts.perFileBytes ?? SAMPLING_LIMITS.perFileBytes;
  const totalBudget = opts.totalBudgetBytes ?? SAMPLING_LIMITS.totalBudgetBytes;

  const picks = pickImportantFiles(paths, max);
  const samples: CodeSample[] = [];
  let totalBytes = 0;

  for (let i = 0; i < picks.length; i++) {
    if (totalBytes >= totalBudget) break;
    const { path, reason, category } = picks[i];
    opts.onProgress?.(i + 1, picks.length);

    const url = `https://raw.githubusercontent.com/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/${encodeURIComponent(branch)}/${path
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/')}`;

    try {
      const res = await fetch(url, { signal: opts.signal, cache: 'no-store' });
      if (!res.ok) continue;
      const text = await res.text();
      const totalSize = text.length;
      const slicedToFile = totalSize > perFileBudget ? text.slice(0, perFileBudget) : text;
      const remainingBudget = totalBudget - totalBytes;
      const finalSlice = slicedToFile.length > remainingBudget ? slicedToFile.slice(0, remainingBudget) : slicedToFile;
      samples.push({
        path,
        size: finalSlice.length,
        totalSize,
        preview: finalSlice,
        reason,
        category,
        truncated: finalSlice.length < totalSize,
      });
      totalBytes += finalSlice.length;
    } catch {
      // skip unreadable files; continue with the rest
    }
  }

  return samples;
}
