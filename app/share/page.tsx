'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, GitPullRequest, ExternalLink, FileCode2, ShieldCheck, ShieldAlert, Link2Off } from 'lucide-react';
import { Brand } from '@/components/shell/brand';
import { ScoreRing } from '@/components/ui/score-ring';
import { Badge } from '@/components/ui/badge';
import { decodeSnapshot } from '@/lib/share';
import { repoLabel } from '@/lib/sprint-pack';
import type { ReportSnapshot } from '@/lib/sprint-pack';

function bullets(text: string): string[] {
  return text.split('\n').map((l) => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
}

function tone(grade: string): 'mint' | 'cyan' | 'violet' {
  return grade === 'A' || grade === 'B' ? 'mint' : grade === 'C' ? 'cyan' : 'violet';
}

export default function SharePage() {
  const [snap, setSnap] = useState<ReportSnapshot | null | undefined>(undefined);

  useEffect(() => {
    setSnap(decodeSnapshot(window.location.hash));
  }, []);

  return (
    <div className="min-h-screen bg-base">
      <header className="border-b border-[var(--border-subtle)]">
        <div className="container-app h-14 flex items-center justify-between">
          <Brand withText />
          <Link href="/run" className="btn btn-primary px-4 py-2 text-sm font-semibold">
            Try BobSprint <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {snap === undefined ? (
        <div className="flex justify-center py-32">
          <div className="h-6 w-6 rounded-full border-2 border-cyan/40 border-t-cyan animate-spin" />
        </div>
      ) : snap === null ? (
        <div className="container-app py-24 text-center">
          <Link2Off className="w-8 h-8 text-ink-600 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-ink-100 mb-3">Invalid or empty share link</h1>
          <p className="text-ink-500 text-sm mb-8">This link doesn&apos;t contain a valid BobSprint report.</p>
          <Link href="/run" className="btn btn-primary px-5 py-2.5 text-sm font-semibold">
            Run BobSprint <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="container-app py-8 max-w-3xl">
          <p className="text-ink-500 text-xs font-mono mb-1">Shared BobSprint report · read-only</p>
          <h1 className="text-2xl font-black text-ink-100 mb-6 break-all">{repoLabel(snap.repo)}</h1>

          <div className="card p-6 mb-6 flex items-center gap-6">
            <ScoreRing value={snap.score} size={104} thickness={9} label="Health" tone={tone(snap.grade)} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl font-black text-ink-100">Grade {snap.grade}</span>
                <Badge tone={tone(snap.grade)} uppercase>{snap.headline}</Badge>
              </div>
              <p className="text-ink-500 text-xs font-mono mb-2">
                {snap.filesAnalyzed} files analyzed · ₿{snap.cost.toFixed(2)} spent
              </p>
              <ul className="space-y-1">
                {snap.reasons.slice(0, 4).map((r, i) => (
                  <li key={i} className="text-sm text-ink-300 flex gap-2"><span className="text-cyan mt-0.5">•</span><span>{r}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {snap.summary && (
            <div className="card p-5 mb-6">
              <h2 className="section-label mb-3">Executive summary</h2>
              <ul className="space-y-2">
                {bullets(snap.summary).map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-300 leading-relaxed"><span className="text-cyan mt-0.5 shrink-0">•</span><span>{b}</span></li>
                ))}
              </ul>
            </div>
          )}

          {snap.files.length > 0 && (
            <div className="card p-5 mb-6">
              <h2 className="section-label mb-3">Files Bob wrote ({snap.files.length})</h2>
              <div className="space-y-2">
                {snap.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <FileCode2 className="w-4 h-4 text-cyan shrink-0" />
                    <span className="font-mono text-ink-100 truncate flex-1">{f.path}</span>
                    <span className="text-ink-600 text-xs font-mono">{f.lines} lines</span>
                    {f.status === 'approved' ? (
                      <Badge tone="mint"><ShieldCheck className="w-3 h-3" /> Approved</Badge>
                    ) : f.status === 'deferred' ? (
                      <Badge tone="amber"><ShieldAlert className="w-3 h-3" /> Deferred</Badge>
                    ) : (
                      <Badge tone="neutral">Pending</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {snap.prUrl && (
            <a href={snap.prUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full justify-center py-4 text-base font-bold rounded-2xl">
              <GitPullRequest className="w-5 h-5" /> View the draft pull request <ExternalLink className="w-4 h-4 opacity-70" />
            </a>
          )}

          <p className="text-center text-ink-600 text-xs font-mono mt-8">
            Generated by BobSprint · IBM Bob Hackathon 2026
          </p>
        </div>
      )}
    </div>
  );
}
