const errorHandlerMiddleware = (err, req, res, next) => {
  // Log error for debugging (in production, use proper logging service)
  console.error('Error:', err.message);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Default error status and message
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
  }

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  if (err.code === 11000) {
    status = 400;
    message = 'Duplicate value error';
  }

  // Send error response
  res.status(status).json({
    success: false,
    message: message,
    ...(isDevelopment && { stack: err.stack })
  });
};

module.exports = errorHandlerMiddleware;