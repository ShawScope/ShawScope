import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "admin_theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Apply theme ONLY when on /admin route. Public site is always default (dark via :root).
 */
function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  const isAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  // Always strip both classes first
  root.classList.remove("light", "dark");
  if (!isAdmin) return; // public site keeps :root defaults — never touched
  if (resolved === "light") root.classList.add("light");
  else root.classList.add("dark");
}

export function ThemeProvider({ children, defaultTheme = "dark" }: { children: ReactNode; defaultTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored || defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    const t = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Theme | null)) || defaultTheme;
    return t === "system" ? getSystemTheme() : t;
  });

  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // Re-apply on route changes so navigating to/from /admin toggles correctly
  useEffect(() => {
    const handler = () => {
      const resolved = theme === "system" ? getSystemTheme() : theme;
      applyTheme(resolved);
    };
    window.addEventListener("popstate", handler);
    // Patch pushState/replaceState to fire our handler
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      const r = origPush.apply(this, args as any);
      handler();
      return r;
    };
    history.replaceState = function (...args) {
      const r = origReplace.apply(this, args as any);
      handler();
      return r;
    };
    return () => {
      window.removeEventListener("popstate", handler);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
