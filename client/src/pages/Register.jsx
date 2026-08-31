import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // Public registration only sends identity fields — never a role.
      const payload = { username: form.username, email: form.email, password: form.password };
      await register(payload);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-brand-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-5">Join the MMt WebOps AI platform</p>
        {error && <div className="mb-4 bg-red-100 text-red-700 text-sm rounded p-3">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input className={field} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" className={field} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={12} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}" title="Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a special character." />
            <p className="mt-1 text-xs text-gray-500">At least 12 characters, with upper &amp; lower case, a number, and a special character.</p>
          </div>
          <button disabled={busy} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 rounded disabled:opacity-60">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <div className="mt-4 text-sm text-center">
          <Link to="/login" className="text-brand-600 hover:underline">Already have an account? Sign in</Link>
        </div>
      </div>
    </div>
  );
}
