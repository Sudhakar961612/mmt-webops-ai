import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { ExecutionRun } from '../models/ExecutionRun.js';
import { Snapshot } from '../models/Snapshot.js';
import { Change } from '../models/Change.js';
import { Insight } from '../models/Insight.js';
import { Feedback } from '../models/Feedback.js';
import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Dashboard statistics are computed from the database (never hard-coded),
 * so the numbers reflect real data as users create tasks and runs.
 */
export const dashboardStats = asyncHandler(async (req, res) => {
  const adminOrManager = ['admin', 'manager'].includes(req.user.role);

  // Role-aware scoping for the aggregates below.
  const taskFilter = adminOrManager ? {} : { owner: req.user.id };
  const ownedTaskIds = adminOrManager ? null : await Task.find(taskFilter).distinct('_id');
  const runFilterByTask = adminOrManager ? {} : { task: { $in: ownedTaskIds } };
  const insightFilter = adminOrManager ? {} : { task: { $in: ownedTaskIds } };

  const [userCount, taskCount, myTaskCount, runCount, successCount, failedCount, awaitingCount, snapshotCount, changeCount, insightCount, feedbackCount, runningCount, completedTaskCount, failedTaskCount] =
    await Promise.all([
      User.countDocuments(),
      adminOrManager ? Task.countDocuments() : 0,
      adminOrManager ? 0 : Task.countDocuments(taskFilter),
      ExecutionRun.countDocuments(runFilterByTask),
      ExecutionRun.countDocuments({ ...runFilterByTask, status: 'SUCCEEDED' }),
      ExecutionRun.countDocuments({ ...runFilterByTask, status: 'FAILED' }),
      ExecutionRun.countDocuments({ ...runFilterByTask, status: 'AWAITING_APPROVAL' }),
      Snapshot.countDocuments(runFilterByTask),
      Change.countDocuments(runFilterByTask),
      Insight.countDocuments(insightFilter),
      Feedback.countDocuments({}),
      Task.countDocuments({ ...taskFilter, status: 'RUNNING' }),
      Task.countDocuments({ ...taskFilter, status: 'COMPLETED' }),
      Task.countDocuments({ ...taskFilter, status: 'FAILED' }),
    ]);

  const byStatus = await ExecutionRun.aggregate([
    { $match: adminOrManager ? {} : { task: { $in: ownedTaskIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const recentRuns = await ExecutionRun.find(runFilterByTask)
    .populate('task', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentInsights = await Insight.find(insightFilter)
    .populate('task', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  const pendingApprovals = await ExecutionRun.countDocuments({ status: 'AWAITING_APPROVAL' });

  res.json({
    success: true,
    data: {
      stats: {
        users: userCount,
        tasks: taskCount,
        myTasks: myTaskCount,
        runs: runCount,
        succeeded: successCount,
        failed: failedCount,
        awaitingApproval: awaitingCount,
        pendingApprovals,
        snapshots: snapshotCount,
        changes: changeCount,
        insights: insightCount,
        feedbackCount,
        runningTasks: runningCount,
        completedTasks: completedTaskCount,
        failedTasks: failedTaskCount,
        successRate: runCount ? Math.round((successCount / runCount) * 100) : 0,
        runStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
        hasData: runCount > 0,
        role: req.user.role,
        scoped: !adminOrManager,
      },
      recentRuns,
      recentInsights,
      auditCount: await AuditLog.countDocuments(),
    },
  });
});

export default { dashboardStats };
