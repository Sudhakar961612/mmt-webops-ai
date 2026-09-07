import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { createPlan, extractContent, compareSnapshots, completeRun } from '../controllers/opsController.js';

const router = Router();
router.use(authenticate);

// POST /api/plans { taskId }
router.post('/plans', body('taskId').isMongoId().withMessage('Valid taskId required'), validate, createPlan);
// POST /api/extract { html, schemaId|fields } or { record, fields }
router.post('/extract', extractContent);
// POST /api/compare { previous, current } or snapshot ids
router.post('/compare', compareSnapshots);
// POST /api/complete { runId }
router.post('/complete', body('runId').isMongoId().withMessage('Valid runId required'), validate, completeRun);

export default router;
