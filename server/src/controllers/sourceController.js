import { Source } from '../models/Source.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { evaluateSourceDomains } from '../services/sourceValidationService.js';
import logger from '../utils/logger.js';

export const createSource = asyncHandler(async (req, res) => {
  const { name, description, domains, category, status, requiresAuth, allowScreenshots, compliance, accessControl } = req.body;

  if (!name || !domains || !domains.length) {
    throw new ApiError(400, 'name and domains are required');
  }

  const source = await Source.create({
    name,
    description,
    domains,
    category: category || 'public',
    status: status || 'PENDING_REVIEW',
    requiresAuth: requiresAuth || false,
    allowScreenshots: allowScreenshots !== false,
    compliance: compliance || { retentionDays: 90, dataClassification: 'public' },
    accessControl: accessControl || {},
    managedBy: req.user.id,
  });

  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'source.create',
    entityType: 'Source',
    entityId: source._id,
    details: { name, category, domains: domains.join(', ') },
    ip: req.ip,
  });

  res.status(201).json({ success: true, data: source });
});

export const listSources = asyncHandler(async (req, res) => {
  const { category, status, search } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
  }

  const sources = await Source.find(filter)
    .populate('managedBy', 'username email')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: sources });
});

export const getSource = asyncHandler(async (req, res) => {
  const source = await Source.findById(req.params.id).populate('managedBy', 'username email').populate('accessControl.allowedUsers', 'username email');

  if (!source) {
    throw new ApiError(404, 'Source not found');
  }

  res.json({ success: true, data: source });
});

export const updateSource = asyncHandler(async (req, res) => {
  const { name, description, domains, category, status, requiresAuth, allowScreenshots, compliance, accessControl, rateLimit } = req.body;

  const source = await Source.findById(req.params.id);
  if (!source) {
    throw new ApiError(404, 'Source not found');
  }

  // Only manager or admin can update
  if (source.managedBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this source');
  }

  if (name) source.name = name;
  if (description !== undefined) source.description = description;
  if (domains) source.domains = domains;
  if (category) source.category = category;
  if (status) source.status = status;
  if (requiresAuth !== undefined) source.requiresAuth = requiresAuth;
  if (allowScreenshots !== undefined) source.allowScreenshots = allowScreenshots;
  if (compliance) source.compliance = { ...source.compliance, ...compliance };
  if (accessControl) source.accessControl = accessControl;
  if (rateLimit) source.rateLimit = rateLimit;

  await source.save();

  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'source.update',
    entityType: 'Source',
    entityId: source._id,
    details: { name, status },
    ip: req.ip,
  });

  res.json({ success: true, data: source });
});

export const deleteSource = asyncHandler(async (req, res) => {
  const source = await Source.findById(req.params.id);
  if (!source) {
    throw new ApiError(404, 'Source not found');
  }

  if (source.managedBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this source');
  }

  await Source.deleteOne({ _id: req.params.id });

  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'source.delete',
    entityType: 'Source',
    entityId: source._id,
    details: { name: source.name },
    ip: req.ip,
  });

  res.json({ success: true, message: 'Source deleted successfully' });
});

export const validateSource = asyncHandler(async (req, res) => {
  const source = await Source.findById(req.params.id);
  if (!source) {
    throw new ApiError(404, 'Source not found');
  }

  // 'safe' (default) performs structural + SSRF checks without any outbound
  // request. 'full' additionally runs a bounded HTTP probe for external URLs.
  const validationMode = req.query.mode === 'full' ? 'full' : 'safe';
  const results = await evaluateSourceDomains(source.domains || [], validationMode);
  const isActive = results.length > 0 && results.every((r) => r.ok);

  source.validationStatus = {
    isActive,
    lastError: isActive
      ? ''
      : results
          .filter((r) => !r.ok)
          .map((r) => `${r.domain || '(empty)'}: ${r.reason}`)
          .join('; '),
    checksPerformed: (source.validationStatus?.checksPerformed || 0) + 1,
    lastCheckedAt: new Date(),
  };
  source.lastValidatedAt = new Date();
  await source.save();

  logger.info(
    { source: source._id, name: source.name, mode: validationMode, isActive },
    'Source validated'
  );

  res.status(isActive ? 200 : 422).json({
    success: isActive,
    data: {
      validationStatus: source.validationStatus,
      lastValidatedAt: source.lastValidatedAt,
      mode: validationMode,
      results,
    },
  });
});

export const getSourceStats = asyncHandler(async (req, res) => {
  const total = await Source.countDocuments();
  const byStatus = await Source.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const byCategory = await Source.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);

  const topSources = await Source.find()
    .sort({ usageCount: -1 })
    .limit(10)
    .select('name category usageCount failureCount');

  res.json({
    success: true,
    data: {
      total,
      byStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.count])),
      byCategory: Object.fromEntries(byCategory.map((b) => [b._id, b.count])),
      topSources,
    },
  });
});

async function logAudit(data) {
  try {
    const { logAudit: auditLogger } = await import('./auditService.js');
    await auditLogger(data);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to log audit');
  }
}

export default {
  createSource,
  listSources,
  getSource,
  updateSource,
  deleteSource,
  validateSource,
  getSourceStats,
};
