'use client';

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "@/lib/use-toast";

export const THEMES = [
  {
    id: "dark-chocolate",
    name: "Dark Chocolate",
    badge: "Espresso Obsidian",
    tagline: "Hangat & Mewah",
    description: "Nuansa obsidian espresso hangat dengan pendaran orbs amber gold yang mewah.",
    accentColor: "#D97706",
    accentHover: "#B45309",
    glowColor: "rgba(217, 119, 6, 0.4)",
    glowColorSubtle: "rgba(217, 119, 6, 0.15)",
    cardBg: "rgba(22, 17, 14, 0.55)",
    cardBgHover: "rgba(28, 22, 18, 0.68)",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    cardBorderHover: "rgba(255, 255, 255, 0.16)",
    navBg: "rgba(16, 12, 10, 0.75)",
    baseBg: "#0C0A09",
    swatchColors: ["#0C0A09", "#78350F", "#D97706", "#F59E0B"],
    isDefault: true,
  },
  {
    id: "soft-aurora",
    name: "Soft Aurora",
    badge: "Calm & Ethereal",
    tagline: "Tenang & Mengalir",
    description: "Tirai pendaran cahaya aurora borealis cyan & fuchsia yang menyejukkan fokus.",
    accentColor: "#06B6D4",
    accentHover: "#0891B2",
    glowColor: "rgba(6, 182, 212, 0.45)",
    glowColorSubtle: "rgba(6, 182, 212, 0.15)",
    cardBg: "rgba(10, 16, 30, 0.55)",
    cardBgHover: "rgba(16, 24, 42, 0.68)",
    cardBorder: "rgba(6, 182, 212, 0.14)",
    cardBorderHover: "rgba(6, 182, 212, 0.28)",
    navBg: "rgba(9, 13, 24, 0.78)",
    baseBg: "#060810",
    swatchColors: ["#090D16", "#3B82F6", "#06B6D4", "#E879F9"],
    isDefault: false,
  },
  {
    id: "abyssal-teal",
    name: "Abyssal Teal",
    badge: "Bioluminescent",
    tagline: "Bioluminescent & Menenangkan",
    description: "Pendaran kabut fluida zamrud & teal laut dalam yang mengalir elegan, dipadukan dengan kaca kristal frosted abisal.",
    accentColor: "#2DD4BF",
    accentHover: "#14B8A6",
    glowColor: "rgba(45, 212, 191, 0.55)",
    glowColorSubtle: "rgba(45, 212, 191, 0.18)",
    cardBg: "rgba(4, 24, 28, 0.65)",
    cardBgHover: "rgba(8, 36, 42, 0.78)",
    cardBorder: "rgba(45, 212, 191, 0.22)",
    cardBorderHover: "rgba(45, 212, 191, 0.42)",
    navBg: "rgba(3, 16, 20, 0.85)",
    baseBg: "#021013",
    swatchColors: ["#021013", "#042B30", "#0D9488", "#2DD4BF"],
    isDefault: false,
  },
];

const THEME_STORAGE_KEY = "taskflow_theme";

const ThemeContext = createContext({
  theme: "dark-chocolate",
  currentTheme: THEMES[0],
  setTheme: () => {},
  isThemeModalOpen: false,
  openThemeModal: () => {},
  closeThemeModal: () => {},
  themes: THEMES,
  isMounted: false,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark-chocolate");
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Apply theme tokens to root HTML element
  const applyThemeTokens = useCallback((themeId) => {
    if (typeof document === "undefined") return;
    const themeObj = THEMES.find((t) => t.id === themeId) || THEMES[0];
    const root = document.documentElement;

    root.setAttribute("data-theme", themeObj.id);
    root.style.setProperty("--theme-accent", themeObj.accentColor);
    root.style.setProperty("--theme-accent-hover", themeObj.accentHover);
    root.style.setProperty("--theme-glow", themeObj.glowColor);
    root.style.setProperty("--theme-glow-subtle", themeObj.glowColorSubtle);
    root.style.setProperty("--glass-bg", themeObj.cardBg);
    root.style.setProperty("--glass-bg-hover", themeObj.cardBgHover);
    root.style.setProperty("--glass-border", themeObj.cardBorder);
    root.style.setProperty("--glass-border-hover", themeObj.cardBorderHover);
    root.style.setProperty("--theme-nav-bg", themeObj.navBg);
    root.style.setProperty("--theme-base-bg", themeObj.baseBg);
  }, []);

  // Sync initial theme from localStorage on client mount
  useEffect(() => {
    setIsMounted(true);
    try {
      let savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "gradient-ascii") {
        savedTheme = "abyssal-teal";
        localStorage.setItem(THEME_STORAGE_KEY, "abyssal-teal");
      }
      if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
        setThemeState(savedTheme);
        applyThemeTokens(savedTheme);
      } else {
        applyThemeTokens("dark-chocolate");
      }
    } catch {
      applyThemeTokens("dark-chocolate");
    }
  }, [applyThemeTokens]);

  // Multi-tab theme sync via storage event listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        if (THEMES.some((t) => t.id === e.newValue)) {
          setThemeState(e.newValue);
          applyThemeTokens(e.newValue);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [applyThemeTokens]);

  const setTheme = useCallback(
    (newThemeId, showToastNotification = true) => {
      const targetTheme = THEMES.find((t) => t.id === newThemeId);
      if (!targetTheme) return;

      // Prevent redundant work and toast notification if theme is already active
      if (targetTheme.id === theme) return;

      setThemeState(targetTheme.id);
      applyThemeTokens(targetTheme.id);

      try {
        localStorage.setItem(THEME_STORAGE_KEY, targetTheme.id);
      } catch (err) {
        console.warn("Gagal menyimpan tema ke localStorage:", err);
      }

      if (showToastNotification) {
        toast.success(`Tema "${targetTheme.name}" aktif`);
      }
    },
    [theme, applyThemeTokens]
  );

  const openThemeModal = useCallback(() => setIsThemeModalOpen(true), []);
  const closeThemeModal = useCallback(() => setIsThemeModalOpen(false), []);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentTheme,
        setTheme,
        isThemeModalOpen,
        openThemeModal,
        closeThemeModal,
        themes: THEMES,
        isMounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

