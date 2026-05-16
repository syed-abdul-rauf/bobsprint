'use client';

import { useState } from 'react';
import { Square } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

export function KillSwitch({ onAbort, disabled }: { onAbort: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  if (disabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 focus-ring"
        style={{
          background: 'rgb(var(--danger) / 0.08)',
          border: '1px solid rgb(var(--danger) / 0.30)',
          color: 'rgb(var(--danger))',
        }}
      >
        <Square className="w-3 h-3 fill-current" />
        Stop run
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Stop this run?">
        <p className="text-sm text-ink-400 mb-6">
          The pipeline will abort after the current step. Evidence collected so far will be preserved.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setOpen(false)}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => { setOpen(false); onAbort(); }}
            className="btn px-4 py-2 text-sm font-semibold focus-ring"
            style={{
              background: 'rgb(var(--danger) / 0.15)',
              border: '1px solid rgb(var(--danger) / 0.5)',
              color: 'rgb(var(--danger))',
            }}
          >
            <Square className="w-3 h-3 fill-current" />
            Stop run
          </button>
        </div>
      </Modal>
    </>
  );
}
