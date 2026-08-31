import { Insight } from '../models/Insight.js';
import { Task } from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/ApiError.js';

export const listInsights = asyncHandler(async (req, res) => {
  const { taskId } = req.query;
  const filter = taskId ? { task: taskId } : {};

  // Role-aware scoping: analysts/viewers see insights only for tasks they own.
  if (!['admin', 'manager'].includes(req.user.role)) {
    const ownedTaskIds = await Task.find({ owner: req.user.id }).distinct('_id');
    filter.task = { $in: ownedTaskIds };
  }

  const insights = await Insight.find(filter)
    .populate('task', 'name target type')
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit, 10) || 100);
  res.json({ success: true, data: { insights } });
});

export const getInsight = asyncHandler(async (req, res) => {
  const insight = await Insight.findById(req.params.id).populate('task', 'name target type');
  if (!insight) throw notFound('Insight not found');
  res.json({ success: true, data: { insight } });
});

export default { listInsights, getInsight };
