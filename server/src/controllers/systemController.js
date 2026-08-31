import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isAiConfigured } from '../services/agent/aiProvider.js';
import { isBrowserAvailable } from '../services/browser/playwrightService.js';
import { getSchedulerStatus } from '../services/schedulerService.js';
import { ExecutionRun } from '../models/ExecutionRun.js';
import { AuditLog } from '../models/AuditLog.js';

/** Lightweight, secret-free status available to all authenticated users. */
export const systemStatus = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      ai: { configured: isAiConfigured() },
      scheduler: { enabled: env.ENABLE_SCHEDULER },
      demoMode: env.DEMO_MODE,
      now: new Date().toISOString(),
    },
  });
});

/**
 * System Health (admin only). Reports real state — never secrets, never faked.
 * `ai` reflects whether an AI key is configured (AI is backend-only).
 */
export const systemHealth = asyncHandler(async (_req, res) => {
  const [lastRun] = await ExecutionRun.find({})
    .sort({ createdAt: -1 })
    .limit(1)
    .select('status createdAt summary error task')
    .populate('task', 'name');

  const [failureCount] = await Promise.all([
    ExecutionRun.countDocuments({ status: 'FAILED' }),
  ]);

  const mongoState = mongoose.connection.readyState; // 1 = connected
  const scheduler = getSchedulerStatus();

  let dbLatencyMs = null;
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    dbLatencyMs = Date.now() - start;
  } catch {
    dbLatencyMs = null;
  }

  res.json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      mongo: {
        status: mongoState === 1 ? 'CONNECTED' : 'ERROR',
        state: mongoState,
        latencyMs: dbLatencyMs,
      },
      api: { status: 'CONNECTED' },
      ai: {
        configured: isAiConfigured(),
        status: isAiConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED',
        provider: env.AI_PROVIDER || 'openai',
        model: env.AI_MODEL || 'gpt-4o-mini',
        fallbackActive: !isAiConfigured(),
      },
      playwright: {
        installed: isBrowserAvailable(),
        status: isBrowserAvailable() ? 'CONNECTED' : 'ERROR',
        headless: env.BROWSER_HEADLESS,
      },
      scheduler: {
        enabled: scheduler.enabled,
        started: scheduler.started,
        jobCount: scheduler.jobCount,
        status: scheduler.running ? 'CONNECTED' : 'DEGRADED',
      },
      lastRun: lastRun
        ? { id: lastRun._id, status: lastRun.status, task: lastRun.task?.name, at: lastRun.createdAt }
        : null,
      failedRuns: failureCount,
      demoMode: env.DEMO_MODE,
      auditCount: await AuditLog.countDocuments(),
    },
  });
});

export default { systemHealth };