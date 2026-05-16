"use client";

import { useEffect, useRef } from "react";

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
    };
    resize();

    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.2,
      alpha: Math.random() * 0.65 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.012 + 0.003,
    }));

    let raf: number;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.006;
      for (const s of stars) {
        const a = s.alpha * (0.55 + 0.45 * Math.sin(t * s.speed * 70 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147,224,252,${a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={ref} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, opacity: 0.55 }} />
  );
}
