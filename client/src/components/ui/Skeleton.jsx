const SHIMMER =
  'animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-brand-50 via-brand-100 to-brand-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800';

/** A shimmering placeholder block. Pass width/height (any CSS size). */
export const SkeletonCard = ({ width = '100%', height = '6rem', className = '' }) => (
  <div
    className={`rounded-xl ${SHIMMER} ${className}`}
    style={{ width, height }}
  />
);

/** A thin shimmering bar, for table-row placeholders. */
export const SkeletonRow = ({ width = '100%', className = '' }) => (
  <div className={`h-4 rounded ${SHIMMER} ${className}`} style={{ width }} />
);

export default SkeletonCard;
