import { Feedback } from '../models/Feedback.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/ApiError.js';
import logAudit from '../services/auditService.js';

export const createFeedback = asyncHandler(async (req, res) => {
  const { taskId, runId, insightId, rating, comment } = req.body;
  if (!taskId || !runId) throw badRequest('taskId and runId are required');
  if (rating !== undefined && (rating < 1 || rating > 5)) throw badRequest('rating must be between 1 and 5');

  const feedback = await Feedback.create({
    task: taskId,
    run: runId,
    insight: insightId || null,
    user: req.user.id,
    rating: rating || null,
    comment: comment || '',
  });

  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'feedback.created',
    entityType: 'Feedback',
    entityId: feedback._id,
    details: { run: runId, rating, hasComment: Boolean(comment) },
    ip: req.ip,
  });
  res.status(201).json({ success: true, data: { feedback } });
});

export const listFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({}).populate('user', 'username').sort({ createdAt: -1 });
  res.json({ success: true, data: { feedback } });
});

export default { createFeedback, listFeedback };
