import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';
import Icon from '../components/Icons.jsx';

// Demo accounts shown behind a clearly-labelled collapsible section. These are
// reference/demo credentials only — never production secrets.
const DEMO_ACCOUNTS = [
  { role: 'Admin', username: 'admin@mmt.local', password: 'Admin@Secure#2026!' },
  { role: 'Manager', username: 'manager@mmt.local', password: 'Manager@Secure#2026!' },
  { role: 'Analyst', username: 'analyst@mmt.local', password: 'Analyst@Secure#2026!' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.identifier, form.password);
      const from = location.state?.from?.pathname;
      navigate(from || '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  const field =
    'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-900 to-brand-700 px-4 py-10'>
      <div className='w-full max-w-md bg-white rounded-2xl shadow-2xl p-8'>
        <div className='text-center mb-6'>
          <div className='w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center'>
            <Icon name='sparkle' size={28} />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 mt-3'>MMT WebOps AI</h1>
          <p className='text-sm text-gray-500 mt-1'>Autonomous operations console</p>
        </div>

        {error && (
          <div className='mb-4 bg-red-50 text-red-700 text-sm rounded-lg p-3 border border-red-200'>
            {error}
          </div>
        )}

        <form onSubmit={submit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700'>Email or username</label>
            <input
              className={field}
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              autoComplete='username'
              placeholder='you@company.com'
              required
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700'>Password</label>
            <input
              type='password'
              className={field}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete='current-password'
              placeholder='••••••••'
              required
            />
          </div>
          <button
            disabled={busy}
            className='w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 rounded-lg disabled:opacity-60 transition-colors'>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className='mt-4 text-sm text-center text-gray-500'>
          Sign in with your assigned account.
        </p>

        <div className='mt-5 border-t border-gray-100 pt-4'>
          <button
            type='button'
            onClick={() => setShowDemo((v) => !v)}
            className='w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-800'>
            <span className='inline-flex items-center gap-1.5'>
              <Icon name='sparkle' size={15} /> Demo credentials
            </span>
            <span className={`transition-transform ${showDemo ? 'rotate-180' : ''}`}>
              <Icon name='chevron' size={16} />
            </span>
          </button>
          {showDemo && (
            <div className='mt-3 space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3'>
              <p className='text-xs text-amber-800'>
                Reference accounts for the review. MMT WebOps AI demo only — these are not
                production credentials.
              </p>
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.role}
                  type='button'
                  onClick={() => setForm({ identifier: a.username, password: a.password })}
                  className='w-full flex items-center justify-between text-xs text-left px-3 py-2 bg-white rounded-lg border border-amber-200 hover:border-amber-400'>
                  <span className='font-semibold text-amber-900'>{a.role}</span>
                  <span className='text-gray-500 font-mono'>{a.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className='mt-4 text-sm text-center'>
          <Link to='/register' className='text-brand-600 hover:underline'>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
