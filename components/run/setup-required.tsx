'use client';

import { Download, Terminal, LogIn, AlertTriangle, ExternalLink } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

const INSTALL_CMD = 'npm install -g .\\bobshell-1.0.3.tgz';
const AUTH_CMD = 'bob';

type StepProps = {
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

function Step({ number, icon, title, children }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-7 h-7 rounded-full bg-cyan/10 border border-cyan/25 flex items-center justify-center">
          <span className="text-xs font-bold text-cyan">{number}</span>
        </div>
        <div className="flex-1 w-px bg-border-subtle min-h-[1.5rem]" />
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-ink-500">{icon}</span>
          <span className="text-sm font-semibold text-ink-200">{title}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ value, note }: { value: string; note?: string }) {
  return (
    <div className="space-y-1">
      <div className="card flex items-center gap-3 rounded-xl p-3 font-mono text-sm">
        <Terminal className="w-3.5 h-3.5 text-ink-500 shrink-0" />
        <code className="flex-1 text-cyan text-xs">{value}</code>
        <CopyButton value={value} />
      </div>
      {note && <p className="text-ink-600 text-xs pl-1">{note}</p>}
    </div>
  );
}

export function SetupRequired({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl p-6 md:p-8 bg-warning/[0.04] border border-warning/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <span className="text-xs font-mono font-bold tracking-widest uppercase text-warning">
          Bob Shell not found
        </span>
      </div>

      <h2 className="text-xl font-bold text-ink-100 mb-1">Install IBM Bob Shell</h2>
      <p className="text-ink-400 text-sm leading-relaxed mb-6">
        BobSprint needs Bob Shell to analyze repositories. Install in 3 steps:
      </p>

      {/* Steps */}
      <div>
        <Step number={1} icon={<Download className="w-3.5 h-3.5" />} title="Download the Bob Shell installer">
          <p className="text-ink-400 text-xs mb-2">
            Go to the IBM Bob portal, open the <span className="text-ink-300 font-mono">Bob Shell</span> tab,
            and download the <span className="text-ink-300 font-mono">Windows x64</span> (or Mac/Linux) <span className="text-ink-300 font-mono">.tgz</span>.
          </p>
          <a
            href="https://bob.ibm.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan hover:underline focus-ring rounded"
          >
            bob.ibm.com/download <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </Step>

        <Step number={2} icon={<Terminal className="w-3.5 h-3.5" />} title="Install globally via npm">
          <CodeBlock
            value={INSTALL_CMD}
            note="Run from the folder where the .tgz was downloaded. On Mac/Linux, use forward slashes."
          />
        </Step>

        <Step number={3} icon={<LogIn className="w-3.5 h-3.5" />} title="Authenticate with your IBMid">
          <p className="text-ink-400 text-xs mb-2">
            Run <span className="font-mono text-ink-300">bob</span> in any terminal — it opens a browser to sign in.
          </p>
          <CodeBlock value={AUTH_CMD} />
        </Step>
      </div>

      {/* Footer note */}
      <p className="text-ink-600 text-xs font-mono mt-1 mb-5 leading-relaxed">
        Already installed but still seeing this screen? Click <span className="text-ink-400">Retry</span> below.
        {' '}Or type{' '}
        <span className="text-ink-300">demo</span>
        {' '}as your repo URL to run fully offline without Bob.
      </p>

      <button
        onClick={onRetry}
        className="btn btn-primary px-5 py-2.5 text-sm font-semibold"
      >
        Retry
      </button>
    </div>
  );
}
