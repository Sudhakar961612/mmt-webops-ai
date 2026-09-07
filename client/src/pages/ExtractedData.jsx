import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage, downloadExport } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { formatDate, timeAgo } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

const runTone = (status) => {
  if (status === 'COMPLETED') return 'green';
  if (status === 'RUNNING') return 'blue';
  if (status === 'FAILED') return 'red';
  if (status === 'AWAITING_APPROVAL') return 'amber';
  return 'gray';
};

export default function ExtractedData() {
  const toast = useToast();
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      // GET /runs returns run records (snapshot is an ObjectId here) — the
      // full snapshot payload comes from GET /runs/:id.
      const { data } = await api.get('/runs?limit=50');
      setRuns(data.data.runs || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load extracted data'));
    } finally {
      setBusy(false);
    }
  }, []);

  const loadDetail = useCallback(async (runId) => {
    if (!runId) return;
    setDetailBusy(true);
    try {
      const { data } = await api.get(`/runs/${runId}`);
      setDetail(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load snapshot'));
    } finally {
      setDetailBusy(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const select = (runId) => {
    setSelectedRunId(runId);
    setDetail(null);
    loadDetail(runId);
  };

  const snapshot = detail?.snapshot || null;
  const meta = snapshot?.meta || {};
  const fieldMeta = meta.fieldMeta || {};
  const warnings = meta.extractionWarnings || [];
  const fields = snapshot ? Object.keys(snapshot.extractedData || {}) : [];
  const confidenceOf = (f) => {
    const c = fieldMeta[f]?.confidence;
    return typeof c === 'number' ? c : null;
  };

  const exportRun = async (runId, format) => {
    try {
      await downloadExport(`/exports/runs/${runId}?format=${format}`, `run-${runId}.${format}`);
      toast.success(`Exported run as ${format.toUpperCase()}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export failed'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extracted Data"
        subtitle="Snapshots load from the run detail endpoint with confidence and warnings"
        meta={`${runs.length} runs available`}
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <Card title="Runs" subtitle={`${runs.length} recent`}>
            <div className="max-h-96 overflow-y-auto">
              {busy && !runs.length ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading…</div>
              ) : runs.length === 0 ? (
                <div className="p-4"><EmptyState icon="database" title="No data yet" message="Run tasks to generate extractions." /></div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {runs.map((r) => (
                    <li key={r._id}>
                      <button
                        onClick={() => select(r._id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedRunId === r._id ? 'bg-brand-50 border-l-2 border-brand-600' : ''
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-800 truncate">{r.task?.name || 'Task'}</div>
                        <div className="text-xs text-gray-500 mt-1">{timeAgo(r.createdAt)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge tone={runTone(r.status)} size="xs">{r.status}</Badge>
                          {r.errorCode && <Badge tone="red" size="xs">{r.errorCode}</Badge>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedRunId ? (
            <Card>
              <div className="p-12 text-center">
                <Icon name="database" size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Select a run to view its snapshot</p>
              </div>
            </Card>
          ) : detailBusy && !snapshot ? (
            <Card><div className="p-10 text-center text-sm text-gray-500">Loading snapshot…</div></Card>
          ) : snapshot ? (
            <div className="space-y-5">
              {meta.screenshotTruncated && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
                  Screenshot dropped — exceeded the backend cap ({Math.round((meta.screenshotBytes || 0) / 1024)} KB). Data below is unaffected.
                </div>
              )}
              {warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="font-medium">Extraction warnings ({warnings.length})</div>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {warnings.slice(0, 8).map((w, i) => (
                      <li key={i}>{w.field ? `${w.field}: ` : ''}{w.issue} (confidence {w.confidence})</li>
                    ))}
                  </ul>
                </div>
              )}
              <Card
                title="Snapshot Details"
                subtitle={`From run ${selectedRunId?.slice(-8) || 'N/A'} · mode: ${meta.extractionMode || '—'}${
                  typeof meta.extractionConfidence === 'number' ? ` · confidence ${Math.round(meta.extractionConfidence * 100)}%` : ''
                }`}
                action={
                  <div className="flex items-center gap-3">
                    <button onClick={() => exportRun(selectedRunId, 'json')} className="text-xs text-brand-600 hover:underline">Export JSON</button>
                    <button onClick={() => exportRun(selectedRunId, 'csv')} className="text-xs text-brand-600 hover:underline">Export CSV</button>
                    <Link to={`/runs/${selectedRunId}`} className="text-xs text-brand-600 hover:underline">View Run</Link>
                  </div>
                }
              >
                <div className="px-5 py-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Task:</span>
                    <Link to={detail?.run?.task?._id ? `/tasks/${detail.run.task._id}` : '#'} className="text-brand-600 hover:underline truncate">
                      {detail?.run?.task?.name || '—'}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Captured:</span>
                    <span className="text-gray-800">{formatDate(snapshot.createdAt)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 shrink-0">Source:</span>
                    <span className="text-gray-800 font-mono text-xs break-all text-right">{snapshot.url || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fields extracted:</span>
                    <span className="text-gray-800 font-medium">{fields.length}</span>
                  </div>
                  {snapshot.screenshot && (
                    <div className="pt-3 border-t">
                      <p className="text-gray-600 mb-2">Screenshot:</p>
                      <a href={snapshot.screenshot} target="_blank" rel="noopener noreferrer" className="inline-block">
                        <img src={snapshot.screenshot} alt="Snapshot" className="max-h-48 rounded border border-gray-200" />
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
                        {fields.map((f) => {
                          const value = snapshot.extractedData[f];
                          const confidence = confidenceOf(f);
                          const issues = fieldMeta[f]?.issues || [];
                          return (
                            <tr key={f} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {f}
                                {issues.length > 0 && (
                                  <div className="text-xs font-normal text-amber-700 mt-0.5" title={issues.join('; ')}>⚠ {issues.length} issue{issues.length > 1 ? 's' : ''}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={String(value)}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </td>
                              <td className="px-4 py-3">
                                {confidence === null ? (
                                  <span className="text-xs text-gray-400">—</span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-12 bg-gray-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-green-500" style={{ width: `${confidence * 100}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-500">{Math.round(confidence * 100)}%</span>
                                  </div>
                                )}
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
            <Card><div className="p-10 text-center text-sm text-gray-500">No snapshot for this run yet.</div></Card>
          )}
        </div>
      </div>
    </div>
  );
}
