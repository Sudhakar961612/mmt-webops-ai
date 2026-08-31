import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/', authorize('admin', 'manager', 'analyst'), listAuditLogs);

export default router;
