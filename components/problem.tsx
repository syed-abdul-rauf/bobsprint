"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function Problem() {
  return (
    <section id="problem" className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 text-red-400 text-xs font-bold tracking-[0.3em] uppercase font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />The Problem
          </span>

          <div
            className="rounded-2xl p-12 flex flex-col items-center gap-6"
            style={{ background: "rgba(239,68,68,0.04)", border: "1px dashed rgba(239,68,68,0.2)" }}
          >
            <AlertTriangle className="w-10 h-10 text-red-400/60" />
            <h2 className="text-2xl font-bold text-slate-400">Problem section — content needed</h2>
            <p className="text-slate-600 text-sm font-mono">
              [ Placeholder — provide copy, stats, and layout for this section ]
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
