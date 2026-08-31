import { useEffect, useState, useCallback } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState, Modal, ConfirmDialog } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/format.js';

export default function Schemas() {
  const toast = useToast();
  const [schemas, setSchemas] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', fields: [{ name: '', selector: '', type: 'string' }] });
  const [createBusy, setCreateBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/schemas');
      setSchemas(data.data.schemas || []);
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
      await api.post('/schemas', createForm);
      toast.success('Extraction schema created.');
      setCreateOpen(false);
      setCreateForm({ name: '', fields: [{ name: '', selector: '', type: 'string' }] });
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreateBusy(false);
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
        meta={`${schemas.length} schemas available`}
        action={<Button onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> Create schema</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

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
                    <td className="px-4 py-3 text-right">
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
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCreateForm({
                ...createForm,
                fields: [...createForm.fields, { name: '', selector: '', type: 'string' }]
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
    </div>
  );
}
