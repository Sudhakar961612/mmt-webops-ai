import { Router } from 'express';
import { systemHealth, systemStatus } from '../controllers/systemController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/status', systemStatus);
router.get('/health', authorize('admin'), systemHealth);

export default router;