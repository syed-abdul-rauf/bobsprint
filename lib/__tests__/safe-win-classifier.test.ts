import { describe, it, expect } from 'vitest';
import { classifyByPath, classifyContent } from '../safe-win-classifier';

describe('classifyByPath', () => {
  it('marks a new test file as safe with type add-tests', () => {
    const r = classifyByPath('backend/tests/test_cache_isolation.py');
    expect(r.safe).toBe(true);
    if (r.safe) expect(r.type).toBe('add-tests');
  });

  it('marks a TypeScript test file as safe', () => {
    const r = classifyByPath('src/__tests__/auth.test.ts');
    expect(r.safe).toBe(true);
    if (r.safe) expect(r.type).toBe('add-tests');
  });

  it('blocks package.json', () => {
    const r = classifyByPath('package.json');
    expect(r.safe).toBe(false);
    if (!r.safe) expect(r.reason).toMatch(/package\.json/i);
  });

  it('blocks Dockerfile', () => {
    const r = classifyByPath('Dockerfile');
    expect(r.safe).toBe(false);
  });

  it('blocks a config file (next.config.mjs)', () => {
    const r = classifyByPath('next.config.mjs');
    expect(r.safe).toBe(false);
  });

  it('blocks a YAML file (CI workflow)', () => {
    const r = classifyByPath('.github/workflows/ci.yml');
    expect(r.safe).toBe(false);
  });

  it('marks docs/SETUP.md as safe with type add-docs', () => {
    const r = classifyByPath('docs/SETUP.md');
    expect(r.safe).toBe(true);
    if (r.safe) expect(r.type).toBe('add-docs');
  });

  it('marks README.md as safe with type add-readme-section', () => {
    const r = classifyByPath('README.md');
    expect(r.safe).toBe(true);
    if (r.safe) expect(r.type).toBe('add-readme-section');
  });

  it('marks a TypeScript source file as safe with type add-jsdoc', () => {
    const r = classifyByPath('lib/utils.ts');
    expect(r.safe).toBe(true);
    if (r.safe) expect(r.type).toBe('add-jsdoc');
  });
});

describe('classifyContent', () => {
  it('new file (null original) is always safe', () => {
    const r = classifyContent('export function foo() {}', null);
    expect(r.safe).toBe(true);
  });

  it('comment-only addition is safe', () => {
    const original = 'export function foo() {\n  return 1;\n}\n';
    const updated = '// This function returns one\nexport function foo() {\n  return 1;\n}\n';
    const r = classifyContent(updated, original);
    expect(r.safe).toBe(true);
  });

  it('deleting a non-trivial line is unsafe', () => {
    const original = 'export function foo() {\n  return 1;\n}\n';
    const updated = 'export function foo() {\n}\n';
    const r = classifyContent(updated, original);
    expect(r.safe).toBe(false);
    if (!r.safe) expect(r.reason).toMatch(/non-trivial/i);
  });

  it('blank-line-only deletion is safe', () => {
    const original = 'const x = 1;\n\n\nconst y = 2;\n';
    const updated = 'const x = 1;\nconst y = 2;\n';
    const r = classifyContent(updated, original);
    expect(r.safe).toBe(true);
  });
});
