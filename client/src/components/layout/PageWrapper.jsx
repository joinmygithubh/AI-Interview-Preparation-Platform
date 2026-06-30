import Navbar from './Navbar';

/**
 * Standard authenticated page shell: sticky navbar + centered main content.
 */
const PageWrapper = ({ children }) => (
  <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
  </div>
);

export default PageWrapper;
