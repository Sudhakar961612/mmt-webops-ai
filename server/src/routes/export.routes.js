import { Router } from 'express';
import { param, query } from 'express-validator';
import { ExecutionRun } from '../models/ExecutionRun.js';
import { Snapshot } from '../models/Snapshot.js';
import { Change } from '../models/Change.js';
import { Insight } from '../models/Insight.js';
import { Task } from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/ApiError.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import logAudit from '../services/auditService.js';

const router = Router();
router.use(authenticate);

function toCsv(rows) {
  if (!rows.length) return 'field,type,previousValue,currentValue,severity,summary\n';
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['field,type,previousValue,currentValue,severity,summary'];
  for (const r of rows) {
    lines.push(
      [esc(r.field), esc(r.type), esc(JSON.stringify(r.previousValue)), esc(JSON.stringify(r.currentValue)), esc(r.severity), esc(r.summary)].join(',')
    );
  }
  return lines.join('\n');
}

// GET /api/exports/runs/:id?format=json|csv — completed findings handoff.
router.get(
  '/runs/:id',
  param('id').isMongoId().withMessage('Invalid run id'),
  query('format').optional().isIn(['json', 'csv']).withMessage('format must be json or csv'),
  validate,
  asyncHandler(async (req, res) => {
    const run = await ExecutionRun.findById(req.params.id).populate('task', 'name target type owner');
    if (!run) throw notFound('Run not found');
    if (!['admin', 'manager'].includes(req.user.role)) {
      const ownerId = run.task?.owner?._id || run.task?.owner;
      if (!ownerId || ownerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You do not have access to this run' });
      }
    }
    const [snapshot, changes, insight] = await Promise.all([
      Snapshot.findById(run.snapshot),
      Change.find({ run: run._id }).lean(),
      Insight.findById(run.insight).lean(),
    ]);
    const format = req.query.format || 'json';
    await logAudit({
      actor: req.user.username,
      user: req.user,
      action: 'run.exported',
      entityType: 'ExecutionRun',
      entityId: run._id,
      details: { format, changes: changes.length },
      ip: req.ip,
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="run-${run._id}.csv"`);
      return res.send(toCsv(changes));
    }
    res.json({ success: true, data: { run, task: run.task, snapshot, changes, insight, exportedAt: new Date().toISOString() } });
  })
);

// GET /api/exports/tasks/:id/insights?format=json|csv
router.get(
  '/tasks/:id/insights',
  param('id').isMongoId().withMessage('Invalid task id'),
  validate,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) throw notFound('Task not found');
    const insights = await Insight.find({ task: task._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: { task: task.name, count: insights.length, insights } });
  })
);

export default router;
