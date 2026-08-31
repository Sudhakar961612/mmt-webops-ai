import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, me, getUsers, setUserRole, createUser, setUserStatus } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const strongPasswordRule = body('password')
  .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
  .matches(STRONG_PASSWORD_REGEX)
  .withMessage('Password must include uppercase, lowercase, numbers, and special characters');

const router = Router();

router.post(
  '/register',
  body('username').trim().isLength({ min: 3, max: 40 }).withMessage('Username must be 3-40 characters'),
  body('email').isEmail().withMessage('A valid email is required'),
  strongPasswordRule,
  validate,
  register
);

router.post(
  '/login',
  body('identifier').trim().notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
  login
);

router.get('/me', authenticate, me);

router.get('/users', authenticate, authorize('admin', 'manager'), getUsers);

// Admin-only user creation with an explicit (elevated) role.
router.post(
  '/users',
  authenticate,
  authorize('admin'),
  body('username').trim().isLength({ min: 3, max: 40 }).withMessage('Username must be 3-40 characters'),
  body('email').isEmail().withMessage('A valid email is required'),
  strongPasswordRule,
  body('role').optional().isIn(['admin', 'manager', 'analyst', 'viewer']).withMessage('Invalid role'),
  validate,
  createUser
);

router.patch('/users/:id/role', authenticate, authorize('admin'), body('role').isIn(['admin', 'manager', 'analyst', 'viewer']).withMessage('Invalid role'), validate, setUserRole);
router.patch('/users/:id/status', authenticate, authorize('admin'), setUserStatus);

export default router;
