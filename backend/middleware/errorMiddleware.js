const { errorResponse } = require('../utils/responseHelper');

const notFoundHandler = (req, res, next) => {
  return errorResponse(res, 404, `API Route not found: ${req.originalUrl}`);
};

const errorHandler = (err, req, res, next) => {
  console.error('Central Error Handler caught error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return errorResponse(res, statusCode, message, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
