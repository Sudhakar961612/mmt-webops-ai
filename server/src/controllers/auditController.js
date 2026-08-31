import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { entityType, entityId, action } = req.query;
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (action) filter.action = action;
  const logs = await AuditLog.find(filter)
    .populate('user', 'username role')
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit, 10) || 200);
  res.json({ success: true, data: { logs } });
});

export default { listAuditLogs };
