/**
 * Wrap an async Express handler so rejected promises are forwarded to next(err).
 * @param {Function} fn
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
