import { useEffect, useState, useCallback } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Button, Card, ErrorBanner, EmptyState, Modal, ConfirmDialog } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, formatRole } from '../lib/format.js';

const ROLES = ['admin', 'manager', 'analyst', 'viewer'];
const roleTone = (r) => (r === 'admin' ? 'red' : r === 'manager' ? 'amber' : r === 'analyst' ? 'blue' : 'gray');
const field = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'analyst' });
  const [createBusy, setCreateBusy] = useState(false);
  const [roleEditing, setRoleEditing] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.data.users);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load users'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setCreateBusy(true);
    try {
      await api.post('/auth/users', createForm);
      toast.success(`User "${createForm.username}" created.`);
      setCreateOpen(false);
      setCreateForm({ username: '', email: '', password: '', role: 'analyst' });
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create user (password must be ≥ 12 characters with upper/lowercase, a number, and a special character)'));
    } finally {
      setCreateBusy(false);
    }
  };

  const changeRole = async (id) => {
    try {
      await api.patch(`/auth/users/${id}/role`, { role: roleEditing });
      toast.success('Role updated.');
      setRoleEditing(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change role'));
    }
  };

  const toggleActive = async () => {
    const u = confirmToggle;
    setToggleBusy(true);
    try {
      await api.patch(`/auth/users/${u.id}/status`, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Account deactivated.' : 'Account activated.');
      setConfirmToggle(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update status'));
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Create accounts, assign roles and control access."
        meta={`${users.length} users`}
        action={<Button onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> Create user</Button>}
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      <Card>
        {busy && !users.length ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-6"><EmptyState icon="users" title="No users yet" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-gray-800">
                        <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 text-xs flex items-center justify-center uppercase">{u.username?.[0]}</span>
                        {u.username}
                        {me?.id === u.id && <span className="text-[10px] text-gray-400">(you)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {roleEditing?.id === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <select value={roleEditing.role} onChange={(e) => setRoleEditing({ ...roleEditing, role: e.target.value })} className="border border-gray-300 rounded px-2 py-1 text-xs">
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <Button size="xs" variant="success" onClick={() => changeRole(u.id)}>Save</Button>
                          <Button size="xs" variant="ghost" onClick={() => setRoleEditing(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Badge tone={roleTone(u.role)}>{formatRole(u.role)}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge tone={u.isActive ? 'green' : 'red'} dot>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="xs" variant="secondary" onClick={() => setRoleEditing({ id: u.id, role: u.role })}>Change role</Button>
                        {me?.id !== u.id && (
                          <Button size="xs" variant={u.isActive ? 'ghost' : 'secondary'} onClick={() => setConfirmToggle(u)}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create user"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={createBusy}>{createBusy ? 'Creating…' : 'Create user'}</Button>
          </>
        }>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input className={field} value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} minLength={3} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" className={field} value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" className={field} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} minLength={12} required pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}" title="Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a special character." placeholder="Min 12 characters" />
              <p className="mt-1 text-xs text-gray-500">At least 12 characters, with uppercase, lowercase, a number, and a special character.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select className={field} value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{formatRole(r)}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">Passwords are stored hashed (bcrypt) and are never returned by the API.</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isActive ? 'Deactivate account?' : 'Activate account?'}
        message={confirmToggle ? `${confirmToggle.username} will be ${confirmToggle.isActive ? 'blocked from signing in' : 'allowed to sign in'}. Permissions are otherwise unchanged.` : ''}
        confirmLabel={confirmToggle?.isActive ? 'Deactivate' : 'Activate'}
        busy={toggleBusy}
        onConfirm={toggleActive}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}