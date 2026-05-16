"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Map, FileText, GitBranch, Layers } from "lucide-react";

const deliverables = [
  {
    icon: Map,
    title: "Architecture Map",
    description:
      "Visual graph of every module, service, and data flow. Instantly see what talks to what — no archaeology required.",
    accent: "#22d3ee",
    delay: 0.1,
  },
  {
    icon: FileText,
    title: "Onboarding Guide",
    description:
      "Plain-English walkthrough written by Bob after reading your repo. Dev-ready in under a day, not a week.",
    accent: "#3b82f6",
    delay: 0.2,
  },
  {
    icon: GitBranch,
    title: "Sprint Backlog",
    description:
      "Prioritized task list derived from your codebase state — tech debt, blocked PRs, missing tests, flagged risks.",
    accent: "#a855f7",
    delay: 0.3,
  },
  {
    icon: Layers,
    title: "Risk Report",
    description:
      "Critical paths, single points of failure, and hot files highlighted before they become incidents.",
    accent: "#06b6d4",
    delay: 0.4,
  },
];

export default function SprintPack() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} id="sprint-pack" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center mb-6"
        >
          <span className="flex items-center gap-2 text-cyan-400 text-xs font-semibold tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            The Sprint Pack
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-center text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-tight tracking-tight mb-6"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Everything you need to{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #3b82f6, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            rescue any project.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center text-slate-400 text-lg max-w-2xl mx-auto mb-20 leading-relaxed"
        >
          Four deliverables. One session. Zero onboarding time wasted. BobSprint gets your team productive from day one.
        </motion.p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deliverables.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: d.delay, duration: 0.6 }}
              className="group relative p-7 rounded-2xl glass overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                borderColor: `${d.accent}20`,
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 30% 50%, ${d.accent}08 0%, transparent 70%)`,
                }}
              />

              {/* Top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${d.accent}50, transparent)`,
                  opacity: 0,
                  transition: "opacity 0.3s",
                }}
              />

              <div className="relative z-10">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${d.accent}12`, border: `1px solid ${d.accent}25` }}
                >
                  <d.icon className="w-5 h-5" style={{ color: d.accent }} />
                </div>

                <h3
                  className="text-white text-xl font-bold mb-3 tracking-tight"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {d.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{d.description}</p>

                {/* Card number */}
                <span
                  className="absolute top-6 right-7 text-5xl font-black leading-none"
                  style={{
                    color: `${d.accent}10`,
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  0{i + 1}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
