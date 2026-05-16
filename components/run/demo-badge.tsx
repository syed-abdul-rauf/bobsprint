export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-[var(--bg-card-active)] border border-[var(--border-active)] text-cyan">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
      Demo Mode
    </span>
  );
}
