import { useState, createContext, useContext, useEffect, useCallback, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/main.css';
import api from './utils/api';

// Pages
import Dashboard   from './pages/Dashboard';
import Purchase    from './pages/Purchase';
import Issue       from './pages/Issue';
import Fuel        from './pages/Fuel';
import Trips       from './pages/Trips';
import Invoicing   from './pages/Invoicing';
import Reports     from './pages/Reports';
import Trucks      from './pages/Trucks';
import Drivers     from './pages/Drivers';
import Stock       from './pages/Stock';
import Expenditure from './pages/Expenditure';
import Revenue     from './pages/Revenue';
import Maintenance from './pages/Maintenance';
import Users       from './pages/Users';
import Profile     from './pages/Profile';
import AuditLog    from './pages/AuditLog';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

const AlertsCtx = createContext(null);
export const useAlerts = () => useContext(AlertsCtx);

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('erp-theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('erp-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark(!dark) }}>{children}</ThemeCtx.Provider>;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const login = (userData, access, refresh) => {
    localStorage.setItem('access', access);
    localStorage.setItem('refresh', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };
  const logout = async () => {
    try { await api.post('/auth/logout/', { refresh: localStorage.getItem('refresh') }); } catch {}
    localStorage.clear();
    setUser(null);
  };
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

function AlertsProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/core/alerts/?unread=true');
      setUnreadCount(data.results?.length || data.length || 0);
    } catch {}
  }, [user]);
  useEffect(() => {
    fetchAlerts();
    const t = setInterval(fetchAlerts, 60000);
    return () => clearInterval(t);
  }, [fetchAlerts]);
  return <AlertsCtx.Provider value={{ unreadCount }}>{children}</AlertsCtx.Provider>;
}

const Icons = {
  Dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Fleet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 17h4V5H2v12h3m15 0h2v-3.34a2 2 0 0 0-.59-1.42L17.5 9H14"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  Inventory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Finance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Ops: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Admin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Theme: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
};

const NAV_ICONS = {
  Dashboard:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  Trucks:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Drivers:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a9 9 0 0 1 13 0"/><circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none"/></svg>,
  Trips:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17V9a6 6 0 0 1 6-6"/><path d="M18 7v8a6 6 0 0 1-6 6"/></svg>,
  Fuel:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22h12V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v18z"/><path d="M15 14h1a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L16 7"/><path d="M19 7v4"/><line x1="7" y1="10" x2="11" y2="10"/></svg>,
  Purchase:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  Issue:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  Stock:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  Invoicing:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Expenditure: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Revenue:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Maintenance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Reports:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
  Users:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  AuditLog:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
};

function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const NAV = [
    { label: 'Overview', items: [{ to: '/', icon: NAV_ICONS.Dashboard, label: 'Dashboard' }] },
    { label: 'Fleet', items: [
      { to: '/trucks',  icon: NAV_ICONS.Trucks,  label: 'Trucks',       module: 'trucks' },
      { to: '/drivers', icon: NAV_ICONS.Drivers, label: 'Drivers',      module: 'drivers' },
      { to: '/trips',   icon: NAV_ICONS.Trips,   label: 'Trips',        module: 'trips' },
      { to: '/fuel',    icon: NAV_ICONS.Fuel,    label: 'Fuel Control', module: 'fuel' },
    ]},
    { label: 'Inventory', items: [
      { to: '/purchase', icon: NAV_ICONS.Purchase, label: 'Purchase',     module: 'purchase' },
      { to: '/issue',    icon: NAV_ICONS.Issue,    label: 'Issue Items',  module: 'issue' },
      { to: '/stock',    icon: NAV_ICONS.Stock,    label: 'Stock Ledger', module: 'stock' },
    ]},
    { label: 'Financials', items: [
      { to: '/invoicing',    icon: NAV_ICONS.Invoicing,   label: 'Invoicing',    module: 'invoicing' },
      { to: '/expenditure',  icon: NAV_ICONS.Expenditure, label: 'Expenditure',  module: 'expenditure' },
      { to: '/revenue',      icon: NAV_ICONS.Revenue,     label: 'Revenue',      module: 'revenue' },
    ]},
    { label: 'System', items: [
      { to: '/maintenance', icon: NAV_ICONS.Maintenance, label: 'Maintenance', module: 'maintenance' },
      { to: '/reports',     icon: NAV_ICONS.Reports,     label: 'Reports',     module: 'reports' },
      { to: '/users',       icon: NAV_ICONS.Users,       label: 'Users',       adminOnly: true },
      { to: '/audit-log',   icon: NAV_ICONS.AuditLog,    label: 'Audit Log',   adminOnly: true },
    ]},
  ];

  const filteredNav = NAV.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.adminOnly && user?.role !== 'ADMIN') return false;
      if (user?.role !== 'ADMIN' && item.module) return (user?.module_permissions || []).includes(item.module);
      return true;
    })
  })).filter(group => group.items.length > 0);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 900, color: '#fff', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
          }}>T</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.1 }}>TAURUS</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Logistics ERP</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="nav-container">
        {filteredNav.map(group => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(item => {
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={`nav-item ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span style={{
                      marginLeft: 'auto', width: 6, height: 6,
                      borderRadius: '50%', background: 'rgba(255,255,255,0.7)', flexShrink: 0,
                    }} />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User + Sign Out */}
      <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, flexShrink: 0,
          }}>{user?.first_name?.[0]}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              {user?.role}
            </div>
          </div>
        </div>
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 7, border: 'none',
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          transition: 'all 0.15s', width: '100%',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.14)'; e.currentTarget.style.color = '#f87171'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <span style={{ width: 14, height: 14, flexShrink: 0, display: 'block' }}>{Icons.Logout}</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function Topbar() {
  const { user } = useAuth();
  const { toggle } = useTheme();
  const location = useLocation();
  const titles = { '/': 'Dashboard', '/trucks': 'Trucks', '/drivers': 'Drivers', '/trips': 'Trips', '/fuel': 'Fuel', '/purchase': 'Purchase', '/issue': 'Issue', '/stock': 'Stock', '/invoicing': 'Invoicing', '/expenditure': 'Expenditure', '/revenue': 'Revenue', '/maintenance': 'Maintenance', '/reports': 'Reports', '/users': 'Users', '/audit-log': 'Audit Log', '/profile': 'Profile' };
  return (
    <header className="topbar">
      <h1 style={{ flex: 1 }}>{titles[location.pathname] || 'Taurus ERP'}</h1>
      <div className="flex items-center gap-4">
        <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <span style={{ width: 16, height: 16, display: 'block' }}>{Icons.Theme}</span>
        </button>
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <div className="flex items-center gap-3">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ fontSize: '10.5px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{user?.role}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
            {user?.first_name?.[0]}
          </div>
        </div>
      </div>
    </header>
  );
}

function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (user) nav('/', { replace: true }); }, [user, nav]);
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login/', { email, password: pass });
      login(data.user, data.access, data.refresh);
      nav('/');
    } catch (err) { setErr('Invalid email or password.'); } finally { setLoading(false); }
  };
  return (
    <div className="login-root">
      <div className="login-container">
        <div className="login-header">
          <div style={{ fontSize: 36, fontWeight: 900, color: '#0f62fe', letterSpacing: '-1.5px' }}>TAURUS</div>
          <h2 className="login-title">Sign in to Enterprise</h2>
          <p className="login-subtitle">Access your logistics command center</p>
        </div>
        {err && <div style={{ color: '#da1e28', background: '#fff1f1', padding: '14px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', textAlign: 'center', border: '1px solid #ffd7d7' }}>{err}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@taurus.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={pass} onChange={e => setPass(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Authenticating...' : 'Sign In'}</button>
        </form>
      </div>
    </div>
  );
}

function ProtectedLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrap">
        <Topbar />
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AlertsProvider>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
              <Route path="/trucks" element={<ProtectedLayout><Trucks /></ProtectedLayout>} />
              <Route path="/drivers" element={<ProtectedLayout><Drivers /></ProtectedLayout>} />
              <Route path="/trips" element={<ProtectedLayout><Trips /></ProtectedLayout>} />
              <Route path="/fuel" element={<ProtectedLayout><Fuel /></ProtectedLayout>} />
              <Route path="/purchase" element={<ProtectedLayout><Purchase /></ProtectedLayout>} />
              <Route path="/issue" element={<ProtectedLayout><Issue /></ProtectedLayout>} />
              <Route path="/stock" element={<ProtectedLayout><Stock /></ProtectedLayout>} />
              <Route path="/invoicing" element={<ProtectedLayout><Invoicing /></ProtectedLayout>} />
              <Route path="/expenditure" element={<ProtectedLayout><Expenditure /></ProtectedLayout>} />
              <Route path="/revenue" element={<ProtectedLayout><Revenue /></ProtectedLayout>} />
              <Route path="/maintenance" element={<ProtectedLayout><Maintenance /></ProtectedLayout>} />
              <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
              <Route path="/users" element={<ProtectedLayout><Users /></ProtectedLayout>} />
              <Route path="/audit-log" element={<ProtectedLayout><AuditLog /></ProtectedLayout>} />
              <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AlertsProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
