import { Router } from 'express';
import { param } from 'express-validator';
import { listInsights, getInsight } from '../controllers/insightController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', listInsights);
router.get('/:id', param('id').isMongoId().withMessage('Invalid insight id'), validate, getInsight);

export default router;
