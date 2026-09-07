import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NAV, roleLabel } from '../config/nav.js';
import Icon from './Icons.jsx';
import api from '../api/client.js';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ai, setAi] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get('/system/status').then((res) => alive && setAi(res.data.data?.ai?.configured)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const items = NAV[user?.role] || NAV.analyst;

  const navList = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {items.map((n) => (
        <NavLink
          key={n.to} to={n.to} end={!!n.end} onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-white/10 text-white' : 'text-brand-100 hover:bg-white/5 hover:text-white'}`
          }
        >
          <Icon name={n.icon} size={18} className="shrink-0 opacity-80" />
          {n.label}
        </NavLink>
      ))}
    </nav>
  );

  const sidebarFooter = (
    <div className="px-4 py-4 border-t border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-brand-100 uppercase">
          {user?.username?.[0]}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">{user?.username}</div>
          <div className="text-xs text-brand-100/80">{roleLabel(user?.role)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-brand-900 z-30">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <Icon name="sparkle" size={20} className="text-brand-100" />
          </span>
          <div>
            <div className="text-white font-bold leading-tight">MMT WebOps AI</div>
            <div className="text-[11px] text-brand-100/80">Operations Console</div>
          </div>
        </div>
        {navList}
        {sidebarFooter}
      </aside>
      {/* __SIDEBAR__ */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <div className="lg:hidden flex items-center justify-between bg-brand-900 text-white px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-2 font-bold">
            <Icon name="sparkle" size={18} /> MMT WebOps AI
          </div>
          <button onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
            <Icon name="menu" size={22} />
          </button>
        </div>
        {mobileOpen && (
          <div className="lg:hidden bg-brand-900 text-white fixed inset-0 z-40 flex flex-col pt-16">
            <button onClick={() => setMobileOpen(false)} className="self-end p-3" aria-label="Close">
              <Icon name="x" size={22} />
            </button>
            {navList}
            {sidebarFooter}
          </div>
        )}
      {/* __MOBILE__ */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-gray-400 whitespace-nowrap truncate">
              <span>{roleLabel(user?.role)} workspace</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {user?.role === 'admin' && (
                <NavLink to="/health" className="hidden xl:inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800">
                  <Icon name="health" size={16} /> Health
                </NavLink>
              )}
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  ai === true
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : ai === false
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
                title={
                  ai === true
                    ? 'AI provider connected'
                    : ai === false
                    ? 'AI unavailable — deterministic fallback active'
                    : 'Checking AI status…'
                }
              >
                <span className={`w-1.5 h-1.5 rounded-full ${ai === true ? 'bg-emerald-500' : ai === false ? 'bg-amber-500' : 'bg-gray-400'}`} />
                <span className="hidden sm:inline">{ai === true ? 'Gemini configured' : ai === false ? 'AI · Fallback' : '…'}</span>
              </span>
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-200">
                <span className="text-sm font-medium text-gray-700">{user?.username}</span>
                <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-semibold">{user?.role}</span>
              </div>
              <button onClick={handleLogout} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                <Icon name="logout" size={16} />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>
        </header>
      {/* __TOPBAR__ */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </main>
        <footer className="text-center text-xs text-gray-400 py-5 border-t border-gray-100 mt-4">
          MMT WebOps AI · React · Node · MongoDB · Playwright · Demo Mode
        </footer>
      {/* __MAIN__ */}
      </div>
    </div>
  );
}
