import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState, Modal, ConfirmDialog } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/format.js';

export default function Schemas() {
  const toast = useToast();
  const [schemas, setSchemas] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', schemaType: 'custom', repeatingSelector: '', fields: [{ name: '', selector: '', type: 'string', isRequired: false, transform: 'trim' }] });
  const [createBusy, setCreateBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editOpen, setEditOpen] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', status: 'ACTIVE' });
  const [testOpen, setTestOpen] = useState(null);
  const [testHtml, setTestHtml] = useState('<div class="price">₹5,400</div>');
  const [testResult, setTestResult] = useState(null);
  const [testBusy, setTestBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/schemas');
      setSchemas(data.data.schemas || data.data || []);
      try {
        const s = await api.get('/schemas/stats');
        setStats(s.data.data);
      } catch { /* stats optional */ }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load schemas'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setCreateBusy(true);
    try {
      const payload = {
        name: createForm.name,
        schemaType: createForm.schemaType,
        repeatingSelector: createForm.repeatingSelector,
        fields: createForm.fields.map((f) => ({
          name: f.name,
          selector: f.selector,
          type: f.type,
          isRequired: !!f.isRequired,
          normalization: { transform: f.transform || 'trim' },
        })),
      };
      await api.post('/schemas', payload);
      toast.success('Extraction schema created.');
      setCreateOpen(false);
      setCreateForm({ name: '', schemaType: 'custom', repeatingSelector: '', fields: [{ name: '', selector: '', type: 'string', isRequired: false, transform: 'trim' }] });
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreateBusy(false);
    }
  };

  const openEdit = (sch) => {
    setEditOpen(sch);
    setEditForm({ name: sch.name, status: sch.status || 'ACTIVE' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/schemas/${editOpen._id}`, editForm);
      toast.success('Schema updated.');
      setEditOpen(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const runTest = async () => {
    setTestBusy(true);
    setTestResult(null);
    try {
      const { data } = await api.post(`/schemas/${testOpen._id}/test`, { html: testHtml });
      setTestResult(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Schema test failed'));
    } finally {
      setTestBusy(false);
    }
  };

  const deleteSchema = async () => {
    try {
      await api.delete(`/schemas/${confirmDelete._id}`);
      toast.success('Schema deleted.');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const field = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extraction Schemas"
        subtitle="Define field extraction rules for data parsing"
        meta={`${schemas.length} schemas available${stats?.total ? ` · ${stats.total} active` : ''}`}
        action={<Button onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> Create schema</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {stats?.byType && (
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {Object.entries(stats.byType).map(([k, v]) => (
            <span key={k} className="px-2.5 py-1 rounded-full bg-white border border-gray-200">{k}: {v}</span>
          ))}
        </div>
      )}

      <Card>
        {busy && !schemas.length ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading…</div>
        ) : schemas.length === 0 ? (
          <div className="p-6"><EmptyState icon="schema" title="No schemas yet" message="Create extraction schemas to structure data from web pages." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Fields</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Accuracy</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Usage</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schemas.map((sch) => (
                  <tr key={sch._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{sch.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone="purple" size="xs">{sch.type || 'css'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {sch.fields?.length || 0} fields
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-8 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${Math.round(((sch.accuracy || 0.85) * 100))}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round((sch.accuracy || 0.85) * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{sch.usageCount || 0}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setTestOpen(sch)} className="text-xs text-brand-600 hover:underline mr-2">Test</button>
                      <button onClick={() => openEdit(sch)} className="text-xs text-brand-600 hover:underline mr-2">Edit</button>
                      <Link to={`/tasks/new?schemaId=${sch._id}`} className="text-xs text-brand-600 hover:underline mr-2">Use in task</Link>
                      <button
                        onClick={() => setConfirmDelete(sch)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Extraction Schema">
        <form onSubmit={create} className="space-y-4 max-h-96 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Schema name</label>
              <input
                type="text"
                className={field}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                minLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select className={field} value={createForm.schemaType} onChange={(e) => setCreateForm({ ...createForm, schemaType: e.target.value })}>
                {['pricing', 'offers', 'availability', 'content', 'campaign', 'custom'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Repeating selector (optional, for lists)</label>
            <input type="text" placeholder=".card" className={field} value={createForm.repeatingSelector}
              onChange={(e) => setCreateForm({ ...createForm, repeatingSelector: e.target.value })} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fields</label>
            {createForm.fields.map((f, i) => (
              <div key={i} className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Field name"
                    className={field}
                    value={f.name}
                    onChange={(e) => {
                      const nf = [...createForm.fields];
                      nf[i].name = e.target.value;
                      setCreateForm({ ...createForm, fields: nf });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="CSS selector"
                    className={field}
                    value={f.selector}
                    onChange={(e) => {
                      const nf = [...createForm.fields];
                      nf[i].selector = e.target.value;
                      setCreateForm({ ...createForm, fields: nf });
                    }}
                  />
                  <select
                    className={field}
                    value={f.type}
                    onChange={(e) => {
                      const nf = [...createForm.fields];
                      nf[i].type = e.target.value;
                      setCreateForm({ ...createForm, fields: nf });
                    }}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                    <option value="array">Array</option>
                    <option value="object">Object</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className={field}
                      value={f.transform || 'trim'}
                      onChange={(e) => {
                        const nf = [...createForm.fields];
                        nf[i].transform = e.target.value;
                        setCreateForm({ ...createForm, fields: nf });
                      }}
                      title="Normalization"
                    >
                      <option value="trim">trim</option>
                      <option value="uppercase">UPPERCASE</option>
                      <option value="lowercase">lowercase</option>
                      <option value="parseFloat">parse number</option>
                      <option value="parseDate">parse date</option>
                      <option value="none">none</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={!!f.isRequired}
                        onChange={(e) => {
                          const nf = [...createForm.fields];
                          nf[i].isRequired = e.target.checked;
                          setCreateForm({ ...createForm, fields: nf });
                        }}
                      />
                      Required
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCreateForm({
                ...createForm,
                fields: [...createForm.fields, { name: '', selector: '', type: 'string', isRequired: false, transform: 'trim' }]
              })}
              className="text-sm text-brand-600 hover:underline"
            >
              + Add field
            </button>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={createBusy}>{createBusy ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete schema?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"?`}
        action="Delete"
        onConfirm={deleteSchema}
      />

      <Modal open={!!editOpen} onClose={() => setEditOpen(null)} title={`Edit schema — ${editOpen?.name || ''}`}>
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input className={field} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required minLength={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select className={field} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
              {['ACTIVE', 'TESTING', 'DEPRECATED', 'ARCHIVED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button variant="secondary" onClick={() => setEditOpen(null)}>Cancel</Button>
            <Button>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!testOpen} onClose={() => { setTestOpen(null); setTestResult(null); }} title={`Test schema — ${testOpen?.name || ''}`}>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <textarea className={field} rows="5" value={testHtml} onChange={(e) => setTestHtml(e.target.value)} placeholder="Paste sample HTML" />
          <Button onClick={runTest} disabled={testBusy}>{testBusy ? 'Testing…' : 'Run test (POST /schemas/:id/test)'}</Button>
          {testResult && (
            <div className="text-xs space-y-2">
              <p className="text-gray-600">Confidence: <span className="font-medium">{typeof testResult.confidence === 'number' ? `${Math.round(testResult.confidence * 100)}%` : `${testResult.accuracy ?? '—'}%`}</span></p>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-x-auto max-h-48">{JSON.stringify(testResult.results ?? testResult, null, 2)}</pre>
              {(testResult.errors?.length > 0) && (
                <ul className="list-disc list-inside text-red-600">
                  {testResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {(testResult.warnings?.length > 0) && (
                <ul className="list-disc list-inside text-amber-700">
                  {testResult.warnings.map((w, i) => <li key={i}>{w.field ? `${w.field}: ` : ''}{w.issue}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
