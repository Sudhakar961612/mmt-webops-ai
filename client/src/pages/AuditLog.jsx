import { useEffect, useState, useCallback } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { formatDate, timeAgo } from '../lib/format.js';

const actionTone = (action) => {
  if (action.includes('created') || action.includes('approved')) return 'green';
  if (action.includes('deleted') || action.includes('rejected')) return 'red';
  if (action.includes('updated') || action.includes('modified')) return 'blue';
  return 'gray';
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [filters, setFilters] = useState({ actor: '', action: '', entity: '' });
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.actor) params.append('actor', filters.actor);
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entity', filters.entity);
      const { data } = await api.get(`/audit?${params.toString()}`);
      setLogs(data.data.logs || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load audit logs'));
    } finally {
      setBusy(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Complete history of system actions and changes"
        meta={`${logs.length} log entries`}
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex flex-col lg:flex-row gap-3">
        <input
          type="text"
          placeholder="Filter by actor (username)"
          value={filters.actor}
          onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="Filter by action"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="Filter by entity"
          value={filters.entity}
          onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Card>
        {busy && !logs.length ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading audit logs…</div>
        ) : logs.length === 0 ? (
          <div className="p-6"><EmptyState icon="audit" title="No audit logs" message="System activities will appear here." /></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log._id} className="p-4 hover:bg-gray-50">
                <button
                  onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                  className="w-full text-left flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-800">{log.actor}</span>
                      <Badge tone={actionTone(log.action)} size="xs">{log.action}</Badge>
                      {log.entityType && <Badge tone="gray" size="xs">{log.entityType}</Badge>}
                    </div>
                    <div className="text-xs text-gray-500">{timeAgo(log.createdAt)}</div>
                  </div>
                  <Icon
                    name="chevron"
                    size={16}
                    className={`shrink-0 transition-transform ${expanded === log._id ? 'rotate-180' : ''}`}
                  />
                </button>

                {expanded === log._id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="text-gray-800 font-mono text-xs">{formatDate(log.createdAt)}</span>
                    </div>
                    {log.entityId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entity ID:</span>
                        <span className="text-gray-800 font-mono text-xs">{log.entityId}</span>
                      </div>
                    )}
                    {log.ip && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">IP Address:</span>
                        <span className="text-gray-800 text-xs">{log.ip}</span>
                      </div>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div>
                        <span className="text-gray-600 block mb-1">Details:</span>
                        <div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs font-mono overflow-x-auto">
                          {Object.entries(log.details).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-gray-600">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
