'use client';

import { motion } from 'framer-motion';
import {
  Search, GitFork, Shield, GitMerge, CheckCircle2,
  Check, XCircle, Loader2, Minus, ClipboardList, MessageSquare, Code2,
} from 'lucide-react';
import type { AutoPilotRun, AutoPilotStage, EvidenceEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

type StageStatus = 'idle' | 'active' | 'complete' | 'error' | 'skipped' | 'aborted';
type FanStatus   = 'idle' | 'running' | 'done';

interface StageConfig {
  key:   AutoPilotStage;
  label: string;
  icon:  React.ElementType;
  desc:  string;
}

const STAGES: StageConfig[] = [
  { key: 'recon',       label: 'Recon',       icon: Search,       desc: 'Reading repo structure and sampling key files' },
  { key: 'fan-out',     label: 'Bob Fan-out', icon: GitFork,      desc: 'Bob runs in Plan, Ask, and Code modes in parallel' },
  { key: 'safety-gate', label: 'Safety Gate', icon: Shield,       desc: 'Every change reviewed before it touches any file' },
  { key: 'apply',       label: 'Apply + PR',  icon: GitMerge,     desc: 'Committing approved files and opening the draft PR' },
  { key: 'done',        label: 'Done',        icon: CheckCircle2, desc: 'All approved changes landed on the fork branch' },
];

const STAGE_ORDER = STAGES.map((s) => s.key);

function getStatus(stageKey: AutoPilotStage, currentStage: AutoPilotStage): StageStatus {
  if (currentStage === 'idle') return 'idle';
  const ci = STAGE_ORDER.indexOf(currentStage);
  const si = STAGE_ORDER.indexOf(stageKey);
  if (currentStage === 'error')
    return si < ci - 1 ? 'complete' : si <= ci ? 'error' : 'idle';
  if (currentStage === 'aborted')
    return si < ci - 1 ? 'complete' : si === ci - 1 ? 'aborted' : 'idle';
  if (si < ci)  return 'complete';
  if (si === ci) return 'active';
  return 'idle';
}

function deriveFanOut(evidence: EvidenceEntry[] = []) {
  const has  = (e: 'bob-plan' | 'bob-ask' | 'bob-code') =>
    evidence.some((x) => x.eventType === e);
  const cost = (mode: 'Plan' | 'Ask' | 'Code') =>
    evidence.filter((x) => x.mode === mode).reduce((a, x) => a + (x.costEstimate ?? 0), 0);
  return {
    plan: { status: (has('bob-plan') ? 'done' : 'running') as FanStatus, cost: cost('Plan') },
    ask:  { status: (has('bob-ask')  ? 'done' : 'running') as FanStatus, cost: cost('Ask')  },
    code: { status: (has('bob-code') ? 'done' : 'running') as FanStatus, cost: cost('Code') },
  };
}

function stageDurationMs(key: AutoPilotStage, evidence: EvidenceEntry[]): number | null {
  const durs = evidence
    .filter((e) => e.stage === key && e.durationMs)
    .map((e) => e.durationMs!);
  return durs.length ? durs.reduce((a, b) => a + b, 0) : null;
}

function fmtDur(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

const FAN_MODES: { key: keyof ReturnType<typeof deriveFanOut>; label: string; icon: React.ElementType }[] = [
  { key: 'plan', label: 'Plan', icon: ClipboardList },
  { key: 'ask',  label: 'Ask',  icon: MessageSquare },
  { key: 'code', label: 'Code', icon: Code2 },
];

function FanOutSubCards({ fanOut }: { fanOut: ReturnType<typeof deriveFanOut> }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {FAN_MODES.map(({ key, label, icon: Icon }) => {
        const { status, cost } = fanOut[key];
        const done = status === 'done';
        return (
          <div
            key={key}
            className="rounded-lg p-2.5 flex flex-col gap-1"
            style={{
              background: done
                ? 'rgb(var(--success) / 0.06)'
                : 'var(--bg-card-active)',
              border: `1px solid ${
                done ? 'rgb(var(--success) / 0.25)' : 'var(--border-active)'
              }`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {done
                  ? <Check   className="w-3 h-3 text-success" />
                  : <Loader2 className="w-3 h-3 text-cyan animate-spin" />}
                <span className="text-[11px] font-medium text-ink-200">{label}</span>
              </div>
              {!done && (
                <span className="text-[10px] font-mono text-cyan animate-pulse-glow">…</span>
              )}
            </div>
            {cost > 0 && (
              <span className="text-[10px] font-mono text-ink-500">
                {'₿'}{cost.toFixed(2)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StageCard({
  stage, status, index, isLast, fanOut, safeWinCount, deferredCount, durationMs,
}: {
  stage:          StageConfig;
  status:         StageStatus;
  index:          number;
  isLast:         boolean;
  fanOut?:        ReturnType<typeof deriveFanOut>;
  safeWinCount?:  number;
  deferredCount?: number;
  durationMs:     number | null;
}) {
  const Icon    = stage.icon;
  const active   = status === 'active';
  const complete = status === 'complete';
  const error    = status === 'error';
  const aborted  = status === 'aborted';
  const idle     = status === 'idle' || status === 'skipped';

  const circleStyle = active
    ? { background: 'var(--bg-card-active)', borderColor: 'var(--border-active)',
        boxShadow: '0 0 12px rgb(var(--accent-cyan) / 0.4)' }
    : complete
    ? { background: 'rgb(var(--success) / 0.12)', borderColor: 'rgb(var(--success) / 0.5)' }
    : error || aborted
    ? { background: 'rgb(var(--danger) / 0.10)', borderColor: 'rgb(var(--danger) / 0.5)' }
    : { background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' };

  const cardStyle = active
    ? { background: 'var(--bg-card-active)', border: '1px solid var(--border-active)',
        boxShadow: 'var(--shadow-active)' }
    : complete
    ? { background: 'rgb(var(--success) / 0.04)', border: '1px solid rgb(var(--success) / 0.25)' }
    : error
    ? { background: 'rgb(var(--danger) / 0.05)',  border: '1px solid rgb(var(--danger) / 0.30)' }
    : aborted
    ? { background: 'rgb(var(--warning) / 0.04)', border: '1px solid rgb(var(--warning) / 0.25)' }
    : { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="relative pl-10 pb-3"
    >
      {/* Circle indicator */}
      <div
        className="absolute left-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300"
        style={circleStyle}
      >
        {active  && <Loader2  className="w-4 h-4 text-cyan animate-spin" />}
        {complete && <Check   className="w-4 h-4 text-success" />}
        {error   && <XCircle  className="w-4 h-4 text-danger" />}
        {aborted && <Minus    className="w-4 h-4 text-warning" />}
        {idle    && (
          <Icon className={cn('w-4 h-4', status === 'skipped' ? 'text-ink-700' : 'text-ink-500')} />
        )}
      </div>

      {/* Card */}
      <div
        className={cn(
          'relative rounded-xl overflow-hidden transition-all duration-300',
          idle && 'opacity-60',
        )}
        style={cardStyle}
        role="status"
        aria-label={`${stage.label}: ${status}`}
      >
        <div className="p-3.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                'font-semibold text-sm',
                (active || complete) ? 'text-ink-100' : 'text-ink-500',
                status === 'skipped' && 'line-through',
              )}
            >
              {stage.label}
            </span>

            {active && (
              <span className="text-[11px] font-mono text-cyan animate-pulse-glow">
                running…
              </span>
            )}
            {complete && stage.key === 'fan-out' && safeWinCount != null && (
              <span className="text-[11px] font-mono text-success">{safeWinCount} safe wins</span>
            )}
            {complete && stage.key === 'safety-gate' && deferredCount != null && deferredCount > 0 && (
              <span className="text-[11px] font-mono text-warning">{deferredCount} deferred</span>
            )}

            <span className="ml-auto text-[11px] font-mono text-ink-600">
              {complete && durationMs != null
                ? <span className="text-ink-400">{fmtDur(durationMs)}</span>
                : `0${index + 1}`}
            </span>
          </div>

          <p className={cn(
            'text-xs leading-relaxed',
            (active || complete) ? 'text-ink-400' : 'text-ink-600',
          )}>
            {stage.desc}
          </p>

          {stage.key === 'fan-out' && active && fanOut && (
            <FanOutSubCards fanOut={fanOut} />
          )}
        </div>

        {/* Active — sweeping progress bar */}
        {active && (
          <div
            className="absolute bottom-0 left-0 h-0.5"
            style={{
              background: 'rgb(var(--accent-cyan))',
              animation: 'progress-sweep 1.8s ease-in-out infinite',
            }}
          />
        )}
        {/* Complete — solid success bar */}
        {complete && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ background: 'rgb(var(--success))' }} />
        )}
        {/* Error — solid danger bar */}
        {error && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ background: 'rgb(var(--danger))' }} />
        )}
      </div>

      {/* Rail connector to next stage */}
      {!isLast && (
        <div
          className="absolute left-[15px] top-10 bottom-0 w-0.5"
          style={{
            background: complete
              ? 'rgb(var(--accent-cyan) / 0.7)'
              : 'var(--border-subtle)',
            transition: 'background 0.4s ease',
          }}
        />
      )}
    </motion.div>
  );
}

export function PipelineStages({
  currentStage,
  run,
  safeWinCount,
  deferredCount,
}: {
  currentStage:   AutoPilotStage;
  run?:           AutoPilotRun | null;
  safeWinCount?:  number;
  deferredCount?: number;
}) {
  const evidence = run?.evidence ?? [];
  const fanOut   = deriveFanOut(evidence);

  return (
    <div className="relative" aria-label="Pipeline stages">
      {STAGES.map((stage, i) => {
        const status = getStatus(stage.key, currentStage);
        return (
          <StageCard
            key={stage.key}
            stage={stage}
            status={status}
            index={i}
            isLast={i === STAGES.length - 1}
            fanOut={stage.key === 'fan-out' ? fanOut : undefined}
            safeWinCount={safeWinCount}
            deferredCount={deferredCount}
            durationMs={status === 'complete' ? stageDurationMs(stage.key, evidence) : null}
          />
        );
      })}
    </div>
  );
}
