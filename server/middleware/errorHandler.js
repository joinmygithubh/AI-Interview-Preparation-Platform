/* eslint-disable no-unused-vars */
/**
 * Centralized Express error handler. Register LAST, after all routes.
 *
 * Maps known error types to status codes:
 *  - Mongoose ValidationError      -> 400
 *  - Duplicate key (code 11000)    -> 409 ("... already exists")
 *  - JWT errors (invalid/expired)  -> 401
 *  - Everything else               -> 500
 *
 * Always responds: { success: false, message, ...(stack in development) }
 */
const isProd = () => process.env.NODE_ENV === 'production';

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Mongoose bad ObjectId
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  // Duplicate key
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    message = `${field} '${value}' already exists`;
  }

  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err);
  }

  const body = {
    success: false,
    message,
  };

  // Expose stack traces only outside production to aid debugging.
  if (!isProd()) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

export default errorHandler;
