import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { param, body } from 'express-validator';
import { createTemplate, listTemplates, getTemplate, updateTemplate, deleteTemplate, createTaskFromTemplate, getTemplateStats } from '../controllers/templateController.js';

const router = Router();

router.use(authenticate);

// List templates
router.get('/', listTemplates);

// Get template stats
router.get('/stats', getTemplateStats);

// Create new template
router.post(
  '/',
  authorize('admin', 'manager'),
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('Name must be 3-120 characters'),
  body('targetPattern').notEmpty().withMessage('targetPattern is required'),
  validate,
  createTemplate
);

// Get template details
router.get('/:id', param('id').isMongoId().withMessage('Invalid template id'), validate, getTemplate);

// Update template
router.patch(
  '/:id',
  authorize('admin', 'manager'),
  param('id').isMongoId().withMessage('Invalid template id'),
  body('name').optional().trim().isLength({ min: 3, max: 120 }),
  validate,
  updateTemplate
);

// Delete template
router.delete('/:id', param('id').isMongoId().withMessage('Invalid template id'), validate, authorize('admin', 'manager'), deleteTemplate);

// Create task from template
router.post('/:id/use', param('id').isMongoId().withMessage('Invalid template id'), body('taskName').optional().trim(), validate, createTaskFromTemplate);

export default router;
