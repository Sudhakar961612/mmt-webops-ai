import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge, { runTone } from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner } from '../components/ui.jsx';
import RunTimeline from '../components/RunTimeline.jsx';
import ExtractedDataTable from '../components/ExtractedDataTable.jsx';
import ChangeDetection from '../components/ChangeDetection.jsx';
import { formatDate, durationMs } from '../lib/format.js';

export default function RunDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ rating: 4, comment: '' });
  const [fbMsg, setFbMsg] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: res } = await api.get(`/runs/${id}`);
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load run'));
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const submitFeedback = async (e) => {
    e.preventDefault();
    setFbMsg('');
    try {
      await api.post('/feedback', {
        taskId: data?.run?.task?._id,
        runId: data?.run?._id,
        insightId: data?.insight?._id || null,
        rating: feedback.rating,
        comment: feedback.comment,
      });
      setFbMsg('Feedback saved. Thank you!');
      setFeedback({ rating: 4, comment: '' });
      await load();
    } catch (err) {
      setFbMsg(getErrorMessage(err, 'Could not save feedback'));
    }
  };

  if (!data) return <div className="py-20 text-center text-gray-500">Loading run…</div>;

  const { run, snapshot, changes, insight, feedback: feedbackList } = data;
  const isManager = ['admin', 'manager'].includes(user?.role);

  return (
    <div className="space-y-6">
      <div>
        <Link to={run?.task?._id ? `/tasks/${run.task._id}` : '/runs'} className="text-sm text-brand-600 hover:underline">← back</Link>
      </div>
      <PageHeader
        title={`Run · ${run?._id?.slice(-8)}`}
        subtitle={run?.task?.name || 'Task'}
        meta={`${formatDate(run?.createdAt)} · ${run?.trigger || 'manual'} trigger`}
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-400">Status</div>
          <div className="mt-1"><Badge tone={runTone(run?.status)} dot>{run?.status}</Badge></div>
          {run?.error && <div className="text-xs text-red-600 mt-2 flex items-start gap-1"><Icon name="alert" size={13} /> {run.error}</div>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-400">Changes</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{changes?.length || 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-400">Duration</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{durationMs(run?.startedAt, run?.finishedAt) || '—'}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-400">Snapshot</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{snapshot ? 'Saved' : '—'}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Run timeline" subtitle="Lifecycle of this run — timestamps are from the backend">
          <div className="px-5 py-4"><RunTimeline run={run} /></div>
        </Card>
        <div className="space-y-5">
          {insight && (
            <Card title="Business insight" subtitle={insight.hasChanges ? 'Changes were detected and reasoned about' : 'No changes detected'}
              action={
                <div className="flex gap-2">
                  <Badge tone={insight.source === 'ai' ? 'purple' : 'gray'}>
                    {insight.source === 'ai' ? 'AI generated' : 'Generated using fallback analysis'}
                  </Badge>
                  <Badge tone="blue">confidence {Math.round((insight.confidence || 0) * 100)}%</Badge>
                </div>
              }>
              <div className="px-5 py-4 space-y-3">
                {([['What changed', insight.summary], ['Why it matters', insight.reasoning]]).map(([label, text]) => (
                  <div key={label}>
                    <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
                  </div>
                ))}
                {insight.insights?.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Key signals</div>
                    <ul className="mt-1 space-y-1 text-sm text-gray-700">
                      {insight.insights.map((it, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Icon name="sparkle" size={14} className="mt-1 text-brand-500 shrink-0" />
                          <span>{it.field} · {it.kind}{it.delta ? ` · ${it.delta}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card title="Extracted data" subtitle="Human-readable results for this run"
            action={snapshot?.url ? <a href={snapshot.url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Open source</a> : null}>
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 mb-3">
                <span>Source: <span className="font-mono">{snapshot?.url || run?.task?.target || '—'}</span></span>
                <span>Snapshot: {formatDate(snapshot?.createdAt)}</span>
              </div>
              <ExtractedDataTable data={snapshot?.extractedData} type={run?.task?.type} />
            </div>
            {snapshot?.screenshot && (
              <a href={snapshot.screenshot} target="_blank" rel="noreferrer">
                <img src={snapshot.screenshot} alt="Snapshot of monitored page" className="w-full max-h-72 object-cover" />
              </a>
            )}
          </Card>

          <Card title="Detected changes" subtitle={changes?.length ? `${changes.length} change${changes.length > 1 ? 's' : ''} vs previous snapshot` : 'No changes vs previous snapshot'}>
            <div className="px-5 py-4"><ChangeDetection changes={changes} /></div>
          </Card>

          {user?.role !== 'viewer' && (
            <Card title="Reviewer feedback">
              <div className="px-5 py-4 space-y-4">
                <form onSubmit={submitFeedback} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Rating:</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} onClick={() => setFeedback({ ...feedback, rating: n })} aria-label={`${n} star`}
                        className={`text-xl ${n <= (feedback.rating || 0) ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                    ))}
                  </div>
                  <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows="3" placeholder="Comment on this insight / changes…"
                    value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} />
                  <div className="flex items-center gap-3">
                    <Button type="submit">Submit feedback</Button>
                    {fbMsg && <span className="text-xs text-gray-600">{fbMsg}</span>}
                  </div>
                </form>
                {feedbackList?.length > 0 && (
                  <ul className="divide-y divide-gray-100 border-t border-gray-100">
                    {feedbackList.map((f) => (
                      <li key={f._id} className="py-2 text-sm">
                        <span className="text-amber-400">{'★'.repeat(f.rating || 0)}{'☆'.repeat(5 - (f.rating || 0))}</span>
                        <span className="text-gray-400 text-xs ml-2">by {f.user?.username}</span>
                        {f.comment && <p className="text-gray-600 text-xs mt-1">{f.comment}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
