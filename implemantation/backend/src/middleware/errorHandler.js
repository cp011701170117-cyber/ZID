// src/middleware/errorHandler.js
// centralized error handling middleware

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const response = { error: err.message || 'Internal Server Error' };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};
