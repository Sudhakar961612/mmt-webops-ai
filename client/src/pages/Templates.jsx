import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState, Modal, ConfirmDialog } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/format.js';

const categoryOptions = ['competitor_offer', 'hotel_pricing', 'campaign_page', 'partner_update', 'travel_trend', 'custom'];

export default function Templates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', category: 'custom', targetPattern: '' });
  const [createBusy, setCreateBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [useBusy, setUseBusy] = useState(null);
  const navigate = useNavigate();

  // Use a template: POST /templates/:id/use then open the created task.
  const useTemplate = async (tpl) => {
    setUseBusy(tpl._id);
    setError('');
    try {
      const { data } = await api.post(`/templates/${tpl._id}/use`);
      const task = data.data;
      toast.success(`Task "${task.name}" created from template.`);
      navigate(`/tasks/${task._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create task from template'));
    } finally {
      setUseBusy(null);
    }
  };

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/templates');
      setTemplates(data.data.templates || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load templates'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setCreateBusy(true);
    try {
      await api.post('/templates', createForm);
      toast.success('Template created.');
      setCreateOpen(false);
      setCreateForm({ name: '', category: 'custom', targetPattern: '' });
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreateBusy(false);
    }
  };

  const deleteTemplate = async () => {
    try {
      await api.delete(`/templates/${confirmDelete._id}`);
      toast.success('Template deleted.');
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
        title="Task Templates"
        subtitle="Reusable monitoring workflows for common tasks"
        meta={`${templates.length} templates available`}
        action={<Button onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> Create template</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {busy && !templates.length ? (
          <div className="col-span-full p-10 text-center text-sm text-gray-500">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full"><Card><div className="p-6"><EmptyState icon="template" title="No templates yet" message="Create templates to help analysts reuse workflows." /></div></Card></div>
        ) : (
          templates.map((tpl) => (
            <Card key={tpl._id} className="relative">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-800 truncate">{tpl.name}</h3>
                    <Badge tone="blue" size="xs" className="mt-2">{tpl.category}</Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-3">Target: {tpl.targetPattern}</p>
                <div className="text-xs text-gray-500 mb-4">
                  {tpl.usageCount || 0} uses · Created {timeAgo(tpl.createdAt)}
                </div>
                <div className="flex gap-2">
                  <Button size="xs" variant="secondary" className="flex-1" onClick={() => useTemplate(tpl)} disabled={useBusy === tpl._id}>
                    {useBusy === tpl._id ? 'Using…' : 'Use'}
                  </Button>
                  <button
                    onClick={() => setConfirmDelete(tpl)}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Task Template">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Template name</label>
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Target pattern</label>
            <input
              type="text"
              className={field}
              value={createForm.targetPattern}
              onChange={(e) => setCreateForm({ ...createForm, targetPattern: e.target.value })}
              placeholder="e.g., demo:hotels or https://example.com"
              required
            />
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
        title="Delete template?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"?`}
        action="Delete"
        onConfirm={deleteTemplate}
      />
    </div>
  );
}
