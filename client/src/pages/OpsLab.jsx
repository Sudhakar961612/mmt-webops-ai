import { useState } from 'react';
import api, { getErrorMessage, downloadExport } from '../api/client.js';
import { PageHeader, Card, Button, ErrorBanner } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

const field = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono';

function Panel({ title, subtitle, children }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </Card>
  );
}

function Result({ data }) {
  if (!data) return null;
  if (data.error) return <p className="text-sm text-red-600">{data.error}</p>;
  return (
    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto max-h-64">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function OpsLab() {
  const toast = useToast();
  const [taskId, setTaskId] = useState('');
  const [runId, setRunId] = useState('');
  const [html, setHtml] = useState('');
  const [record, setRecord] = useState('{"price_value": "₹5,400"}');
  const [prev, setPrev] = useState('{"price": 100}');
  const [curr, setCurr] = useState('{"price": 120}');
  const [busy, setBusy] = useState('');
  const [out, setOut] = useState({});

  const call = async (key, fn) => {
    setBusy(key);
    try {
      const res = await fn();
      setOut((o) => ({ ...o, [key]: res.data?.data ?? res.data }));
      toast.success('Done.');
    } catch (err) {
      setOut((o) => ({ ...o, [key]: { error: getErrorMessage(err) } }));
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ops Lab"
        subtitle="Direct console for the spec workflow APIs — plans, runs, extract, compare, complete, exports"
      />
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Plans" subtitle="POST /api/plans {taskId}">
          <input className={field} placeholder="taskId (Mongo ObjectId)" value={taskId} onChange={(e) => setTaskId(e.target.value)} />
          <Button size="sm" disabled={busy || !taskId} onClick={() => call('plans', () => api.post('/plans', { taskId }))}>
            {busy === 'plans' ? 'Working…' : 'Create plan'}
          </Button>
          <Result data={out.plans} />
        </Panel>
        <Panel title="Runs" subtitle="POST /api/runs {taskId} — manager/admin immediate execution">
          <input className={field} placeholder="taskId (Mongo ObjectId)" value={taskId} onChange={(e) => setTaskId(e.target.value)} />
          <Button size="sm" disabled={busy || !taskId} onClick={() => call('runs', () => api.post('/runs', { taskId }))}>
            {busy === 'runs' ? 'Running…' : 'Start run'}
          </Button>
          <Result data={out.runs} />
        </Panel>
        <Panel title="Extract" subtitle="POST /api/extract — normalize a record or parse HTML">
          <textarea className={field} rows="3" placeholder='Record JSON, e.g. {"price_value": "₹5,400"}' value={record} onChange={(e) => setRecord(e.target.value)} />
          <textarea className={field} rows="3" placeholder="Optional HTML to parse instead" value={html} onChange={(e) => setHtml(e.target.value)} />
          <Button
            size="sm"
            disabled={!!busy}
            onClick={() => {
              let payload;
              try {
                payload = html ? { html } : { record: JSON.parse(record || '{}') };
              } catch {
                toast.error('Record is not valid JSON');
                return;
              }
              call('extract', () => api.post('/extract', payload));
            }}
          >
            {busy === 'extract' ? 'Working…' : 'Run extract'}
          </Button>
          <Result data={out.extract} />
        </Panel>
        <Panel title="Compare" subtitle="POST /api/compare — diff two JSON objects">
          <textarea className={field} rows="3" value={prev} onChange={(e) => setPrev(e.target.value)} />
          <textarea className={field} rows="3" value={curr} onChange={(e) => setCurr(e.target.value)} />
          <Button
            size="sm"
            disabled={!!busy}
            onClick={() => {
              try {
                call('compare', () => api.post('/compare', { previous: JSON.parse(prev), current: JSON.parse(curr) }));
              } catch {
                toast.error('Previous/current must be valid JSON');
              }
            }}
          >
            {busy === 'compare' ? 'Working…' : 'Run compare'}
          </Button>
          <Result data={out.compare} />
        </Panel>
        <Panel title="Complete" subtitle="POST /api/complete {runId} — insight + notify">
          <input className={field} placeholder="runId (Mongo ObjectId)" value={runId} onChange={(e) => setRunId(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !runId} onClick={() => call('complete', () => api.post('/complete', { runId }))}>
              {busy === 'complete' ? 'Working…' : 'Complete run'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !runId}
              onClick={() => call('complete', () => api.post('/complete', { runId, regenerateInsight: true }))}
            >
              Regenerate
            </Button>
          </div>
          <Result data={out.complete} />
        </Panel>
        <Panel title="Exports" subtitle="GET /api/exports/runs/:id?format=json|csv">
          <input className={field} placeholder="runId (Mongo ObjectId)" value={runId} onChange={(e) => setRunId(e.target.value)} />
          <div className="flex gap-2">
            {['json', 'csv'].map((f) => (
              <Button
                key={f}
                size="sm"
                variant="secondary"
                disabled={busy || !runId}
                onClick={async () => {
                  setBusy(`export-${f}`);
                  try {
                    await downloadExport(`/exports/runs/${runId}?format=${f}`, `run-${runId}.${f}`);
                    toast.success(`Exported ${f.toUpperCase()}.`);
                  } catch (err) {
                    toast.error(getErrorMessage(err, 'Export failed'));
                  } finally {
                    setBusy('');
                  }
                }}
              >
                Download {f.toUpperCase()}
              </Button>
            ))}
          </div>
          {busy.startsWith('export') && <p className="text-xs text-gray-500">Preparing download…</p>}
        </Panel>
      </div>
    </div>
  );
}
