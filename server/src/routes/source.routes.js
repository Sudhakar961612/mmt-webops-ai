import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { param, body } from 'express-validator';
import { createSource, listSources, getSource, updateSource, deleteSource, validateSource, getSourceStats } from '../controllers/sourceController.js';

const router = Router();

router.use(authenticate);

// List sources
router.get('/', listSources);

// Get source stats
router.get('/stats', getSourceStats);

// Create new source
router.post(
  '/',
  authorize('admin', 'manager'),
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('Name must be 3-120 characters'),
  body('domains').isArray().notEmpty().withMessage('domains must be an array'),
  validate,
  createSource
);

// Get source details
router.get('/:id', param('id').isMongoId().withMessage('Invalid source id'), validate, getSource);

// Update source
router.patch(
  '/:id',
  authorize('admin', 'manager'),
  param('id').isMongoId().withMessage('Invalid source id'),
  validate,
  updateSource
);

// Delete source
router.delete('/:id', authorize('admin', 'manager'), param('id').isMongoId().withMessage('Invalid source id'), validate, deleteSource);

// Validate source (test connectivity/availability) — admin/manager only
router.post('/:id/validate', authorize('admin', 'manager'), param('id').isMongoId().withMessage('Invalid source id'), validate, validateSource);

export default router;
