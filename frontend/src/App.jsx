// src/App.jsx — Taurus Trade & Logistics ERP (Professional UI v2)
import { useState, createContext, useContext, useEffect, useCallback, useRef, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
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
import Tyres       from './pages/Tyres';
import Expenditure from './pages/Expenditure';
import Revenue     from './pages/Revenue';
import Maintenance from './pages/Maintenance';
import Users       from './pages/Users';
import Profile     from './pages/Profile';
import AuditLog    from './pages/AuditLog';

/* ── Contexts ─────────────────────────────────────────────── */
const AuthCtx   = createContext(null);
export const useAuth   = () => useContext(AuthCtx);
const ThemeCtx  = createContext(null);
export const useTheme  = () => useContext(ThemeCtx);
const AlertsCtx = createContext(null);
export const useAlerts = () => useContext(AlertsCtx);

/* ── Providers ────────────────────────────────────────────── */
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('erp-theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('erp-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const login = (u, access, refresh) => {
    localStorage.setItem('access', access);
    localStorage.setItem('refresh', refresh);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
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

/* ── Icon set (inline SVG, no deps) ───────────────────────── */
const I = ({ d, children, vb = '0 0 24 24' }) => (
  <svg viewBox={vb} width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children || <path d={d} />}
  </svg>
);
const Icons = {
  Dashboard: <I><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></I>,
  Truck:    <I><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a2 2 0 0 0-.59-1.42L17.5 9H14v8h3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></I>,
  Driver:   <I><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></I>,
  Trip:     <I><path d="M9 18l6-6-6-6"/></I>,
  Fuel:     <I><path d="M3 22h12V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M15 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2h0V8l-3-3"/></I>,
  Box:      <I><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></I>,
  Dollar:   <I><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></I>,
  Wrench:   <I><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></I>,
  Tyre:     <I><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></I>,
  Chart:    <I><path d="M3 3v18h18"/><path d="M7 15l4-4 4 4 5-6"/></I>,
  Receipt:  <I><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></I>,
  User:     <I><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></I>,
  Shield:   <I><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></I>,
  Log:      <I><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></I>,
  Logout:   <I><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></I>,
  Sun:      <I><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></I>,
  Moon:     <I><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></I>,
  Bell:     <I><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></I>,
  Menu:     <I><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></I>,
};

/* ── Nav config ───────────────────────────────────────────── */
const NAV_SECTIONS = [
  { label: 'Overview', items: [{ to: '/', icon: Icons.Dashboard, label: 'Dashboard' }] },
  { label: 'Fleet',    items: [
    { to: '/trucks',  icon: Icons.Truck,  label: 'Trucks' },
    { to: '/drivers', icon: Icons.Driver, label: 'Drivers' },
    { to: '/trips',   icon: Icons.Trip,   label: 'Trips' },
    { to: '/fuel',    icon: Icons.Fuel,   label: 'Fuel Control' },
  ]},
  { label: 'Inventory', items: [
    { to: '/purchase', icon: Icons.Box,  label: 'Purchase' },
    { to: '/issue',    icon: Icons.Box,  label: 'Issue Items' },
    { to: '/stock',    icon: Icons.Box,  label: 'Stock Ledger' },
    { to: '/tyres',    icon: Icons.Tyre, label: 'Tyres' },
  ]},
  { label: 'Financials', items: [
    { to: '/invoicing',   icon: Icons.Receipt, label: 'Invoicing' },
    { to: '/expenditure', icon: Icons.Dollar,  label: 'Expenditure' },
    { to: '/revenue',     icon: Icons.Chart,   label: 'Revenue' },
  ]},
  { label: 'System', items: [
    { to: '/maintenance', icon: Icons.Wrench, label: 'Maintenance' },
    { to: '/reports',     icon: Icons.Chart,  label: 'Reports' },
    { to: '/users',       icon: Icons.User,   label: 'Users',     roles: ['ADMIN'] },
    { to: '/audit',       icon: Icons.Log,    label: 'Audit Log', roles: ['ADMIN'] },
  ]},
];

const TITLE_MAP = {
  '/': 'Dashboard', '/trucks': 'Trucks', '/drivers': 'Drivers',
  '/trips': 'Trips', '/fuel': 'Fuel Control', '/purchase': 'Purchase',
  '/issue': 'Issue Items', '/stock': 'Stock Ledger', '/tyres': 'Tyres',
  '/invoicing': 'Invoicing', '/expenditure': 'Expenditure', '/revenue': 'Revenue',
  '/maintenance': 'Maintenance', '/reports': 'Reports', '/users': 'User Management',
  '/audit': 'Audit Log', '/profile': 'My Profile',
};

const initialsOf = (u) =>
  u ? ((u.first_name?.[0] || '') + (u.last_name?.[0] || u.email?.[0] || '')).toUpperCase() || 'A' : 'A';
const fullNameOf = (u) =>
  u ? ([u.first_name, u.last_name].filter(Boolean).join(' ') || u.email) : 'Admin';

/* ── Sidebar ──────────────────────────────────────────────── */
function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const canSee = (item) => !item.roles || item.roles.includes(user?.role);

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo">T</div>
          <div>
            <div className="brand-name">Taurus</div>
            <div className="brand-sub">Logistics ERP</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter(canSee);
            if (!items.length) return null;
            return (
              <div key={section.label} className="sidebar-group">
                <div className="sidebar-group-label">{section.label}</div>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="avatar">{initialsOf(user)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fullNameOf(user)}
              </div>
              <div style={{ fontSize: 11, color: '#93a3bf' }}>{user?.role || 'Admin'}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── Topbar ───────────────────────────────────────────────── */
function Topbar({ onMenu }) {
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { unreadCount }  = useAlerts();
  const location         = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const title = TITLE_MAP[location.pathname] || 'Taurus ERP';

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="icon-btn mobile-only" onClick={onMenu} aria-label="Open menu">{Icons.Menu}</button>
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
          {dark ? Icons.Sun : Icons.Moon}
        </button>
        <button className="icon-btn" aria-label="Notifications" title="Notifications">
          {Icons.Bell}
          {unreadCount > 0 && <span className="dot-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>

        <div className="user-menu" ref={ref}>
          <button className="user-chip" onClick={() => setMenuOpen(o => !o)}>
            <div className="avatar sm">{initialsOf(user)}</div>
            <div className="user-chip-text">
              <div className="name">{fullNameOf(user)}</div>
              <div className="role">{user?.role || 'Admin'}</div>
            </div>
          </button>
          {menuOpen && (
            <div className="menu-pop">
              <Link to="/profile" className="menu-item" onClick={() => setMenuOpen(false)}>
                {Icons.User}<span>Profile</span>
              </Link>
              <button className="menu-item danger" onClick={logout}>
                {Icons.Logout}<span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── App layout ───────────────────────────────────────────── */
function AppLayout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="page">{children}</main>
      </div>
    </div>
  );
}

/* ── Login ────────────────────────────────────────────────── */
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login/', { email, password });
      login(data.user, data.access, data.refresh);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo lg">T</div>
          <div>
            <div className="auth-title">Taurus ERP</div>
            <div className="auth-sub">Logistics command center</div>
          </div>
        </div>

        <h2 className="auth-h">Welcome back</h2>
        <p className="auth-p">Sign in to continue to your dashboard</p>

        {error && <div className="alert alert-danger mb14">{error}</div>}

        <form onSubmit={onSubmit} autoComplete="on">
          <div className="mb14">
            <label className="form-label">Email address</label>
            <input type="email" className="form-input" value={email}
              onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email"
              placeholder="you@company.com" />
          </div>
          <div className="mb16">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} className="form-input" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                placeholder="••••••••" />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 44 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-foot">
          © {new Date().getFullYear()} Taurus Trade &amp; Logistics
        </div>
      </div>
    </div>
  );
}

/* ── Error boundary ───────────────────────────────────────── */
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ margin: '0 auto 16px' }}>⚠️</div>
          <h2 className="auth-h">Something went wrong</h2>
          <p className="auth-p">{this.state.error?.message || 'Unexpected error.'}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

/* ── Route guard ──────────────────────────────────────────── */
function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/* ── Root ─────────────────────────────────────────────────── */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AlertsProvider>
              <Toaster position="top-right" toastOptions={{
                style: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-md)' },
              }} />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={
                  <RequireAuth>
                    <AppLayout>
                      <Routes>
                        <Route path="/"            element={<Dashboard />} />
                        <Route path="/trucks"      element={<Trucks />} />
                        <Route path="/drivers"     element={<Drivers />} />
                        <Route path="/trips"       element={<Trips />} />
                        <Route path="/fuel"        element={<Fuel />} />
                        <Route path="/purchase"    element={<Purchase />} />
                        <Route path="/issue"       element={<Issue />} />
                        <Route path="/stock"       element={<Stock />} />
                        <Route path="/tyres"       element={<Tyres />} />
                        <Route path="/invoicing"   element={<Invoicing />} />
                        <Route path="/expenditure" element={<Expenditure />} />
                        <Route path="/revenue"     element={<Revenue />} />
                        <Route path="/maintenance" element={<Maintenance />} />
                        <Route path="/reports"     element={<Reports />} />
                        <Route path="/users"       element={<Users />} />
                        <Route path="/audit"       element={<AuditLog />} />
                        <Route path="/profile"     element={<Profile />} />
                        <Route path="*"            element={<Navigate to="/" replace />} />
                      </Routes>
                    </AppLayout>
                  </RequireAuth>
                } />
              </Routes>
            </AlertsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
