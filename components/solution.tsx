"use client";

import { motion } from "framer-motion";
import { Map, FileText, GitBranch, Layers } from "lucide-react";

const DELIVERABLES = [
  { icon: Map, num: "01", title: "Architecture Map", desc: "Visual graph of every module, service, and data flow. See what talks to what — no archaeology required.", accent: "#22d3ee" },
  { icon: FileText, num: "02", title: "Onboarding Guide", desc: "Plain-English walkthrough written by Bob after reading your repo. Dev-ready in under a day, not a week.", accent: "#3b82f6" },
  { icon: GitBranch, num: "03", title: "Sprint Backlog", desc: "Prioritized task list derived from your codebase state — tech debt, blocked PRs, missing tests, flagged risks.", accent: "#a855f7" },
  { icon: Layers, num: "04", title: "Risk Report", desc: "Critical paths, single points of failure, and hot files highlighted before they become incidents.", accent: "#06b6d4" },
];

export default function Solution() {
  return (
    <section id="solution" className="relative py-32 px-6">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(34,211,238,0.04) 0%, transparent 70%)" }} />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-[0.3em] uppercase font-mono mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />The Sprint Pack
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.1, duration: 0.6 }}
            className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-tight tracking-tight mb-6"
          >
            Everything you need to{" "}
            <span style={{ background: "linear-gradient(135deg,#3b82f6,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              rescue any project.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Four deliverables. One session. Zero onboarding time wasted. BobSprint gets your team productive from day one.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DELIVERABLES.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.08, duration: 0.55 }}
              className="group relative p-7 rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform duration-300"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 50%, ${d.accent}06 0%, transparent 70%)` }} />

              <div className="relative z-10 flex items-start gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${d.accent}12`, border: `1px solid ${d.accent}22` }}>
                  <d.icon className="w-5 h-5" style={{ color: d.accent }} />
                </div>
                <div>
                  <h3 className="text-white text-xl font-bold mb-2 tracking-tight">{d.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{d.desc}</p>
                </div>
              </div>

              <span className="absolute top-5 right-6 text-5xl font-black leading-none select-none"
                style={{ color: `${d.accent}0d` }}>
                {d.num}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
