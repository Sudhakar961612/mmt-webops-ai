import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge, { taskTone } from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Button, Card, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { cronToLabel } from '../components/CronPreset.jsx';
import { timeAgo } from '../lib/format.js';

export default function Tasks() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const isManager = can('admin', 'manager');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get('/tasks');
      setTasks(data.data.tasks || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load tasks'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);

  const desc = isManager
    ? 'Team operations. Plan → review → run.'
    : user?.role === 'viewer'
    ? 'Read-only monitoring tasks.'
    : 'Your monitoring tasks. Create one, generate a plan, and let a manager approve it.';

  return (
    <div className="space-y-6">
      <PageHeader
        title={isManager ? 'Team Tasks' : 'Tasks'}
        subtitle={desc}
        meta={`${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
        action={can('admin', 'manager', 'analyst') ? (
          <Button onClick={() => navigate('/tasks/new')}><Icon name="plus" size={16} /> New task</Button>
        ) : null}
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex flex-wrap gap-1.5">
        {['all', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'PAUSED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              statusFilter === s ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {busy && !tasks.length ? (
        <div className="text-sm text-gray-500">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="tasks" title={tasks.length ? 'No tasks in this view' : 'No tasks yet'}
          message={tasks.length ? 'Try a different filter.' : 'Create a task to start monitoring.'}
          action={tasks.length === 0 && can('admin', 'manager', 'analyst') ? <Button onClick={() => navigate('/tasks/new')}>Create task</Button> : null} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  {isManager && <th className="px-4 py-3 font-medium">Owner</th>}
                  <th className="px-4 py-3 font-medium">Last run</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{t.name}</div>
                      <div className="text-xs text-gray-400 max-w-xs truncate">{t.description}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.target}</td>
                    <td className="px-4 py-3"><Badge tone={taskTone(t.status)} dot>{t.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{cronToLabel(t.schedule)}</td>
                    {isManager && <td className="px-4 py-3 text-gray-600">{t.owner?.username || '—'}</td>}
                    <td className="px-4 py-3 text-gray-500">{timeAgo(t.lastRunAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/tasks/${t._id}`} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-500 text-sm font-medium">
                        View <Icon name="chevron" size={14} />
                      </Link>
                    </td>
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