import logAudit from './auditService.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Notify reviewers about a completed run.
 * In this reference implementation "notification" is recorded in the audit log
 * and surfaced through the logger — a real deployment could push to email/slack.
 * Non-blocking: never throws into the run's success path.
 */
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
  } catch (err) {
    logger.warn({ err: err.message }, 'Notification failed (non-blocking)');
  }
  return null;
}

export default notifierService;
