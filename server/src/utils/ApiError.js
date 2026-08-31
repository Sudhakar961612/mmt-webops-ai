export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (msg = 'Resource not found', details) => new ApiError(404, msg, details);
export const badRequest = (msg = 'Bad request', details) => new ApiError(400, msg, details);
export const unauthorized = (msg = 'Unauthorized', details) => new ApiError(401, msg, details);
export const forbidden = (msg = 'Forbidden', details) => new ApiError(403, msg, details);
export const conflict = (msg = 'Conflict', details) => new ApiError(409, msg, details);

export default ApiError;
