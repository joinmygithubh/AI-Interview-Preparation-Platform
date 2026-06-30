/** A pulsing gray block. Pass width/height (any CSS size) for custom sizing. */
export const SkeletonCard = ({ width = '100%', height = '6rem', className = '' }) => (
  <div
    className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700 ${className}`}
    style={{ width, height }}
  />
);

/** A thin horizontal bar, for table-row placeholders. */
export const SkeletonRow = ({ width = '100%', className = '' }) => (
  <div
    className={`h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`}
    style={{ width }}
  />
);

export default SkeletonCard;
