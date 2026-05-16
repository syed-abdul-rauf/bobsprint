"use client";

import { motion } from "framer-motion";
import { Target, Zap, CheckCircle, Clock } from "lucide-react";

const STEPS = [
  {
    num: "01", time: "00:00", icon: Target, color: "#22d3ee",
    title: "Feature Request Received",
    desc: "Fix cache contamination in session handler causing billing overlap.",
  },
  {
    num: "02", time: "00:04", icon: Zap, color: "#3b82f6",
    title: "Bob Locates the Code",
    desc: "Identified BillingController.java and 3 related cache managers in 4 seconds.",
  },
  {
    num: "03", time: "00:09", icon: CheckCircle, color: "#a855f7",
    title: "Root Cause Analysis",
    desc: "Missing namespace prefix causes cross-user session collision under load.",
  },
  {
    num: "04", time: "00:21", icon: CheckCircle, color: "#22c55e",
    title: "Fix Generated & Applied",
    desc: "Namespaced cache keys, TTL added, async audit log properly awaited.",
  },
];

export default function Demo() {
  return (
    <section id="demo" className="relative py-32 px-6">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 70%)" }} />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-green-400 text-xs font-bold tracking-[0.3em] uppercase font-mono mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Implementation Plan
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.1, duration: 0.6 }}
            className="text-[clamp(1.8rem,4.5vw,3.2rem)] font-black leading-tight tracking-tight mb-6"
          >
            From feature request to{" "}
            <span style={{ color: "#22d3ee" }}>working fix</span>
            {" — "}
            <span style={{ background: "linear-gradient(135deg,#a855f7,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              in 21 seconds.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Watch Bob receive a real bug report, locate the root cause, and generate the production-ready fix with full context.
          </motion.p>
        </div>

        {/* Feature request card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }} transition={{ delay: 0.1, duration: 0.6 }}
          className="max-w-3xl mx-auto mb-14 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
          style={{
            background: "rgba(34,211,238,0.04)",
            border: "1px solid rgba(34,211,238,0.25)",
            boxShadow: "0 0 40px rgba(34,211,238,0.08), 0 0 80px rgba(34,211,238,0.04)",
          }}
        >
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.25)" }}>
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <div className="text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase mb-2">
              Feature Request #447
            </div>
            <p className="text-white font-semibold text-base leading-snug">
              Fix cache contamination causing billing overlap between users
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-slate-500 text-[11px] font-mono uppercase tracking-widest mb-1">Total time</div>
            <div className="text-green-400 font-mono font-bold text-lg">00:21s</div>
          </div>
        </motion.div>

        {/* Step cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl p-6 overflow-hidden hover:-translate-y-1 transition-transform duration-300"
              style={{ background: "rgba(10,14,26,0.8)", border: `1px solid ${step.color}20` }}
            >
              {/* Faded big number */}
              <span className="absolute top-4 left-5 text-6xl font-black leading-none select-none font-mono"
                style={{ color: `${step.color}0c` }}>
                {step.num}
              </span>

              {/* Timestamp + icon */}
              <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono">
                  <Clock className="w-3 h-3" />
                  {step.time}
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${step.color}12`, border: `1px solid ${step.color}25` }}>
                  <step.icon className="w-4 h-4" style={{ color: step.color }} />
                </div>
              </div>

              <div className="relative z-10">
                <h3 className="text-white font-bold text-base mb-2 leading-tight">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg,transparent,${step.color}40,transparent)` }} />
            </motion.div>
          ))}
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }} transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col items-center gap-6 mt-16"
        >
          <a
            href="#"
            className="flex items-center gap-2 px-12 py-4 rounded-md text-sm font-bold tracking-wide text-[#020617] transition-all duration-300"
            style={{ background: "linear-gradient(135deg,#22d3ee,#06b6d4)", boxShadow: "0 0 24px rgba(34,211,238,0.4),0 0 60px rgba(34,211,238,0.12)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(34,211,238,0.65),0 0 80px rgba(34,211,238,0.22)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(34,211,238,0.4),0 0 60px rgba(34,211,238,0.12)"; }}
          >
            <Zap className="w-4 h-4" />
            Get the Sprint Pack — Free
          </a>
          <p className="text-slate-600 text-xs font-mono tracking-wide">No signup required · Works on any Git host · Private repos supported</p>
        </motion.div>
      </div>
    </section>
  );
}
