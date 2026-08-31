import { generateText } from './aiProvider.js';
import logger from '../../utils/logger.js';

/**
 * Reviewer service: produces an approval recommendation for a plan.
 * The final decision belongs to the user (a manager/admin approving the plan),
 * but the reviewer flags obvious risks so humans can make an informed call.
 */
export async function reviewPlan(task) {
  const steps = task.plan || [];
  const review = {
    recommendation: 'approve',
    score: 90,
    issues: [],
    notes: '',
    reviewer: 'rule-engine',
    reviewedAt: new Date(),
  };

  if (!steps.length) {
    review.recommendation = 'reject';
    review.score = 0;
    review.issues.push('Plan has no steps');
    return review;
  }

  const actions = steps.map((s) => s.action);
  if (!actions.includes('navigate')) review.issues.push('Plan is missing a navigate step');
  if (!actions.includes('extract')) review.issues.push('Plan is missing an extract step');
  if (!actions.includes('compare')) review.issues.push('Plan is missing a compare step');
  if (!actions.includes('reason')) review.issues.push('Plan is missing a reason step');

  const hasTarget =
    task.target &&
    (task.target.startsWith('demo:') || /^https?:\/\//i.test(task.target));
  if (!hasTarget) review.issues.push('Task target is not a valid demo key or URL');

  review.score = Math.max(10, 100 - review.issues.length * 15);

  if (review.issues.length >= 3) review.recommendation = 'reject';
  else if (review.issues.length) review.recommendation = 'review';

  // AI notes when available (best-effort; fall back to rule text otherwise).
  const aiNotes = await generateText(
    `Review this web automation plan and give one sentence of advice: ${JSON.stringify(
      steps.map(({ action, description }) => ({ action, description }))
    )}`
  );
  review.notes =
    review.issues.length === 0
      ? 'Plan is complete and safe to execute.'
      : `Reviewer found issues: ${review.issues.join('; ')}.`;
  if (aiNotes) {
    review.reviewer = 'ai';
    review.notes = `${aiNotes} ${review.notes}`.trim();
  }

  logger.info({ task: task._id, score: review.score }, 'Plan review complete');
  return review;
}
