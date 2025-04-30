/**
 * Sends a standardized response.
 * @param {Response} res Express Response object.
 * @param {number} statusCode HTTP status code.
 * @param {boolean} success Boolean indicating success.
 * @param {string} message Response message.
 * @param {any} data Optional data payload.
 * @param {any} errors Optional errors.
 * @param {any} pagination Optional pagination information.
 */
const sendResponse = (res, statusCode, success, message, data = null, errors = null, pagination = null) => {
  const response = {
    success,
    message,
    statusCode,
  };

  if (data) response.data = data;
  if (errors) response.errors = errors;
  if (pagination) response.pagination = pagination;

  // Uncomment for development debugging:
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('response----', response);
  // }

  res.status(statusCode).send(response);
};

/**
 * Sends a success response with status code 200.
 */
const sendSuccess = (res, message, data = null, pagination = null) => {
  sendResponse(res, 200, true, message, data, null, pagination);
};

/**
 * Sends a created response with status code 201.
 */
const sendCreated = (res, message, data = null) => {
  sendResponse(res, 201, true, message, data);
};

/**
 * Sends an error response with status code 500.
 */
const sendError = async (res, errors = null, req) => {
  sendResponse(res, 500, false, 'Internal Server Error', null, errors);
  console.error(errors);
};

/**
 * Sends a bad request error with status code 400.
 */
const sendErrorMessage = (res, message = 'Something Went Wrong') => {
  sendResponse(res, 400, false, message);
};

/**
 * Sends a not found error with status code 404.
 */
const sendNotFound = (res, errors = null) => {
  sendResponse(res, 404, false, errors || 'Not Found', null, errors);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendCreated,
  sendError,
  sendErrorMessage,
  sendNotFound
};