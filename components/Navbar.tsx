"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Menu, X } from "lucide-react";

const NAV = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "IBM Bob", href: "#ibmbob" },
  { label: "Demo", href: "#demo" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(2,6,23,0.88)" : "transparent",
          backdropFilter: scrolled ? "blur(18px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(34,211,238,0.1)" : "1px solid transparent",
        }}
      >
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.35)", boxShadow: "0 0 12px rgba(34,211,238,0.2)" }}
            >
              <Zap className="w-4 h-4 text-cyan-400" fill="currentColor" />
            </div>
            <span className="text-cyan-400 font-bold text-lg tracking-tight">BobSprint</span>
          </a>

          <ul className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <li key={n.label}>
                <a href={n.href} className="relative text-slate-400 hover:text-cyan-400 transition-colors duration-200 text-sm font-medium py-1 group">
                  {n.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-cyan-400 group-hover:w-full transition-all duration-300" />
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#demo"
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-md text-cyan-400 text-sm font-semibold transition-all duration-300"
            style={{ border: "1px solid rgba(34,211,238,0.4)", background: "rgba(34,211,238,0.04)" }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "0 0 18px rgba(34,211,238,0.3)";
              el.style.borderColor = "rgba(34,211,238,0.8)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "none";
              el.style.borderColor = "rgba(34,211,238,0.4)";
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            Get Sprint Pack
          </a>

          <button className="md:hidden text-slate-400 hover:text-cyan-400 transition-colors p-1" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed top-16 left-0 right-0 z-40 md:hidden"
            style={{ background: "rgba(2,6,23,0.97)", borderBottom: "1px solid rgba(34,211,238,0.12)" }}
          >
            <ul className="px-6 py-4 flex flex-col gap-3">
              {NAV.map((n) => (
                <li key={n.label}>
                  <a href={n.href} className="block text-slate-300 hover:text-cyan-400 transition-colors text-base font-medium py-2" onClick={() => setOpen(false)}>{n.label}</a>
                </li>
              ))}
              <li><a href="#demo" className="flex items-center gap-2 text-cyan-400 font-semibold py-2" onClick={() => setOpen(false)}><Zap className="w-4 h-4" /> Get Sprint Pack</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
