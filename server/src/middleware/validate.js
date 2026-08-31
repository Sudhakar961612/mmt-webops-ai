import { validationResult } from 'express-validator';
import { badRequest } from '../utils/ApiError.js';

/**
 * Express-validator helper: after running validators on a route, this middleware
 * collects errors and responds with a 400 + the first error message.
 */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const first = result.array()[0];
    return next(badRequest(first.msg, result.array().map((e) => e.msg)));
  }
  next();
}

export default validate;
