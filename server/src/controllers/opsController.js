import { Task } from '../models/Task.js';
import { ExecutionRun } from '../models/ExecutionRun.js';
import { Snapshot } from '../models/Snapshot.js';
import { ExtractionSchema } from '../models/ExtractionSchema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError, notFound, badRequest } from '../utils/ApiError.js';
import { planTask, executeRun } from '../services/runEngine.js';
import { extractFromHtml, applySchemaToRecord } from '../services/extractionService.js';
import { diffSnapshots } from '../services/comparisonService.js';
import { generateInsight } from '../services/agent/reasonerService.js';
import { notifierService } from '../services/notifierService.js';
import logAudit from '../services/auditService.js';

/**
 * Spec §7.3 aliases — thin wrappers over the same services used by
 * /api/tasks/:id/plan|run so evaluation scripts can call the documented names.
 */

// POST /api/plans { taskId } -> generate plan + register run
export const createPlan = asyncHandler(async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) throw badRequest('taskId is required');
  const task = await Task.findById(taskId);
  if (!task) throw notFound('Task not found');
  if (!['admin', 'manager'].includes(req.user.role) && task.owner.toString() !== req.user.id) {
    throw new ApiError(403, 'You do not have access to this task');
  }
  const { run, review } = await planTask(task, req.user, { trigger: 'api' });
  res.status(201).json({ success: true, data: { run, review, plan: run.plan } });
});

// POST /api/extract { html, schemaId?, fields?, record? }
export const extractContent = asyncHandler(async (req, res) => {
  const { html, schemaId, fields, record } = req.body;
  let fieldDefs = fields;
  if (schemaId) {
    const schema = await ExtractionSchema.findById(schemaId);
    if (!schema) throw notFound('Extraction schema not found');
    fieldDefs = schema.fields;
  }
  if (!fieldDefs && !html) throw badRequest('Provide html+fields/schemaId or a record object to normalize');
  if (record && fieldDefs) {
    const result = applySchemaToRecord(record, fieldDefs);
    return res.json({ success: true, data: result });
  }
  if (!html) throw badRequest('html is required for DOM extraction');
  const schemaLike = schemaId
    ? await ExtractionSchema.findById(schemaId)
    : { fields: fieldDefs || [], repeatingSelector: req.body.repeatingSelector || '' };
  const result = await extractFromHtml(html, schemaLike);
  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'extract.tested',
    entityType: 'ExtractionSchema',
    entityId: schemaId || null,
    details: { confidence: result.confidence, warnings: result.warnings?.length || 0 },
    ip: req.ip,
  });
  res.json({ success: true, data: result });
});

// POST /api/compare { previous, current } -> field diffs
export const compareSnapshots = asyncHandler(async (req, res) => {
  const { previous, current, previousSnapshotId, currentSnapshotId } = req.body;
  let prev = previous;
  let curr = current;
  if (previousSnapshotId) {
    const s = await Snapshot.findById(previousSnapshotId);
    if (!s) throw notFound('Previous snapshot not found');
    prev = s.extractedData;
  }
  if (currentSnapshotId) {
    const s = await Snapshot.findById(currentSnapshotId);
    if (!s) throw notFound('Current snapshot not found');
    curr = s.extractedData;
  }
  if (prev === undefined || curr === undefined) throw badRequest('Provide previous+current objects or snapshot ids');
  const changes = diffSnapshots(prev || {}, curr || {});
  res.json({ success: true, data: { changes, count: changes.length } });
});

// POST /api/complete { runId, webhook?, exportFormat? } -> insight + notify + export payload
export const completeRun = asyncHandler(async (req, res) => {
  const { runId, regenerateInsight } = req.body;
  if (!runId) throw badRequest('runId is required');
  const run = await ExecutionRun.findById(runId);
  if (!run) throw notFound('Run not found');
  const task = await Task.findById(run.task);
  if (!task) throw notFound('Task not found for run');
  const { Change } = await import('../models/Change.js');
  const { Insight } = await import('../models/Insight.js');
  const changes = await Change.find({ run: run._id });
  let insight = run.insight ? await Insight.findById(run.insight) : null;
  if (!insight || regenerateInsight) {
    const snapshot = run.snapshot ? await Snapshot.findById(run.snapshot) : null;
    const insightData = await generateInsight(task, changes, snapshot?.extractedData || {});
    insight = await Insight.create({
      task: task._id,
      run: run._id,
      title: insightData.title,
      summary: insightData.summary,
      reasoning: insightData.reasoning,
      insights: insightData.insights,
      changeCount: insightData.changeCount,
      hasChanges: insightData.hasChanges,
      confidence: insightData.confidence,
      source: insightData.source,
    });
    run.insight = insight._id;
    run.summary = insight.summary;
    await run.save();
  }
  await notifierService(task, run, insight, changes);
  await logAudit({
    actor: req.user.username,
    user: req.user,
    action: 'run.completed',
    entityType: 'ExecutionRun',
    entityId: run._id,
    details: { via: 'api/complete', changes: changes.length, insight: insight._id?.toString() },
    ip: req.ip,
  });
  res.json({ success: true, data: { run, insight, changes, exportedAt: new Date().toISOString() } });
});

// POST /api/runs { taskId } -> plan + execute immediately (managers/admins)
export const startRun = asyncHandler(async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    throw new ApiError(403, 'Only managers and admins can start runs directly');
  }
  const { taskId } = req.body;
  if (!taskId) throw badRequest('taskId is required');
  const task = await Task.findById(taskId);
  if (!task) throw notFound('Task not found');
  const { run } = await planTask(task, req.user, { trigger: 'api' });
  const executed = await executeRun(run, req.user);
  res.status(201).json({ success: true, data: { run: executed } });
});

export default { createPlan, extractContent, compareSnapshots, completeRun, startRun };
