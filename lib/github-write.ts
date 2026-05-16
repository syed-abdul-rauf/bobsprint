// GitHub REST API write operations — all browser-direct (CORS-enabled for
// authenticated requests). PAT flows browser → api.github.com, no server hop.

const API = 'https://api.github.com';

function headers(pat: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${pat}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghFetch(path: string, pat: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers(pat), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status} ${res.statusText} — ${path}: ${body.slice(0, 200)}`);
  }
  return res;
}

// ── Fork ──────────────────────────────────────────────────────────────────────

export async function forkRepo(owner: string, repo: string, pat: string): Promise<string> {
  const res = await ghFetch(`/repos/${owner}/${repo}/forks`, pat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  // GitHub returns 202 Accepted; the fork owner is in data.owner.login
  return data.owner?.login as string;
}

export async function getOrCreateFork(
  owner: string,
  repo: string,
  pat: string,
): Promise<{ forkOwner: string; defaultBranch: string }> {
  // Get authenticated user's login first
  const userRes = await ghFetch('/user', pat);
  const user = await userRes.json();
  const login = user.login as string;

  // Check if fork already exists for this user
  try {
    const forkRes = await ghFetch(`/repos/${login}/${repo}`, pat);
    const fork = await forkRes.json();
    if (fork.fork && fork.parent?.full_name === `${owner}/${repo}`) {
      return { forkOwner: login, defaultBranch: fork.default_branch as string };
    }
  } catch {
    // Fork doesn't exist yet — create it
  }

  const forkOwner = await forkRepo(owner, repo, pat);

  // GitHub fork creation is async — poll until available (max 30s)
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_000));
    try {
      const checkRes = await ghFetch(`/repos/${forkOwner}/${repo}`, pat);
      const fork = await checkRes.json();
      return { forkOwner, defaultBranch: fork.default_branch as string };
    } catch {
      // not ready yet
    }
  }

  throw new Error(`Fork of ${owner}/${repo} didn't become available within 30 s.`);
}

// ── Branch ────────────────────────────────────────────────────────────────────

export async function getLatestCommitSha(
  owner: string,
  repo: string,
  branch: string,
  pat: string,
): Promise<string> {
  const res = await ghFetch(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    pat,
  );
  const data = await res.json();
  return data.object?.sha as string;
}

export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  fromSha: string,
  pat: string,
): Promise<void> {
  await ghFetch(`/repos/${owner}/${repo}/git/refs`, pat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: fromSha }),
  });
}

// ── File upsert ───────────────────────────────────────────────────────────────

export async function upsertFile(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
  branch: string,
  pat: string,
): Promise<string> {
  // Check for existing file SHA (required when updating)
  let existingSha: string | undefined;
  try {
    const checkRes = await ghFetch(
      `/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
      pat,
    );
    const existing = await checkRes.json();
    existingSha = existing.sha as string;
  } catch {
    // File does not exist yet — create
  }

  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))), // UTF-8 → base64
    branch,
  };
  if (existingSha) body.sha = existingSha;

  const res = await ghFetch(`/repos/${owner}/${repo}/contents/${filePath}`, pat, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.content?.sha ?? (data.commit?.sha as string);
}

// ── Draft PR ──────────────────────────────────────────────────────────────────

export async function createDraftPR(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,     // "forkOwner:branchName"
  base: string,     // default branch of the upstream repo
  pat: string,
): Promise<string> {
  const res = await ghFetch(`/repos/${owner}/${repo}/pulls`, pat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, head, base, draft: true }),
  });
  const data = await res.json();
  return data.html_url as string;
}
