import { Router } from 'express';
import { body } from 'express-validator';
import { createFeedback, listFeedback } from '../controllers/feedbackController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  body('taskId').isMongoId().withMessage('Valid taskId required'),
  body('runId').isMongoId().withMessage('Valid runId required'),
  validate,
  createFeedback
);
router.get('/', listFeedback);

export default router;
