import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import Badge, { taskTone } from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Button, Card, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { CronPreset, cronToLabel } from '../components/CronPreset.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Schedules() {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState(null); // taskId
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get('/tasks');
      const withSchedule = (data.data.tasks || []).filter((t) => t.schedule);
      setTasks(withSchedule);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load schedules'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (id) => {
    try {
      await api.patch(`/tasks/${id}`, { schedule: draft });
      toast.success('Schedule updated.');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid cron expression'));
    }
  };

  const togglePause = async (t) => {
    try {
      await api.patch(`/tasks/${t._id}/pause`, { paused: t.status !== 'PAUSED' });
      toast.info(t.status !== 'PAUSED' ? 'Task paused.' : 'Task resumed.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update task'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        subtitle="Manage recurrence for automated web operations. Choose a preset — no cron syntax required."
        meta={`${tasks.length} scheduled task${tasks.length === 1 ? '' : 's'}`}
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      {busy && !tasks.length ? (
        <div className="text-sm text-gray-500">Loading schedules…</div>
      ) : tasks.length === 0 ? (
        <EmptyState icon="calendar" title="No scheduled tasks" message="Tasks with a schedule enjoy automated runs. Set one when creating a task." />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t._id} title={t.name}
              subtitle={t.target}
              action={
                <div className="flex items-center gap-2">
                  <Badge tone={taskTone(t.status)}>{t.status}</Badge>
                  <Button size="xs" variant={t.status === 'PAUSED' ? 'success' : 'secondary'} onClick={() => togglePause(t)}>
                    {t.status === 'PAUSED' ? 'Resume' : 'Pause'}
                  </Button>
                </div>
              }
            >
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="clock" size={16} className="text-gray-400" />
                    <span className="text-gray-600">{cronToLabel(t.schedule)}</span>
                    <code className="text-xs text-gray-400 font-mono">{t.schedule}</code>
                  </div>
                  {editing !== t._id ? (
                    <Button size="xs" variant="secondary" onClick={() => { setEditing(t._id); setDraft(t.schedule); }}>Edit</Button>
                  ) : null}
                </div>
                {editing === t._id ? (
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <CronPreset label="Schedule" value={draft} onChange={setDraft} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => save(t._id)}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    <Link to={`/tasks/${t._id}`} className="text-brand-600 hover:underline">Open task</Link>
                    {' · scheduled runs go through the normal workflow (approval where required)'}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}