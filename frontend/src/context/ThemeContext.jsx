// Theme switcher — toggles between "PAU Blue" (default) and the classic
// warm-brown look. The choice is saved so it sticks across visits.
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('fyp-theme') === 'classic' ? 'classic' : 'blue'
  );

  useEffect(() => {
    if (theme === 'classic') document.documentElement.setAttribute('data-theme', 'classic');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('fyp-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'blue' ? 'classic' : 'blue'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
