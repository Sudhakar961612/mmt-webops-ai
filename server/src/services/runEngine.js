import { Task } from '../models/Task.js';
import { ExecutionRun } from '../models/ExecutionRun.js';
import { Snapshot } from '../models/Snapshot.js';
import { Change } from '../models/Change.js';
import { Insight } from '../models/Insight.js';
import { generatePlan } from './agent/plannerService.js';
import { reviewPlan } from './agent/reviewerService.js';
import { generateInsight } from './agent/reasonerService.js';
import { withBrowser, gotoPage, takeScreenshot, dismissOverlays } from './browser/playwrightService.js';
import { resolveTarget, assertNavigableTarget, assertSafeExternalUrl } from './browser/resolveTarget.js';
import { readEmbeddedJson, extractBySelectors, extractWithSchema, normalizeFieldValue, contentHash } from './extractionService.js';
import { diffSnapshots } from './comparisonService.js';
import logAudit from './auditService.js';
import { notifierService } from './notifierService.js';
import { ApiError, notFound } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

/** Cap screenshot bytes stored in MongoDB; larger ones are dropped with a flag. */
export function toStorableScreenshot(buf) {
  if (!buf) return { screenshot: '', truncated: false, bytes: 0 };
  const bytes = buf.length;
  if (bytes > env.SCREENSHOT_MAX_BYTES) {
    return { screenshot: '', truncated: true, bytes };
  }
  return { screenshot: `data:image/jpeg;base64,${buf.toString('base64')}`, truncated: false, bytes };
}

/**
 * Steps 1-3: create a plan for a task and register a run.
 * Returns a run whose status is AWAITING_APPROVAL (unless the task auto-approves).
 */
export async function planTask(taskOrId, user = null, { trigger = 'manual' } = {}) {
  const task = typeof taskOrId === 'string' ? await Task.findById(taskOrId) : taskOrId;
  if (!task) throw new Error('Task not found');

  const { plan, source, resolution } = await generatePlan(task);
  task.plan = plan;
  task.lastStatus = task.status;
  task.status = task.autoApprove ? 'APPROVED' : 'AWAITING_APPROVAL';

  const run = await ExecutionRun.create({
    task: task._id,
    status: task.autoApprove ? 'APPROVED' : 'AWAITING_APPROVAL',
    plan,
    trigger,
    createdBy: user?.id,
  });

  task.lastRunRef = run._id;
  await task.save();

  // Review the generated plan (best-effort recommendation for the human approver).
  const review = await reviewPlan(task);

  await logAudit({
    actor: user?.username || 'system',
    user,
    action: 'task.plan',
    entityType: 'Task',
    entityId: task._id,
    details: { planSource: source, steps: plan.length, runId: run._id, reviewScore: review.score },
    ip: user?.ip,
  });

  return { run, review };
}

/**
 * Approve an awaiting run and kick off execution.
 */
export async function approveAndExecute(runId, user = null) {
  const run = await ExecutionRun.findById(runId);
  if (!run) throw notFound('Run not found');
  // Approval is only valid from AWAITING_APPROVAL. Already-approved runs and
  // terminal/in-flight runs (SUCCEEDED, FAILED, REJECTED, APPROVED, RUNNING,
  // PLANNED, EXTRACTING, COMPARING, REASONING) must not be re-approved -> 409.
  if (run.status !== 'AWAITING_APPROVAL') {
    throw new ApiError(409, `Run cannot be approved from status ${run.status}`);
  }
  run.status = 'APPROVED';
  await run.save();
  await logAudit({
    actor: user?.username || 'system',
    user,
    action: 'run.approve',
    entityType: 'ExecutionRun',
    entityId: run._id,
    details: { task: run.task?.toString() },
    ip: user?.ip,
  });
  return executeRun(run, user);
}

/**
 * Steps 4-10: full orchestration — navigate, extract, snapshot, compare,
 * reason, and store the insight. Wraps every stage with status updates + audit.
 */
export async function executeRun(runOrId, user = null) {
  let run = typeof runOrId === 'string' ? await ExecutionRun.findById(runOrId) : runOrId;
  if (!run) throw notFound('Run not found');
  if (run.status === 'RUNNING') throw new ApiError(409, 'Run is already running');

  const task = await Task.findById(run.task);
  if (!task) throw new Error('Task not found');

  run.status = 'RUNNING';
  run.startedAt = new Date();
  run.error = '';
  await run.save();
  task.status = 'RUNNING';
  await task.save();

  try {
    const resolution = await resolveTarget(task.target, task.extractors?.fields || []);
    // Never let the stored plan silently change the task's trusted target.
    const navigateStep = Array.isArray(run.plan) ? run.plan.find((s) => s && s.action === 'navigate') : null;
    assertNavigableTarget(run.plan, resolution);
    const url = navigateStep?.url || resolution.url;
    // Defense-in-depth SSRF guard for any external (non-demo) navigation target.
    if (!(typeof resolution.source === 'string' && resolution.source.startsWith('demo:'))) {
      assertSafeExternalUrl(url);
    }

    // --- Browser execution (navigate, wait, extract, screenshot) ---
    // Schema (if task.extractionSchema set) takes precedence over legacy
    // selector maps; embedded JSON remains the demo-page default.
    let extractionSchemaDoc = null;
    if (task.extractionSchema) {
      try {
        const { ExtractionSchema } = await import('../models/ExtractionSchema.js');
        extractionSchemaDoc = await ExtractionSchema.findById(task.extractionSchema);
      } catch {
        extractionSchemaDoc = null;
      }
    }
    const extracted = await withBrowser(async (page) => {
      await gotoPage(page, url);
      // Let the demo page's JS populate the embedded JSON.
      await page.waitForTimeout(1500);
      await dismissOverlays(page).catch(() => {});
      const screenshotBuf = await takeScreenshot(page);
      const title = await page.title().catch(() => '');
      let data;
      let fieldMeta = {};
      let extractionConfidence = null;
      let extractionWarnings = [];
      let extractionMode = 'embedded-json';
      if (extractionSchemaDoc && extractionSchemaDoc.fields?.length) {
        const result = await extractWithSchema(page, extractionSchemaDoc);
        data = result.data;
        fieldMeta = result.fieldMeta;
        extractionConfidence = result.confidence;
        extractionWarnings = result.warnings;
        extractionMode = `schema:${extractionSchemaDoc.name}`;
        // Fall back to embedded JSON for empty schema results (demo pages).
        if (!data || Object.values(data).every((v) => v === null || v === '')) {
          data = await readEmbeddedJson(page, '__DATA__');
          extractionMode = 'embedded-json(fallback)';
        }
      } else if (task.extractors && Object.keys(task.extractors).length) {
        // Legacy map may be { field: selector } or { fields: {...} }.
        const selectorMap = task.extractors.fields || task.extractors;
        data = await extractBySelectors(page, selectorMap);
        extractionMode = 'selectors';
      } else {
        data = await readEmbeddedJson(page, '__DATA__');
      }
      // Normalize currency/date-ish top-level fields best-effort.
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        for (const [k, v] of Object.entries(data)) {
          if (/price|fare|rate|amount|cost/i.test(k) && typeof v === 'string') {
            const n = normalizeFieldValue(v, { type: 'number' });
            if (typeof n === 'number') data[k] = n;
          }
        }
      }
      const storable = toStorableScreenshot(screenshotBuf);
      return {
        data,
        title,
        screenshot: storable.screenshot,
        screenshotTruncated: storable.truncated,
        screenshotBytes: storable.bytes,
        fieldMeta,
        extractionConfidence,
        extractionWarnings,
        extractionMode,
      };
    });

    run.status = 'EXTRACTING';
    await run.save();

    // --- Snapshot storage ---
    const snapshot = await Snapshot.create({
      task: task._id,
      run: run._id,
      url,
      title: extracted.title,
      extractedData: extracted.data,
      screenshot: extracted.screenshot,
      contentHash: contentHash(extracted.data),
      meta: {
        demoMode: typeof resolution.source === 'string' && resolution.source.startsWith('demo:'),
        currency: extracted.data?.currency,
        extractionMode: extracted.extractionMode,
        extractionConfidence: extracted.extractionConfidence,
        fieldMeta: extracted.fieldMeta || {},
        extractionWarnings: (extracted.extractionWarnings || []).slice(0, 20),
        screenshotTruncated: Boolean(extracted.screenshotTruncated),
        screenshotBytes: extracted.screenshotBytes || 0,
      },
    });
    // Track schema usage for operations quality metrics.
    if (extractionSchemaDoc) {
      extractionSchemaDoc.usageCount = (extractionSchemaDoc.usageCount || 0) + 1;
      await extractionSchemaDoc.save().catch(() => {});
    }
    run.snapshot = snapshot._id;
    await run.save();

    // --- Previous snapshot comparison & change detection ---
    run.status = 'COMPARING';
    await run.save();
    const previous = await Snapshot.findOne({ task: task._id, _id: { $ne: snapshot._id } }).sort({ createdAt: -1 });
    const changeDrafts = previous ? diffSnapshots(previous.extractedData, extracted.data) : [];
    const changes = [];
    for (const c of changeDrafts) {
      const doc = await Change.create({
        task: task._id,
        run: run._id,
        previousSnapshot: previous?._id,
        currentSnapshot: snapshot._id,
        type: c.type,
        field: c.field,
        path: c.path,
        previousValue: c.previousValue,
        currentValue: c.currentValue,
        severity: c.severity,
        summary: c.summary,
      });
      changes.push(doc);
    }
    run.changes = changes.map((c) => c._id);
    await run.save();

    // --- AI reasoning / business insight ---
    run.status = 'REASONING';
    await run.save();
    const insightData = await generateInsight(task, changes, extracted.data);
    const insight = await Insight.create({
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
    run.status = 'SUCCEEDED';
    run.finishedAt = new Date();
    await run.save();

    // Finalize task state.
    task.status = 'COMPLETED';
    task.lastRunAt = new Date();
    task.lastRunRef = run._id;
    task.lastError = '';
    await task.save();

    // --- Notify (auditable, non-blocking) ---
    await notifierService(task, run, insight, changes);

    await logAudit({
      actor: user?.username || 'system',
      user,
      action: 'run.completed',
      entityType: 'ExecutionRun',
      entityId: run._id,
      details: {
        task: task._id?.toString(),
        changed: changes.length,
        snapshot: snapshot._id?.toString(),
        insight: insight._id?.toString(),
        previousSnapshot: previous?._id?.toString() || null,
      },
      ip: user?.ip,
    });

    logger.info(
      { run: run._id, task: task._id, changes: changes.length, previous: !!previous },
      'Run completed'
    );
    return run;
  } catch (err) {
    run.status = 'FAILED';
    run.error = err.message;
    run.errorCode = err.code || err.statusCode || 'RUN_FAILED';
    run.finishedAt = new Date();
    await run.save().catch(() => {});
    task.status = 'FAILED';
    task.lastError = err.message;
    await task.save().catch(() => {});
    await logAudit({
      actor: user?.username || 'system',
      user,
      action: 'run.failed',
      entityType: 'ExecutionRun',
      entityId: run._id,
      details: { error: err.message, code: run.errorCode, task: task._id?.toString() },
      status: 'error',
      ip: user?.ip,
    });
    logger.error({ run: run._id, err: err.message, code: run.errorCode }, 'Run failed');
    throw err;
  }
}

export default { planTask, approveAndExecute, executeRun };
