import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  planTaskHandler,
  runTaskHandler,
  approveRunHandler,
  pauseTask,
} from '../controllers/taskController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('Name must be 3-120 characters'),
  body('type').optional().isIn(['flight_monitor', 'hotel_monitor', 'price_monitor', 'generic']).withMessage('Invalid task type'),
  body('target').trim().notEmpty().withMessage('target is required'),
  validate,
  createTask
);

router.get('/', listTasks);
router.get('/:id', param('id').isMongoId().withMessage('Invalid task id'), validate, getTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

router.post('/:id/plan', param('id').isMongoId(), validate, planTaskHandler);
router.post('/:id/run', param('id').isMongoId(), validate, runTaskHandler);
router.patch('/:id/pause', pauseTask);

// Approve & execute a run of a task.
router.post('/run/:runId/approve', param('runId').isMongoId(), validate, authorize('admin', 'manager'), approveRunHandler);

export default router;
