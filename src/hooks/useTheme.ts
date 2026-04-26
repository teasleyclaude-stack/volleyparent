import { useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "light";
export const THEME_STORAGE_KEY = "courtsideview_theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const initial = readStoredTheme();
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* noop */
    }
    // Subtle fade transition so the swap doesn't feel jarring
    const root = document.documentElement;
    root.style.transition = "opacity 150ms ease-out";
    root.style.opacity = "0.95";
    window.setTimeout(() => {
      root.style.opacity = "1";
      window.setTimeout(() => {
        root.style.transition = "";
      }, 180);
    }, 80);
  }, []);

  return { theme, setTheme };
}
