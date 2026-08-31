import { Router } from 'express';
import { listDemoPages } from '../controllers/demoController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/', listDemoPages);

export default router;
