import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "seventh-tone-theme";
const FONT_SCALE_KEY = "seventh-tone-font-scale";

type Theme = "light" | "dark";
export type FontScale = "small" | "medium" | "large";

interface ThemeContextValue {
  theme: Theme;
  fontScale: FontScale;
  setTheme: (theme: Theme) => void;
  setFontScale: (fontScale: FontScale) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

function readStoredFontScale(): FontScale {
  if (typeof window === "undefined") return "medium";
  const stored = localStorage.getItem(FONT_SCALE_KEY);
  if (stored === "small" || stored === "medium" || stored === "large") return stored;
  return "medium";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [fontScale, setFontScaleState] = useState<FontScale>(readStoredFontScale);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(FONT_SCALE_KEY, fontScale);
  }, [fontScale]);

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
  }, []);

  const setFontScale = useCallback((value: FontScale) => {
    setFontScaleState(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, fontScale, setTheme, setFontScale, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
