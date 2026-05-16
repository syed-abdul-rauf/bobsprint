"use client";

import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import type { MotionValue } from "framer-motion";
import { Shield, AlertTriangle, Terminal as TerminalIcon } from "lucide-react";

const RobotScene = dynamic(() => import("@/components/RobotScene"), { ssr: false });

// ─── Counting number ────────────────────────────────────────────────────────
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v).toString() + suffix);

  useEffect(() => {
    if (inView) raw.set(target);
  }, [inView, raw, target]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  value, suffix = "", subValue, subLabel, label, color, delay,
}: {
  value: number; suffix?: string; subValue: string; subLabel: string; label: string;
  color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ delay, duration: 0.55 }}
      className="rounded-2xl p-6 relative overflow-hidden hover:-translate-y-1 transition-transform duration-300"
      style={{ background: "rgba(10,14,26,0.8)", border: `1px solid ${color}22` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${color}60,transparent)` }} />
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />

      <div className="text-5xl font-black tracking-tight mb-1" style={{ color }}>
        <CountUp target={value} suffix={suffix} />
      </div>
      <div className="text-slate-500 text-xs font-mono mb-3">{subValue}</div>
      <div className="text-white font-bold text-sm mb-1">{label}</div>
      <div className="text-xs font-mono" style={{ color: `${color}99` }}>{subLabel}</div>
    </motion.div>
  );
}

// ─── Terminal ────────────────────────────────────────────────────────────────
const LOG_LINES = [
  { text: "> IBM Bob Analysis Engine v4.2.1 — initializing...", color: "#22d3ee", delay: 0.1 },
  { text: "> Repository: acme-corp/billing-service [private]", color: "#94a3b8", delay: 0.6 },
  { text: "> Scanning 847 files across 23 directories...", color: "#94a3b8", delay: 1.0 },
  { text: "> Entry point identified: /src/server.ts (Express)", color: "#a3e635", delay: 1.5 },
  { text: "> Database: PostgreSQL + Redis (cache layer)", color: "#94a3b8", delay: 1.9 },
  { text: "> Dependency graph: 4,219 edges resolved", color: "#94a3b8", delay: 2.4 },
  { text: "> Risk analysis: 3 critical paths flagged", color: "#f87171", delay: 2.9 },
  { text: "> Dead code scan: 18,247 lines removable", color: "#fbbf24", delay: 3.3 },
  { text: "> Test coverage: 31% (target: 60%)", color: "#fb923c", delay: 3.7 },
  { text: "", color: "", delay: 4.0 },
  { text: "✓ Sprint Pack generated  →  ./bob-output/", color: "#a855f7", delay: 4.2 },
];

function TerminalWindow({ started }: { started: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden h-full"
      style={{ background: "#050c18", border: "1px solid rgba(34,211,238,0.14)", boxShadow: "0 0 40px rgba(34,211,238,0.06)" }}>
      {/* Traffic lights + title */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#040a14" }}>
        <div className="flex gap-1.5">
          {["#ef4444", "#eab308", "#22c55e"].map((c, i) => (
            <div key={i} className="w-3 h-3 rounded-full" style={{ background: c, opacity: 0.7 }} />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 text-xs font-mono">bob-analysis.log</span>
        </div>
      </div>
      {/* Lines */}
      <div className="p-5 space-y-1.5 overflow-hidden">
        {LOG_LINES.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={started ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: line.delay, duration: 0.28 }}
            className="text-xs font-mono leading-6"
            style={{ color: line.color || "transparent" }}
          >
            {line.text || " "}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Risk report card ────────────────────────────────────────────────────────
const RISKS = [
  { severity: "CRITICAL", file: "/src/billing/SessionHandler.java", msg: "Missing namespace prefix on Redis keys — cross-user collision under load", color: "#f87171" },
  { severity: "CRITICAL", file: "/src/payments/StripeWebhook.ts", msg: "No idempotency check on webhook replay — double charges possible", color: "#f87171" },
  { severity: "HIGH", file: "/src/auth/JWTMiddleware.ts", msg: "Token expiry not validated server-side — client-controlled expiry", color: "#fb923c" },
  { severity: "HIGH", file: "/src/cache/CacheManager.java", msg: "Unbounded cache growth — no eviction policy configured", color: "#fb923c" },
  { severity: "WARN", file: "/src/reporting/ReportBuilder.ts", msg: "Synchronous file I/O on hot path — 340ms avg latency spike", color: "#fbbf24" },
];

function RiskReport({ started }: { started: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden h-full"
      style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(168,85,247,0.18)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(168,85,247,0.1)", background: "rgba(168,85,247,0.05)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
          <Shield className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="text-white font-bold text-sm">Risk Intelligence Report</div>
          <div className="text-purple-400/70 text-xs font-mono">billing-service / 2 critical · 2 high · 1 warn</div>
        </div>
      </div>

      {/* Findings */}
      <div className="p-4 space-y-3">
        {RISKS.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 14 }}
            animate={started ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
            className="rounded-xl p-3.5"
            style={{ background: `${r.color}06`, border: `1px solid ${r.color}1a` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
                style={{ background: `${r.color}20`, color: r.color }}>
                {r.severity}
              </span>
              <span className="text-slate-500 text-[11px] font-mono truncate">{r.file}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">{r.msg}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function IbmBob({ scroll }: { scroll: MotionValue<number> | number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  const STATS = [
    { value: 12, suffix: "", subValue: "+2 hidden", subLabel: "Services Detected", label: "microservices", color: "#fb923c", delay: 0 },
    { value: 74, suffix: "", subValue: "/ 100", subLabel: "↑ High Risk", label: "Risk Score", color: "#f87171", delay: 0.08 },
    { value: 31, suffix: "%", subValue: "↓ Below 60% target", subLabel: "Test Coverage", label: "covered", color: "#fbbf24", delay: 0.16 },
    { value: 18, suffix: "K", subValue: "lines", subLabel: "Remove safely", label: "Dead Code", color: "#c084fc", delay: 0.24 },
  ];

  return (
    <section ref={sectionRef} id="ibmbob" className="relative py-32 px-6">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(168,85,247,0.04) 0%, transparent 70%)" }} />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-purple-400 text-xs font-bold tracking-[0.3em] uppercase font-mono mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />IBM Bob Evidence Panel
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.1, duration: 0.6 }}
            className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-tight tracking-tight mb-6"
          >
            Watch Bob analyze{" "}
            <span style={{ background: "linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              the chaos.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Real output from Bob analyzing a production billing service. This is what an AI-powered code rescue looks like.
          </motion.p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {STATS.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Two-panel row: robot + terminal + risk */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Robot panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.2, duration: 0.7 }}
            className="relative rounded-2xl overflow-hidden"
            style={{ background: "rgba(10,14,26,0.5)", border: "1px solid rgba(168,85,247,0.15)", minHeight: 400 }}
          >
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(circle at 50% 60%, rgba(168,85,247,0.07) 0%, transparent 70%)" }} />
            <div className="h-full min-h-[400px]">
              <Suspense fallback={null}>
                <RobotScene scroll={scroll} />
              </Suspense>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full font-mono text-xs text-cyan-400 font-bold"
              style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" }}>
              BOB / v4.2.1
            </div>
          </motion.div>

          {/* Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.3, duration: 0.6 }}
          >
            <TerminalWindow started={inView} />
          </motion.div>

          {/* Risk report */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.4, duration: 0.7 }}
          >
            <RiskReport started={inView} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
