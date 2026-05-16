'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Github, Coins, CheckCircle, XCircle, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { HydrationGate } from '@/components/shell/hydration-gate';
import { useApp } from '@/lib/store';

// ── PAT validator ─────────────────────────────────────────────────────────────

type PatState = 'idle' | 'validating' | 'valid' | 'invalid';

async function validatePat(pat: string): Promise<{ ok: boolean; login?: string }> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, login: data.login as string };
  } catch {
    return { ok: false };
  }
}

// ── Settings view ─────────────────────────────────────────────────────────────

function SettingsView() {
  const githubPat      = useApp((s) => s.githubPat);
  const setGithubPat   = useApp((s) => s.setGithubPat);
  const bobcoinBudget  = useApp((s) => s.bobcoinBudget);
  const setBobcoinBudget = useApp((s) => s.setBobcoinBudget);
  const runs           = useApp((s) => s.runs);

  const [patInput,   setPatInput]   = useState(githubPat);
  const [patState,   setPatState]   = useState<PatState>('idle');
  const [patLogin,   setPatLogin]   = useState('');
  const [budget,     setBudget]     = useState(bobcoinBudget);
  const [flash,      setFlash]      = useState(false);

  const totalSpent = runs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
  const remainingCoins = Math.max(0, 40 - totalSpent);

  function flashSaved() {
    setFlash(true);
    setTimeout(() => setFlash(false), 1800);
  }

  async function handleValidateAndSave() {
    if (!patInput.trim()) return;
    setPatState('validating');
    const result = await validatePat(patInput.trim());
    if (result.ok) {
      setPatLogin(result.login ?? '');
      setPatState('valid');
      setGithubPat(patInput.trim());
      setBobcoinBudget(budget);
      flashSaved();
    } else {
      setPatState('invalid');
    }
  }

  function handleSaveWithoutValidation() {
    setGithubPat(patInput.trim());
    setBobcoinBudget(budget);
    flashSaved();
  }

  function handleClearPat() {
    setPatInput('');
    setGithubPat('');
    setPatState('idle');
    setPatLogin('');
  }

  return (
    <div className="container-app py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-ink-100 mb-1">Settings</h1>
        <p className="text-ink-500 text-sm">GitHub credentials and Bobcoin budget.</p>
      </div>

      {/* ── GitHub PAT ── */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Github className="w-4 h-4 text-ink-400" />
          <h2 className="text-sm font-semibold text-ink-200">GitHub Personal Access Token</h2>
        </div>
        <p className="text-ink-500 text-xs mb-4 leading-relaxed">
          Required for the Apply stage — forks the repo, commits Bob&apos;s files, opens a draft PR.
          Create at{' '}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan hover:underline font-mono"
          >
            github.com/settings/tokens
          </a>{' '}
          with <span className="font-mono text-ink-300">repo</span> scope.
        </p>

        <div className="flex gap-2 mb-2">
          <input
            type="password"
            value={patInput}
            onChange={(e) => { setPatInput(e.target.value); setPatState('idle'); }}
            placeholder="ghp_..."
            autoComplete="off"
            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm font-mono text-ink-100 placeholder:text-ink-600 focus:outline-none focus:border-[var(--border-active)] focus:shadow-[0_0_0_3px_rgb(var(--accent-cyan)/0.12)]"
          />
          <button
            onClick={handleValidateAndSave}
            disabled={!patInput.trim() || patState === 'validating'}
            className="btn btn-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-40 shrink-0"
          >
            {patState === 'validating'
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</>
              : 'Validate & Save'}
          </button>
        </div>

        {patState === 'valid' && (
          <p className="flex items-center gap-1.5 text-success text-xs mt-2">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Authenticated as <span className="font-mono">@{patLogin}</span>
          </p>
        )}
        {patState === 'invalid' && (
          <p className="flex items-center gap-1.5 text-danger text-xs mt-2">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            Invalid token — check scopes and expiry
          </p>
        )}
        {githubPat && patState === 'idle' && (
          <p className="text-ink-600 text-xs mt-2 flex items-center gap-1.5">
            <KeyRound className="w-3 h-3" /> Saved (ends in …{githubPat.slice(-4)})
            <button onClick={handleClearPat} className="text-danger hover:underline ml-1">clear</button>
          </p>
        )}
      </div>

      {/* ── Bobcoin budget ── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-cyan" />
            <h2 className="text-sm font-semibold text-ink-200">Per-run Bobcoin budget</h2>
          </div>
          <span className="text-cyan font-mono font-bold text-sm">₿{budget.toFixed(1)}</span>
        </div>
        <p className="text-ink-500 text-xs mb-4 leading-relaxed">
          Pipeline halts if a single run exceeds this limit. Hackathon allocates 40 total.
          Use <span className="font-mono text-ink-300">BOBSPRINT_DEV_MODE=1</span> during development to cap runs at 1 file.
        </p>

        <input
          type="range" min={0.5} max={10} step={0.5}
          value={budget}
          onChange={(e) => setBudget(parseFloat(e.target.value))}
          className="w-full accent-cyan"
        />
        <div className="flex justify-between text-[10px] font-mono text-ink-700 mt-1">
          <span>₿0.5</span><span>₿5</span><span>₿10</span>
        </div>

        {/* Global spend tracker */}
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex justify-between items-center text-xs font-mono mb-1.5">
            <span className="text-ink-500">Hackathon balance</span>
            <span className={remainingCoins < 10 ? 'text-warning' : 'text-ink-400'}>
              ₿{totalSpent.toFixed(2)} spent · ₿{remainingCoins.toFixed(2)} remaining
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (totalSpent / 40) * 100)}%`,
                background: totalSpent > 30
                  ? 'rgb(var(--danger))'
                  : totalSpent > 20
                  ? 'rgb(var(--warning))'
                  : 'rgb(var(--accent-cyan))',
              }}
            />
          </div>
          <p className="text-ink-700 text-[10px] font-mono mt-1">40 Bobcoin hackathon allocation</p>
        </div>
      </div>

      {/* ── Save ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveWithoutValidation}
          className="btn btn-primary px-5 py-2.5 text-sm font-semibold"
        >
          {flash ? '✓ Saved' : 'Save settings'}
        </button>
        <Link
          href="/run"
          className="flex items-center gap-1.5 text-xs font-mono text-ink-500 hover:text-ink-200 transition-colors focus-ring rounded"
        >
          Back to Run <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppHeader />
      <HydrationGate>
        <SettingsView />
      </HydrationGate>
    </div>
  );
}
