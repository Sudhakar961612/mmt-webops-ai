import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';
import Icon from '../components/Icons.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
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
              placeholder='********'
              required
            />
          </div>
          <button
            disabled={busy}
            className='w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 rounded-lg disabled:opacity-60 transition-colors'>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className='mt-4 text-sm text-center text-gray-500'>Sign in with your assigned account.</p>
        <div className='mt-4 text-sm text-center'>
          <Link to='/register' className='text-brand-600 hover:underline'>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
