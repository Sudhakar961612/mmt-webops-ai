import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { formatDate, timeAgo } from '../lib/format.js';

const sourceTone = (source) => (source === 'ai' ? 'purple' : 'gray');

export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [filters, setFilters] = useState({ source: '', severity: '' });

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get('/insights');
      setInsights(data.data.insights || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load insights'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = insights.filter((i) => {
    if (filters.source && i.source !== filters.source) return false;
    if (filters.severity && i.severity !== filters.severity) return false;
    return true;
  });

  const severityTone = (sev) => (sev === 'HIGH' ? 'red' : sev === 'MEDIUM' ? 'amber' : 'green');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle="AI-powered analysis of changes and business impact"
        meta={`${filtered.length} of ${insights.length} insights`}
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex gap-3">
        <select
          value={filters.source}
          onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All sources</option>
          <option value="ai">AI</option>
          <option value="fallback">Fallback</option>
        </select>
        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All severities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <Card>
        {busy && !insights.length ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading insights…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState icon="bulb" title="No insights yet" message="Insights are generated when changes are detected in your tasks." /></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((insight) => (
              <Link
                key={insight._id}
                to={`/tasks/${insight.task?._id}`}
                className="block p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm">{insight.task?.name || 'Task'}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(insight.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={sourceTone(insight.source)} dot>{insight.source === 'ai' ? 'AI' : 'Fallback'}</Badge>
                    <Badge tone={severityTone(insight.severity)}>{insight.severity || 'MEDIUM'}</Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3 mb-2">{insight.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {insight.hasChanges ? `${insight.changeCount || 0} changes detected` : 'No changes'}
                    {' '}·{' '}
                    {Math.round((insight.confidence || 0) * 100)}% confidence
                  </div>
                  {insight.recommendedAction && (
                    <div className="text-xs text-brand-600 font-medium">{insight.recommendedAction}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
