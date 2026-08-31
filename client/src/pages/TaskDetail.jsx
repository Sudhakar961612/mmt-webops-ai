import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge, { taskTone, runTone } from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { Card, Button, ErrorBanner, EmptyState, ConfirmDialog, KeyValue } from '../components/ui.jsx';
import ProgressStepper from '../components/ProgressStepper.jsx';
import PlanReview from '../components/PlanReview.jsx';
import { cronToLabel } from '../components/CronPreset.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo, durationMs, formatDate, formatRole, shortId } from '../lib/format.js';

const WORKFLOW = [
  { key: 'objective', label: 'Objective' },
  { key: 'source', label: 'Source' },
  { key: 'fields', label: 'Fields' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'approval', label: 'Approval' },
  { key: 'plan', label: 'AI Plan' },
  { key: 'execution', label: 'Execution' },
  { key: 'extract', label: 'Extracted' },
  { key: 'compare', label: 'Compare' },
  { key: 'insight', label: 'AI Insight' },
];

// "Next action" card tone -> visual accents.
const NEXT_TONE = {
  primary: { card: 'border-brand-200 bg-brand-50/60', icon: 'bg-brand-600 text-white', iconName: 'sparkle', accent: 'bg-brand-600' },
  amber: { card: 'border-amber-200 bg-amber-50/60', icon: 'bg-amber-500 text-white', iconName: 'clock', accent: 'bg-amber-500' },
  success: { card: 'border-emerald-200 bg-emerald-50/60', icon: 'bg-emerald-600 text-white', iconName: 'check', accent: 'bg-emerald-600' },
  danger: { card: 'border-red-200 bg-red-50/60', icon: 'bg-red-600 text-white', iconName: 'alert', accent: 'bg-red-600' },
  info: { card: 'border-blue-200 bg-blue-50/60', icon: 'bg-sky-600 text-white', iconName: 'runs', accent: 'bg-sky-600' },
  neutral: { card: 'border-gray-200 bg-gray-50/70', icon: 'bg-gray-400 text-white', iconName: 'clock', accent: 'bg-gray-400' },
};

const humanize = (v) => (v ? String(v).replace(/_/g, ' ') : '—');

function taskErrorMessage(err) {
  const status = err?.response?.status;
  if (status === 404) return 'Task not found. It may have been deleted or never existed.';
  if (status === 403) return "You don't have permission to view this task.";
  if (status === 401) return 'Please log in again to view this task.';
  if (status === 400) return 'That task ID is not recognised.';
  return getErrorMessage(err, 'Could not load task. Please try again.');
}

/**
 * Map the real task/run state onto the 10-phase workflow.
 * Returns the index of the *current* step (0-based). Steps below index are
 * complete; the step at index is the active one.
 */
function deriveWorkflowCurrent(task, runs) {
  const hasPlan = Array.isArray(task?.plan) && task?.plan.length > 0;
  const status = (task?.status || '').toString().toUpperCase();
  const latest = Array.isArray(runs) && runs.length ? runs[0] : null;

  if (latest) {
    switch (latest.status) {
      case 'SUCCEEDED':
        return 10; // all phases reached
      case 'COMPARING':
        return 8;
      case 'REASONING':
        return 9;
      case 'EXTRACTING':
        return 7;
      case 'RUNNING':
        return 6;
      case 'FAILED':
      case 'REJECTED':
        return 6; // failed during execution
      case 'PLANNED':
      case 'AWAITING_APPROVAL':
        return 5; // plan generated, awaiting review
      default:
        break;
    }
  }

  if (status === 'COMPLETED') return hasPlan ? 10 : 5;
  if (status === 'FAILED') return 6;
  if (status === 'RUNNING') return 6;
  if (status === 'APPROVED') return 6;
  if (status === 'AWAITING_APPROVAL' || status === 'PLANNED') return 5;
  if (status === 'PAUSED') return 4;
  // DRAFT: configuration is done; AI plan is the next step.
  return 5;
}

/**
 * Decide what the user should do next, based entirely on real task/run state.
 */
function buildNextAction(task, runs, pendingRun, latestRun, flags, handlers) {
  const status = (task?.status || '').toString().toUpperCase();
  const hasPlan = Array.isArray(task?.plan) && task?.plan.length > 0;
  const { isManager, canManage, canCreate } = flags;
  const { generatePlan, runTask, reviewPlan, openResume } = handlers;

  if (status === 'RUNNING') {
    return {
      tone: 'info',
      title: 'Task is running',
      body: 'Execution is in progress. The page refreshes automatically; no action is needed right now.',
      action: null,
    };
  }

  if (status === 'COMPLETED' && latestRun) {
    return {
      tone: 'success',
      title: 'Task completed',
      body: 'The latest run finished successfully. Review the AI insight and run details.',
      action: {
        label: 'View latest run',
        variant: 'success',
        icon: 'chevron',
        to: `/runs/${latestRun._id}`,
        next: true,
      },
    };
  }

  if (status === 'FAILED') {
    const errText = task?.lastError || 'The most recent execution did not complete.';
    return {
      tone: 'danger',
      title: 'Last execution failed',
      body: errText,
      primary: latestRun
        ? { label: 'View latest run', variant: 'secondary', icon: 'chevron', to: `/runs/${latestRun._id}` }
        : null,
      secondary:
        canCreate && !pendingRun
          ? { label: 'Generate plan', variant: 'primary', icon: 'sparkle', key: 'plan', onClick: generatePlan }
          : null,
    };
  }

  if (status === 'PAUSED') {
    return {
      tone: 'neutral',
      title: 'Task paused',
      body: 'Scheduled runs are currently paused. Resume the task to continue.',
      action:
        canManage && !pendingRun
          ? { label: 'Resume task', variant: 'success', icon: 'check', key: 'resume', onClick: openResume }
          : null,
    };
  }

  if (status === 'AWAITING_APPROVAL' || status === 'PLANNED') {
    if (pendingRun) {
      return isManager
        ? {
            tone: 'amber',
            title: 'Plan awaits your approval',
            body: 'Review the generated AI plan in the section below, then approve to execute or reject it.',
            action: { label: 'Review plan', variant: 'primary', icon: 'approve', key: 'review', onClick: reviewPlan },
          }
        : {
            tone: 'neutral',
            title: 'Awaiting manager approval',
            body: 'A manager or admin must approve the generated plan before this task can run.',
            action: null,
          };
    }
  }

  if (status === 'APPROVED') {
    return isManager
      ? {
          tone: 'primary',
          title: 'Plan approved — ready to run',
          body: 'The plan has been approved. Start the execution now.',
          action: { label: 'Run task', variant: 'success', icon: 'runs', key: 'run', onClick: runTask },
        }
      : {
          tone: 'neutral',
          title: 'Plan approved',
          body: 'This task is approved and will execute when a run is triggered.',
          action: null,
        };
  }

  // DRAFT (or plan not yet generated)
  return {
    tone: 'primary',
    title: hasPlan ? 'Plan is ready to review' : 'Ready for AI planning',
    body: hasPlan
      ? 'An execution plan already exists. Review it below.'
      : 'Generate an execution plan to continue. The AI plans navigation, extraction, comparison and insight steps.',
    action: canCreate
      ? hasPlan
        ? { label: 'Review plan', variant: 'primary', icon: 'approve', key: 'review', onClick: reviewPlan }
        : { label: 'Generate AI plan', variant: 'primary', icon: 'sparkle', key: 'plan', onClick: generatePlan }
      : null,
  };
}

function NextActionCard({ next, busy }) {
  if (!next) return null;
  if (!next.tone || !next.title) return null;
  const tone = NEXT_TONE[next.tone] || NEXT_TONE.neutral;
  const action = next.primary || next.action;
  const secondary = next.primary ? next.secondary : null;
  return (
    <section className={`relative overflow-hidden rounded-2xl border ${tone.card} shadow-sm p-5 sm:p-6`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${tone.accent}`} />
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 pl-0.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone.icon}`}>
            <Icon name={action?.icon || tone.iconName} size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Next action</div>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5 leading-snug">{next.title}</h2>
            <p className="text-sm text-gray-600 mt-1 max-w-xl">{next.body}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 lg:pl-4">
          {action && renderNextBtn(action, busy)}
          {secondary && renderNextBtn(secondary, busy)}
        </div>
      </div>
    </section>
  );
}

function renderNextBtn(item, busy) {
  if (!item) return null;
  if (item.to) {
    const styles =
      item.variant === 'success'
        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
        : item.variant === 'secondary'
        ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
        : item.variant === 'danger'
        ? 'bg-red-600 hover:bg-red-500 text-white'
        : 'bg-brand-600 hover:bg-brand-500 text-white';
    return (
      <Link
        to={item.to}
        className={`inline-flex items-center justify-center gap-1.5 font-medium px-4 py-2 text-sm rounded-lg transition-colors ${styles}`}
      >
        {item.icon && <Icon name={item.icon} size={15} className={item.next ? '-rotate-90' : ''} />}
        {item.label}
      </Link>
    );
  }
  return (
    <Button variant={item.variant || 'primary'} onClick={item.onClick} disabled={!!busy}>
      {item.icon && <Icon name={item.icon} size={15} />}
      {busy === item.key ? 'Working…' : item.label}
    </Button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-44" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/4" />
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="mt-4 h-24 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const { user, can } = useAuth();
  const toast = useToast();
  const inFlight = useRef(false);

  const [task, setTask] = useState(null);
  const [taskError, setTaskError] = useState('');
  const [runs, setRuns] = useState([]);
  const [runsError, setRunsError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [resumeConfirm, setResumeConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  const isManager = can('admin', 'manager');

  /** Load task and runs independently so one failing request never blanks the page. */
  const load = useCallback(
    async ({ background = false } = {}) => {
      if (inFlight.current) return; // never stack overlapping requests
      inFlight.current = true;
      if (!background) setInitialLoading(true);
      try {
        const { data } = await api.get(`/tasks/${id}`);
        setTask(data.data.task);
        setTaskError('');
      } catch (err) {
        if (!background) setTaskError(taskErrorMessage(err));
      }
      try {
        const { data } = await api.get(`/runs?taskId=${id}`);
        setRuns(data.data.runs || []);
        setRunsError('');
      } catch (err) {
        setRunsError(getErrorMessage(err, 'Run history could not be loaded.'));
      }
      if (!background) setInitialLoading(false);
      inFlight.current = false;
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Background polling (8s) — refreshes in place, never flashes a full-screen loader.
  useEffect(() => {
    const t = setInterval(() => load({ background: true }), 8000);
    return () => clearInterval(t);
  }, [load]);

  const generatePlan = async () => {
    setActionBusy('plan');
    try {
      await api.post(`/tasks/${id}/plan`);
      toast.success(task?.autoApprove && isManager ? 'Plan generated and executed.' : 'Plan generated — awaiting approval.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not generate plan'));
    } finally {
      setActionBusy('');
    }
  };

  const runTask = async () => {
    setActionBusy('run');
    try {
      await api.post(`/tasks/${id}/run`);
      toast.success('Task execution started.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not run task'));
    } finally {
      setActionBusy('');
    }
  };

  const resumeTask = async () => {
    setActionBusy('resume');
    try {
      await api.patch(`/tasks/${id}/pause`, { paused: false });
      toast.success('Task resumed.');
      setResumeConfirm(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not resume task'));
    } finally {
      setActionBusy('');
    }
  };

  const reviewPlan = () => {
    document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(task?._id || '');
      setCopied(true);
      toast.success('Task ID copied');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy Task ID');
    }
  };

  const pauseTask = async () => {
    setActionBusy('pause');
    try {
      await api.patch(`/tasks/${id}/pause`, { paused: true });
      toast.success('Task paused. Scheduled runs are now on hold.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not pause task'));
    } finally {
      setActionBusy('');
    }
  };

  const deleteTask = async () => {
    setActionBusy('delete');
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted.');
      navigate('/tasks');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete task'));
    } finally {
      setActionBusy('');
    }
  };

  // Derived view state computed each render from real task/run data.
  const canManage = isManager;
  const canCreate = can('admin', 'manager', 'analyst');
  const pendingRun = Array.isArray(runs)
    ? runs.find((r) => r.status === 'AWAITING_APPROVAL' || r.status === 'PLANNED')
    : null;
  const latestRun = Array.isArray(runs) && runs.length ? runs[0] : null;

  const next = buildNextAction(task, runs, pendingRun, latestRun, { isManager, canManage, canCreate }, {
    generatePlan,
    runTask,
    reviewPlan,
    openResume: () => setResumeConfirm(true),
  });
  const current = deriveWorkflowCurrent(task, runs);

  if (initialLoading && !task && !taskError) {
    return (
      <div className="space-y-6">
        <Skeleton />
      </div>
    );
  }

  if (taskError && !task) {
    return (
      <div className="space-y-6">
        <ErrorBanner message={taskError} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/tasks" className="text-sm text-brand-600 hover:underline">← back to tasks</Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight break-words">{task?.name || 'Task'}</h1>
            <Badge tone={taskTone(task?.status)} dot>{task?.status || '—'}</Badge>
            {task?.type && <Badge tone="blue">{humanize(task.type)}</Badge>}
            {task?.autoApprove && <Badge tone="purple">auto-approve</Badge>}
          </div>
          {task?.description && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5" title="Full task ID">
              <span className="uppercase tracking-wide">ID</span>
              <span className="font-mono text-gray-600">{shortId(task?._id)}</span>
              <button onClick={copyId} aria-label="Copy full task ID" title="Copy full task ID"
                className="text-brand-600 hover:text-brand-500 p-0.5 rounded transition-colors">
                {copied ? <Icon name="check" size={13} /> : <Icon name="link" size={13} />}
              </button>
            </span>
            {task?.target && (
              <span className="inline-flex items-center gap-1 font-mono max-w-[16rem] truncate" title={task.target}>
                <Icon name="link" size={13} /> {task.target}
              </span>
            )}
            <span className="inline-flex items-center gap-1"><Icon name="calendar" size={13} /> Created {formatDate(task?.createdAt)}</span>
            <span>Updated {timeAgo(task?.updatedAt)}</span>
            <span className="inline-flex items-center gap-1"><Icon name="users" size={13} /> {isManager ? task?.owner?.username || formatRole(task?.owner?.role) : 'You'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => load()}>
            <Icon name="refresh" size={15} /> Refresh
          </Button>
          {canManage && task?.status && task.status !== 'PAUSED' && task?.schedule && (
            <Button variant="warn" size="sm" onClick={pauseTask} disabled={!!actionBusy}>
              <Icon name="clock" size={15} /> Pause
            </Button>
          )}
          {canManage && (
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)} disabled={!!actionBusy}>
              <Icon name="x" size={15} /> Delete
            </Button>
          )}
        </div>
      </div>

      {taskError && <ErrorBanner message={taskError} onRetry={load} />}
      {runsError && <ErrorBanner message={runsError} onRetry={load} />}

      {/* Primary next action */}
      <NextActionCard next={next} busy={actionBusy} />

      {/* Workflow stepper */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <header className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Workflow progress</h3>
            <p className="text-xs text-gray-500 mt-0.5">Where this task is in the automated workflow</p>
          </div>
          <span className="text-xs text-gray-500 shrink-0">{current <= WORKFLOW.length ? `${current} of ${WORKFLOW.length} phases` : 'Complete'}</span>
        </header>
        <div className="px-4 sm:px-5 py-4 overflow-x-auto">
          <ProgressStepper steps={WORKFLOW} current={current} compact />
        </div>
      </section>

      {/* Task configuration */}
      <Card title="Task configuration" subtitle="Details of this monitoring task">
        <dl className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
          <KeyValue label="Type" value={humanize(task?.type)} />
          <KeyValue label="Status" value={humanize(task?.status)} />
          <KeyValue label="Target" value={task?.target} mono />
          <KeyValue label="Schedule" value={cronToLabel(task?.schedule)} />
          <KeyValue label="Approval" value={task?.autoApprove ? 'Auto-approve' : 'Manager approval'} />
          <KeyValue label="Owner" value={isManager ? task?.owner?.username || formatRole(task?.owner?.role) : 'You'} />
          <KeyValue label="Last run" value={latestRun ? timeAgo(latestRun.startedAt || latestRun.createdAt) : 'Never'} />
          <KeyValue label="Plan steps" value={Array.isArray(task?.plan) && task?.plan.length ? `${task.plan.length} steps` : '—'} />
          <KeyValue label="Created" value={formatDate(task?.createdAt)} />
          <KeyValue label="Updated" value={formatDate(task?.updatedAt)} />
        </dl>
        {task?.extractors && Object.keys(task.extractors).length > 0 && (
          <div className="px-5 pb-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Extractors</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(task.extractors).map(([k, v]) => (
                <code key={k} className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-700">
                  {k}: <span className="font-mono">{String(v)}</span>
                </code>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Plan review */}
      <div id="plan-section">
        <Card title="AI plan & review" subtitle={pendingRun ? 'Review and approve the generated execution plan' : 'Execution plan for this task'}>
          <div className="px-5 py-4">
            <PlanReview task={task} pendingRun={pendingRun} canApprove={isManager} onDone={load} />
          </div>
        </Card>
      </div>

      {/* Latest execution summary */}
      {latestRun ? (
        <Card
          title="Latest run"
          subtitle={`Most recent execution · ${timeAgo(latestRun.createdAt || latestRun.startedAt)}`}
          action={
            <Link to={`/runs/${latestRun._id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-500 font-medium">
              View run details <Icon name="chevron" size={14} />
            </Link>
          }
        >
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400">Status</div>
                <div className="mt-1"><Badge tone={runTone(latestRun.status)} dot>{latestRun.status}</Badge></div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400">Started</div>
                <div className="mt-1 text-sm font-medium text-gray-800">{formatDate(latestRun.startedAt || latestRun.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400">Trigger</div>
                <div className="mt-1 text-sm capitalize font-medium text-gray-800">{latestRun.trigger || 'manual'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400">Duration</div>
                <div className="mt-1 text-sm font-medium text-gray-800">{durationMs(latestRun.startedAt, latestRun.finishedAt) || '—'}</div>
              </div>
            </div>
            {latestRun.error ? (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                <span>{latestRun.error}</span>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Run history */}
      <Card
        title="Run history"
        subtitle={runs.length ? `${runs.length} run${runs.length === 1 ? '' : 's'} total` : 'No executions yet'}
        action={latestRun ? (
          <Link to={`/runs/${latestRun._id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-500 font-medium">
            View latest <Icon name="chevron" size={14} />
          </Link>
        ) : null}
      >
        {runs.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState icon="runs" title="No runs yet"
              message="Generate and approve an AI plan to start the first execution. Results and changes will appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 bg-gray-50">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((r, i) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{runs.length - i}</td>
                    <td className="px-4 py-3"><Badge tone={runTone(r.status)} dot>{r.status}</Badge></td>
                    <td className="px-4 py-3 capitalize text-gray-600">{r.trigger}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(r.startedAt || r.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500">{durationMs(r.startedAt, r.finishedAt) || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={r.summary || r.error || ''}>
                      {r.error ? r.error : (r.summary || '—')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/runs/${r._id}`} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-500 text-sm font-medium">
                        Details <Icon name="chevron" size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Resume confirm */}
      <ConfirmDialog
        open={resumeConfirm}
        title="Resume this task?"
        message="Scheduled runs will continue on the configured schedule. Existing run history is kept."
        confirmLabel="Resume task"
        tone="success"
        busy={actionBusy === 'resume'}
        onConfirm={resumeTask}
        onCancel={() => setResumeConfirm(false)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteConfirm}
        title="Delete this task?"
        message="This permanently removes the task and its run history. This cannot be undone."
        confirmLabel="Delete task"
        tone="danger"
        busy={actionBusy === 'delete'}
        onConfirm={deleteTask}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}