import Icon from './Icons.jsx';
import Badge, { runTone } from './Badge.jsx';
import { formatTime, durationMs } from '../lib/format.js';

const LIFECYCLE = [
  { key: 'accepted', label: 'Task accepted' },
  { key: 'plan', label: 'AI plan generated' },
  { key: 'approval', label: 'Plan approved' },
  { key: 'navigate', label: 'Browser started' },
  { key: 'wait', label: 'Page opened' },
  { key: 'extract', label: 'Data extracted' },
  { key: 'screenshot', label: 'Screenshot captured' },
  { key: 'compare', label: 'Compared with previous snapshot' },
  { key: 'reason', label: 'AI reasoning' },
  { key: 'notify', label: 'Insight generated' },
];

function computeCompletion(run) {
  const status = run?.status;
  const planActions = (run?.plan || []).map((s) => s.action);
  const order = { navigate: 0, wait: 1, extract: 2, screenshot: 3, compare: 4, reason: 5, notify: 6 };
  const planReached = planActions.length ? Math.max(...planActions.map((a) => order[a])) : -1;
  const statusRank = {
    PLANNED: 1, AWAITING_APPROVAL: 1, APPROVED: 2, RUNNING: 3,
    EXTRACTING: 4 + planReached, COMPARING: 6, REASONING: 7,
    REJECTED: 8, SUCCEEDED: 9, FAILED: 9,
  };
  return {
    rank: statusRank[status] ?? 0,
    status,
    failed: status === 'FAILED',
    rejected: status === 'REJECTED',
  };
}

export default function RunTimeline({ run }) {
  if (!run) return null;
  const comp = computeCompletion(run);
  const steps = LIFECYCLE.map((step, i) => ({ ...step, action: step.key }));

  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const isApproval = step.key === 'approval';
        const approvalDone = comp.rejected ? false : comp.rank >= 2;
        const done = (!isApproval && i <= comp.rank && !comp.rejected) || (isApproval && approvalDone);
        const current = i === comp.rank && !comp.rejected;
        const failedHere = comp.failed && step.key === 'notify';
        const pending = !done && !current && !failedHere;

        return (
          <li key={step.key} className="flex gap-4 pb-1 last:pb-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : current
                    ? 'bg-brand-600 border-brand-600 text-white ring-4 ring-brand-100'
                    : failedHere
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {done ? <Icon name="check" size={16} /> : failedHere ? <Icon name="x" size={16} /> : <span className="text-xs font-semibold">{i + 1}</span>}
              </div>
              {i < steps.length - 1 && <span className={`w-0.5 flex-1 my-0.5 ${done ? 'bg-emerald-200' : 'bg-gray-200'}`} />}
            </div>
            <div className="pb-4 pt-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${done ? 'text-gray-800' : pending ? 'text-gray-400' : 'text-gray-800'}`}>
                  {step.label}
                </span>
                {isApproval && (
                  <Badge tone={comp.status === 'AWAITING_APPROVAL' ? 'amber' : approvalDone ? 'green' : comp.rejected ? 'gray' : 'gray'}>
                    {comp.status === 'AWAITING_APPROVAL' ? 'Pending approval' : approvalDone ? 'Approved' : comp.rejected ? 'Rejected' : '—'}
                  </Badge>
                )}
                {failedHere && comp.failed && <Badge tone="red">Failed — see error below</Badge>}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {step.key === 'accepted' && <span>{formatTime(run.createdAt)}</span>}
                {step.key === 'plan' && run.plan?.length ? <span>{run.plan.length} steps · {formatTime(run.createdAt)}</span> : null}
                {step.key === 'approval' && <span>{formatTime(run.startedAt || run.finishedAt)}</span>}
                {step.key === 'navigate' && <span>{formatTime(run.startedAt)}</span>}
                {step.key === 'notify' && run.finishedAt ? <span>{formatTime(run.finishedAt)} · {durationMs(run.startedAt, run.finishedAt) || ''}</span> : null}
                {['wait', 'extract', 'screenshot', 'compare', 'reason'].includes(step.key) && (
                  <span>{run.finishedAt ? `completed ${formatTime(run.finishedAt)}` : current ? 'in progress…' : 'pending'}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function RunStatusSummary({ run }) {
  if (!run) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={runTone(run.status)} dot>{run.status}</Badge>
      {run.trigger && <span className="text-xs text-gray-400 uppercase">trigger: {run.trigger}</span>}
    </div>
  );
}