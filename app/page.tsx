'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, GitBranch, Shield, Zap, FileCheck, Search, Bot, GitPullRequest,
} from 'lucide-react';
import { Brand } from '@/components/shell/brand';

const ThreeScene = dynamic(() => import('@/components/space/three-scene'), { ssr: false });

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
});

// ── URL input ─────────────────────────────────────────────────────────────────

function UrlInput() {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(trimmed === 'demo' ? '/run?url=demo' : `/run?url=${encodeURIComponent(trimmed)}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form onSubmit={submit} className="w-full max-w-2xl">
      <div
        className="relative flex items-center rounded-2xl transition-all duration-200"
        style={{
          background: 'var(--bg-card)',
          border: focused ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
          boxShadow: focused ? '0 0 0 3px rgb(var(--accent-cyan)/0.12)' : 'none',
        }}
      >
        <GitBranch className="ml-4 w-4 h-4 text-ink-500 shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder='github.com/owner/repo'
          className="flex-1 bg-transparent px-3 py-4 text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none font-mono"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="btn btn-primary m-1.5 px-5 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap className="w-3.5 h-3.5" />
          Run Bob
        </button>
      </div>
      <p className="mt-2 text-center text-ink-700 text-xs font-mono">
        Press <kbd className="px-1 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)]">/</kbd> to focus · No signup required
      </p>
    </form>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01', icon: Search,       colorClass: 'text-cyan',   borderClass: 'border-cyan/20',   bgClass: 'bg-cyan/[0.06]',
    title: 'Bob reads the repo',
    desc: 'Clones the tree, samples key files, detects stack and gaps. Full recon in under 60 seconds.',
  },
  {
    num: '02', icon: Bot,          colorClass: 'text-violet', borderClass: 'border-violet/20', bgClass: 'bg-violet/[0.06]',
    title: 'Bob writes the fixes',
    desc: 'Plan mode identifies safe wins. Code mode writes tests and docs. Ask mode drafts the exec summary.',
  },
  {
    num: '03', icon: GitPullRequest, colorClass: 'text-success', borderClass: 'border-success/20', bgClass: 'bg-success/[0.05]',
    title: 'Draft PR on your fork',
    desc: 'Every file passes the safety gate. Approved changes land on a fork branch. You review before merging.',
  },
];

function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="container-app">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 section-label mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-ink-100 text-display">
            Paste URL. Get a draft PR. In minutes, not weeks.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`card p-7 relative overflow-hidden border ${s.borderClass}`}
            >
              <span className="absolute top-4 right-5 text-6xl font-black leading-none select-none font-mono text-ink-800">
                {s.num}
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${s.bgClass} border ${s.borderClass}`}>
                <s.icon className={`w-5 h-5 ${s.colorClass}`} />
              </div>
              <h3 className="text-ink-100 font-semibold text-lg mb-2 tracking-tight">{s.title}</h3>
              <p className="text-ink-400 text-sm leading-relaxed">{s.desc}</p>
              <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${s.colorClass}`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Safety rails ──────────────────────────────────────────────────────────────

const RAILS = [
  { icon: Shield,     label: 'Draft PR only',        desc: 'Opens on a fork. Never auto-merges. You click merge.' },
  { icon: FileCheck,  label: 'Add-only changes',      desc: 'Tests, docs, JSDoc. No logic modifications. No deletions.' },
  { icon: Zap,        label: 'Safety gate per file',  desc: 'Bob Ask reviews every diff. Anything ambiguous is deferred.' },
  { icon: GitBranch,  label: 'Full evidence trail',   desc: 'Every Bob call logged with mode, cost, and duration.' },
];

function SafetyRails() {
  return (
    <section className="py-20 px-6">
      <div className="container-app">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="card-active rounded-2xl p-8 md:p-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-cyan" />
            <span className="section-label text-cyan/80">Safety rails</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-ink-100 mb-8 text-display">
            Bob writes the PR. You decide if it ships.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {RAILS.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <r.icon className="w-4 h-4 text-cyan" />
                  <span className="text-ink-100 font-semibold text-sm">{r.label}</span>
                </div>
                <p className="text-ink-500 text-xs leading-relaxed">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgb(var(--bg-base)/0.90)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
      }}
    >
      <nav className="container-app h-16 flex items-center justify-between">
        <Brand withText />
        <div className="flex items-center gap-3">
          <Link
            href="/run"
            className="btn btn-primary px-4 py-2 text-sm font-semibold"
          >
            Run Bob <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function SiteFooter() {
  return (
    <footer className="container-app py-10 border-t border-[var(--border-subtle)]">
      <div className="flex flex-col sm:flex-row gap-5 items-center justify-between">
        <Brand withText />
        <p className="text-ink-600 text-xs font-mono">Paste a GitHub URL. Bob rescues the repo.</p>
        <div className="flex items-center gap-5 text-xs text-ink-600 font-mono">
          <span>© 2026 BobSprint</span>
          <Link href="/run" className="hover:text-ink-300 transition-colors focus-ring rounded">Run</Link>
          <Link href="/evidence" className="hover:text-ink-300 transition-colors focus-ring rounded">Evidence</Link>
          <Link href="/report" className="hover:text-ink-300 transition-colors focus-ring rounded">Report</Link>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="relative min-h-screen bg-base">
      <div className="relative z-10">
        <SiteNav />

        <main>
          {/* Hero */}
          <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center overflow-hidden">
            {/* 3-D space background */}
            <ThreeScene />

            <div className="relative z-10 flex flex-col items-center">
              {/* Eyebrow */}
              <motion.div {...fadeUp(0.05)} className="mb-5">
                <span className="chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
                  IBM Bob Hackathon · 2026
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                {...fadeUp(0.15)}
                className="text-display text-[clamp(2.8rem,8vw,6rem)] font-black leading-[1.05] tracking-tight text-ink-100 mb-6 max-w-4xl"
              >
                Bob ships the PR{' '}
                <span
                  style={{
                    background: 'linear-gradient(120deg, rgb(var(--accent-cyan)), rgb(var(--accent-violet)))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  in minutes, not weeks.
                </span>
              </motion.h1>

              {/* Sub */}
              <motion.p
                {...fadeUp(0.28)}
                className="text-ink-400 text-lg md:text-xl max-w-xl leading-relaxed mb-10"
              >
                Paste a GitHub URL. Bob analyzes, fixes safe-wins, and opens a draft PR on your fork.
                Fully audited. From weeks of onboarding to minutes of agentic work.
              </motion.p>

              {/* URL input */}
              <motion.div {...fadeUp(0.4)} className="w-full flex justify-center mb-6">
                <UrlInput />
              </motion.div>

              {/* Trust markers */}
              <motion.div {...fadeUp(0.5)} className="flex items-center gap-6 text-xs font-mono text-ink-600 flex-wrap justify-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Draft PR only
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan" /> Add-only changes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet" /> Safety-gated
                </span>
              </motion.div>

              {/* Scroll cue */}
              <motion.div {...fadeUp(0.7)} className="mt-14 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-ink-700">Scroll ↓</span>
              </motion.div>
            </div>
          </section>

          <HowItWorks />
          <SafetyRails />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
