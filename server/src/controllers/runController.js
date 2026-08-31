import { ExecutionRun } from '../models/ExecutionRun.js';
import { Snapshot } from '../models/Snapshot.js';
import { Change } from '../models/Change.js';
import { Insight } from '../models/Insight.js';
import { Feedback } from '../models/Feedback.js';
import { Task } from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest, ApiError } from '../utils/ApiError.js';
import logAudit from '../services/auditService.js';

export const listRuns = asyncHandler(async (req, res) => {
  const { taskId } = req.query;
  const filter = taskId ? { task: taskId } : {};

  // Role-aware scoping: analysts/viewers only see runs on tasks they own.
  if (!['admin', 'manager'].includes(req.user.role)) {
    const ownedTaskIds = await Task.find({ owner: req.user.id }).distinct('_id');
    filter.task = { $in: ownedTaskIds };
  }

  const runs = await ExecutionRun.find(filter)
    .populate('task', 'name target type')
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit, 10) || 50);
  res.json({ success: true, data: { runs } });
});

export const getRun = asyncHandler(async (req, res) => {
  const run = await ExecutionRun.findById(req.params.id).populate('task', 'name target type owner');
  if (!run) throw notFound('Run not found');
  // Analysts/viewers may only read runs on tasks they own. Guardians keep this
  // from depending on the requestor — the run's task owner is the source of truth.
  if (!['admin', 'manager'].includes(req.user.role)) {
    const ownerId = run.task?.owner?._id || run.task?.owner;
    if (!ownerId || ownerId.toString() !== req.user.id) {
      throw new ApiError(403, 'You do not have access to this run');
    }
  }
  const [snapshot, changes, insight, feedback] = await Promise.all([
    Snapshot.findById(run.snapshot),
    Change.find({ run: run._id }),
    Insight.findById(run.insight),
    Feedback.find({ run: run._id }).populate('user', 'username'),
  ]);
  res.json({
    success: true,
    data: {
      run,
      snapshot: snapshot || null,
      changes,
      insight: insight || null,
      feedback,
    },
  });
});

/**
 * Admin/manager reject an AWAITING_APPROVAL run (Plan Review "Reject" action).
 * Sets the run to REJECTED so it is pulled out of the approval queue.
 */
export const rejectRun = asyncHandler(async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only managers and admins can reject runs' });
  }
  const run = await ExecutionRun.findById(req.params.id);
  if (!run) throw notFound('Run not found');
  if (run.status !== 'AWAITING_APPROVAL' && run.status !== 'PLANNED') {
    throw badRequest('Only a pending (awaiting approval) run can be rejected');
  }
  run.status = 'REJECTED';
  await run.save();
  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'run.rejected',
    entityType: 'ExecutionRun',
    entityId: run._id,
    details: { task: run.task?.toString() },
    ip: req.ip || '',
  });
  res.json({ success: true, data: { run } });
});

export default { listRuns, getRun, rejectRun };
