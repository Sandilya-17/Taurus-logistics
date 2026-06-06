// src/App.jsx — Taurus ERP — Fresh Enterprise UI
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

/* ── Contexts ──────────────────────────────────────────────── */
const AuthCtx   = createContext(null);
export const useAuth  = () => useContext(AuthCtx);
const ThemeCtx  = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

/* ── Theme ─────────────────────────────────────────────────── */
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('taurus-theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('taurus-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

/* ── Auth ──────────────────────────────────────────────────── */
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

/* ── Icons ─────────────────────────────────────────────────── */
const Ic = ({ path, children }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={path} />}
  </svg>
);

const Icons = {
  Dashboard: <Ic><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Ic>,
  Truck:    <Ic><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a2 2 0 0 0-.59-1.42L17.5 9H14v8h3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></Ic>,
  Driver:   <Ic><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Ic>,
  Trip:     <Ic><path d="M5 12h14M12 5l7 7-7 7"/></Ic>,
  Fuel:     <Ic><path d="M3 22h12V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M15 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2h0V8l-3-3"/></Ic>,
  Box:      <Ic><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></Ic>,
  Purchase: <Ic><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></Ic>,
  IssueItem:<Ic><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Ic>,
  StockLedger:<Ic><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></Ic>,
  Expenditure:<Ic><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></Ic>,
  Dollar:   <Ic><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Ic>,
  Wrench:   <Ic><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Ic>,
  Tyre:     <Ic><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></Ic>,
  Chart:    <Ic><path d="M3 3v18h18"/><path d="M7 15l4-4 4 4 5-6"/></Ic>,
  BarChart: <Ic><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Ic>,
  Receipt:  <Ic><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></Ic>,
  User:     <Ic><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Ic>,
  Users:    <Ic><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Ic>,
  Log:      <Ic><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></Ic>,
  Logout:   <Ic><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ic>,
  Sun:      <Ic><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Ic>,
  Moon:     <Ic><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Ic>,
  Bell:     <Ic><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Ic>,
  Menu:     <Ic><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></Ic>,
  ChevronRight: <Ic><path d="M9 18l6-6-6-6"/></Ic>,
  Close:    <Ic><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>,
  Shield:   <Ic><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ic>,
};

/* ── Nav Config ─────────────────────────────────────────────── */
const NAV = [
  {
    label: 'Overview',
    items: [{ to: '/', icon: Icons.Dashboard, label: 'Dashboard' }],
  },
  {
    label: 'Fleet',
    items: [
      { to: '/trucks',  icon: Icons.Truck,  label: 'Trucks' },
      { to: '/drivers', icon: Icons.Driver, label: 'Drivers' },
      { to: '/trips',   icon: Icons.Trip,   label: 'Trips' },
      { to: '/fuel',    icon: Icons.Fuel,   label: 'Fuel Control' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/purchase', icon: Icons.Purchase,    label: 'Purchase' },
      { to: '/issue',    icon: Icons.IssueItem,   label: 'Issue Items' },
      { to: '/stock',    icon: Icons.StockLedger, label: 'Stock Ledger' },
      { to: '/tyres',    icon: Icons.Tyre,        label: 'Tyres' },
    ],
  },
  {
    label: 'Financials',
    items: [
      { to: '/invoicing',   icon: Icons.Receipt, label: 'Invoicing' },
      { to: '/expenditure', icon: Icons.Expenditure, label: 'Expenditure' },
      { to: '/revenue',     icon: Icons.Chart,   label: 'Revenue' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/maintenance', icon: Icons.Wrench, label: 'Maintenance' },
      { to: '/reports',     icon: Icons.BarChart, label: 'Reports' },
      { to: '/users',       icon: Icons.Users,  label: 'Users',     roles: ['ADMIN'] },
      { to: '/audit',       icon: Icons.Log,    label: 'Audit Log', roles: ['ADMIN'] },
    ],
  },
];

const TITLE_MAP = {
  '/': 'Dashboard', '/trucks': 'Trucks', '/drivers': 'Drivers',
  '/trips': 'Trips', '/fuel': 'Fuel Control', '/purchase': 'Purchase',
  '/issue': 'Issue Items', '/stock': 'Stock Ledger', '/tyres': 'Tyres',
  '/invoicing': 'Invoicing', '/expenditure': 'Expenditure', '/revenue': 'Revenue',
  '/maintenance': 'Maintenance', '/reports': 'Reports', '/users': 'User Management',
  '/audit': 'Audit Log', '/profile': 'My Profile',
};

const initials = (u) =>
  u ? ((u.first_name?.[0] || '') + (u.last_name?.[0] || u.email?.[0] || '')).toUpperCase() || 'AU' : 'AU';
const fullName = (u) =>
  u ? ([u.first_name, u.last_name].filter(Boolean).join(' ') || u.email) : 'Admin';

/* ── Sidebar ─────────────────────────────────────────────────── */
function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const canSee = (item) => !item.roles || item.roles.includes(user?.role);

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">T</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">Taurus</div>
            <div className="sidebar-brand-sub">Logistics ERP</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map((section) => {
            const items = section.items.filter(canSee);
            if (!items.length) return null;
            return (
              <div key={section.label} className="sidebar-section">
                <div className="sidebar-section-label">{section.label}</div>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="sidebar-user">
          <div className="avatar avatar-sm">{initials(user)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{fullName(user)}</div>
            <div className="sidebar-user-role">{user?.role || 'Admin'}</div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── Topbar ──────────────────────────────────────────────────── */
function Topbar({ onMenu }) {
  const { dark, toggle } = useTheme();
  const { user, logout }  = useAuth();
  const location          = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const title = TITLE_MAP[location.pathname] || 'Taurus ERP';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={onMenu} aria-label="Open menu">
          {Icons.Menu}
        </button>
        <span className="topbar-title">{title}</span>
      </div>

      <div className="topbar-right">
        <button className="icon-btn" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}>
          {dark ? Icons.Sun : Icons.Moon}
        </button>
        <button className="icon-btn" title="Notifications">
          {Icons.Bell}
        </button>

        <div className="user-menu-wrap" ref={menuRef}>
          <button className="user-chip" onClick={() => setMenuOpen(o => !o)}>
            <div className="avatar avatar-sm">{initials(user)}</div>
            <div style={{ textAlign: 'left' }}>
              <div className="user-chip-name">{fullName(user)}</div>
              <div className="user-chip-role">{user?.role || 'Admin'}</div>
            </div>
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <Link
                to="/profile"
                className="dropdown-item"
                onClick={() => setMenuOpen(false)}
              >
                {Icons.User}<span>My Profile</span>
              </Link>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={logout}>
                {Icons.Logout}<span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── App Layout ──────────────────────────────────────────────── */
function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="page-content page-enter">{children}</main>
      </div>
    </div>
  );
}

/* ── Login ───────────────────────────────────────────────────── */
function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">T</div>
        <div className="auth-heading">Welcome back</div>
        <div className="auth-sub">Sign in to Taurus Logistics ERP</div>

        {error && <div className="alert alert-danger mb-6">{error}</div>}

        <form onSubmit={onSubmit} autoComplete="on" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required autoFocus autoComplete="email"
              placeholder="you@company.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-toggle-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                placeholder="••••••••"
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: 42 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          © {new Date().getFullYear()} Taurus Trade &amp; Logistics
        </div>
      </div>
    </div>
  );
}

/* ── Error Boundary ──────────────────────────────────────────── */
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(e, info) { console.error(e, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div className="auth-heading">Something went wrong</div>
          <div className="auth-sub">{this.state.error?.message || 'Unexpected error.'}</div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

/* ── Route Guard ─────────────────────────────────────────────── */
function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/* ── Root ────────────────────────────────────────────────────── */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 500,
                  fontFamily: 'Geist, sans-serif',
                  boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                },
              }}
            />
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
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
