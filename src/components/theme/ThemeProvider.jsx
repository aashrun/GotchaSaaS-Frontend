import { createContext, useContext, useEffect, useState } from 'react';
const Context = createContext(null);
const choices = ['dark', 'light'];
const normalize = (value) => (value === 'light' ? 'light' : 'dark');
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('gotcha-theme');
    return normalize(saved);
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('gotcha-theme', theme);
  }, [theme]);
  const setTheme = (t) => setThemeState(normalize(t));
  return <Context.Provider value={{ theme, setTheme, choices }}>{children}</Context.Provider>;
}
export const useTheme = () => useContext(Context);
