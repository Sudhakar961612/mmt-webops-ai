import { useState } from 'react';
import Badge from './Badge.jsx';
import Icon from './Icons.jsx';
import { Button, ConfirmDialog } from './ui.jsx';
import api, { getErrorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/format.js';

const riskLabel = (issues, score) => {
  if (!issues || issues.length === 0) return { tone: 'green', text: 'Low risk — safe to execute' };
  if ((score || 0) < 50) return { tone: 'red', text: 'High risk — review carefully' };
  return { tone: 'amber', text: `${issues.length} review point${issues.length > 1 ? 's' : ''} — review before approval` };
};

export default function PlanReview({ task, pendingRun, canApprove, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);

  const plan = task?.plan || pendingRun?.plan || [];
  const review = pendingRun?.review || null;
  const generatedAt = pendingRun?.createdAt || task?.updatedAt;
  // Backend returns plan source transiently ({ plan, source }) and reviewer
  // identity in review.reviewer ('ai' | 'rule-engine'); neither is stored on
  // the run/task documents, so fall back to 'fallback' display.
  const isAiPlan = review?.reviewer === 'ai' || pendingRun?.planSource === 'ai' || task?.planSource === 'ai';

  const execute = async (type) => {
    const { runId } = confirm;
    setBusy(type);
    try {
      if (type === 'approve') {
        await api.post(`/tasks/run/${runId}/approve`);
        toast.success('Plan approved. Execution started.');
      } else {
        await api.post(`/runs/${runId}/reject`);
        toast.info('Plan rejected and removed from the approval queue.');
      }
      setConfirm(null);
      onDone?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Action failed'));
    } finally {
      setBusy('');
    }
  };

  const regenerate = async () => {
    if (!task) return;
    setBusy('regenerate');
    try {
      await api.post(`/tasks/${task._id}/plan`);
      toast.success('A fresh plan was generated.');
      onDone?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not regenerate plan'));
    } finally {
      setBusy('');
    }
  };

  if (!plan || plan.length === 0) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <Icon name="alert" size={18} />
        No plan has been generated yet. Generate a plan to review it.
      </div>
    );
  }

  const risk = riskLabel(review?.issues, review?.score);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900">AI Plan</h3>
          <Badge tone={isAiPlan ? 'purple' : 'gray'}>{isAiPlan ? 'AI generated' : 'Fallback generated'}</Badge>
          {review?.score != null && <Badge tone="blue">review {review.score}/100</Badge>}
          {generatedAt && <span className="text-xs text-gray-400">{timeAgo(generatedAt)}</span>}
        </div>
        <Badge tone={risk.tone} dot>{risk.text}</Badge>
      </div>

      {review?.issues?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm space-y-1">
          <div className="font-medium flex items-center gap-1.5"><Icon name="alert" size={16} /> Review notes</div>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {review.issues.map((iss, i) => <li key={i}>{iss}</li>)}
          </ul>
          {review.notes && <p className="text-xs pt-1">{review.notes}</p>}
        </div>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium">Target URL</th>
            <th className="px-3 py-2 font-medium">Extract fields</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {plan.map((s) => (
            <tr key={s.order ?? s._id} className="hover:bg-gray-50">
              <td className="px-3 py-2.5 text-gray-400">{s.order}</td>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 font-medium capitalize text-gray-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> {s.action}
                </span>
              </td>
              <td className="px-3 py-2.5 text-gray-600">{s.description}</td>
              <td className="px-3 py-2.5 text-gray-500">{s.url ? <code className="text-xs">{s.url}</code> : '—'}</td>
              <td className="px-3 py-2.5 text-gray-500">{s.params?.fields?.join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canApprove && pendingRun && (
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <Button variant="success" onClick={() => setConfirm({ type: 'approve', runId: pendingRun._id })} disabled={!!busy}>
            <Icon name="check" size={16} /> Approve &amp; Run
          </Button>
          <Button variant="danger" onClick={() => setConfirm({ type: 'reject', runId: pendingRun._id })} disabled={!!busy}>
            <Icon name="x" size={16} /> Reject
          </Button>
          <Button variant="secondary" onClick={regenerate} disabled={!!busy}>
            <Icon name="refresh" size={16} /> Regenerate plan
          </Button>
        </div>
      )}

      {!canApprove && pendingRun?.status === 'AWAITING_APPROVAL' && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Icon name="clock" size={18} />
          This plan is awaiting approval by a manager or admin before it can run.
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'approve' ? 'Approve and run this plan?' : 'Reject this plan?'}
        message={
          confirm?.type === 'approve'
            ? 'The approved plan will execute immediately with Playwright, capture data, and generate an insight.'
            : 'The run will be marked REJECTED and removed from the approval queue. A new plan can be generated any time.'
        }
        confirmLabel={confirm?.type === 'approve' ? 'Approve & run' : 'Reject plan'}
        tone={confirm?.type === 'approve' ? 'success' : 'danger'}
        busy={!!busy}
        onConfirm={() => execute(confirm?.type)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}