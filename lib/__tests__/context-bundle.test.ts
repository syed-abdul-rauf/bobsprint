import { describe, it, expect } from 'vitest';
import { buildContextBundle } from '../context-bundle';
import { snapshot } from '../analyzer';
import type { Project } from '../types';

// Minimal Northpeak-like file list to drive a real snapshot
const NORTHPEAK_PATHS = [
  'README.md',
  'backend/main.py',
  'backend/services/cache.py',
  'backend/services/proposals.py',
  'backend/models/customer.py',
  'backend/routers/customers.py',
  'backend/alembic/versions/001_init.py',
  'frontend/app/page.tsx',
  'frontend/app/layout.tsx',
  'frontend/components/ProposalEditor.tsx',
  'frontend/package.json',
  'requirements.txt',
  'docker-compose.yml',
  'alembic.ini',
  '.env.example',
];

function makeProject(paths: string[]): Project {
  const snap = snapshot(paths);
  return {
    id: 'test-northpeak',
    name: 'northpeak-demo/proposal-studio',
    goal: '',
    source: 'github',
    githubUrl: 'https://github.com/northpeak-demo/proposal-studio',
    snapshot: snap,
  };
}

describe('buildContextBundle', () => {
  it('returns a string', () => {
    const project = makeProject(NORTHPEAK_PATHS);
    const bundle = buildContextBundle(project);
    expect(typeof bundle).toBe('string');
    expect(bundle.length).toBeGreaterThan(50);
  });

  it('is under 7500 characters', () => {
    const project = makeProject(NORTHPEAK_PATHS);
    const bundle = buildContextBundle(project);
    expect(bundle.length).toBeLessThanOrEqual(7_500);
  });

  it('includes the repo name', () => {
    const project = makeProject(NORTHPEAK_PATHS);
    const bundle = buildContextBundle(project);
    expect(bundle).toContain('northpeak-demo/proposal-studio');
  });

  it('includes detected stack labels', () => {
    const project = makeProject(NORTHPEAK_PATHS);
    const bundle = buildContextBundle(project);
    // Python and Next.js should be in the bundle
    expect(bundle.toLowerCase()).toMatch(/python|fastapi|next\.?js/i);
  });

  it('includes risk/missing section when test suite is absent', () => {
    const project = makeProject(NORTHPEAK_PATHS); // no test files in paths
    const bundle = buildContextBundle(project);
    // The bundle should mention missing tests
    expect(bundle).toMatch(/test|missing/i);
  });

  it('stays under hard cap even with large file tree', () => {
    const manyPaths = Array.from({ length: 500 }, (_, i) => `src/module_${i}.py`);
    const project = makeProject([...NORTHPEAK_PATHS, ...manyPaths]);
    const bundle = buildContextBundle(project);
    expect(bundle.length).toBeLessThanOrEqual(7_600); // small margin for truncation suffix
  });
});
