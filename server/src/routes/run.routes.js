import { Router } from 'express';
import { body, param } from 'express-validator';
import { listRuns, getRun, rejectRun } from '../controllers/runController.js';
import { startRun } from '../controllers/opsController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// POST /api/runs { taskId } — spec §7.3 alias: start a browser workflow run.
router.post('/', body('taskId').isMongoId().withMessage('Valid taskId required'), validate, startRun);
router.get('/', listRuns);
router.get('/:id', param('id').isMongoId().withMessage('Invalid run id'), validate, getRun);
router.post('/:id/reject', param('id').isMongoId().withMessage('Invalid run id'), validate, authorize('admin', 'manager'), rejectRun);

export default router;
