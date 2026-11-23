'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { toast } from "@/lib/use-toast";
import {
  THEMES,
  THEME_STORAGE_KEY,
  THEME_COOKIE_NAME,
  THEME_COOKIE_MAX_AGE,
  DEFAULT_THEME_ID,
  normalizeThemeId,
  resolveThemeId,
  getThemeById,
  getThemeCssVars,
} from "@/lib/themes";

export { THEMES };

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function persistThemeCookie(themeId) {
  if (typeof document === "undefined") return;
  try {
    const isSecure =
      typeof window !== "undefined" && window.location?.protocol === "https:";
    document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(
      themeId
    )}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${
      isSecure ? "; Secure" : ""
    }`;
  } catch (err) {
    console.warn("Gagal menyimpan tema ke cookie:", err);
  }
}

function syncMetaThemeColor(color) {
  if (typeof document === "undefined" || !color) return;
  try {
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length > 0) {
      metas.forEach((meta) => {
        if (meta.getAttribute("content") !== color) {
          meta.setAttribute("content", color);
        }
      });
    } else if (document.head) {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("content", color);
      document.head.appendChild(meta);
    }
  } catch {
    // Abaikan jika head belum siap
  }
}

const ThemeContext = createContext({
  theme: DEFAULT_THEME_ID,
  currentTheme: THEMES[0],
  setTheme: () => {},
  isThemeModalOpen: false,
  openThemeModal: () => {},
  closeThemeModal: () => {},
  themes: THEMES,
  isMounted: false,
});

export function ThemeProvider({ children, initialTheme = DEFAULT_THEME_ID }) {
  const safeInitialTheme = resolveThemeId(initialTheme);
  const [theme, setThemeState] = useState(safeInitialTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Apply unified theme tokens & dynamic mobile status bar color to root HTML element
  const applyThemeTokens = useCallback((themeId) => {
    if (typeof document === "undefined") return;
    const themeObj = getThemeById(themeId);
    const root = document.documentElement;
    const colorScheme = themeObj.isLight ? "light" : "dark";

    root.setAttribute("data-theme", themeObj.id);
    root.setAttribute("data-color-scheme", colorScheme);
    if (themeObj.isLight) {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }

    const cssVars = getThemeCssVars(themeObj);
    for (const [prop, val] of Object.entries(cssVars)) {
      root.style.setProperty(prop, val);
    }

    syncMetaThemeColor(themeObj.themeColor);
  }, []);

  // Pre-paint sync: migrasi localStorage -> cookie (untuk user lama atau offline SW cache)
  useIsomorphicLayoutEffect(() => {
    let resolved = safeInitialTheme;

    try {
      const rawStored = localStorage.getItem(THEME_STORAGE_KEY);
      const normalizedStored = normalizeThemeId(rawStored);
      if (rawStored === "gradient-ascii" && normalizedStored) {
        localStorage.setItem(THEME_STORAGE_KEY, normalizedStored);
      }

      const domTheme = normalizeThemeId(
        document.documentElement.getAttribute("data-theme")
      );

      if (normalizedStored) {
        resolved = normalizedStored;
      } else if (domTheme) {
        resolved = domTheme;
        localStorage.setItem(THEME_STORAGE_KEY, domTheme);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, resolved);
      }
    } catch {
      const domTheme = normalizeThemeId(
        document.documentElement.getAttribute("data-theme")
      );
      if (domTheme) {
        resolved = domTheme;
      }
    }

    setThemeState((prev) => (prev === resolved ? prev : resolved));
    applyThemeTokens(resolved);
    persistThemeCookie(resolved);
    setIsMounted(true);
  }, [applyThemeTokens, safeInitialTheme]);

  // Multi-tab theme sync via storage event listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const nextTheme = normalizeThemeId(e.newValue);
        if (nextTheme) {
          setThemeState(nextTheme);
          applyThemeTokens(nextTheme);
          persistThemeCookie(nextTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [applyThemeTokens]);

  const setTheme = useCallback(
    (newThemeId, showToastNotification = true) => {
      const normalizedId = normalizeThemeId(newThemeId);
      if (!normalizedId) return;
      const targetTheme = getThemeById(normalizedId);

      // Prevent redundant work and toast notification if theme is already active
      if (targetTheme.id === theme) return;

      setThemeState(targetTheme.id);
      applyThemeTokens(targetTheme.id);
      persistThemeCookie(targetTheme.id);

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

  const currentTheme = getThemeById(theme);

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

