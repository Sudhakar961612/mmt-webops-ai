import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Button, ErrorBanner } from '../components/ui.jsx';
import ProgressStepper from '../components/ProgressStepper.jsx';
import { CronPreset } from '../components/CronPreset.jsx';

const STEPS = [
  { key: 'objective', label: 'Objective' },
  { key: 'source', label: 'Source / target' },
  { key: 'fields', label: 'Expected fields' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'approval', label: 'Approval mode' },
  { key: 'review', label: 'Create' },
];
const TYPES = [
  { value: 'hotel_monitor', label: 'Hotel monitor', hint: 'Prices, ratings, availability' },
  { value: 'flight_monitor', label: 'Flight monitor', hint: 'Airfares and seats' },
  { value: 'price_monitor', label: 'Price monitor', hint: 'Pricing changes' },
  { value: 'generic', label: 'Generic', hint: 'Any structured data' },
];
const field = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function NewTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const [demoPages, setDemoPages] = useState([]);
  const [demoError, setDemoError] = useState('');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', type: 'hotel_monitor', target: 'demo:hotels', customUrl: '', fields: '', schemaId: '', schedule: '', autoApprove: false });
  const [schemas, setSchemas] = useState([]);
  const [testHtml, setTestHtml] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testBusy, setTestBusy] = useState(false);

  useEffect(() => {
    api.get('/demo').then((d) => setDemoPages(d.data.data.pages)).catch((e) => setDemoError(getErrorMessage(e)));
    api.get('/schemas').then((d) => setSchemas(d.data.data || d.data.data.schemas || [])).catch(() => {});
    const preset = searchParams.get('schemaId');
    if (preset) setForm((f) => ({ ...f, schemaId: preset }));
  }, [searchParams]);

  const target = form.target.startsWith('custom:') ? form.customUrl.trim() : form.target;
  const fieldKeys = useMemo(() => form.fields.split(/[\n,]/).map((s) => s.trim()).filter(Boolean), [form.fields]);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const canApprove = can('admin', 'manager');

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/tasks', {
        name: form.name, description: form.description, type: form.type, target,
        schedule: form.schedule, autoApprove: form.autoApprove,
        extractionSchema: form.schemaId || null,
        extractors: fieldKeys.length ? Object.fromEntries(fieldKeys.map((k) => [k, `#${k}`])) : {},
      });
      toast.success('Task created.');
      navigate(`/tasks/${data.data.task._id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create task'));
    } finally {
      setBusy(false);
    }
  };

  const testExtraction = async () => {
    setTestBusy(true);
    setTestResult(null);
    try {
      const fieldDefs = fieldKeys.map((k) => ({ name: k, type: 'string', selector: `#${k}` }));
      const payload = form.schemaId
        ? { schemaId: form.schemaId, ...(testHtml ? { html: testHtml } : { record: Object.fromEntries(fieldKeys.map((k) => [k, k])) }) }
        : { fields: fieldDefs, ...(testHtml ? { html: testHtml } : { record: Object.fromEntries(fieldKeys.map((k) => [k, `sample ${k}`])) }) };
      const { data } = await api.post('/extract', payload);
      setTestResult(data.data);
    } catch (err) {
      setTestResult({ error: getErrorMessage(err, 'Test failed') });
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Create a monitoring task"
        subtitle="Configure a recurring web operation step by step. Setup (steps 1–5) feeds the 10-phase workflow that runs after approval." />
      <ProgressStepper steps={STEPS} current={step} />
      {demoError && <ErrorBanner message={demoError} />}
      {error && <ErrorBanner message={error} />}
      <form onSubmit={(e) => { e.preventDefault(); create(); }} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Task name</label>
              <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={3} required placeholder="e.g. Goa hotel rate monitor" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Task type</label>
              <div className="mt-2 grid sm:grid-cols-2 gap-3">
                {TYPES.map((t) => (
                  <button type="button" key={t.value} onClick={() => setForm({ ...form, type: t.value })}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${form.type === t.value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="font-medium text-gray-800">{t.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <textarea className={field} rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should this task watch?" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Source / target</label>
              <select className={field} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                {demoPages.map((p) => <option key={p.key} value={`demo:${p.key}`}>{p.name} (demo:{p.key})</option>)}
                <option value="custom:url">Custom URL…</option>
              </select>
              {form.target.startsWith('custom:') && (
                <input className={`${field} mt-2`} placeholder="https://example.com" value={form.customUrl} onChange={(e) => setForm({ ...form, customUrl: e.target.value })} required />
              )}
              <p className="text-xs text-gray-500 mt-2">Use a local demo page or an absolute http(s) URL.</p>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Extraction schema (optional)</label>
              <select className={field} value={form.schemaId} onChange={(e) => setForm({ ...form, schemaId: e.target.value })}>
                <option value="">No schema — use embedded data / selectors</option>
                {(Array.isArray(schemas) ? schemas : schemas?.schemas || []).map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.schemaType || s.type || 'custom'} · v{s.version || 1})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Reusable typed fields with validation + confidence. Manage in Extraction Schemas.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expected fields</label>
              <textarea className={field} rows="4" value={form.fields} onChange={(e) => setForm({ ...form, fields: e.target.value })}
                placeholder={'One field per line (or comma separated)\nprice\nroomsAvailable\nbestDeal'} />
              <p className="text-xs text-gray-500 mt-2">
                {fieldKeys.length ? `Fields to monitor: ${fieldKeys.join(', ')}` : "Leave empty to use the page's embedded data automatically."}
              </p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Test extraction (POST /api/extract)</span>
                <Button type="button" variant="secondary" size="sm" onClick={testExtraction} disabled={testBusy}>
                  {testBusy ? 'Testing…' : 'Run test'}
                </Button>
              </div>
              <textarea className={field} rows="3" value={testHtml} onChange={(e) => setTestHtml(e.target.value)}
                placeholder="Optional: paste sample HTML to test selectors, or leave empty to normalize a sample record." />
              {testResult && (
                <div className="text-xs">
                  {testResult.error ? (
                    <p className="text-red-600">{testResult.error}</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-gray-600">Confidence: <span className="font-medium text-gray-800">{typeof testResult.confidence === 'number' ? `${Math.round(testResult.confidence * 100)}%` : '—'}</span></p>
                      <pre className="bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto max-h-40">{JSON.stringify(testResult.data ?? testResult.results ?? testResult, null, 2)}</pre>
                      {(testResult.warnings?.length > 0) && (
                        <ul className="list-disc list-inside text-amber-700">
                          {testResult.warnings.slice(0, 5).map((w, i) => <li key={i}>{w.field ? `${w.field}: ` : ''}{w.issue}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
            <CronPreset label="Schedule" value={form.schedule} onChange={(v) => setForm({ ...form, schedule: v })} />
            <p className="text-xs text-gray-500 mt-2">Choose a preset or enter a custom cron expression. The readable label shows on the Schedule page.</p>
          </div>
        )}
        {step === 4 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Approval mode</label>
            <div className="mt-2 space-y-3">
              {canApprove ? (
                <>
                  <label className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${!form.autoApprove ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
                    <input type="radio" checked={!form.autoApprove} onChange={() => setForm({ ...form, autoApprove: false })} />
                    <div>
                      <div className="font-medium text-gray-800">Require approval</div>
                      <div className="text-xs text-gray-500">Plan is generated, then a manager/admin reviews before execution.</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${form.autoApprove ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
                    <input type="radio" checked={form.autoApprove} onChange={() => setForm({ ...form, autoApprove: true })} />
                    <div>
                      <div className="font-medium text-gray-800">Auto-approve</div>
                      <div className="text-xs text-gray-500">Plan executes immediately after generation (manager/admin only).</div>
                    </div>
                  </label>
                </>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
                  Your tasks always require approval by a manager or admin before execution. This keeps the review workflow safe.
                </div>
              )}
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Review your task</h3>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Name', form.name],
                ['Type', TYPES.find((t) => t.value === form.type)?.label],
                ['Target', target],
                ['Fields', fieldKeys.join(', ') || 'Auto (embedded data)'],
                ['Schema', (Array.isArray(schemas) ? schemas : schemas?.schemas || []).find((s) => s._id === form.schemaId)?.name || 'None'],
                ['Schedule', form.schedule || 'None (manual)'],
                ['Approval', form.autoApprove ? 'Auto-approve' : 'Requires approval'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">{k}</dt>
                  <dd className="font-medium text-gray-700 break-words">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-gray-600 space-y-1">
              <div className="font-medium text-gray-700">The 10-phase workflow after creation</div>
              <ol className="list-decimal list-inside text-xs text-gray-500 space-y-0.5">
                <li>Task objective</li><li>Source / target</li><li>Expected fields</li><li>Schedule</li><li>Approval mode</li>
                <li>AI plan</li><li>Execution</li><li>Extracted data</li><li>Comparison</li><li>AI insight</li>
              </ol>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Button variant="secondary" type="button" onClick={back} disabled={step === 0 || busy}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>Continue</Button>
          ) : (
            <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create task'}</Button>
          )}
        </div>
      </form>
    </div>
  );
}