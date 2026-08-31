import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError, unauthorized } from '../utils/ApiError.js';
import { User } from '../models/User.js';

/**
 * Reads and verifies the Bearer JWT, attaches req.user = { id, username, role }.
 */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw unauthorized('Authentication token is required');
    }
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      throw unauthorized('Invalid or expired token');
    }
    if (!payload.sub) throw unauthorized('Invalid token payload');

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw unauthorized('User no longer active');

    req.user = { id: user._id.toString(), username: user.username, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based access control. Pass the roles that are allowed to proceed.
 */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized('Not authenticated'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Requires role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
}

export default authenticate;
