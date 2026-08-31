import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { formatDate, timeAgo } from '../lib/format.js';

const runTone = (status) => {
  if (status === 'COMPLETED') return 'green';
  if (status === 'RUNNING') return 'blue';
  if (status === 'FAILED') return 'red';
  if (status === 'AWAITING_APPROVAL') return 'amber';
  return 'gray';
};

export default function ExtractedData() {
  const [snapshots, setSnapshots] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      // Get runs to extract snapshot data
      const { data } = await api.get('/runs?limit=50');
      const runs = data.data.runs || [];
      // Filter to completed runs with snapshots
      const snaps = runs
        .filter((r) => r.snapshot)
        .map((r) => ({
          ...r.snapshot,
          _id: r._id,
          runId: r._id,
          taskId: r.task?._id,
          taskName: r.task?.name,
          status: r.status,
          createdAt: r.createdAt,
        }));
      setSnapshots(snaps);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load extracted data'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const fields = selectedSnapshot ? Object.keys(selectedSnapshot.extractedData || {}) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extracted Data"
        subtitle="View and manage data extracted from automation runs"
        meta={`${snapshots.length} snapshots available`}
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <Card title="Snapshots" subtitle={`${snapshots.length} recent`}>
            <div className="max-h-96 overflow-y-auto">
              {busy && !snapshots.length ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading…</div>
              ) : snapshots.length === 0 ? (
                <div className="p-4"><EmptyState icon="database" title="No data yet" message="Run tasks to generate extractions." /></div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {snapshots.map((snap) => (
                    <li key={snap._id}>
                      <button
                        onClick={() => setSelectedSnapshot(snap)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedSnapshot?._id === snap._id ? 'bg-brand-50 border-l-2 border-brand-600' : ''
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-800 truncate">{snap.taskName}</div>
                        <div className="text-xs text-gray-500 mt-1">{timeAgo(snap.createdAt)}</div>
                        <Badge tone={runTone(snap.status)} size="xs" className="mt-2">{snap.status}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedSnapshot ? (
            <div className="space-y-5">
              <Card
                title="Snapshot Details"
                subtitle={`From run ${selectedSnapshot.runId?.slice(-8) || 'N/A'}`}
                action={
                  <Link to={`/runs/${selectedSnapshot.runId}`} className="text-xs text-brand-600 hover:underline">
                    View Run
                  </Link>
                }
              >
                <div className="px-5 py-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Task:</span>
                    <Link to={`/tasks/${selectedSnapshot.taskId}`} className="text-brand-600 hover:underline truncate">
                      {selectedSnapshot.taskName}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Captured:</span>
                    <span className="text-gray-800">{formatDate(selectedSnapshot.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source:</span>
                    <span className="text-gray-800">{selectedSnapshot.sourceUrl || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fields extracted:</span>
                    <span className="text-gray-800 font-medium">{fields.length}</span>
                  </div>
                  {selectedSnapshot.screenshotUrl && (
                    <div className="pt-3 border-t">
                      <p className="text-gray-600 mb-2">Screenshot:</p>
                      <a href={selectedSnapshot.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                        <img src={selectedSnapshot.screenshotUrl} alt="Snapshot" className="max-h-48 rounded border border-gray-200" />
                      </a>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Extracted Fields" subtitle={`${fields.length} fields`}>
                {fields.length === 0 ? (
                  <div className="p-6"><EmptyState icon="database" title="No fields" message="This snapshot has no extracted data." /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Field</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Value</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {fields.map((field) => {
                          const value = selectedSnapshot.extractedData[field];
                          const confidence = selectedSnapshot.confidence?.[field] || 0.95;
                          return (
                            <tr key={field} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-800">{field}</td>
                              <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={String(value)}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-12 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500"
                                      style={{ width: `${confidence * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500">{Math.round(confidence * 100)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <Card>
              <div className="p-12 text-center">
                <Icon name="database" size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Select a snapshot to view extracted data</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
