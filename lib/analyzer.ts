import type {
  AppType,
  ArtifactCheck,
  ArtifactStatus,
  FolderInfo,
  MissingItem,
  RepoSnapshot,
  RiskCard,
  StackHit,
} from './types';

const FOLDER_PURPOSE: Record<string, string> = {
  app: 'Next.js App Router routes, layouts, and server components',
  pages: 'Next.js Pages Router routes',
  src: 'Primary source root',
  components: 'Reusable UI components',
  ui: 'Design-system primitives',
  lib: 'Shared utilities, helpers, domain logic',
  utils: 'Helper functions',
  hooks: 'React hooks',
  api: 'HTTP route handlers / API endpoints',
  routes: 'HTTP routes',
  controllers: 'Request handlers (MVC)',
  services: 'Domain service layer',
  repositories: 'Data access layer',
  models: 'Domain or ORM models',
  schemas: 'Validation / data schemas',
  migrations: 'Database migrations',
  prisma: 'Prisma ORM schema and client',
  alembic: 'Alembic migration scripts',
  backend: 'Backend application root',
  frontend: 'Frontend application root',
  server: 'Server entry / runtime',
  client: 'Client entry / runtime',
  tests: 'Automated tests',
  test: 'Automated tests',
  __tests__: 'Jest/Vitest tests',
  spec: 'Test specs',
  e2e: 'End-to-end tests',
  docs: 'Documentation',
  doc: 'Documentation',
  scripts: 'Operational scripts',
  infra: 'Infrastructure-as-code',
  terraform: 'Terraform IaC',
  k8s: 'Kubernetes manifests',
  kubernetes: 'Kubernetes manifests',
  helm: 'Helm charts',
  config: 'Configuration files',
  public: 'Static public assets',
  assets: 'Static assets',
  styles: 'Stylesheets',
  middleware: 'Middleware layer',
  workers: 'Background workers',
  jobs: 'Scheduled jobs',
  graphql: 'GraphQL schemas / resolvers',
  proto: 'Protocol Buffer definitions',
};

export function parseFileTree(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cleaned = lines.map((line) => {
    const stripped = line
      .replace(/^[\s│├└──]+/u, '')
      .replace(/^[\s\-*+]+/u, '')
      .replace(/\s+#.*$/, '')
      .trim();
    return stripped;
  });

  return Array.from(new Set(cleaned.filter((l) => l.length > 0 && !l.startsWith('//'))));
}

const STACK_RULES: Array<{
  test: (path: string) => boolean;
  hit: Omit<StackHit, 'evidence'>;
}> = [
  { test: (p) => /(^|\/)next\.config\.(m?js|ts)$/i.test(p), hit: { kind: 'nextjs', label: 'Next.js', category: 'frontend' } },
  { test: (p) => /(^|\/)vite\.config\.(m?js|ts)$/i.test(p), hit: { kind: 'vite', label: 'Vite', category: 'frontend' } },
  { test: (p) => /(^|\/)package\.json$/i.test(p), hit: { kind: 'node', label: 'Node.js', category: 'backend' } },
  { test: (p) => /(^|\/)tsconfig.*\.json$/i.test(p), hit: { kind: 'typescript', label: 'TypeScript', category: 'tooling' } },
  { test: (p) => /(^|\/)tailwind\.config\.(m?js|ts)$/i.test(p), hit: { kind: 'tailwind', label: 'Tailwind CSS', category: 'frontend' } },
  { test: (p) => /(^|\/)requirements\.txt$/i.test(p) || /(^|\/)pyproject\.toml$/i.test(p), hit: { kind: 'python', label: 'Python', category: 'backend' } },
  { test: (p) => /(^|\/)main\.py$/i.test(p) || /(^|\/)app\.py$/i.test(p), hit: { kind: 'python', label: 'Python app', category: 'backend' } },
  { test: (p) => /fastapi/i.test(p), hit: { kind: 'fastapi', label: 'FastAPI', category: 'backend' } },
  { test: (p) => /(^|\/)manage\.py$/i.test(p) || /django/i.test(p), hit: { kind: 'django', label: 'Django', category: 'backend' } },
  { test: (p) => /flask/i.test(p), hit: { kind: 'flask', label: 'Flask', category: 'backend' } },
  { test: (p) => /(^|\/)composer\.json$/i.test(p), hit: { kind: 'php', label: 'PHP / Composer', category: 'backend' } },
  { test: (p) => /(^|\/)artisan$/i.test(p), hit: { kind: 'laravel', label: 'Laravel', category: 'backend' } },
  { test: (p) => /(^|\/)docker-compose\.ya?ml$/i.test(p) || /(^|\/)Dockerfile$/i.test(p), hit: { kind: 'docker', label: 'Docker', category: 'devops' } },
  { test: (p) => /prisma\/schema\.prisma$/i.test(p), hit: { kind: 'prisma', label: 'Prisma', category: 'database' } },
  { test: (p) => /(^|\/)alembic(\/|\.ini$)/i.test(p), hit: { kind: 'alembic', label: 'Alembic', category: 'database' } },
  { test: (p) => /(^|\/)go\.mod$/i.test(p), hit: { kind: 'go', label: 'Go', category: 'backend' } },
  { test: (p) => /(^|\/)Cargo\.toml$/i.test(p), hit: { kind: 'rust', label: 'Rust', category: 'backend' } },
  { test: (p) => /(^|\/)pom\.xml$/i.test(p) || /(^|\/)build\.gradle/i.test(p), hit: { kind: 'java', label: 'Java', category: 'backend' } },
  { test: (p) => /spring/i.test(p), hit: { kind: 'spring', label: 'Spring', category: 'backend' } },
  { test: (p) => /(^|\/)k8s\//i.test(p) || /(^|\/)kubernetes\//i.test(p) || (/\.ya?ml$/i.test(p) && /deployment|service|ingress/i.test(p)), hit: { kind: 'kubernetes', label: 'Kubernetes', category: 'devops' } },
  { test: (p) => /\.tf$/i.test(p), hit: { kind: 'terraform', label: 'Terraform', category: 'devops' } },
  { test: (p) => /\.github\/workflows\//i.test(p), hit: { kind: 'github-actions', label: 'GitHub Actions', category: 'devops' } },
  { test: (p) => /jest\.config|jest\.setup/i.test(p), hit: { kind: 'jest', label: 'Jest', category: 'testing' } },
  { test: (p) => /vitest\.config/i.test(p), hit: { kind: 'vitest', label: 'Vitest', category: 'testing' } },
  { test: (p) => /(^|\/)pytest\.ini$|conftest\.py$/i.test(p), hit: { kind: 'pytest', label: 'pytest', category: 'testing' } },
  { test: (p) => /reportlab/i.test(p), hit: { kind: 'reportlab', label: 'ReportLab', category: 'backend' } },
  { test: (p) => /postgres|psql|pg_/i.test(p), hit: { kind: 'postgres', label: 'PostgreSQL', category: 'database' } },
  { test: (p) => /mongo/i.test(p), hit: { kind: 'mongodb', label: 'MongoDB', category: 'database' } },
  { test: (p) => /redis/i.test(p), hit: { kind: 'redis', label: 'Redis', category: 'database' } },
];

const REACT_DIR_HINTS = ['components', 'pages', 'app'];

export function detectStack(paths: string[]): StackHit[] {
  const hits = new Map<string, StackHit>();

  for (const path of paths) {
    for (const rule of STACK_RULES) {
      if (rule.test(path)) {
        if (!hits.has(rule.hit.kind)) {
          hits.set(rule.hit.kind, { ...rule.hit, evidence: path });
        }
      }
    }
  }

  const hasJsxLike = paths.some((p) => /\.(tsx|jsx)$/i.test(p));
  const hasReactDir = paths.some((p) =>
    REACT_DIR_HINTS.some((h) => p.startsWith(h + '/') || p.includes('/' + h + '/')),
  );
  if (hasJsxLike && hasReactDir && !hits.has('react')) {
    hits.set('react', {
      kind: 'react',
      label: 'React',
      category: 'frontend',
      evidence: paths.find((p) => /\.(tsx|jsx)$/i.test(p)) || '',
    });
  }

  return Array.from(hits.values()).sort((a, b) => a.label.localeCompare(b.label));
}

const EXT_LOC_FACTOR: Record<string, number> = {
  ts: 35, tsx: 45, js: 35, jsx: 40,
  py: 40, rb: 35, php: 40, java: 50, go: 35, rs: 40,
  css: 25, scss: 30, html: 25,
  md: 12, json: 8, yml: 10, yaml: 10,
};

export function snapshot(paths: string[], treeTruncated = false): RepoSnapshot {
  const folders = new Map<string, number>();
  const extCount = new Map<string, number>();
  let totalFiles = 0;
  let estimatedLoc = 0;

  for (const path of paths) {
    if (path.endsWith('/')) {
      folders.set(path.slice(0, -1), folders.get(path.slice(0, -1)) ?? 0);
      continue;
    }
    totalFiles += 1;

    const parts = path.split('/');
    if (parts.length > 1) {
      const top = parts[0];
      folders.set(top, (folders.get(top) ?? 0) + 1);
      if (parts.length > 2) {
        const second = parts[0] + '/' + parts[1];
        folders.set(second, (folders.get(second) ?? 0) + 1);
      }
    } else {
      folders.set('(root)', (folders.get('(root)') ?? 0) + 1);
    }

    const dot = path.lastIndexOf('.');
    if (dot > -1 && dot > path.lastIndexOf('/')) {
      const ext = path.slice(dot + 1).toLowerCase();
      if (ext.length <= 6) {
        extCount.set(ext, (extCount.get(ext) ?? 0) + 1);
        estimatedLoc += EXT_LOC_FACTOR[ext] ?? 15;
      }
    }
  }

  const importantFolders: FolderInfo[] = [];
  for (const [folder, count] of folders) {
    const top = folder.split('/').pop() ?? folder;
    const purpose = FOLDER_PURPOSE[top.toLowerCase()];
    if (purpose && !folder.includes('node_modules') && !folder.includes('.next')) {
      importantFolders.push({ path: folder, purpose, fileCount: count });
    }
  }
  importantFolders.sort((a, b) => b.fileCount - a.fileCount);

  const topExtensions = Array.from(extCount.entries())
    .map(([ext, count]) => ({ ext, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const stack = detectStack(paths);
  const totalDirs = folders.size;
  const artifacts = checkArtifacts(paths, treeTruncated);
  const missing = artifacts
    .filter((a) => a.status === 'missing')
    .map(({ key, label, why, severity }) => ({ key, label, why, severity }));
  const unverified = artifacts.filter((a) => a.status === 'unknown');
  const appType = detectAppType(paths);

  return {
    totalFiles,
    totalDirs,
    estimatedLoc,
    topExtensions,
    importantFolders: importantFolders.slice(0, 10),
    stack,
    missing,
    unverified,
    artifacts,
    fileTree: paths,
    treeTruncated,
    appType,
  };
}

interface ArtifactSpec {
  key: string;
  label: string;
  why: string;
  severity: 'low' | 'medium' | 'high';
  detect: (path: string) => boolean;
}

const ARTIFACT_SPECS: ArtifactSpec[] = [
  {
    key: 'readme',
    label: 'README',
    why: 'Defines project purpose, setup, and usage.',
    severity: 'high',
    detect: (p) => /^README(\.md|\.rst|\.txt)?$/i.test(p),
  },
  {
    key: 'tests',
    label: 'Test suite',
    why: 'Automated tests reduce risk on every change.',
    severity: 'high',
    detect: (p) =>
      /(^|\/)(tests?|__tests__|spec|e2e|specs)\//i.test(p) ||
      /\.(test|spec)\.(t|j)sx?$/i.test(p) ||
      /(^|\/)test_[^/]+\.py$/i.test(p) ||
      /(^|\/)conftest\.py$/i.test(p),
  },
  {
    key: 'ci',
    label: 'CI workflow',
    why: 'CI gates merges with build, lint, and test runs on every PR.',
    severity: 'medium',
    detect: (p) =>
      /\.github\/workflows\/[^/]+\.ya?ml$/i.test(p) ||
      /^\.gitlab-ci\.ya?ml$/i.test(p) ||
      /^\.circleci\//i.test(p) ||
      /^azure-pipelines\.ya?ml$/i.test(p),
  },
  {
    key: 'envExample',
    label: '.env.example',
    why: 'Documents required env vars.',
    severity: 'medium',
    detect: (p) => /^\.env\.(example|sample)$/i.test(p),
  },
  {
    key: 'dockerfile',
    label: 'Dockerfile',
    why: 'Reproducible local and production environments.',
    severity: 'low',
    detect: (p) => /^Dockerfile(\.[\w-]+)?$/i.test(p),
  },
  {
    key: 'security',
    label: 'SECURITY.md',
    why: 'A published security policy gives a defined disclosure path.',
    severity: 'medium',
    detect: (p) => /^SECURITY(\.md|\.rst)?$/i.test(p),
  },
  {
    key: 'license',
    label: 'LICENSE',
    why: 'License file makes the legal status of the code unambiguous.',
    severity: 'low',
    detect: (p) => /^LICEN[SC]E(\.md|\.txt|\.rst)?$/i.test(p),
  },
  {
    key: 'contributing',
    label: 'CONTRIBUTING guide',
    why: 'Sets contribution conventions for new engineers and AI tools.',
    severity: 'low',
    detect: (p) => /^CONTRIBUTING(\.md|\.rst)?$/i.test(p),
  },
];

export function checkArtifacts(paths: string[], treeTruncated: boolean): ArtifactCheck[] {
  return ARTIFACT_SPECS.map((spec) => {
    const present = paths.some(spec.detect);
    if (present) {
      return {
        key: spec.key,
        label: spec.label,
        why: spec.why,
        severity: spec.severity,
        status: 'present' as ArtifactStatus,
        confidence: 'high' as const,
        reason: 'Found in loaded tree.',
      };
    }
    if (treeTruncated) {
      return {
        key: spec.key,
        label: spec.label,
        why: spec.why,
        severity: spec.severity,
        status: 'unknown' as ArtifactStatus,
        confidence: 'low' as const,
        reason: 'Not found in loaded tree, but the repository tree is partial — needs verification.',
      };
    }
    return {
      key: spec.key,
      label: spec.label,
      why: spec.why,
      severity: spec.severity,
      status: 'missing' as ArtifactStatus,
      confidence: 'high' as const,
      reason: 'Not found in repository.',
    };
  });
}

export function detectMissing(paths: string[], treeTruncated = false): MissingItem[] {
  return checkArtifacts(paths, treeTruncated)
    .filter((a) => a.status === 'missing')
    .map(({ key, label, why, severity }) => ({ key, label, why, severity }));
}

export function detectAppType(paths: string[]): AppType {
  const hasPyproject = paths.some((p) => /^pyproject\.toml$/i.test(p));
  const hasPackageDir = paths.some((p) => /^[^/]+\/__init__\.py$/i.test(p));
  const hasFastapiPkg = paths.some((p) => /^fastapi\/__init__\.py$/i.test(p));
  const hasNextConfig = paths.some((p) => /^next\.config\.(m?js|ts)$/i.test(p));
  const hasViteConfig = paths.some((p) => /^vite\.config\.(m?js|ts)$/i.test(p));
  const hasMkdocs = paths.some((p) => /^mkdocs\.ya?ml$/i.test(p));
  const hasAppEntry = paths.some(
    (p) => /^app\/page\.(t|j)sx?$/i.test(p) || /^src\/(main|App)\.(t|j)sx?$/i.test(p),
  );
  const hasBackendEntry = paths.some((p) => /^(backend\/)?(app\/)?main\.py$/i.test(p));
  const hasCli = paths.some(
    (p) => /(^|\/)__main__\.py$/i.test(p) || /(^|\/)cli\.py$/i.test(p) || /^bin\//i.test(p),
  );
  const hasMonorepo =
    paths.some((p) => /^packages\//i.test(p)) || paths.some((p) => /^apps\//i.test(p));

  if (hasMonorepo) return 'monorepo';
  if (hasFastapiPkg || (hasPyproject && hasPackageDir && !hasBackendEntry)) return 'library';
  if (hasNextConfig || hasViteConfig || hasAppEntry || hasBackendEntry) return 'app';
  if (hasMkdocs && !hasPackageDir) return 'docs';
  if (hasCli) return 'cli';
  return 'unknown';
}

export function artifactStatusOf(snap: RepoSnapshot, key: string): ArtifactStatus {
  return snap.artifacts.find((a) => a.key === key)?.status ?? 'unknown';
}

export function generateRisks(snap: RepoSnapshot): RiskCard[] {
  const risks: RiskCard[] = [];
  const statusOf = (key: string) => artifactStatusOf(snap, key);

  if (statusOf('security') === 'missing') {
    risks.push({
      category: 'security',
      severity: 'high',
      title: 'No published security policy',
      why: 'Without SECURITY.md, vulnerability disclosure has no defined path.',
      fix: 'Add SECURITY.md with disclosure email, supported versions, and triage SLA.',
      relatedPaths: ['SECURITY.md (missing)'],
    });
  }

  if (statusOf('envExample') === 'missing') {
    risks.push({
      category: 'security',
      severity: 'medium',
      title: 'Environment contract undocumented',
      why: 'Missing .env.example invites secrets being hard-coded or committed by accident.',
      fix: 'Document all required env vars in .env.example.',
      relatedPaths: ['.env.example (missing)'],
    });
  }

  if (statusOf('tests') === 'missing') {
    risks.push({
      category: 'testing',
      severity: 'high',
      title: 'No automated test surface',
      why: 'Any AI-generated or manual change ships unverified.',
      fix: 'Bootstrap a smoke suite covering critical paths before any sprint work begins.',
      relatedPaths: ['tests/ (missing)'],
    });
  } else if (statusOf('tests') === 'present') {
    risks.push({
      category: 'testing',
      severity: 'medium',
      title: 'Tests detected; coverage breadth unknown',
      why: 'Test files exist, but their coverage of critical paths is not measured here.',
      fix: 'Run coverage and gate CI at a minimum threshold for core modules.',
      relatedPaths: snap.fileTree
        .filter((p) => /(^|\/)tests?\/|conftest\.py$|\.(test|spec)\./i.test(p))
        .slice(0, 3),
    });
  }

  if (statusOf('readme') === 'missing') {
    risks.push({
      category: 'documentation',
      severity: 'medium',
      title: 'No README — onboarding cliff',
      why: 'New engineers (or AI tools) cannot orient.',
      fix: 'Generate a README with project purpose, stack, setup, run commands, and architecture link.',
      relatedPaths: ['README.md (missing)'],
    });
  }

  if (statusOf('ci') === 'missing') {
    risks.push({
      category: 'deployment',
      severity: 'medium',
      title: 'No CI gating merges',
      why: 'Without CI, broken builds can land.',
      fix: 'Add a CI workflow running install → typecheck → lint → test on every PR.',
      relatedPaths: ['.github/workflows/ (missing)'],
    });
  }

  if (snap.stack.some((s) => s.kind === 'nextjs') || snap.stack.some((s) => s.kind === 'react')) {
    risks.push({
      category: 'performance',
      severity: 'medium',
      title: 'Client bundle size is unmonitored',
      why: 'Frontend without bundle budgets tends to bloat.',
      fix: 'Add @next/bundle-analyzer or size-limit; fail CI on regressions over a threshold.',
      relatedPaths: snap.fileTree.filter((p) => /package\.json/i.test(p)).slice(0, 1),
    });
  }

  if (snap.stack.some((s) => ['fastapi', 'flask', 'django'].includes(s.kind))) {
    risks.push({
      category: 'security',
      severity: 'medium',
      title: 'Input validation surface is untested',
      why: 'Python web frameworks accept untyped JSON freely.',
      fix: 'Adopt Pydantic models (FastAPI) or DRF serializers (Django).',
      relatedPaths: snap.fileTree.filter((p) => /\.py$/i.test(p)).slice(0, 3),
    });
  }

  risks.push({
    category: 'maintainability',
    severity: 'low',
    title: 'Implicit conventions slow review',
    why: 'Without an AGENTS.md / CONTRIBUTING.md, code review converges slowly to house style.',
    fix: 'Document conventions for naming, file layout, error handling, and PR scope.',
    relatedPaths: ['AGENTS.md (missing)'],
  });

  return risks;
}
