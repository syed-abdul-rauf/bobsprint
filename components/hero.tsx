"use client";

import { motion } from "framer-motion";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import type { MotionValue } from "framer-motion";
import { Settings2, GitCompare, Zap } from "lucide-react";

const RobotScene = dynamic(() => import("@/components/RobotScene"), { ssr: false });

const BADGES = [
  { icon: Settings2, label: "AI-Powered Analysis" },
  { icon: GitCompare, label: "Repo-Aware" },
  { icon: Zap, label: "Sprint Ready" },
];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function Hero({ scroll }: { scroll: MotionValue<number> | number }) {
  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden pt-20">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto w-full">
        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {BADGES.map((b, i) => (
            <motion.div key={b.label} {...fadeUp(0.1 + i * 0.12)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-cyan-400 text-xs font-semibold tracking-widest uppercase"
              style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)" }}
            >
              <b.icon className="w-3.5 h-3.5" />
              {b.label}
            </motion.div>
          ))}
        </div>

        {/* Headline */}
        <motion.div {...fadeUp(0.32)} className="mb-2">
          <h1 className="leading-none tracking-tighter" style={{ fontWeight: 900 }}>
            <span className="block text-[clamp(5.5rem,15vw,11rem)]"
              style={{ background: "linear-gradient(120deg,#3b82f6 0%,#22d3ee 55%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>
              Bob
            </span>
            <span className="block text-[clamp(5.5rem,15vw,11rem)] text-white" style={{ lineHeight: 1, marginTop: "-0.04em" }}>
              Sprint
            </span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p {...fadeUp(0.5)} className="text-cyan-400 text-sm md:text-base font-bold tracking-[0.45em] uppercase mb-10 font-mono">
          — GPS FOR YOUR CODEBASE —
        </motion.p>

        {/* Sub-tagline */}
        <motion.p {...fadeUp(0.62)} className="text-slate-400 text-base md:text-lg max-w-xl leading-relaxed mb-12">
          Drop Bob into any repo. Get instant architecture maps, onboarding guides, and a sprint-ready backlog — before your first standup.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fadeUp(0.74)} className="flex flex-wrap justify-center gap-4">
          <a href="#demo"
            className="flex items-center gap-2 px-8 py-3.5 rounded-md text-sm font-bold tracking-wide text-[#020617] transition-all duration-300"
            style={{ background: "linear-gradient(135deg,#22d3ee,#06b6d4)", boxShadow: "0 0 24px rgba(34,211,238,0.4),0 0 60px rgba(34,211,238,0.12)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(34,211,238,0.65),0 0 80px rgba(34,211,238,0.22)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(34,211,238,0.4),0 0 60px rgba(34,211,238,0.12)"; }}
          >
            <Zap className="w-4 h-4" /> Get the Sprint Pack
          </a>
          <a href="#solution"
            className="flex items-center gap-2 px-8 py-3.5 rounded-md text-slate-300 text-sm font-semibold hover:text-white transition-all duration-300"
            style={{ border: "1px solid rgba(148,163,184,0.25)" }}
          >
            See how it works
          </a>
        </motion.div>
      </div>

      {/* Robot */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.42, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 w-full max-w-xl mx-auto"
      >
        <div className="h-[500px] md:h-[580px]">
          <Suspense fallback={<div className="w-full h-full" />}>
            <RobotScene scroll={scroll} />
          </Suspense>
        </div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-slate-600 text-xs tracking-widest uppercase font-mono">Scroll</span>
        <motion.div
          className="w-px h-8 bg-gradient-to-b from-cyan-400/50 to-transparent"
          animate={{ scaleY: [1, 0.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      </motion.div>
    </section>
  );
}
