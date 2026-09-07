import logAudit from './auditService.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Notify reviewers about a completed run.
 * Channels: audit log (always) + optional COMPLETION_WEBHOOK_URL POST (Slack-compatible).
 * Non-blocking: never throws into the run's success path.
 */
export async function postWebhook(payload) {
  const url = env.COMPLETION_WEBHOOK_URL;
  if (!url) return { delivered: false, reason: 'no-webhook-configured' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    return { delivered: res.ok, status: res.status };
  } catch (err) {
    logger.warn({ err: err.message }, 'Completion webhook failed (non-blocking)');
    return { delivered: false, reason: err.message };
  }
}

export async function notifierService(task, run, insight, changes) {
  try {
    const hasChanges = insight?.hasChanges === true;
    logger.info(
      {
        task: task._id,
        run: run._id,
        changes: changes.length,
        insight: insight?._id,
        channel: 'audit',
      },
      hasChanges ? 'Notification: changes detected for review' : 'Notification: no changes'
    );
    await logAudit({
      actor: 'notifier',
      action: hasChanges ? 'notification.changes' : 'notification.nochanges',
      entityType: 'ExecutionRun',
      entityId: run._id,
      details: { task: task._id?.toString(), changed: changes.length, demoMode: env.DEMO_MODE },
    });
    // Optional outbound webhook (Slack / ops queue) — audited, non-blocking.
    if (env.COMPLETION_WEBHOOK_URL) {
      const result = await postWebhook({
        text: hasChanges
          ? `WebOps: ${changes.length} change(s) detected for "${task.name}"`
          : `WebOps: no changes for "${task.name}"`,
        task: { id: task._id?.toString(), name: task.name },
        run: { id: run._id?.toString(), status: run.status },
        insight: { id: insight?._id?.toString(), summary: insight?.summary, confidence: insight?.confidence },
        changeCount: changes.length,
        at: new Date().toISOString(),
      });
      await logAudit({
        actor: 'notifier',
        action: 'notification.webhook',
        entityType: 'ExecutionRun',
        entityId: run._id,
        details: { delivered: result.delivered, status: result.status || null },
      });
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Notification failed (non-blocking)');
  }
  return null;
}

export default notifierService;
