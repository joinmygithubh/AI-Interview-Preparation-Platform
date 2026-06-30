import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-surface-light px-4 text-center dark:bg-surface-dark">
    <h1 className="text-7xl font-extrabold text-brand-600">404</h1>
    <p className="mt-3 text-lg font-medium text-slate-600 dark:text-slate-300">
      Page not found
    </p>
    <Link
      to="/dashboard"
      className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700"
    >
      Back to dashboard
    </Link>
  </div>
);

export default NotFound;
