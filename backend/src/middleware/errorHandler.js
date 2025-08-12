/**
 * Global error handler middleware
 * Catches and properly formats all errors in production
 */

const logger = require('../utils/logger')('errorHandler');

// Custom error class for API errors
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

// Error handler middleware
function errorHandler(err, req, res, next) {
  // Default to 500 if no status code
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Log the error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id
    });
  } else {
    logger.warn('Client error:', {
      error: err.message,
      url: req.url,
      method: req.method,
      statusCode
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
  }

  // Prepare response
  const response = {
    error: message,
    statusCode
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.details = details || err.details;
    response.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(response);
}

// Not found handler
function notFoundHandler(req, res, next) {
  const error = new ApiError(404, `Route ${req.url} not found`);
  next(error);
}

// Async wrapper to catch errors in async route handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError
};
