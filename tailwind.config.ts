import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Dynamic tone classes used by evidence / pipeline / risk components
    {
      pattern:
        /(bg|text|border|ring)-(cyan|violet|success|danger|warning|ink-\d+)(\/\d+)?/,
    },
    // Bob semantic aliases (kept during migration; removed after final grep gate)
    {
      pattern:
        /(bg|text|border|ring)-bob-(cyan|violet|mint|coral|amber|blue|blue-soft)(\/\d+)?/,
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-geist-sans)',  'system-ui', 'sans-serif'],
        mono:    ['var(--font-geist-mono)',  'ui-monospace', 'monospace'],
        // display = Geist Sans 600 (Instrument Serif removed per plan §10)
        display: ['var(--font-geist-sans)',  'system-ui', 'sans-serif'],
      },

      colors: {
        // ── Semantic tokens (direct brief mapping) ───────────────────────────
        base:      'rgb(var(--bg-base)      / <alpha-value>)',
        elevated:  'rgb(var(--bg-elevated)  / <alpha-value>)',
        primary:   'rgb(var(--ink-100)      / <alpha-value>)',   // = text-primary
        secondary: 'rgb(var(--ink-400)      / <alpha-value>)',   // = text-secondary
        muted:     'rgb(var(--ink-500)      / <alpha-value>)',   // = text-muted
        cyan:      'rgb(var(--accent-cyan)  / <alpha-value>)',
        violet:    'rgb(var(--accent-violet)/ <alpha-value>)',
        success:   'rgb(var(--success)      / <alpha-value>)',
        danger:    'rgb(var(--danger)       / <alpha-value>)',
        warning:   'rgb(var(--warning)      / <alpha-value>)',

        // ── Ink neutral scale (var-backed, inverts with theme) ───────────────
        ink: {
          50:  'rgb(var(--ink-50)  / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          925: 'rgb(var(--ink-925) / <alpha-value>)',
          950: 'rgb(var(--ink-950) / <alpha-value>)',
        },

        // ── Bob accent aliases (var-backed; migrated to semantic in rewrites) ─
        bob: {
          blue:        'rgb(var(--accent-cyan)   / <alpha-value>)',
          'blue-soft': 'rgb(var(--accent-cyan)   / <alpha-value>)',
          cyan:        'rgb(var(--accent-cyan)   / <alpha-value>)',
          violet:      'rgb(var(--accent-violet) / <alpha-value>)',
          mint:        'rgb(var(--bob-mint)      / <alpha-value>)',
          coral:       'rgb(var(--bob-coral)     / <alpha-value>)',
          amber:       'rgb(var(--warning)       / <alpha-value>)',
        },
      },

      backgroundImage: {
        'grid-dark':
          'linear-gradient(to right,rgba(148,163,184,0.06) 1px,transparent 1px),' +
          'linear-gradient(to bottom,rgba(148,163,184,0.06) 1px,transparent 1px)',
        'grid-light':
          'linear-gradient(to right,rgba(15,23,42,0.05) 1px,transparent 1px),' +
          'linear-gradient(to bottom,rgba(15,23,42,0.05) 1px,transparent 1px)',
        'radial-fade':
          'radial-gradient(ellipse 80% 60% at 50% 0%,' +
          'rgb(var(--accent-cyan)/0.18),transparent 70%)',
        aurora:
          'radial-gradient(ellipse 60% 50% at 20% 30%,' +
          'rgb(var(--accent-cyan)/0.18),transparent 70%),' +
          'radial-gradient(ellipse 50% 50% at 80% 20%,' +
          'rgb(var(--accent-violet)/0.18),transparent 70%),' +
          'radial-gradient(ellipse 70% 60% at 50% 100%,' +
          'rgb(var(--accent-cyan)/0.12),transparent 70%)',
      },

      boxShadow: {
        glow:     '0 0 0 1px rgb(var(--accent-cyan)/0.20), 0 16px 56px -16px rgb(var(--accent-cyan)/0.45)',
        'glow-cyan': '0 0 0 1px rgb(var(--accent-cyan)/0.25), 0 16px 56px -16px rgb(var(--accent-cyan)/0.45)',
        active:   'var(--shadow-active)',
        soft:     '0 1px 0 0 rgb(255 255 255/0.04) inset, 0 8px 32px -12px rgb(var(--bg-base)/0.65)',
        sheet:    '0 1px 0 0 rgb(255 255 255/0.04) inset, 0 30px 80px -30px rgb(var(--bg-base)/0.85)',
      },

      borderRadius: {
        '4xl': '2rem',
      },

      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%':       { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'rail-fill': {
          from: { height: '0%' },
          to:   { height: '100%' },
        },
        'progress-sweep': {
          from: { width: '0%' },
          to:   { width: '100%' },
        },
        'header-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%':       { opacity: '1' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%':       { opacity: '1',   transform: 'scale(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-12px)' },
        },
        orbit: {
          from: { offsetDistance: '0%' },
          to:   { offsetDistance: '100%' },
        },
        'log-entry': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'ghost-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%':       { opacity: '0.7' },
        },
        'icon-rotate': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(180deg)' },
        },
      },

      animation: {
        'fade-up':       'fade-up 0.6s cubic-bezier(0.22,0.61,0.36,1) both',
        'pulse-glow':    'pulse-glow 2.4s ease-in-out infinite',
        shimmer:         'shimmer 2.4s linear infinite',
        marquee:         'marquee 40s linear infinite',
        'rail-fill':     'rail-fill 0.6s ease-out forwards',
        'progress-sweep':'progress-sweep 1.8s ease-in-out infinite',
        'header-pulse':  'header-pulse 2s ease-in-out infinite',
        twinkle:         'twinkle 3s ease-in-out infinite',
        float:           'float 4s ease-in-out infinite',
        orbit:           'orbit 16s linear infinite',
        'log-entry':     'log-entry 0.25s ease-out both',
        'ghost-pulse':   'ghost-pulse 1.8s ease-in-out infinite',
        'icon-rotate':   'icon-rotate 0.35s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
