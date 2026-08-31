import logger from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation errors.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const details = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed';
    return res.status(statusCod4e).json({ success: false, message, errors: details });
  }
  // Mongoose duplicate key.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res
      .status(statusCode)
      .json({ success: false, message: `Duplicate value for ${field}`, errors: [field] });
  }
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  if (statusCode >= 500) logger.error({ err }, 'Unhandled error');
  else logger.warn({ err: err.message }, 'Request error');

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { errors: err.details } : {}),
  });
}

export default errorHandler;
