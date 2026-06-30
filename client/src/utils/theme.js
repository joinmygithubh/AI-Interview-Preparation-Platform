// Theme modes: 'light' | 'dark' | 'mono' (Black & White).
export const THEME_KEY = 'theme-mode';

export const getThemeMode = () => {
  const m = typeof localStorage !== 'undefined' && localStorage.getItem(THEME_KEY);
  return m === 'dark' || m === 'mono' ? m : 'light';
};

/** Apply the theme mode to <html> and persist it. */
export const applyThemeMode = (mode) => {
  const el = document.documentElement;
  el.classList.remove('dark', 'theme-mono');
  if (mode === 'dark') el.classList.add('dark');
  else if (mode === 'mono') el.classList.add('theme-mono');
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* ignore */
  }
};
