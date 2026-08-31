import { TaskTemplate } from '../models/TaskTemplate.js';
import { Task } from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const createTemplate = asyncHandler(async (req, res) => {
  const { name, description, category, taskType, targetPattern, extractors, defaultSchedule, defaultAutoApprove, fieldDescriptions, tags } = req.body;

  if (!name || !targetPattern) {
    throw new ApiError(400, 'name and targetPattern are required');
  }

  const template = await TaskTemplate.create({
    name,
    description,
    category,
    taskType,
    targetPattern,
    extractors: extractors || {},
    defaultSchedule: defaultSchedule || '',
    defaultAutoApprove: defaultAutoApprove || false,
    fieldDescriptions: fieldDescriptions || {},
    createdBy: req.user.id,
    tags: tags || [],
    status: 'ACTIVE',
  });

  res.status(201).json({ success: true, data: template });
});

export const listTemplates = asyncHandler(async (req, res) => {
  const { category, status, search } = req.query;
  const filter = { status: status || 'ACTIVE' };

  if (category) filter.category = category;
  if (search) {
    filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
  }

  const templates = await TaskTemplate.find(filter)
    .populate('createdBy', 'username email')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: templates });
});

export const getTemplate = asyncHandler(async (req, res) => {
  const template = await TaskTemplate.findById(req.params.id).populate('createdBy', 'username email');

  if (!template) {
    throw new ApiError(404, 'Template not found');
  }

  res.json({ success: true, data: template });
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const { name, description, category, extractors, defaultSchedule, defaultAutoApprove, fieldDescriptions, tags, status } = req.body;

  const template = await TaskTemplate.findById(req.params.id);
  if (!template) {
    throw new ApiError(404, 'Template not found');
  }

  // Only creator or admin can update
  if (template.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this template');
  }

  if (name) template.name = name;
  if (description !== undefined) template.description = description;
  if (category) template.category = category;
  if (extractors) template.extractors = extractors;
  if (defaultSchedule !== undefined) template.defaultSchedule = defaultSchedule;
  if (defaultAutoApprove !== undefined) template.defaultAutoApprove = defaultAutoApprove;
  if (fieldDescriptions) template.fieldDescriptions = fieldDescriptions;
  if (tags) template.tags = tags;
  if (status) template.status = status;

  await template.save();

  res.json({ success: true, data: template });
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  const template = await TaskTemplate.findById(req.params.id);
  if (!template) {
    throw new ApiError(404, 'Template not found');
  }

  // Only creator or admin can delete
  if (template.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this template');
  }

  await TaskTemplate.deleteOne({ _id: req.params.id });

  res.json({ success: true, message: 'Template deleted successfully' });
});

export const createTaskFromTemplate = asyncHandler(async (req, res) => {
  // The template id ALWAYS comes from the URL path (req.params.id). A body
  // "templateId" is never trusted — honouring it would let a client silently
  // create a task from a different template than the one being "used".
  const { taskName, taskDescription, schedule, autoApprove } = req.body;

  const template = await TaskTemplate.findById(req.params.id);
  if (!template) {
    throw new ApiError(404, 'Template not found');
  }

  const wantsAutoApprove = autoApprove !== undefined ? autoApprove : template.defaultAutoApprove;
  // Analysts must go through the review-approve workflow — never auto-approve
  // via a template (Phase 19 — no silent approval bypass).
  if (wantsAutoApprove && !['admin', 'manager'].includes(req.user.role)) {
    throw new ApiError(403, 'Only managers and admins can enable auto-approval');
  }

  // Create a new task based on the template
  const task = await Task.create({
    name: taskName || template.name,
    description: taskDescription || template.description,
    type: template.taskType,
    target: template.targetPattern,
    extractors: template.extractors || {},
    schedule: schedule || template.defaultSchedule || '',
    autoApprove: wantsAutoApprove,
    owner: req.user.id,
    status: 'DRAFT',
  });

  // Update template usage stats
  template.usageCount += 1;
  template.lastUsedAt = new Date();
  await template.save();

  res.status(201).json({ success: true, data: task });
});

export const getTemplateStats = asyncHandler(async (req, res) => {
  const totalTemplates = await TaskTemplate.countDocuments({ status: 'ACTIVE' });
  const byCategory = await TaskTemplate.aggregate([
    { $match: { status: 'ACTIVE' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const topTemplates = await TaskTemplate.find({ status: 'ACTIVE' })
    .sort({ usageCount: -1 })
    .limit(5)
    .select('name category usageCount');

  res.json({
    success: true,
    data: {
      total: totalTemplates,
      byCategory: Object.fromEntries(byCategory.map((b) => [b._id, b.count])),
      topTemplates,
    },
  });
});

export default {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createTaskFromTemplate,
  getTemplateStats,
};
