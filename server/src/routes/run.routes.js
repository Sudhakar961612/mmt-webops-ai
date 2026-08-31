import { Router } from 'express';
import { param } from 'express-validator';
import { listRuns, getRun, rejectRun } from '../controllers/runController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', listRuns);
router.get('/:id', param('id').isMongoId().withMessage('Invalid run id'), validate, getRun);
router.post('/:id/reject', param('id').isMongoId().withMessage('Invalid run id'), validate, authorize('admin', 'manager'), rejectRun);

export default router;
