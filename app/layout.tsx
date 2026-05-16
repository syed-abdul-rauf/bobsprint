import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { ThemeProvider } from '@/components/shell/theme-provider';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'BobSprint — From unknown repo to production-ready sprint',
  description:
    'BobSprint is an AI codebase rescue and sprint delivery copilot. Turn any repo into a sprint-ready plan with IBM Bob.',
  applicationName: 'BobSprint',
  keywords: ['IBM Bob', 'codebase analysis', 'sprint planning', 'developer tools', 'AI'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* Pre-paint theme script — runs before first render to avoid FOUC.
            Reads bobsprint:theme ('dark'|'light'|'system'), falls back to
            prefers-color-scheme, then sets/removes .dark on <html>. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('bobsprint:theme');var d=s==='dark'||(s!=='light'&&(s!=='system'?!s:!0)&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
