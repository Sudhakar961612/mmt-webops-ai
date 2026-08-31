import cron from 'node-cron';
import { Task } from '../models/Task.js';
import { ExecutionRun } from '../models/ExecutionRun.js';
import { env } from '../config/env.js';
import { planTask, executeRun } from './runEngine.js';
import logAudit from './auditService.js';
import logger from '../utils/logger.js';

/**
 * Simple scheduler: for each task with a `schedule` (cron expression), register
 * a job that plans + executes the task. Started when ENABLE_SCHEDULER is true.
 * Because demo pages change on every load, scheduled runs produce real changes.
 */
const jobs = new Map();
let started = false;

function isValidCron(expr) {
  return cron.validate(expr);
}

export function buildScheduledFlow(taskId) {
  return async () => {
    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === 'PAUSED') return;
      // Duplicate-approval guard: never stack another pending run while the
      // task already has one awaiting human approval (prevents queue flooding).
      const pending = await ExecutionRun.findOne({ task: taskId, status: 'AWAITING_APPROVAL' });
      if (pending) {
        logger.info(
          { task: taskId, run: pending._id },
          'Scheduler skipped run: task already has a run awaiting approval'
        );
        return;
      }
      logger.info({ task: taskId }, 'Scheduler triggered task');
      const { run } = await planTask(task, null, { trigger: 'scheduler' });
      if (task.autoApprove) {
        await executeRun(run, null);
      } else {
        logger.info({ run: run._id }, 'Scheduled run awaiting approval');
      }
      await logAudit({
        actor: 'scheduler',
        action: 'scheduler.run_triggered',
        entityType: 'Task',
        entityId: taskId,
        details: { runId: run._id },
      });
    } catch (err) {
      logger.error({ task: taskId, err: err.message }, 'Scheduled run error');
    }
  };
}

export async function loadScheduledTasks() {
  const tasks = await Task.find({ schedule: { $ne: '' } });
  for (const task of tasks) {
    if (isValidCron(task.schedule) && !jobs.has(task._id.toString())) {
      jobs.set(task._id.toString(), cron.schedule(task.schedule, buildScheduledFlow(task._id)));
      logger.info({ task: task._id, schedule: task.schedule }, 'Scheduled task registered');
    }
  }
}

export function stopAll() {
  for (const job of jobs.values()) job.stop();
  jobs.clear();
}

export async function startScheduler() {
  if (started) return;
  started = true;
  if (!env.ENABLE_SCHEDULER) {
    logger.info('Scheduler disabled (ENABLE_SCHEDULER=false)');
    return;
  }
  await loadScheduledTasks();
  // Reregister periodically to pick up newly scheduled tasks.
  setInterval(loadScheduledTasks, 60_000).unref();
  logger.info('Scheduler started');
}

export { isValidCron };

/** Aggregated scheduler status for the System Health page (no secrets). */
export function getSchedulerStatus() {
  return {
    enabled: env.ENABLE_SCHEDULER,
    started,
    jobCount: jobs.size,
    running: env.ENABLE_SCHEDULER && started,
  };
}

export default { startScheduler, loadScheduledTasks, buildScheduledFlow, stopAll, isValidCron, getSchedulerStatus };
