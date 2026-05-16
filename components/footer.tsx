"use client";

import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative py-12 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)" }}>
            <Zap className="w-3.5 h-3.5 text-cyan-400" fill="currentColor" />
          </div>
          <span className="text-cyan-400 font-bold tracking-tight">BobSprint</span>
        </div>
        <p className="text-slate-600 text-xs text-center font-mono">GPS for your codebase — zero onboarding time wasted.</p>
        <p className="text-slate-700 text-xs font-mono">© 2025 BobSprint</p>
      </div>
    </footer>
  );
}
