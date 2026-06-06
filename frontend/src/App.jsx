// src/App.jsx — Taurus Trade & Logistics ERP
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

// ── Contexts ─────────────────────────────────────────────────
const AuthCtx   = createContext(null);
export const useAuth  = () => useContext(AuthCtx);
const ThemeCtx  = createContext(null);
export const useTheme = () => useContext(ThemeCtx);
const AlertsCtx = createContext(null);
export const useAlerts = () => useContext(AlertsCtx);

// ── Providers ────────────────────────────────────────────────
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('erp-theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('erp-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeCtx.Provider>;
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

// ── SVG Icons ────────────────────────────────────────────────
const Icons = {
  Dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17h4V5H2v12h3m15 0h2v-3.34a2 2 0 0 0-.59-1.42L17.5 9H14"/>
      <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  ),
  Driver: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  Trip: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 6h18M3 18h12"/>
    </svg>
  ),
  Fuel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22V6l6-4 6 4v16"/><path d="M3 9h12m0 0v13M15 9l4-3 2 2v8a2 2 0 0 1-2 2h-2"/>
    </svg>
  ),
  Box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
    </svg>
  ),
  Dollar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  Shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  Bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  ChevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  User: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  Chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/>
      <line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/>
    </svg>
  ),
  Wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  Tyre: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/>
    </svg>
  ),
  Log: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
};

// ── Nav Config ───────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/', icon: Icons.Dashboard, label: 'Dashboard' }],
  },
  {
    label: 'Fleet',
    items: [
      { to: '/trucks',  icon: Icons.Truck,  label: 'Trucks',       module: 'trucks'  },
      { to: '/drivers', icon: Icons.Driver, label: 'Drivers',      module: 'drivers' },
      { to: '/trips',   icon: Icons.Trip,   label: 'Trips',        module: 'trips'   },
      { to: '/fuel',    icon: Icons.Fuel,   label: 'Fuel Control', module: 'fuel'    },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/purchase', icon: Icons.Box,    label: 'Purchase',    module: 'inventory' },
      { to: '/issue',    icon: Icons.Box,    label: 'Issue Items', module: 'inventory' },
      { to: '/stock',    icon: Icons.Box,    label: 'Stock Ledger',module: 'inventory' },
      { to: '/tyres',    icon: Icons.Tyre,   label: 'Tyres',       module: 'tyres'    },
    ],
  },
  {
    label: 'Financials',
    items: [
      { to: '/invoicing',   icon: Icons.Receipt, label: 'Invoicing',   module: 'invoicing'   },
      { to: '/expenditure', icon: Icons.Dollar,  label: 'Expenditure', module: 'expenditure' },
      { to: '/revenue',     icon: Icons.Chart,   label: 'Revenue',     module: 'revenue'     },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/maintenance', icon: Icons.Wrench,  label: 'Maintenance', module: 'maintenance' },
      { to: '/reports',     icon: Icons.Chart,   label: 'Reports',     module: 'reports'     },
      { to: '/users',       icon: Icons.User,    label: 'Users',       roles: ['ADMIN']      },
      { to: '/audit',       icon: Icons.Log,     label: 'Audit Log',   roles: ['ADMIN']      },
    ],
  },
];

// ── Sidebar ──────────────────────────────────────────────────
function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  const initials = user
    ? (user.first_name?.[0] || '') + (user.last_name?.[0] || user.email?.[0] || '')
    : 'A';
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : 'Admin';

  const canSee = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">TAURUS</span>
        <span className="sidebar-logo-dot" />
      </div>

      <div className="sidebar-nav">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(canSee);
          if (!visibleItems.length) return null;
          return (
            <div className="sidebar-section" key={section.label}>
              <span className="sidebar-section-label">{section.label}</span>
              {visibleItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`sidebar-link ${location.pathname === item.to ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials.toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{fullName}</div>
            <div className="sidebar-user-role">{user?.role || 'Admin'}</div>
          </div>
        </div>
        <Link to="/profile" className="sidebar-link" style={{ marginBottom: 2 }}>
          {Icons.User}<span>Profile</span>
        </Link>
        <button className="sidebar-link" onClick={logout}>
          {Icons.Logout}<span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

// ── Topbar ───────────────────────────────────────────────────
function Topbar() {
  const { dark, toggle } = useTheme();
  const { user }         = useAuth();
  const { unreadCount }  = useAlerts();
  const location         = useLocation();

  // Derive page title from path
  const titleMap = {
    '/': 'Dashboard', '/trucks': 'Trucks', '/drivers': 'Drivers',
    '/trips': 'Trips', '/fuel': 'Fuel Control', '/purchase': 'Purchase',
    '/issue': 'Issue Items', '/stock': 'Stock Ledger', '/tyres': 'Tyres',
    '/invoicing': 'Invoicing', '/expenditure': 'Expenditure', '/revenue': 'Revenue',
    '/maintenance': 'Maintenance', '/reports': 'Reports', '/users': 'Users',
    '/audit': 'Audit Log', '/profile': 'Profile',
  };
  const title = titleMap[location.pathname] || 'Taurus ERP';

  const initials = user
    ? (user.first_name?.[0] || '') + (user.last_name?.[0] || user.email?.[0] || '')
    : 'A';
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : 'Admin';

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-actions">
        <button className="topbar-icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
          {dark ? Icons.Sun : Icons.Moon}
        </button>
        <button className="topbar-icon-btn" style={{ position: 'relative' }} title="Alerts">
          {Icons.Bell}
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 5, right: 5,
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--red)', border: '2px solid var(--bg-card)',
            }} />
          )}
        </button>
        <Link to="/profile" className="topbar-user" style={{ textDecoration: 'none' }}>
          <div className="topbar-avatar">{initials.toUpperCase()}</div>
          <div className="topbar-user-info">
            <div className="topbar-user-name">{fullName}</div>
            <div className="topbar-user-role">{user?.role || 'Admin'}</div>
          </div>
        </Link>
      </div>
    </header>
  );
}

// ── App Layout ───────────────────────────────────────────────
function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

// ── Login Page ───────────────────────────────────────────────
function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login/', { email, password });
      login(data.user, data.access, data.refresh);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-name">TAURUS</div>
        </div>
        <h2 className="login-title">Sign in to Enterprise</h2>
        <p className="login-sub">Access your logistics command center</p>

        {error && (
          <div className="alert alert-danger mb16" role="alert">{error}</div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="admin@taurus.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in…</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Error Boundary ───────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{this.state.error?.message}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
      </div>
    );
  }
}

// ── Route Guard ──────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// ── Root App ─────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AlertsProvider>
            <ErrorBoundary>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    fontFamily: 'var(--font)',
                    fontSize: 13,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    boxShadow: 'var(--shadow-md)',
                  },
                  success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
                  error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
                }}
              />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={
                  <RequireAuth>
                    <AppLayout>
                      <Routes>
                        <Route path="/"            element={<Dashboard />}   />
                        <Route path="/trucks"      element={<Trucks />}      />
                        <Route path="/drivers"     element={<Drivers />}     />
                        <Route path="/trips"       element={<Trips />}       />
                        <Route path="/fuel"        element={<Fuel />}        />
                        <Route path="/purchase"    element={<Purchase />}    />
                        <Route path="/issue"       element={<Issue />}       />
                        <Route path="/stock"       element={<Stock />}       />
                        <Route path="/invoicing"   element={<Invoicing />}   />
                        <Route path="/expenditure" element={<Expenditure />} />
                        <Route path="/revenue"     element={<Revenue />}     />
                        <Route path="/maintenance" element={<Maintenance />} />
                        <Route path="/reports"     element={<Reports />}     />
                        <Route path="/users"       element={<Users />}       />
                        <Route path="/audit"       element={<AuditLog />}    />
                        <Route path="/profile"     element={<Profile />}     />
                        <Route path="*"            element={<Navigate to="/" replace />} />
                      </Routes>
                    </AppLayout>
                  </RequireAuth>
                } />
              </Routes>
            </ErrorBoundary>
          </AlertsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
