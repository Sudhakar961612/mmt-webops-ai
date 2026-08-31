import { generateJson } from './aiProvider.js';
import { resolveTarget, assertNavigableTarget } from '../browser/resolveTarget.js';
import logger from '../../utils/logger.js';

const TYPE_LABELS = {
  flight_monitor: 'flight prices & availability',
  hotel_monitor: 'hotel prices & availability',
  price_monitor: 'pricing',
  generic: 'key metrics',
};

/**
 * Deterministic planner: builds a sensible step list for any task type.
 * The returned plan is an array of { order, action, description, url, selector, params }.
 */
export function buildFallbackPlan(task, resolution) {
  const fields = resolution.fields && resolution.fields.length ? resolution.fields : [];
  const what = TYPE_LABELS[task.type] || 'monitored values';
  const steps = [];

  let order = 1;
  steps.push({
    order: order++,
    action: 'navigate',
    description: `Open the target page ${resolution.url}`,
    url: resolution.url,
    params: { waitUntil: 'domcontentloaded' },
  });

  steps.push({
    order: order++,
    action: 'wait',
    description: 'Wait for the page and its data to render',
    params: { timeoutMs: 2000 },
  });

  steps.push({
    order: order++,
    action: 'extract',
    description: `Extract structured data for ${what}${fields.length ? ` (${fields.join(', ')})` : ''}`,
    selector: 'body',
    params: { fields, source: resolution.source },
  });

  steps.push({
    order: order++,
    action: 'screenshot',
    description: 'Capture a screenshot snapshot of the page',
    params: { fullPage: false },
  });

  steps.push({
    order: order++,
    action: 'compare',
    description: 'Compare this snapshot with the previous snapshot to detect changes',
    params: { fields },
  });

  steps.push({
    order: order++,
    action: 'reason',
    description: 'Reason about detected changes to produce a business insight',
    params: {},
  });

  steps.push({
    order: order++,
    action: 'notify',
    description: 'Record the insight and notify reviewers',
    params: {},
  });

  return steps;
}

/**
 * Generate an execution plan for a task.
 * Uses the AI provider when configured, otherwise a deterministic builder.
 */
export async function generatePlan(task) {
  const resolution = await resolveTarget(task.target, task.extractors?.fields || []);
  const fallback = buildFallbackPlan(task, resolution);

  let source = 'fallback';
  const aiPlan = await generateJson(
    `Given task "${task.name}" (type: ${task.type}, target: ${task.target}), ` +
      `build an ordered JSON array of execution steps. Each step must have ` +
      `"action" (one of: navigate, wait, extract, screenshot, compare, reason, notify), ` +
      `"description", optional "url", optional "selector" and optional "params" object. ` +
      `Include navigate+extract (fields ${JSON.stringify(resolution.fields)}), screenshot, compare, reason, notify. ` +
      `Return only the JSON array.`
  );

  if (Array.isArray(aiPlan) && aiPlan.length) {
    source = 'ai';
    aiPlan.forEach((s, i) => {
      s.order = i + 1;
      if (s.action === 'navigate' && !s.url) s.url = resolution.url;
    });
    // Reject any AI plan that tries to silently switch the task's trusted target.
    assertNavigableTarget(aiPlan, resolution);
    logger.info({ task: task._id }, 'Plan generated via AI');
    return { plan: aiPlan, source, resolution };
  }

  logger.info({ task: task._id }, 'Plan generated via fallback');
  return { plan: fallback, source, resolution };
}
