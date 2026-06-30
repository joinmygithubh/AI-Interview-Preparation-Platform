import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Menu, X, LogOut } from 'lucide-react';

import api from '../../services/api';
import ThemeSelector from '../ThemeSelector';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Practice' },
  { to: '/history', label: 'History' },
];

const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get('/auth/me')
      .then(({ data }) => active && setUser(data.data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition ${
      isActive
        ? 'text-brand-600 dark:text-brand-400'
        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-slate-700/60 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-brand-600" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            InterviewAI
          </span>
        </NavLink>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          <ThemeSelector />

          <div
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white sm:flex"
            title={user?.name || 'User'}
          >
            {initialsOf(user?.name)}
          </div>

          <button
            type="button"
            onClick={logout}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile slide-down */}
      {menuOpen && (
        <div className="border-t border-slate-200/60 dark:border-slate-700/60 md:hidden">
          <div className="space-y-1 px-4 py-3">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {l.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-danger-500 hover:bg-danger-500/10"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
