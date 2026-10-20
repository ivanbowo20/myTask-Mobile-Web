// import { Arvo, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/lib/theme-context";
import ThemeBackground from "@/components/theme/ThemeBackground";
import ThemeModal from "@/components/theme/ThemeModal";
import { Analytics } from "@vercel/analytics/next";

/*
const arvo = Arvo({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-arvo",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});
*/

export const metadata = {
  title: "MyTask — Manajemen Tugas Pintar",
  description: "Aplikasi manajemen tugas modern dengan desain glassmorphism minimalis & performa kilat.",
  manifest: "/manifest.json?v=2",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyTask",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0C",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="dark font-sans" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json?v=2" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(typeof window !== 'undefined'){var t=localStorage.getItem('taskflow_theme');if(t==='gradient-ascii'){t='abyssal-teal';localStorage.setItem('taskflow_theme','abyssal-teal');}if(t){var c={'dark-chocolate':['#D97706','#B45309','rgba(217,119,6,0.4)','rgba(217,119,6,0.15)','rgba(22,17,14,0.55)','rgba(28,22,18,0.68)','rgba(255,255,255,0.08)','rgba(255,255,255,0.16)','rgba(16,12,10,0.75)','#0C0A09'],'soft-aurora':['#06B6D4','#0891B2','rgba(6,182,212,0.45)','rgba(6,182,212,0.15)','rgba(10,16,30,0.55)','rgba(16,24,42,0.68)','rgba(6,182,212,0.14)','rgba(6,182,212,0.28)','rgba(9,13,24,0.78)','#060810'],'abyssal-teal':['#2DD4BF','#14B8A6','rgba(45,212,191,0.55)','rgba(45,212,191,0.18)','rgba(4,24,28,0.65)','rgba(8,36,42,0.78)','rgba(45,212,191,0.22)','rgba(45,212,191,0.42)','rgba(3,16,20,0.85)','#021013']}[t];if(c){var r=document.documentElement;r.setAttribute('data-theme',t);r.style.setProperty('--theme-accent',c[0]);r.style.setProperty('--theme-accent-hover',c[1]);r.style.setProperty('--theme-glow',c[2]);r.style.setProperty('--theme-glow-subtle',c[3]);r.style.setProperty('--glass-bg',c[4]);r.style.setProperty('--glass-bg-hover',c[5]);r.style.setProperty('--glass-border',c[6]);r.style.setProperty('--glass-border-hover',c[7]);r.style.setProperty('--theme-nav-bg',c[8]);r.style.setProperty('--theme-base-bg',c[9]);}}}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-[100dvh] text-[#FAFAFA] font-sans antialiased selection:bg-[#FAFAFA] selection:text-[#0A0A0A] relative bg-[var(--theme-base-bg,#0C0A09)]">
        <ThemeProvider>
          {/* Dynamic Theme Background Canvas with WCAG AA Scrim Mask */}
          <ThemeBackground />

          {/* Page Content */}
          {children}

          {/* Dynamic Island Global Toast Provider */}
          <ToastProvider />

          {/* Fluid Glassmorphism Theme Selector Modal */}
          <ThemeModal />
        </ThemeProvider>

        {/* Service Worker PWA Background Registration (Native Script) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
        {/* Vercel Web Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
