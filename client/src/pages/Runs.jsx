import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import Badge, { runTone } from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Button, Card, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { timeAgo, durationMs } from '../lib/format.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'SUCCEEDED', label: 'Succeeded' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'RUNNING', label: 'Running' },
  { key: 'AWAITING_APPROVAL', label: 'Pending' },
];

export default function Runs() {
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get('/runs?limit=100');
      setRuns(data.data.runs || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load runs'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? runs : runs.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Runs"
        subtitle="Execution history with status, timing, and results."
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === f.key ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {busy && !runs.length ? (
        <div className="text-sm text-gray-500">Loading runs…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="runs" title="No runs" message="Runs appear here once tasks are executed." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => (window.location.href = `/runs/${r._id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{r.task?.name || 'Task'}</div>
                      <div className="text-xs text-gray-400">{timeAgo(r.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={runTone(r.status)}>{r.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{r.trigger}</td>
                    <td className="px-4 py-3 text-gray-600">{r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{durationMs(r.startedAt, r.finishedAt) || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.summary || r.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}