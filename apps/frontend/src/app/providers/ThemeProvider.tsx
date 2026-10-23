import React, { createContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';

export interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
}

export const initialState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => null,
};

export const ThemeContext = createContext<ThemeProviderState>(initialState);

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'theme-preference',
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (targetTheme: Theme) => {
      root.classList.remove('light', 'dark');

      if (targetTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const computedTheme = systemPrefersDark ? 'dark' : 'light';
        root.classList.add(computedTheme);
        setResolvedTheme(computedTheme);
      } else {
        root.classList.add(targetTheme);
        setResolvedTheme(targetTheme);
      }
    };

    applyTheme(theme);

    // If set to system, attach listener for real-time OS preference changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        const computedTheme = e.matches ? 'dark' : 'light';
        root.classList.add(computedTheme);
        setResolvedTheme(computedTheme);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => {
          mediaQuery.removeEventListener('change', handleChange);
        };
      }
    }

    return undefined;
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch {
      // Storage unavailable or blocked
    }
    setThemeState(newTheme);
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
