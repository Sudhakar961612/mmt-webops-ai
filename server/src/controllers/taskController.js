import { Task } from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError, notFound, badRequest } from '../utils/ApiError.js';
import { planTask, approveAndExecute, executeRun } from '../services/runEngine.js';
import { isValidCron } from '../services/schedulerService.js';
import logAudit from '../services/auditService.js';

export const createTask = asyncHandler(async (req, res) => {
  const { name, description, type, target, extractors, schedule, autoApprove } = req.body;

  if (schedule && !isValidCron(schedule)) {
    throw badRequest(`Invalid cron expression: ${schedule}`);
  }
  if (!target || typeof target !== 'string' || (!target.startsWith('demo:') && !/^https?:\/\//i.test(target))) {
    throw badRequest('target must be "demo:<key>" or an absolute http(s) URL');
  }
  // Only admins/managers may create tasks that auto-approve plans. Analysts must
  // go through the review-approve workflow (Phase 19 — no silent approval bypass).
  if (autoApprove && !['admin', 'manager'].includes(req.user.role)) {
    throw new ApiError(403, 'Only managers and admins can enable auto-approval');
  }

  const task = await Task.create({
    name,
    description: description || '',
    type: type || 'generic',
    target,
    extractors: extractors || {},
    schedule: schedule || '',
    autoApprove: Boolean(autoApprove),
    owner: req.user.id,
    status: 'DRAFT',
  });

  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'task.created',
    entityType: 'Task',
    entityId: task._id,
    details: { name: task.name, target: task.target, type: task.type },
    ip: req.ip,
  });

  res.status(201).json({ success: true, data: { task } });
});

export const listTasks = asyncHandler(async (req, res) => {
  const filter = {};
  // Non-admins only see their own tasks.
  if (!['admin', 'manager'].includes(req.user.role)) filter.owner = req.user.id;
  const tasks = await Task.find(filter).populate('owner', 'username email role').sort({ createdAt: -1 });
  res.json({ success: true, data: { tasks } });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('owner', 'username email role');
  if (!task) throw notFound('Task not found');
  if (!['admin', 'manager'].includes(req.user.role) && task.owner._id.toString() !== req.user.id) {
    throw new ApiError(403, 'You do not have access to this task');
  }
  res.json({ success: true, data: { task } });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw notFound('Task not found');
  if (!['admin', 'manager'].includes(req.user.role) && task.owner.toString() !== req.user.id) {
    throw new ApiError(403, 'You do not have access to this task');
  }
  const { name, description, type, target, extractors, schedule, autoApprove } = req.body;
  if (schedule !== undefined && schedule !== '' && !isValidCron(schedule)) {
    throw badRequest(`Invalid cron expression: ${schedule}`);
  }
  // Prevent analysts from turning on auto-approval after the fact.
  if (autoApprove && !['admin', 'manager'].includes(req.user.role)) {
    throw new ApiError(403, 'Only managers and admins can enable auto-approval');
  }
  if (name !== undefined) task.name = name;
  if (description !== undefined) task.description = description;
  if (type !== undefined) task.type = type;
  if (target !== undefined) task.target = target;
  if (extractors !== undefined) task.extractors = extractors;
  if (schedule !== undefined) task.schedule = schedule;
  if (autoApprove !== undefined) task.autoApprove = Boolean(autoApprove);
  await task.save();

  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'task.updated',
    entityType: 'Task',
    entityId: task._id,
    details: { fields: Object.keys(req.body) },
    ip: req.ip,
  });
  res.json({ success: true, data: { task } });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw notFound('Task not found');
  if (!['admin', 'manager'].includes(req.user.role) && task.owner.toString() !== req.user.id) {
    throw new ApiError(403, 'You do not have access to this task');
  }
  await task.deleteOne();
  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'task.deleted',
    entityType: 'Task',
    entityId: req.params.id,
    details: { name: task.name },
    ip: req.ip,
  });
  res.json({ success: true, data: { deleted: true } });
});

/**
 * Plan a task (generate plan + register a run). If autoApprove, executes immediately.
 */
export const planTaskHandler = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw notFound('Task not found');
  if (!['admin', 'manager'].includes(req.user.role) && task.owner.toString() !== req.user.id) {
    throw new ApiError(403, 'You do not have access to this task');
  }
  const { run, review } = await planTask(task, req.user, { trigger: 'manual' });
  let executed = run;
  // Auto-approval only takes effect for privileged roles; analysts always land
  // in an AWAITING_APPROVAL state for a human to review (Phase 19).
  if (task.autoApprove && ['admin', 'manager'].includes(req.user.role)) {
    executed = await executeRun(run, req.user);
  }
  res.json({ success: true, data: { run: executed, review } });
});

/** Run a task end-to-end immediately (independent of plan approval).
 *  Restricted to admins/managers — an analyst must plan → wait approval → run. */
export const runTaskHandler = asyncHandler(async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    throw new ApiError(403, 'Only managers and admins can run a task immediately');
  }
  const task = await Task.findById(req.params.id);
  if (!task) throw notFound('Task not found');
  if (!['admin', 'manager'].includes(req.user.role) && task.owner.toString() !== req.user.id) {
    throw new ApiError(403, 'You do not have access to this task');
  }
  const { run } = await planTask(task, req.user, { trigger: 'manual' });
  const executed = await executeRun(run, req.user);
  res.json({ success: true, data: { run: executed } });
});

/** Approve an awaiting run and execute it. */
export const approveRunHandler = asyncHandler(async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    throw new ApiError(403, 'Only managers and admins can approve runs');
  }
  const { runId } = req.params;
  const run = await approveAndExecute(runId, req.user);
  res.json({ success: true, data: { run } });
});

/** Pause/resume a task (stops scheduled execution but keeps runs). */
export const pauseTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw notFound('Task not found');
  // Ownership + privilege check: admins/managers any task; others only their own.
  if (!['admin', 'manager'].includes(req.user.role) && task.owner.toString() !== req.user.id) {
    throw new ApiError(403, 'You do not have access to this task');
  }
  const paused = req.body.paused;
  task.status = paused ? 'PAUSED' : 'DRAFT';
  await task.save();
  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: paused ? 'task.paused' : 'task.resumed',
    entityType: 'Task',
    entityId: task._id,
    ip: req.ip,
  });
  res.json({ success: true, data: { task } });
});

export default {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  planTaskHandler,
  runTaskHandler,
  approveRunHandler,
  pauseTask,
};
