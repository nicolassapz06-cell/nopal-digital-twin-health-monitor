import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext } from '@/contexts/theme-context';

function getInitialTheme() {
  const savedTheme = localStorage.getItem('nopal-theme');
  return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: {children: ReactNode;}) {
  const [darkMode, setDarkMode] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('nopal-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const value = useMemo(() => ({
    darkMode,
    toggleTheme: () => setDarkMode((current) => !current)
  }), [darkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
