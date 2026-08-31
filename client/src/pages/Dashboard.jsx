import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import Badge, { runTone, healthTone } from '../components/Badge.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState } from '../components/ui.jsx';
import Icon from '../components/Icons.jsx';
import { timeAgo } from '../lib/format.js';

function HealthPill({ label, status }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 bg-gray-50/60">
      <span className="text-sm text-gray-600">{label}</span>
      <Badge tone={healthTone(status)} dot>{status}</Badge>
    </div>
  );
}

function RecentRunsList({ runs }) {
  if (!runs || runs.length === 0) {
    return <EmptyState icon="runs" title="No runs yet" message="Once tasks run, recent results appear here." />;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {runs.map((r) => (
        <li key={r._id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Link to={`/tasks/${r.task?._id}`} className="font-medium text-sm text-gray-800 hover:text-brand-600 truncate block">
              {r.task?.name || 'Task'}
            </Link>
            <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
          </div>
          <Badge tone={runTone(r.status)}>{r.status}</Badge>
        </li>
      ))}
    </ul>
  );
}

function RecentInsightsList({ insights }) {
  if (!insights || insights.length === 0) {
    return <EmptyState icon="bulb" title="No insights yet" message="Insights are generated when changes are detected." />;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {insights.map((i) => (
        <li key={i._id} className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <Link to={`/tasks/${i.task?._id}`} className="font-medium text-sm text-gray-800 hover:text-brand-600 truncate">{i.task?.name || 'Task'}</Link>
            <Badge tone={i.source === 'ai' ? 'purple' : 'gray'}>{i.source === 'ai' ? 'AI' : 'fallback'}</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{i.summary}</p>
          <div className="text-[11px] text-gray-400 mt-1">{timeAgo(i.createdAt)} · confidence {Math.round((i.confidence || 0) * 100)}%</div>
        </li>
      ))}
    </ul>
  );
}

function StatGrid({ items }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((it) => <StatCard key={it.label} {...it} />)}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [sources, setSources] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [d, h, s] = await Promise.all([
        api.get('/dashboard'),
        user?.role === 'admin' ? api.get('/system/health').catch(() => null) : Promise.resolve(null),
        ['admin', 'manager'].includes(user?.role) ? api.get('/sources').catch(() => null) : Promise.resolve(null),
      ]);
      setData(d.data.data);
      if (h?.data) setHealth(h.data.data);
      if (s?.data) setSources(s.data.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load dashboard'));
    } finally {
      setBusy(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  if (busy && !data) return <div className="py-20 text-center text-gray-500">Loading dashboard…</div>;
  if (!data && error) return <div className="py-10"><ErrorBanner message={error} onRetry={load} /></div>;
  if (!data) return null;

  const role = user?.role;
  const s = data.stats || {};
  const demoPages = null;
  const sourceCount = Array.isArray(sources) ? sources.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === 'admin' ? 'Admin Dashboard' : role === 'manager' ? 'Manager Dashboard' : role === 'analyst' ? 'My Dashboard' : 'Overview'}
        subtitle={
          role === 'admin' ? "Platform-wide health and activity — every number comes from the live database." :
          role === 'manager' ? "Team operations, pending approvals, and run health." :
          role === 'analyst' ? "Your monitoring tasks, runs, and detected changes." :
          "Read-only overview of monitoring activity."
        }
        meta={s.scoped ? 'Showing your own activity' : 'Showing platform-wide data'}
        action={<Button variant="secondary" size="sm" onClick={load}>Refresh</Button>}
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      {role === 'admin' && (
        <>
          <StatGrid items={[
            { label: 'Total users', value: s.users, icon: 'users' },
            { label: 'Total tasks', value: s.tasks, icon: 'tasks' },
            { label: 'Running tasks', value: s.runningTasks, icon: 'runs', tone: 'blue' },
            { label: 'Pending approvals', value: s.pendingApprovals, icon: 'approve', tone: 'amber' },
            { label: 'Successful runs', value: s.succeeded, icon: 'check', tone: 'green' },
            { label: 'Failed runs', value: s.failed, icon: 'alert', tone: 'red' },
            { label: 'Changes detected', value: s.changes, icon: 'layers', tone: 'purple' },
            { label: 'Insights', value: s.insights, icon: 'bulb', tone: 'brand' },
          ]} />
          {health && (
            <Card title="System status" subtitle="Recorded from the live backend — no configuration details are exposed">
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                <HealthPill label="MongoDB" status={health.mongo?.status} />
                <HealthPill label="AI Provider" status={health.ai?.configured ? 'CONFIGURED' : 'NOT_CONFIGURED'} />
                <HealthPill label="Playwright" status={health.playwright?.status} />
                <HealthPill label="Scheduler" status={health.scheduler?.status} />
                <HealthPill label="API" status={health.api?.status} />
                <HealthPill label="Database latency" status={health.mongo?.latencyMs != null ? `${health.mongo.latencyMs}ms` : 'n/a'} />
              </div>
            </Card>
          )}
        </>
      )}

      {role === 'manager' && (
        <>
          <StatGrid items={[
            { label: 'Pending approvals', value: s.pendingApprovals, icon: 'approve', tone: 'amber' },
            { label: 'Running tasks', value: s.runningTasks, icon: 'runs', tone: 'blue' },
            { label: 'Failed runs', value: s.failed, icon: 'alert', tone: 'red' },
            { label: 'Team tasks', value: s.tasks, icon: 'tasks' },
            { label: 'Success rate', value: `${s.successRate}%`, icon: 'check', tone: 'green' },
            { label: 'Changes detected', value: s.changes, icon: 'layers', tone: 'purple' },
          ]} />
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Source health" subtitle="Approved sources monitored by the team">
              <div className="px-4 py-4 flex items-center gap-3 text-sm">
                <span className="text-2xl font-bold text-gray-800">{sourceCount}</span>
                <span className="text-gray-500">registered sources</span>
              </div>
            </Card>
            <Card title="Schedule" subtitle="Automated task scheduling">
              <div className="px-4 py-4 flex items-center gap-2 text-sm">
                <Badge tone="green" dot>Enabled</Badge>
                <span className="text-gray-500">Scheduled tasks run automatically via node-cron.</span>
              </div>
            </Card>
          </div>
        </>
      )}

      {(role === 'analyst' || role === 'viewer') && (
        <StatGrid items={[
          { label: role === 'analyst' ? 'My tasks' : 'Tasks', value: s.tasks || s.myTasks, icon: 'tasks' },
          { label: 'Running tasks', value: s.runningTasks, icon: 'runs', tone: 'blue' },
          { label: 'Completed runs', value: s.succeeded, icon: 'check', tone: 'green' },
          { label: 'Failed runs', value: s.failed, icon: 'alert', tone: 'red' },
          { label: 'Changes detected', value: s.changes, icon: 'layers', tone: 'purple' },
          { label: 'Insights', value: s.insights, icon: 'bulb' },
          { label: 'Pending review', value: s.awaitingApproval, icon: 'approve', tone: 'amber' },
          { label: 'Total runs', value: s.runs, icon: 'runs' },
        ]} />
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Recent runs" action={<Link to="/runs" className="text-xs text-brand-600 hover:underline">View all</Link>}>
          <RecentRunsList runs={data.recentRuns} />
        </Card>
        <Card title="Recent insights" action={<Link to="/insights" className="text-xs text-brand-600 hover:underline">View all</Link>}>
          <RecentInsightsList insights={data.recentInsights} />
        </Card>
      </div>
    </div>
  );
}
