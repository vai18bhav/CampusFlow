/**
 * Standardized API Response Helper
 */

const successResponse = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  let limit = parseInt(query.limit || '25', 10);
  if (isNaN(limit) || limit <= 0) limit = 25;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const paginatedResponse = (res, statusCode = 200, message = 'Success', data = [], totalRecords = 0, page = 1, limit = 25) => {
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalRecords: parseInt(totalRecords, 10),
      totalPages
    }
  });
};

module.exports = {
  successResponse,
  errorResponse,
  getPaginationParams,
  paginatedResponse
};
