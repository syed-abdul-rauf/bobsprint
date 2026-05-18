'use client';

// Mounted once at the app root. When the tab reopens, it looks for a run that
// was mid-pipeline when the tab closed (non-terminal stage + stale heartbeat)
// and transparently resumes it — reusing every Bob result already persisted so
// no Bobcoins are spent twice. The run then completes in the background and
// appears, finished, in the Runs History.

import { useEffect, useRef } from 'react';
import { useApp } from '@/lib/store';
import { AutoPilotController } from '@/lib/autopilot';
import type { AutoPilotRun } from '@/lib/types';

const NON_TERMINAL = new Set(['recon', 'fan-out', 'safety-gate', 'apply']);
const STALE_MS = 30_000; // no heartbeat for 30s ⇒ the driving tab is gone

// Survives component remounts within the session so a run is never resumed twice.
const resuming = new Set<string>();

function isInterrupted(r: AutoPilotRun): boolean {
  if (!NON_TERMINAL.has(r.stage)) return false;
  const beat = r.lastHeartbeat ?? r.startedAt;
  return Date.now() - beat > STALE_MS;
}

export function RunResumer() {
  const hydrated = useApp((s) => s.hydrated);
  const ran = useRef(false);

  useEffect(() => {
    if (!hydrated || ran.current) return;
    ran.current = true;

    const { runs, githubPat, updateRun, setActiveRun } = useApp.getState();
    const devMode = process.env.NEXT_PUBLIC_BOBSPRINT_DEV_MODE === '1';

    // runs are stored newest-first; resume the most recent interrupted one.
    const target = runs.find((r) => isInterrupted(r) && !resuming.has(r.id));
    if (!target) return;

    resuming.add(target.id);
    setActiveRun(target.id);

    const ctrl = new AutoPilotController({
      run: target,
      pat: githubPat,
      devMode,
      resume: true,
      onUpdate: (patch) => updateRun(target.id, patch),
    });
    ctrl.start().finally(() => resuming.delete(target.id));
  }, [hydrated]);

  return null;
}
