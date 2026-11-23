/**
 * Single Source of Truth untuk seluruh tema aplikasi MyTask.
 * Isomorphic (aman diimpor di Server Component `app/layout.js` maupun Client Component `lib/theme-context.js`).
 */

export const THEME_STORAGE_KEY = "taskflow_theme";
export const THEME_COOKIE_NAME = "taskflow_theme";
export const DEFAULT_THEME_ID = "dark-chocolate";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 tahun

export const THEMES = [
  {
    id: "dark-chocolate",
    name: "Dark Chocolate",
    badge: "Espresso Obsidian",
    tagline: "Hangat & Mewah",
    description: "Nuansa obsidian espresso hangat dengan pendaran orbs amber gold yang mewah.",
    accentColor: "#D97706",
    accentHover: "#B45309",
    accentEnd: "#F59E0B",
    fabTextColor: "#0A0A0A",
    glowColor: "rgba(217, 119, 6, 0.4)",
    glowColorSubtle: "rgba(217, 119, 6, 0.15)",
    cardBg: "rgba(22, 17, 14, 0.55)",
    cardBgHover: "rgba(28, 22, 18, 0.68)",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    cardBorderHover: "rgba(255, 255, 255, 0.16)",
    navBg: "rgba(16, 12, 10, 0.75)",
    baseBg: "#0C0A09",
    themeColor: "#0C0A09",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    swatchColors: ["#0C0A09", "#78350F", "#D97706", "#F59E0B"],
    isDefault: true,
    isLight: false,
  },
  {
    id: "cosmic-galaxy",
    name: "Cosmic Galaxy",
    badge: "Deep Space",
    tagline: "Megah & Tenang",
    description:
      "Galaksi spiral berinti emas hangat, planet gas bercincin, dan lautan bintang kosmik dalam kaca obsidian Interstellar yang tenang & tajam.",
    accentColor: "#E2DCE8",
    accentHover: "#CEC6D8",
    accentEnd: "#C5BBD4",
    fabTextColor: "#0B0A10",
    glowColor: "rgba(138, 117, 158, 0.20)",
    glowColorSubtle: "rgba(138, 117, 158, 0.10)",
    cardBg: "rgba(13, 12, 18, 0.62)",
    cardBgHover: "rgba(19, 17, 26, 0.74)",
    cardBorder: "rgba(156, 138, 178, 0.16)",
    cardBorderHover: "rgba(226, 220, 232, 0.30)",
    navBg: "rgba(10, 9, 15, 0.86)",
    baseBg: "#070810",
    themeColor: "#070810",
    textPrimary: "#F5F3F7",
    textSecondary: "#B3AEBC",
    textMuted: "#7C7787",
    swatchColors: ["#070810", "#3B2F4A", "#8A759E", "#E2DCE8"],
    isDefault: false,
    isLight: false,
  },
  {
    id: "abyssal-teal",
    name: "Emerald Aurora",
    badge: "Northern Boreal",
    tagline: "Magis, Sejuk & Menenangkan",
    description:
      "Pemandangan aurora borealis hijau zamrud menari di atas pegunungan bersalju dan danau malam yang tenang, dipadukan dengan palet Luigi & kaca kristal obsidian.",
    accentColor: "#2DB15C",
    accentHover: "#259A4E",
    accentEnd: "#79CE67",
    fabTextColor: "#0A0A0A",
    glowColor: "rgba(45, 177, 92, 0.45)",
    glowColorSubtle: "rgba(45, 177, 92, 0.15)",
    cardBg: "rgba(13, 20, 16, 0.65)",
    cardBgHover: "rgba(18, 28, 22, 0.78)",
    cardBorder: "rgba(121, 206, 103, 0.20)",
    cardBorderHover: "rgba(121, 206, 103, 0.40)",
    navBg: "rgba(10, 16, 13, 0.85)",
    baseBg: "#0B120E",
    themeColor: "#0B120E",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    swatchColors: ["#FFE3B3", "#C2DB6C", "#79CE67", "#2DB15C"],
    isDefault: false,
    isLight: false,
  },
  {
    id: "celestial-sky",
    name: "Celestial Sky",
    badge: "Daylight Ethereal",
    tagline: "Cerah, Sejuk & Produktif",
    description:
      "Hamparan langit biru cerah dengan arak-arakan awan lembut melayang tenang, dipadukan dengan kaca kristal es frosted yang nyaman di mata.",
    accentColor: "#0284C7",
    accentHover: "#0369A1",
    accentEnd: "#38BDF8",
    fabTextColor: "#FFFFFF",
    glowColor: "rgba(2, 132, 199, 0.40)",
    glowColorSubtle: "rgba(2, 132, 199, 0.15)",
    cardBg: "rgba(255, 255, 255, 0.68)",
    cardBgHover: "rgba(255, 255, 255, 0.82)",
    cardBorder: "rgba(186, 230, 253, 0.55)",
    cardBorderHover: "rgba(14, 165, 233, 0.50)",
    navBg: "rgba(240, 249, 255, 0.88)",
    baseBg: "#3172B8",
    themeColor: "#3172B8",
    textPrimary: "#0F172A",
    textSecondary: "#334155",
    textMuted: "#64748B",
    swatchColors: ["#3172B8", "#8CBEE8", "#0284C7", "#FFFFFF"],
    isDefault: false,
    isLight: true,
  },
  {
    id: "winter-frost",
    name: "Winter Frost",
    badge: "Arctic Glacial",
    tagline: "Dingin, Tenang & Elegan",
    description:
      "Atmosfer pegunungan musim dingin dengan pohon cemara pixel art bersalju, rintik salju melayang, dan kaca kristal es arktik.",
    accentColor: "#1E40AF",
    accentHover: "#1D4ED8",
    accentEnd: "#2563EB",
    fabTextColor: "#FFFFFF",
    glowColor: "rgba(37, 99, 235, 0.45)",
    glowColorSubtle: "rgba(30, 64, 175, 0.20)",
    cardBg: "rgba(14, 24, 46, 0.80)",
    cardBgHover: "rgba(20, 34, 64, 0.88)",
    cardBorder: "rgba(186, 230, 253, 0.22)",
    cardBorderHover: "rgba(56, 189, 248, 0.45)",
    navBg: "rgba(14, 24, 44, 0.88)",
    baseBg: "#121E36",
    themeColor: "#121E36",
    textPrimary: "#F8FAFC",
    textSecondary: "#E2E8F0",
    textMuted: "#CBD5E1",
    swatchColors: ["#121E36", "#1E3254", "#1E40AF", "#F8FAFC"],
    isDefault: false,
    isLight: false,
  },
];

const THEME_MAP = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/**
 * Normalisasi ID tema (termasuk migrasi ID lama `gradient-ascii` -> `abyssal-teal`
 * dan `soft-aurora` -> `cosmic-galaxy`).
 * Mengembalikan `null` jika ID tidak valid.
 */
export function normalizeThemeId(rawId) {
  if (typeof rawId !== "string" || !rawId) return null;
  const trimmed = rawId.trim();
  const migrated =
    trimmed === "gradient-ascii"
      ? "abyssal-teal"
      : trimmed === "soft-aurora"
        ? "cosmic-galaxy"
        : trimmed;
  return THEME_MAP[migrated] ? migrated : null;
}

/**
 * Mengembalikan ID tema yang valid, atau `DEFAULT_THEME_ID` jika tidak ada/tidak valid.
 */
export function resolveThemeId(rawId) {
  return normalizeThemeId(rawId) || DEFAULT_THEME_ID;
}

/**
 * Mengembalikan objek konfigurasi tema lengkap berdasarkan ID.
 */
export function getThemeById(themeId) {
  const validId = resolveThemeId(themeId);
  return THEME_MAP[validId] || THEMES[0];
}

/**
 * Menghasilkan objek CSS custom properties untuk disuntikkan ke `<html style={...}>` (SSR)
 * maupun diaplikasikan langsung pada `document.documentElement.style` (Client).
 */
export function getThemeCssVars(themeOrId) {
  const themeObj =
    typeof themeOrId === "string" || !themeOrId
      ? getThemeById(themeOrId)
      : themeOrId;

  return {
    "--theme-accent": themeObj.accentColor,
    "--theme-accent-hover": themeObj.accentHover,
    "--theme-accent-end": themeObj.accentEnd,
    "--theme-fab-text": themeObj.fabTextColor,
    "--theme-glow": themeObj.glowColor,
    "--theme-glow-subtle": themeObj.glowColorSubtle,
    "--glass-bg": themeObj.cardBg,
    "--glass-bg-hover": themeObj.cardBgHover,
    "--glass-border": themeObj.cardBorder,
    "--glass-border-hover": themeObj.cardBorderHover,
    "--theme-nav-bg": themeObj.navBg,
    "--theme-base-bg": themeObj.baseBg,
    "--text-primary": themeObj.textPrimary,
    "--text-secondary": themeObj.textSecondary,
    "--text-muted": themeObj.textMuted,
  };
}

/**
 * Membangun inline script `<head>` sinkron dari sumber kebenaran `THEMES`.
 * Menangani 3 skenario tanpa flash:
 * 1. Migrasi pengguna lama yang baru punya `localStorage` tapi belum punya Cookie SSR.
 * 2. HTML hasil cache Service Worker (offline PWA) yang mungkin membawa `data-theme` versi lama.
 * 3. Sinkronisasi instan `<meta name="theme-color">` agar status bar HP langsung serasi.
 */
export function buildThemeInitScript() {
  const serializedThemes = {};
  for (const t of THEMES) {
    serializedThemes[t.id] = {
      l: Boolean(t.isLight),
      tc: t.themeColor,
      v: getThemeCssVars(t),
    };
  }

  return `(function(){try{var K=${JSON.stringify(THEME_STORAGE_KEY)};var C=${JSON.stringify(THEME_COOKIE_NAME)};var M=${JSON.stringify(serializedThemes)};var r=document.documentElement;var ssr=r.getAttribute('data-theme');var ls=null;try{ls=localStorage.getItem(K);}catch(e){}if(ls==='gradient-ascii'){ls='abyssal-teal';try{localStorage.setItem(K,ls);}catch(e){}}else if(ls==='soft-aurora'){ls='cosmic-galaxy';try{localStorage.setItem(K,ls);}catch(e){}}var active=(ls&&M[ls])?ls:((ssr&&M[ssr])?ssr:${JSON.stringify(DEFAULT_THEME_ID)});var cfg=M[active];if(!cfg)return;var sec=location.protocol==='https:'?'; Secure':'';var hasCookie=document.cookie.indexOf(C+'='+encodeURIComponent(active))!==-1;if(!hasCookie){document.cookie=C+'='+encodeURIComponent(active)+'; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax'+sec;}if(!ls&&active){try{localStorage.setItem(K,active);}catch(e){}}if(ssr!==active){r.setAttribute('data-theme',active);r.setAttribute('data-color-scheme',cfg.l?'light':'dark');r.classList.remove(cfg.l?'dark':'light');r.classList.add(cfg.l?'light':'dark');var vars=cfg.v;for(var p in vars){r.style.setProperty(p,vars[p]);}}var metas=document.querySelectorAll('meta[name="theme-color"]');if(metas.length){for(var i=0;i<metas.length;i++){metas[i].setAttribute('content',cfg.tc);}}else if(document.head){var m=document.createElement('meta');m.setAttribute('name','theme-color');m.setAttribute('content',cfg.tc);document.head.appendChild(m);}}catch(e){}})();`;
}
