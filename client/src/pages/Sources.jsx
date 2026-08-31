import { useEffect, useState, useCallback } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState, Modal, ConfirmDialog } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/format.js';

const categoryOptions = ['competitor', 'partner', 'internal', 'public', 'demo'];
const statusTone = (s) => (s === 'ACTIVE' ? 'green' : s === 'PENDING_REVIEW' ? 'amber' : s === 'RESTRICTED' ? 'red' : 'gray');

export default function Sources() {
  const toast = useToast();
  const [sources, setSources] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', domains: [], category: 'public' });
  const [createBusy, setCreateBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/sources');
      setSources(data.data.sources || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load sources'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setCreateBusy(true);
    try {
      await api.post('/sources', createForm);
      toast.success('Source created.');
      setCreateOpen(false);
      setCreateForm({ name: '', domains: [], category: 'public' });
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreateBusy(false);
    }
  };

  const deleteSource = async () => {
    try {
      await api.delete(`/sources/${confirmDelete._id}`);
      toast.success('Source deleted.');
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
        title="Sources"
        subtitle="Manage approved domains and source governance"
        meta={`${sources.length} sources`}
        action={<Button onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> Add source</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <Card>
        {busy && !sources.length ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading…</div>
        ) : sources.length === 0 ? (
          <div className="p-6"><EmptyState icon="link" title="No sources yet" message="Add domains to allow automation access." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Domains</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Rate Limit</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.map((src) => (
                  <tr key={src._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{src.name}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <Badge tone="blue" size="xs">{src.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                      {src.domains?.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(src.status)} size="xs">{src.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {src.rateLimit?.requestsPerHour || 10}/hour
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDelete(src)}
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Source">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
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
            <label className="block text-sm font-medium text-gray-700">Domains (comma-separated)</label>
            <input
              type="text"
              className={field}
              value={createForm.domains.join(', ')}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  domains: e.target.value.split(',').map((d) => d.trim()).filter(Boolean),
                })
              }
              placeholder="example.com, *.example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              className={field}
              value={createForm.category}
              onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={createBusy}>{createBusy ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete source?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        action="Delete"
        onConfirm={deleteSource}
      />
    </div>
  );
}
