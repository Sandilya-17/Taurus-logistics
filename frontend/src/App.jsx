// src/App.jsx – Taurus Trade & Logistics ERP v7 — Premium Dark Edition
import { useState, createContext, useContext, useEffect } from 'react';
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

// ── Auth context ────────────────────────────────────────────
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// ── Theme context ────────────────────────────────────────────
const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('erp-theme');
    // Apply immediately before first render to avoid flash
    const isDark = saved ? saved === 'dark' : true;
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

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

// ── SVG Icons ───────────────────────────────────────────────
const Icons = {
  Dashboard:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Trucks:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Drivers:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Trips:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
  Fuel:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4l3-2v8"/><line x1="3" y1="22" x2="17" y2="22"/><line x1="8" y1="11" x2="8" y2="11"/></svg>,
  Purchase:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  Issue:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>,
  Stock:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Invoicing:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
  Expenditure:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Revenue:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Maintenance:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Reports:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Users:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Logout:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  ChevronRight: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ── Login Page ──────────────────────────────────────────────
function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user) nav('/', { replace: true });
  }, [user, nav]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login/', { email, password: pass });
      login(data.user, data.access, data.refresh);
      nav('/');
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0];
      setErr(detail || 'Invalid email or password. Please try again.');
    } finally { setLoading(false); }
  };

  const FEATURES = [
    'Real-time fleet tracking & trip management',
    'Automated stock ledger with purchase & issue tracking',
    'Fuel consumption monitoring with excess alerts',
    'Integrated invoicing, revenue & expenditure',
    'Comprehensive PDF & Excel reporting suite',
  ];

  return (
    <div className="login-root">
      {/* ── Left brand panel ── */}
      <div className="login-left">
        <div className="login-left-bg">
          <div className="login-grid-lines" />
          <div className="login-glow" />
          <div className="login-glow2" />
        </div>

        <div className="login-brand">
          <div className="login-logo-wrap">
            <div className="login-logo-badge">T</div>
            <div>
              <div className="login-logo-name">Taurus Trade</div>
              <div className="login-logo-sub">&amp; Logistics ERP</div>
            </div>
          </div>

          <div className="login-headline">
            Enterprise<br/>operations,<br/><em>unified.</em>
          </div>
          <div className="login-sub">
            A complete logistics management platform — from trucks on the road to invoices in the office, everything connected in one place.
          </div>

          <div className="login-features">
            {FEATURES.map((f, i) => (
              <div className="login-feature" key={i}>
                <div className="login-feature-dot" />
                <span className="login-feature-text">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="login-footer">
          © {new Date().getFullYear()} Taurus Trade &amp; Logistics · Enterprise Resource Planning System
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-card-title">Welcome back</div>
            <div className="login-card-sub">Sign in to your ERP dashboard</div>
          </div>

          {err && (
            <div className="alert alert-danger" style={{ marginBottom: 20, borderRadius: 10 }}>
              ⚠️ {err}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="login-field">
              <label>Email Address</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@taurus.com"
                required autoFocus autoComplete="username"
              />
            </div>
            <div className="login-field">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password</span>
                <span
                  style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? 'Hide' : 'Show'}
                </span>
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Enter your password"
                required autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="login-hint">
            🔑 Default: <strong>admin@taurus.com</strong> / <strong>admin1234</strong>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-lg)', display: 'flex', justifyContent: 'center', gap: 24 }}>
            {[
              { icon: Icons.Trucks,     label: 'Fleet' },
              { icon: Icons.Stock,      label: 'Inventory' },
              { icon: Icons.Revenue,    label: 'Finance' },
              { icon: Icons.Reports,    label: 'Reports' },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, opacity: .6 }}>{m.icon}</div>
                <div style={{ fontSize: 9.5, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Navigation config ───────────────────────────────────────
const NAV = [
  { section: 'Overview', items: [
    { to: '/',            icon: Icons.Dashboard,   label: 'Dashboard'   },
  ]},
  { section: 'Fleet', items: [
    { to: '/trucks',      icon: Icons.Trucks,      label: 'Trucks'      },
    { to: '/drivers',     icon: Icons.Drivers,     label: 'Drivers'     },
    { to: '/trips',       icon: Icons.Trips,       label: 'Trips'       },
    { to: '/fuel',        icon: Icons.Fuel,        label: 'Fuel Control'},
  ]},
  { section: 'Inventory', items: [
    { to: '/purchase',    icon: Icons.Purchase,    label: 'Purchase'    },
    { to: '/issue',       icon: Icons.Issue,       label: 'Issue Items' },
    { to: '/stock',       icon: Icons.Stock,       label: 'Stock Ledger'},
  ]},
  { section: 'Finance', items: [
    { to: '/invoicing',   icon: Icons.Invoicing,   label: 'Invoicing'   },
    { to: '/expenditure', icon: Icons.Expenditure, label: 'Expenditure' },
    { to: '/revenue',     icon: Icons.Revenue,     label: 'Revenue'     },
  ]},
  { section: 'Operations', items: [
    { to: '/maintenance', icon: Icons.Maintenance, label: 'Maintenance' },
    { to: '/reports',     icon: Icons.Reports,     label: 'Reports'     },
  ]},
  { section: 'Admin', items: [
    { to: '/users',       icon: Icons.Users,       label: 'User Mgmt'   },
  ]},
];

const PAGE_TITLES = {
  '/':            'Dashboard',
  '/trucks':      'Truck Management',
  '/drivers':     'Driver Management',
  '/trips':       'Trip Management',
  '/fuel':        'Fuel Control',
  '/purchase':    'Purchase Entry',
  '/issue':       'Issue Items',
  '/stock':       'Stock Ledger',
  '/invoicing':   'Invoicing',
  '/expenditure': 'Expenditure',
  '/revenue':     'Revenue',
  '/maintenance': 'Maintenance',
  '/reports':     'Reports',
  '/users':       'User Management',
};

// ── Sidebar ─────────────────────────────────────────────────
function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  const visibleNav = NAV.filter(group => {
    if (group.section === 'Admin') return user?.role === 'ADMIN';
    return true;
  });

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : 'U';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-badge">T</div>
          <div className="logo-text">
            <div className="logo-name">Taurus Trade</div>
            <div className="logo-sub">&amp; Logistics ERP</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {visibleNav.map(group => (
          <div className="nav-group" key={group.section}>
            <div className="nav-section-label">{group.section}</div>
            {group.items.map(item => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button className="btn-signout" onClick={logout}>
          {Icons.Logout}
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Topbar ──────────────────────────────────────────────────
function Topbar() {
  const location = useLocation();
  const { user }  = useAuth();
  const { dark, toggle } = useTheme();
  const title     = PAGE_TITLES[location.pathname] || 'Taurus ERP';
  const today     = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' });
  const initials  = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : 'U';
  const getTime   = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Accra' });
  const [time, setTime] = useState(getTime());

  useEffect(() => {
    const t = setInterval(() => setTime(getTime()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="tb-pill">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {today}
      </div>
      <div className="tb-pill" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {time}
      </div>
      <div className="tb-pill">
        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>GH₵</span>
        Ghana Cedi
      </div>

      {/* ── Dark / Light toggle ── */}
      <button
        className="theme-toggle"
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
      >
        <div className="theme-toggle-track">
          <span className="theme-toggle-icon theme-toggle-moon">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </span>
          <span className="theme-toggle-icon theme-toggle-sun">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2"/></svg>
          </span>
          <div className="theme-toggle-thumb" />
        </div>
      </button>

      <div
        className="topbar-avatar"
        title={`${user?.first_name} ${user?.last_name} (${user?.role})`}
      >
        {initials}
      </div>
    </div>
  );
}

// ── Protected layout ────────────────────────────────────────
function ProtectedLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrap">
        <Topbar />
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}

// ── App root ────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,.45)',
              border: '1px solid rgba(255,255,255,.1)',
              background: '#1a2235',
              color: '#e2e8f0',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#1a2235' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#1a2235' } },
          }}
        />
        <Routes>
          <Route path="/login"       element={<LoginPage />} />
          <Route path="/"            element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/purchase"    element={<ProtectedLayout><Purchase /></ProtectedLayout>} />
          <Route path="/issue"       element={<ProtectedLayout><Issue /></ProtectedLayout>} />
          <Route path="/fuel"        element={<ProtectedLayout><Fuel /></ProtectedLayout>} />
          <Route path="/trips"       element={<ProtectedLayout><Trips /></ProtectedLayout>} />
          <Route path="/invoicing"   element={<ProtectedLayout><Invoicing /></ProtectedLayout>} />
          <Route path="/reports"     element={<ProtectedLayout><Reports /></ProtectedLayout>} />
          <Route path="/trucks"      element={<ProtectedLayout><Trucks /></ProtectedLayout>} />
          <Route path="/drivers"     element={<ProtectedLayout><Drivers /></ProtectedLayout>} />
          <Route path="/stock"       element={<ProtectedLayout><Stock /></ProtectedLayout>} />
          <Route path="/expenditure" element={<ProtectedLayout><Expenditure /></ProtectedLayout>} />
          <Route path="/revenue"     element={<ProtectedLayout><Revenue /></ProtectedLayout>} />
          <Route path="/maintenance" element={<ProtectedLayout><Maintenance /></ProtectedLayout>} />
          <Route path="/users"       element={<ProtectedLayout><Users /></ProtectedLayout>} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
