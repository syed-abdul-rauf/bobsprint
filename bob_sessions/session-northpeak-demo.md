# Bob Session — BobSprint Pipeline Run (Northpeak Demo)

> Exported from Bob IDE — BobSprint autopilot run  
> Repo: `northpeak-demo/proposal-studio`  
> Run date: 2026-05-16  
> Mode: Demo fixture (offline replay of pre-recorded Bob responses)

---

## Session 1 — Plan mode (Fan-out Stage)

**Prompt sent to Bob:**
```
Repository: northpeak-demo/proposal-studio
URL: https://github.com/northpeak-demo/proposal-studio
Stack: TypeScript · React · Next.js · Tailwind CSS
App type: web-app
Entry points: src/app/page.tsx, src/app/layout.tsx
Key dependencies: react 18.3, next 14.2, tailwindcss 3.4
Missing artifacts: tests (no test files found), API docs

Your job: identify add-only improvements this repository is missing.
Output a JSON array, nothing else:
[{"type":"add-tests"|"add-docs"|"add-readme-section","targetPath":"...","description":"..."}]
Rules:
- Maximum 5 items. Only new files or content added to existing files.
- No deletions, no logic edits, no config/dependency changes.
- Prioritize: missing tests > missing docs > missing README.
- If no gaps, return [].
```

**Bob response (Plan mode):**
```json
[
  {
    "type": "add-tests",
    "targetPath": "src/__tests__/ProposalCard.test.tsx",
    "description": "Unit tests for ProposalCard component covering render, status badge variants, and click handler"
  },
  {
    "type": "add-tests",
    "targetPath": "src/__tests__/useProposals.test.ts",
    "description": "Hook tests for useProposals covering fetch, loading state, and error handling"
  },
  {
    "type": "add-docs",
    "targetPath": "docs/API.md",
    "description": "API reference for the proposals REST endpoints with request/response examples"
  }
]
```

**Duration:** 1,512ms | **Mode:** Plan | **Exit code:** 0

---

## Session 2 — Ask mode (Fan-out Stage, parallel with Session 1)

**Prompt sent to Bob:**
```
[context bundle as above]

Write a 5-bullet executive summary:
• What this codebase does
• Overall health (good/needs-work/critical) + one reason
• Most important gap
• Top action a new owner should take first
• Sprint readiness verdict

Plain text, bullets only, no headers.
```

**Bob response (Ask mode):**
```
• Proposal Studio is a Next.js web app that lets sales teams create, track, and share
  client proposals with status workflows and PDF export.
• Health: needs-work — no test coverage found across 23 source files.
• Most important gap: zero automated tests mean any refactor is blind.
• First action for a new owner: add component tests for ProposalCard and the useProposals
  hook before touching the status-change logic.
• Sprint readiness: moderate — core functionality is complete but the lack of tests creates
  delivery risk for any feature work.
```

**Duration:** 1,505ms | **Mode:** Ask | **Exit code:** 0

---

## Session 3 — Code mode (Fan-out Stage)

**Prompt sent to Bob:**
```
Repository: northpeak-demo/proposal-studio
File to create: src/__tests__/ProposalCard.test.tsx
Type: add-tests — Unit tests for ProposalCard component covering render, status badge variants, and click handler
Language: TypeScript/React

Output ONLY the complete file content. No explanation. No markdown fences.
```

**Bob response (Code mode):**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ProposalCard } from '../components/ProposalCard';

const baseProps = {
  id: 'p1',
  title: 'Enterprise Rollout Q3',
  client: 'Acme Corp',
  status: 'draft' as const,
  value: 45000,
  onClick: jest.fn(),
};

describe('ProposalCard', () => {
  it('renders title and client', () => {
    render(<ProposalCard {...baseProps} />);
    expect(screen.getByText('Enterprise Rollout Q3')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows draft badge for draft status', () => {
    render(<ProposalCard {...baseProps} status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows sent badge for sent status', () => {
    render(<ProposalCard {...baseProps} status="sent" />);
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(<ProposalCard {...baseProps} />);
    fireEvent.click(screen.getByRole('article'));
    expect(baseProps.onClick).toHaveBeenCalledWith('p1');
  });
});
```

**Duration:** 1,514ms | **Mode:** Code | **Exit code:** 0

---

## Session 4 — Ask mode (Safety Gate Stage)

**Prompt sent to Bob:**
```
A file will be added to proposal-studio:
Path: src/__tests__/ProposalCard.test.tsx
Content:
import { render, screen, fireEvent } from '@testing-library/react';
import { ProposalCard } from '../components/ProposalCard';
[... first 1500 chars ...]

Does adding this file change the runtime behavior of any existing code?
Answer exactly: SAFE  or  DEFERRED: [one reason sentence]. Nothing else.
```

**Bob response (Ask mode — Safety Gate):**
```
SAFE
```

**Duration:** 498ms | **Mode:** Ask | **Exit code:** 0

---

## Session 5 — Ask mode (Apply Stage — commit message)

**Prompt sent to Bob:**
```
File added: src/__tests__/ProposalCard.test.tsx — Unit tests for ProposalCard component covering render, status badge variants, and click handler
Write a git commit message (conventional commits):
Line 1: "feat: " or "test: " or "docs: " + description under 50 chars
Blank line
1-sentence body.
Only the commit message. Nothing else.
```

**Bob response (Ask mode — commit message):**
```
test: add ProposalCard unit tests

Covers render, status badge variants, and click handler for the ProposalCard component.
```

**Duration:** 501ms | **Mode:** Ask | **Exit code:** 0

---

## Session 6 — Ask mode (Apply Stage — PR description)

**Prompt sent to Bob:**
```
These files were added to proposal-studio:
- src/__tests__/ProposalCard.test.tsx — Unit tests for ProposalCard component
- src/__tests__/useProposals.test.ts — Hook tests for useProposals
- docs/API.md — API reference for proposals REST endpoints

Write a GitHub PR:
Title (line 1, under 72 chars, prefix "feat(bobsprint): ")
[...]
```

**Bob response (Ask mode — PR description):**
```
feat(bobsprint): add tests and API docs to proposal-studio

## Summary
Added automated tests for the two highest-risk components (ProposalCard and
useProposals hook) and a REST API reference that was missing from the repository.
All changes are additive — no existing code was modified.

## Changes
- `src/__tests__/ProposalCard.test.tsx` — Unit tests covering render, status badges, and click handler
- `src/__tests__/useProposals.test.ts` — Hook tests covering fetch lifecycle and error states
- `docs/API.md` — Endpoint reference with request/response examples for the proposals API

## Notes
- Draft PR. All changes are additive only.
- Generated by BobSprint. Review before merging.
```

**Duration:** 503ms | **Mode:** Ask | **Exit code:** 0

---

## Summary

| Session | Stage | Mode | Duration | Result |
|---------|-------|------|----------|--------|
| 1 | Fan-out | Plan | 1,512ms | 3 safe wins identified |
| 2 | Fan-out | Ask | 1,505ms | Executive summary produced |
| 3 | Fan-out | Code | 1,514ms | ProposalCard test file written |
| 4 | Safety gate | Ask | 498ms | SAFE verdict |
| 5 | Apply | Ask | 501ms | Commit message generated |
| 6 | Apply | Ask | 503ms | PR description generated |

**Total Bob calls:** 6 | **Total duration:** ~6.0s (mock mode)  
**Draft PR:** `https://github.com/bobsprint-demo/proposal-studio/pull/1`
