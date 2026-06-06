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

// Contexts
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

const AlertsCtx = createContext(null);
export const useAlerts = () => useContext(AlertsCtx);

// Providers
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('erp-theme');
    const isDark = saved ? saved === 'dark' : false;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return isDark;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('erp-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = () => setDark(d => !d);
  return <ThemeCtx.Provider value={{ dark, toggle }}>{children}</ThemeCtx.Provider>;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const login = (userData, access, refresh) => {
    localStorage.setItem('access',  access);
    localStorage.setItem('refresh', refresh);
    localStorage.setItem('user',    JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try { await api.post('/auth/logout/', { refresh: localStorage.getItem('refresh') }); } catch {}
    localStorage.clear();
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/');
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
    } catch {}
  }, []);

  return <AuthCtx.Provider value={{ user, login, logout, refreshUser }}>{children}</AuthCtx.Provider>;
}

function AlertsProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount]  = useState(0);
  const [alerts, setAlerts]            = useState([]);
  const [showPanel, setShowPanel]      = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/core/alerts/?unread=true&ordering=-created_at');
      const items = data.results ?? data;
      setAlerts(items.slice(0, 20));
      setUnreadCount(items.length);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(fetchAlerts, 60000);
    return () => clearInterval(t);
  }, [fetchAlerts]);

  const markAllRead = async () => {
    try {
      await api.post('/core/alerts/mark-read/', { all: true });
      setUnreadCount(0);
      setAlerts([]);
    } catch {}
  };

  return (
    <AlertsCtx.Provider value={{ unreadCount, alerts, showPanel, setShowPanel, markAllRead, fetchAlerts }}>
      {children}
    </AlertsCtx.Provider>
  );
}

// Icons (Lucide-like SVG)
const Icons = {
  Dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Fleet: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3m15 0h2v-3.34a2 2 0 0 0-.59-1.42L17.5 9H14"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  Inventory: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Finance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Operations: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Admin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

// Redesigned Components
function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  const NAV_CONFIG = [
    { label: 'Overview', items: [{ to: '/', icon: Icons.Dashboard, label: 'Dashboard' }] },
    { label: 'Fleet Management', items: [
      { to: '/trucks', icon: Icons.Fleet, label: 'Trucks', module: 'trucks' },
      { to: '/drivers', icon: Icons.Fleet, label: 'Drivers', module: 'drivers' },
      { to: '/trips', icon: Icons.Fleet, label: 'Trips', module: 'trips' },
      { to: '/fuel', icon: Icons.Fleet, label: 'Fuel Control', module: 'fuel' },
    ]},
    { label: 'Inventory & Stock', items: [
      { to: '/purchase', icon: Icons.Inventory, label: 'Purchase', module: 'purchase' },
      { to: '/issue', icon: Icons.Inventory, label: 'Issue Items', module: 'issue' },
      { to: '/stock', icon: Icons.Inventory, label: 'Stock Ledger', module: 'stock' },
    ]},
    { label: 'Financials', items: [
      { to: '/invoicing', icon: Icons.Finance, label: 'Invoicing', module: 'invoicing' },
      { to: '/expenditure', icon: Icons.Finance, label: 'Expenditure', module: 'expenditure' },
      { to: '/revenue', icon: Icons.Finance, label: 'Revenue', module: 'revenue' },
    ]},
    { label: 'System', items: [
      { to: '/maintenance', icon: Icons.Operations, label: 'Maintenance', module: 'maintenance' },
      { to: '/reports', icon: Icons.Operations, label: 'Reports', module: 'reports' },
      { to: '/users', icon: Icons.Admin, label: 'User Management', adminOnly: true },
      { to: '/audit-log', icon: Icons.Admin, label: 'Audit Log', adminOnly: true },
    ]},
  ];

  const filterNav = (groups) => {
    return groups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.adminOnly && user?.role !== 'ADMIN') return false;
        if (user?.role !== 'ADMIN' && item.module) {
          return (user?.module_permissions || []).includes(item.module);
        }
        return true;
      })
    })).filter(group => group.items.length > 0);
  };

  const visibleNav = filterNav(NAV_CONFIG);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-name">TAURUS</div>
      </div>
      <nav className="nav-container">
        {visibleNav.map(group => (
          <div key={group.label} className="nav-group">
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(item => (
              <Link 
                key={item.to} 
                to={item.to} 
                className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)' }}>
        <button onClick={logout} className="btn btn-outline" style={{ width: '100%', gap: '8px' }}>
          {Icons.Logout} Sign Out
        </button>
      </div>
    </aside>
  );
}

function Topbar() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Taurus ERP';

  return (
    <header className="topbar">
      <h1 style={{ fontSize: '18px', fontWeight: 600, flex: 1 }}>{title}</h1>
      <div className="flex items-center gap-4">
        <button onClick={toggle} className="btn btn-outline" style={{ padding: '8px' }}>
          {dark ? Icons.Sun : Icons.Moon}
        </button>
        <div className="flex items-center gap-2">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.role}</div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
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
    } catch (err) {
      setErr('Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-root">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-name" style={{ fontSize: '32px' }}>TAURUS</div>
          <h2 className="login-title">Sign in to Enterprise</h2>
          <p className="login-subtitle">Enter your credentials to access your account</p>
        </div>
        {err && <div style={{ color: 'var(--error)', background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid #fee2e2' }}>{err}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={pass} onChange={e => setPass(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/trucks': 'Truck Management',
  '/drivers': 'Driver Management',
  '/trips': 'Trip Management',
  '/fuel': 'Fuel Control',
  '/purchase': 'Purchase Entry',
  '/issue': 'Issue Items',
  '/stock': 'Stock Ledger',
  '/invoicing': 'Invoicing',
  '/expenditure': 'Expenditure',
  '/revenue': 'Revenue',
  '/maintenance': 'Maintenance',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/audit-log': 'Audit Log',
  '/profile': 'My Profile',
};

// Layout Wrappers
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
