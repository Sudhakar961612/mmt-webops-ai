import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { param, body } from 'express-validator';
import {
  createExtractionSchema,
  listExtractionSchemas,
  getExtractionSchema,
  updateExtractionSchema,
  deleteExtractionSchema,
  testExtractionSchema,
  getSchemaStats,
} from '../controllers/schemaController.js';

const router = Router();

router.use(authenticate);

// List extraction schemas
router.get('/', listExtractionSchemas);

// Get schema stats
router.get('/stats', getSchemaStats);

// Create new extraction schema
router.post(
  '/',
  authorize('admin', 'manager'),
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('Name must be 3-120 characters'),
  body('fields').isArray().notEmpty().withMessage('fields must be a non-empty array'),
  validate,
  createExtractionSchema
);

// Get schema details
router.get('/:id', param('id').isMongoId().withMessage('Invalid schema id'), validate, getExtractionSchema);

// Update schema
router.patch(
  '/:id',
  authorize('admin', 'manager'),
  param('id').isMongoId().withMessage('Invalid schema id'),
  body('name').optional().trim().isLength({ min: 3, max: 120 }),
  validate,
  updateExtractionSchema
);

// Delete schema
router.delete('/:id', param('id').isMongoId().withMessage('Invalid schema id'), validate, authorize('admin', 'manager'), deleteExtractionSchema);

// Test extraction schema
router.post('/:id/test', param('id').isMongoId().withMessage('Invalid schema id'), body('html').notEmpty().withMessage('html content is required'), validate, testExtractionSchema);

export default router;
