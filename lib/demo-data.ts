import type { AutoPilotRun, DemoFixture, EvidenceEntry, SafeWin } from './types';
import { generateId } from './utils';

export const DEMO_FIXTURE_URL = 'demo';

// ── Pre-recorded Bob responses for the Northpeak Proposal Studio demo ─────────

export const NORTHPEAK_DEMO_FIXTURE: DemoFixture = {
  planModeOutput: JSON.stringify([
    {
      type: 'add-tests',
      targetPath: 'backend/tests/test_cache_isolation.py',
      description: 'Property-based test asserting two distinct (tenant, customer) pairs never share a cache result',
    },
    {
      type: 'add-tests',
      targetPath: 'backend/tests/test_customer_search.py',
      description: 'Endpoint tests for /customers/search: empty query, special chars, paging',
    },
    {
      type: 'add-docs',
      targetPath: 'docs/SETUP.md',
      description: 'Local dev setup guide covering env vars, DB seed, and common errors',
    },
    {
      type: 'add-readme-section',
      targetPath: 'README.md',
      description: 'Add architecture overview, quick-start, and known issues sections',
    },
  ]),

  askModeOutput: `• Northpeak is a B2B AI proposal generator with a Next.js frontend and a FastAPI backend backed by PostgreSQL.
• Health: needs-work — cache contamination bug in services/cache.py is a critical tenancy defect.
• Most important gap: no test suite exists; every change ships unverified.
• Top action: fix cache key scoping in cache.py to include tenant_id + customer_id before any other work.
• Sprint readiness: not ready — the cache bug and missing tests are blockers for any safe deploy.`,

  codeModeOutputs: {
    'backend/tests/test_cache_isolation.py': `"""Property-based tests for cache isolation between (tenant, customer) pairs."""
import pytest
from hypothesis import given, strategies as st
from app.services.cache import cache_key, get_cached, set_cached, CACHE


@pytest.fixture(autouse=True)
def clear_cache():
    CACHE.clear()
    yield
    CACHE.clear()


@given(
    tenant_a=st.text(min_size=1, max_size=20),
    customer_a=st.text(min_size=1, max_size=20),
    tenant_b=st.text(min_size=1, max_size=20),
    customer_b=st.text(min_size=1, max_size=20),
    prompt=st.text(min_size=1, max_size=100),
)
def test_distinct_pairs_never_share_cache(tenant_a, customer_a, tenant_b, customer_b, prompt):
    """Two distinct (tenant, customer) pairs must never return each other's cached output."""
    # Ensure the pairs are actually distinct
    if (tenant_a, customer_a) == (tenant_b, customer_b):
        return

    output_a = f"output_for_{tenant_a}_{customer_a}"
    set_cached(prompt, output_a, tenant_id=tenant_a, customer_id=customer_a)

    result = get_cached(prompt, tenant_id=tenant_b, customer_id=customer_b)
    assert result != output_a, (
        f"Cache leak: ({tenant_b}, {customer_b}) received output belonging to "
        f"({tenant_a}, {customer_a})"
    )


def test_same_pair_returns_cached_output():
    """The same (tenant, customer, prompt) triplet must return the cached result."""
    set_cached("test prompt", "expected output", tenant_id="t1", customer_id="c1")
    assert get_cached("test prompt", tenant_id="t1", customer_id="c1") == "expected output"


def test_cache_miss_returns_none():
    assert get_cached("unknown prompt", tenant_id="t1", customer_id="c1") is None
`,

    'backend/tests/test_customer_search.py': `"""Tests for GET /customers/search endpoint."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_empty_query_returns_empty_list():
    response = client.get("/customers/search", params={"q": ""})
    assert response.status_code == 200
    assert response.json() == []


def test_special_characters_do_not_error():
    response = client.get("/customers/search", params={"q": "'; DROP TABLE customers;--"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_paging_limit_is_respected():
    response = client.get("/customers/search", params={"q": "a", "limit": 3})
    assert response.status_code == 200
    assert len(response.json()) <= 3


def test_paging_offset_skips_results():
    all_results = client.get("/customers/search", params={"q": "a", "limit": 100}).json()
    offset_results = client.get("/customers/search", params={"q": "a", "limit": 100, "offset": 1}).json()
    if len(all_results) > 1:
        assert offset_results[0] != all_results[0]


def test_returns_required_fields():
    response = client.get("/customers/search", params={"q": "test"})
    for item in response.json():
        assert "id" in item
        assert "name" in item
`,

    'docs/SETUP.md': `# Local Development Setup

## Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+
- Docker (optional, for the full stack)

## Quick start

\`\`\`bash
# Clone and install backend dependencies
cd backend
pip install -r requirements.txt

# Copy the env template and fill in your values
cp ../.env.example .env

# Run database migrations
alembic upgrade head

# Start the API
uvicorn main:app --reload --port 8000
\`\`\`

\`\`\`bash
# In a second terminal, install and start the frontend
cd frontend
npm install
npm run dev
\`\`\`

## Environment variables

| Variable | Required | Description |
|---|---|---|
| \`DATABASE_URL\` | Yes | PostgreSQL connection string |
| \`OPENAI_API_KEY\` | Yes | LLM provider key |
| \`SECRET_KEY\` | Yes | JWT signing secret (generate with \`openssl rand -hex 32\`) |
| \`REDIS_URL\` | No | Redis for caching (falls back to in-memory) |
| \`LOG_LEVEL\` | No | Logging verbosity (default: \`info\`) |

## Common errors

**\`connection refused\` on DB start**
Make sure PostgreSQL is running: \`pg_ctl start\` or \`docker compose up db\`

**\`alembic.util.exc.CommandError: Can't locate revision\`**
Run \`alembic stamp head\` to reset the revision pointer, then \`alembic upgrade head\`.

**Frontend can't reach the API**
Check that \`NEXT_PUBLIC_API_URL\` in \`frontend/.env.local\` matches your backend port.
`,
  },

  safetyGateResponses: {
    'backend/tests/test_cache_isolation.py': 'SAFE',
    'backend/tests/test_customer_search.py': 'SAFE',
    'docs/SETUP.md': 'SAFE',
    'README.md': 'DEFERRED: Modifying README requires understanding current content to avoid duplicating sections.',
  },

  commitMessages: {
    'backend/tests/test_cache_isolation.py':
      'test: add property-based cache isolation tests\n\nEnsures distinct (tenant, customer) pairs never share cached proposal output.',
    'backend/tests/test_customer_search.py':
      'test: add customer search endpoint test suite\n\nCovers empty query, SQL injection chars, paging limit/offset, and field presence.',
    'docs/SETUP.md':
      'docs: add local development setup guide\n\nCovers prerequisites, quick-start commands, env vars table, and common errors.',
  },

  prTitle: 'feat(bobsprint): add missing tests and setup docs',

  prBody: `## Summary

BobSprint Auto-Pilot analyzed Northpeak Proposal Studio and applied 3 add-only improvements identified by IBM Bob in Plan mode.

## Changes

- \`backend/tests/test_cache_isolation.py\` — Property-based tests for the cache tenancy bug (the primary risk Bob flagged)
- \`backend/tests/test_customer_search.py\` — Endpoint test suite for the customer search API
- \`docs/SETUP.md\` — Local development setup guide covering prerequisites, env vars, and common errors

## Notes

- This is a **draft PR**. All changes are additive only — no existing logic was modified.
- 1 item deferred to human review: README.md modification (requires human context).
- Generated by [BobSprint](https://github.com/bobsprint) Auto-Pilot. Review before merging.`,
};

// ── Pre-built demo run ────────────────────────────────────────────────────────

export function buildDemoRun(): AutoPilotRun {
  const now = Date.now();
  const runId = 'demo-northpeak';

  const approvedWins: SafeWin[] = [
    {
      id: generateId(),
      type: 'add-tests',
      description: 'Property-based test asserting two distinct (tenant, customer) pairs never share a cache result',
      targetPath: 'backend/tests/test_cache_isolation.py',
      content: NORTHPEAK_DEMO_FIXTURE.codeModeOutputs['backend/tests/test_cache_isolation.py'],
      commitMessage: NORTHPEAK_DEMO_FIXTURE.commitMessages['backend/tests/test_cache_isolation.py'],
      safetyStatus: 'approved',
      appliedAt: now - 1000 * 60 * 1,
      commitSha: 'a1b2c3d',
    },
    {
      id: generateId(),
      type: 'add-tests',
      description: 'Endpoint tests for /customers/search: empty query, special chars, paging',
      targetPath: 'backend/tests/test_customer_search.py',
      content: NORTHPEAK_DEMO_FIXTURE.codeModeOutputs['backend/tests/test_customer_search.py'],
      commitMessage: NORTHPEAK_DEMO_FIXTURE.commitMessages['backend/tests/test_customer_search.py'],
      safetyStatus: 'approved',
      appliedAt: now - 1000 * 55,
      commitSha: 'e4f5g6h',
    },
    {
      id: generateId(),
      type: 'add-docs',
      description: 'Local dev setup guide covering env vars, DB seed, and common errors',
      targetPath: 'docs/SETUP.md',
      content: NORTHPEAK_DEMO_FIXTURE.codeModeOutputs['docs/SETUP.md'],
      commitMessage: NORTHPEAK_DEMO_FIXTURE.commitMessages['docs/SETUP.md'],
      safetyStatus: 'approved',
      appliedAt: now - 1000 * 48,
      commitSha: 'i7j8k9l',
    },
    {
      id: generateId(),
      type: 'add-readme-section',
      description: 'Add architecture overview, quick-start, and known issues sections',
      targetPath: 'README.md',
      content: '',
      commitMessage: '',
      safetyStatus: 'deferred',
      safetyReason: 'Modifying README requires understanding current content to avoid duplicating sections.',
    },
  ];

  const evidence: EvidenceEntry[] = [
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 60 * 4,
      stage: 'recon',
      eventType: 'recon-complete',
      summary: 'Analyzed 47 files across 12 folders. Stack: FastAPI, Next.js, PostgreSQL, Alembic, Docker. Missing: test suite, SECURITY.md, CI workflow.',
      durationMs: 4800,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 60 * 3,
      stage: 'fan-out',
      eventType: 'bob-plan',
      summary: 'Bob (Plan mode) identified 4 safe improvements: 2 test files, 1 doc file, 1 README section.',
      mode: 'Plan',
      durationMs: 18400,
      costEstimate: 0.4,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 60 * 3,
      stage: 'fan-out',
      eventType: 'bob-ask',
      summary: 'Bob (Ask mode) produced executive summary: cache contamination identified as primary risk, no tests as secondary blocker.',
      mode: 'Ask',
      durationMs: 12200,
      costEstimate: 0.25,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 60 * 2,
      stage: 'fan-out',
      eventType: 'bob-code',
      summary: 'Bob (Code mode) wrote backend/tests/test_cache_isolation.py — property-based tests using Hypothesis.',
      mode: 'Code',
      durationMs: 21600,
      costEstimate: 0.35,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 60 * 2,
      stage: 'fan-out',
      eventType: 'bob-code',
      summary: 'Bob (Code mode) wrote backend/tests/test_customer_search.py — 5 endpoint tests including injection chars.',
      mode: 'Code',
      durationMs: 19800,
      costEstimate: 0.3,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 90,
      stage: 'fan-out',
      eventType: 'bob-code',
      summary: 'Bob (Code mode) wrote docs/SETUP.md — setup guide with env vars table and troubleshooting.',
      mode: 'Code',
      durationMs: 15200,
      costEstimate: 0.2,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 80,
      stage: 'safety-gate',
      eventType: 'safety-gate',
      summary: 'Safety gate: test_cache_isolation.py → SAFE (new file, no runtime behavior change).',
      durationMs: 3200,
      costEstimate: 0.05,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 78,
      stage: 'safety-gate',
      eventType: 'safety-gate',
      summary: 'Safety gate: test_customer_search.py → SAFE (new file, no runtime behavior change).',
      durationMs: 2900,
      costEstimate: 0.05,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 75,
      stage: 'safety-gate',
      eventType: 'safety-gate',
      summary: 'Safety gate: SETUP.md → SAFE (new documentation file).',
      durationMs: 2400,
      costEstimate: 0.04,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 72,
      stage: 'safety-gate',
      eventType: 'safety-gate',
      summary: 'Safety gate: README.md → DEFERRED. Modifying README requires understanding current content.',
      durationMs: 3100,
      costEstimate: 0.05,
      deferred: true,
      deferReason: 'Modifying README requires understanding current content to avoid duplicating sections.',
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 60,
      stage: 'apply',
      eventType: 'file-applied',
      summary: 'Committed backend/tests/test_cache_isolation.py to fork branch bobsprint/rescue-demo.',
      durationMs: 1800,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 55,
      stage: 'apply',
      eventType: 'file-applied',
      summary: 'Committed backend/tests/test_customer_search.py to fork branch.',
      durationMs: 1600,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 48,
      stage: 'apply',
      eventType: 'file-applied',
      summary: 'Committed docs/SETUP.md to fork branch.',
      durationMs: 1500,
    },
    {
      id: generateId(),
      runId,
      timestamp: now - 1000 * 40,
      stage: 'apply',
      eventType: 'pr-opened',
      summary: 'Opened draft PR #1 on fork: "feat(bobsprint): add missing tests and setup docs"',
      durationMs: 2200,
    },
  ];

  return {
    id: runId,
    githubUrl: 'https://github.com/northpeak-demo/proposal-studio',
    repoOwner: 'northpeak-demo',
    repoName: 'proposal-studio',
    startedAt: now - 1000 * 60 * 4,
    completedAt: now - 1000 * 35,
    stage: 'done',
    safeWins: approvedWins,
    evidence,
    executiveSummary: NORTHPEAK_DEMO_FIXTURE.askModeOutput,
    prUrl: 'https://github.com/bobsprint-demo/proposal-studio/pull/1',
    prTitle: NORTHPEAK_DEMO_FIXTURE.prTitle,
    totalCost: 1.69,
    forkOwner: 'bobsprint-demo',
    branchName: 'bobsprint/rescue-demo',
    filesAnalyzed: 47,
    isDemo: true,
  };
}
