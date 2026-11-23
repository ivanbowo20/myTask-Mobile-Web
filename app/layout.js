// import { Arvo, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/lib/theme-context";
import ThemeBackground from "@/components/theme/ThemeBackground";
import ThemeModal from "@/components/theme/ThemeModal";
import {
  DEFAULT_THEME_ID,
  THEME_COOKIE_NAME,
  resolveThemeId,
  getThemeById,
  getThemeCssVars,
  buildThemeInitScript,
} from "@/lib/themes";

const Analytics = () => null;
const THEME_INIT_SCRIPT = buildThemeInitScript();

async function getServerTheme() {
  try {
    const cookieStore = await cookies();
    const rawTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
    return getThemeById(resolveThemeId(rawTheme));
  } catch {
    return getThemeById(DEFAULT_THEME_ID);
  }
}

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

export async function generateViewport() {
  const initialThemeObj = await getServerTheme();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: initialThemeObj.themeColor,
    interactiveWidget: "resizes-content",
  };
}

export default async function RootLayout({ children }) {
  const initialThemeObj = await getServerTheme();
  const colorScheme = initialThemeObj.isLight ? "light" : "dark";
  const initialThemeVars = getThemeCssVars(initialThemeObj);

  return (
    <html
      lang="id"
      data-theme={initialThemeObj.id}
      data-color-scheme={colorScheme}
      className={`${colorScheme} font-sans`}
      style={initialThemeVars}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-[100dvh] text-[var(--text-primary)] font-sans antialiased relative bg-[var(--theme-base-bg)]">
        <ThemeProvider initialTheme={initialThemeObj.id}>
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
                var refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  if (!refreshing && navigator.onLine) {
                    refreshing = true;
                    window.location.reload();
                  }
                });
                function registerSW() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    if (reg) {
                      reg.update().catch(function() {});
                    }
                  }).catch(function() {});
                }
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  registerSW();
                } else {
                  window.addEventListener('load', registerSW);
                }
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
