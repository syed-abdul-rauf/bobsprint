'use client';

import { useEffect, useRef } from 'react';

// ── Starfield canvas ──────────────────────────────────────────────────────────

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.1 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.012 + 0.006,
    }));

    let raf = 0;
    let t = 0;

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      for (const s of stars) {
        const alpha = prefersReduced ? 0.5 : 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(226,232,240,${alpha})`;
        ctx!.fill();
      }
      if (!prefersReduced) {
        t++;
        raf = requestAnimationFrame(draw);
      }
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

// ── Earth SVG ─────────────────────────────────────────────────────────────────

function Earth() {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden>
      <defs>
        <radialGradient id="earth-ocean" cx="38%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#0ea5e9" />
          <stop offset="60%"  stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </radialGradient>
        <radialGradient id="earth-atmo" cx="50%" cy="50%" r="50%">
          <stop offset="80%"  stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(56,189,248,0.18)" />
        </radialGradient>
        <clipPath id="earth-clip">
          <circle cx="100" cy="100" r="80" />
        </clipPath>
      </defs>

      {/* Globe */}
      <circle cx="100" cy="100" r="80" fill="url(#earth-ocean)" />

      {/* Landmasses */}
      <g clipPath="url(#earth-clip)" fill="rgba(34,197,94,0.55)">
        <ellipse cx="85" cy="82" rx="22" ry="16" transform="rotate(-15,85,82)" />
        <ellipse cx="112" cy="95" rx="18" ry="12" transform="rotate(8,112,95)" />
        <ellipse cx="68" cy="115" rx="14" ry="8"  transform="rotate(-20,68,115)" />
        <ellipse cx="130" cy="120" rx="10" ry="6" transform="rotate(12,130,120)" />
      </g>

      {/* Cloud band */}
      <g clipPath="url(#earth-clip)" fill="rgba(255,255,255,0.22)">
        <ellipse cx="100" cy="72"  rx="55" ry="7" transform="rotate(-8,100,72)"  />
        <ellipse cx="100" cy="132" rx="45" ry="5" transform="rotate(5,100,132)"  />
      </g>

      {/* Atmospheric rim */}
      <circle cx="100" cy="100" r="80" fill="url(#earth-atmo)" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="6" />

      {/* Contact shadow */}
      <ellipse cx="100" cy="185" rx="60" ry="8" fill="rgba(0,0,0,0.25)" />
    </svg>
  );
}

// ── Orbit ring ────────────────────────────────────────────────────────────────

function OrbitRing() {
  return (
    <svg
      width="340" height="120"
      viewBox="0 0 340 120"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      aria-hidden
    >
      <ellipse
        cx="170" cy="60" rx="160" ry="46"
        fill="none"
        stroke="rgba(56,189,248,0.18)"
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />
    </svg>
  );
}

// ── Rocket SVG ────────────────────────────────────────────────────────────────

function Rocket() {
  return (
    <div
      className="absolute top-1/2 left-1/2 pointer-events-none"
      style={{
        offsetPath: 'ellipse(160px 46px at 50% 50%)',
        animation: 'orbit 16s linear infinite',
        transformOrigin: 'center',
      } as React.CSSProperties}
      aria-hidden
    >
      <svg width="28" height="28" viewBox="0 0 28 28" style={{ rotate: '45deg' }}>
        <path d="M14 2 C14 2 20 6 20 14 L14 20 L8 14 C8 6 14 2 14 2Z" fill="#e2e8f0" />
        <circle cx="14" cy="12" r="2.5" fill="#0ea5e9" />
        <path d="M10 18 L6 22 L10 22Z" fill="#fb923c" opacity="0.8" />
        <path d="M18 18 L22 22 L18 22Z" fill="#fb923c" opacity="0.8" />
        <path d="M12 20 L14 26 L16 20Z" fill="#fbbf24" opacity="0.9" />
      </svg>
    </div>
  );
}

// ── Robot mascot ─────────────────────────────────────────────────────────────

function Robot() {
  return (
    <div className="animate-float" aria-hidden>
      <svg width="80" height="96" viewBox="0 0 80 96">
        <defs>
          <radialGradient id="robot-body" cx="40%" cy="40%" r="60%">
            <stop offset="0%"   stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Antenna */}
        <line x1="40" y1="6" x2="40" y2="16" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="40" cy="4" r="3" fill="#38bdf8" />

        {/* Head */}
        <rect x="20" y="16" width="40" height="32" rx="8" fill="url(#robot-body)" stroke="rgba(56,189,248,0.35)" strokeWidth="1" />

        {/* Eyes */}
        <rect x="27" y="24" width="10" height="8" rx="3" fill="#38bdf8" opacity="0.9" />
        <rect x="43" y="24" width="10" height="8" rx="3" fill="#38bdf8" opacity="0.9" />

        {/* Mouth */}
        <rect x="30" y="38" width="20" height="4" rx="2" fill="rgba(56,189,248,0.4)" />

        {/* Body */}
        <rect x="16" y="52" width="48" height="36" rx="8" fill="url(#robot-body)" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />

        {/* Chest panel */}
        <rect x="26" y="58" width="28" height="18" rx="4" fill="rgba(56,189,248,0.08)" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
        <circle cx="36" cy="67" r="4" fill="rgba(56,189,248,0.6)" />
        <circle cx="44" cy="67" r="4" fill="rgba(167,139,250,0.6)" />

        {/* Arms */}
        <rect x="4"  y="54" width="12" height="24" rx="6" fill="url(#robot-body)" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
        <rect x="64" y="54" width="12" height="24" rx="6" fill="url(#robot-body)" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />

        {/* Legs */}
        <rect x="22" y="88" width="14" height="8" rx="4" fill="url(#robot-body)" />
        <rect x="44" y="88" width="14" height="8" rx="4" fill="url(#robot-body)" />
      </svg>
    </div>
  );
}

// ── Composed space scene ──────────────────────────────────────────────────────

export function SpaceHero() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Starfield */}
      <Starfield />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgb(var(--accent-cyan)/0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Earth + orbit + rocket */}
      <div className="absolute bottom-12 right-[8%] flex items-center justify-center"
        style={{ width: 340, height: 340 }}>
        <OrbitRing />
        <div className="relative z-10">
          <Earth />
        </div>
        <Rocket />
      </div>

      {/* Robot (left of center) */}
      <div className="absolute bottom-16 left-[10%] opacity-70">
        <Robot />
      </div>
    </div>
  );
}
