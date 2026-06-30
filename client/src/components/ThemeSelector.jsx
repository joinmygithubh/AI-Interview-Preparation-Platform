import { useState } from 'react';
import { Sun, Moon, Contrast } from 'lucide-react';

import { getThemeMode, applyThemeMode } from '../utils/theme';

const MODES = [
  { key: 'light', icon: Sun, label: 'Light' },
  { key: 'dark', icon: Moon, label: 'Dark' },
  { key: 'mono', icon: Contrast, label: 'Black & White' },
];

/**
 * Three-mode theme switcher (Light / Dark / Black & White) shown as pill
 * buttons. Selection is persisted and applied to <html>.
 */
const ThemeSelector = () => {
  const [mode, setMode] = useState(getThemeMode);

  const select = (m) => {
    applyThemeMode(m);
    setMode(m);
  };

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-slate-200/60 p-0.5 dark:border-slate-700/60">
      {MODES.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => select(key)}
          aria-label={label}
          aria-pressed={mode === key}
          title={label}
          className={`rounded-full p-1.5 transition ${
            mode === key
              ? 'bg-brand-500 text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
