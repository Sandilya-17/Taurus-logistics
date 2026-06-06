// src/App.jsx – Taurus Trade & Logistics ERP — Enterprise Edition
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

// ── Auth context ────────────────────────────────────────────
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// ── Theme context ────────────────────────────────────────────
const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

// ── Alerts context ────────────────────────────────────────────
const AlertsCtx = createContext(null);
export const useAlerts = () => useContext(AlertsCtx);

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('erp-theme');
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

  // Refresh user data from server (e.g. after profile update)
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/');
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
    } catch {}
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
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
    const t = setInterval(fetchAlerts, 60000); // Poll every minute
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
  AuditLog:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Profile:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Bell:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Logout:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  Shield:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

// ── Login Page ──────────────────────────────────────────────
function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email,    setEmail]    = useState('');
  const [pass,     setPass]     = useState('');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);
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
      const detail = err.response?.data?.message
        || err.response?.data?.detail
        || err.response?.data?.non_field_errors?.[0];
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
          <div className="login-headline">Enterprise<br/>operations,<br/><em>unified.</em></div>
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

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-lg)', display: 'flex', justifyContent: 'center', gap: 24 }}>
            {[
              { icon: Icons.Trucks,   label: 'Fleet'     },
              { icon: Icons.Stock,    label: 'Inventory' },
              { icon: Icons.Revenue,  label: 'Finance'   },
              { icon: Icons.Reports,  label: 'Reports'   },
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

// ── 403 Access Denied Page ───────────────────────────────────
function AccessDeniedPage({ module }) {
  return (
    <div style={{ padding: '60px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Access Restricted</h2>
      <p style={{ color: 'var(--muted)', maxWidth: 420, margin: '0 auto 24px' }}>
        You don't have permission to access{module ? ` the <strong>${module}</strong> module` : ' this page'}.
        Please contact your administrator to request access.
      </p>
      <Link to="/" className="btn btn-primary">← Back to Dashboard</Link>
    </div>
  );
}

// ── Module-permission guard ──────────────────────────────────
function ModuleGuard({ module, children }) {
  const { user } = useAuth();
  // Admins always have full access
  if (user?.role === 'ADMIN') return children;
  // Managers and employees check module_permissions array
  const perms = user?.module_permissions || [];
  if (!module || perms.includes(module)) return children;
  return <AccessDeniedPage module={module} />;
}

// ── Navigation config ────────────────────────────────────────
const NAV = [
  { section: 'Overview', items: [
    { to: '/',            icon: Icons.Dashboard,   label: 'Dashboard',    module: null },
  ]},
  { section: 'Fleet', items: [
    { to: '/trucks',      icon: Icons.Trucks,      label: 'Trucks',       module: 'trucks'  },
    { to: '/drivers',     icon: Icons.Drivers,     label: 'Drivers',      module: 'drivers' },
    { to: '/trips',       icon: Icons.Trips,       label: 'Trips',        module: 'trips'   },
    { to: '/fuel',        icon: Icons.Fuel,        label: 'Fuel Control', module: 'fuel'    },
  ]},
  { section: 'Inventory', items: [
    { to: '/purchase',    icon: Icons.Purchase,    label: 'Purchase',     module: 'purchase' },
    { to: '/issue',       icon: Icons.Issue,       label: 'Issue Items',  module: 'issue'    },
    { to: '/stock',       icon: Icons.Stock,       label: 'Stock Ledger', module: 'stock'    },
  ]},
  { section: 'Finance', items: [
    { to: '/invoicing',   icon: Icons.Invoicing,   label: 'Invoicing',    module: 'invoicing'   },
    { to: '/expenditure', icon: Icons.Expenditure, label: 'Expenditure',  module: 'expenditure' },
    { to: '/revenue',     icon: Icons.Revenue,     label: 'Revenue',      module: 'revenue'     },
  ]},
  { section: 'Operations', items: [
    { to: '/maintenance', icon: Icons.Maintenance, label: 'Maintenance',  module: 'maintenance' },
    { to: '/reports',     icon: Icons.Reports,     label: 'Reports',      module: 'reports'     },
  ]},
  { section: 'Admin', items: [
    { to: '/users',       icon: Icons.Users,       label: 'User Mgmt',    module: 'users', adminOnly: true },
    { to: '/audit-log',   icon: Icons.AuditLog,    label: 'Audit Log',    module: null,    adminOnly: true },
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
  '/audit-log':   'Audit Log',
  '/profile':     'My Profile',
};

// ── Notification Bell ────────────────────────────────────────
function NotificationBell() {
  const { unreadCount, alerts, showPanel, setShowPanel, markAllRead } = useAlerts();

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPanel(p => !p)}
        className="tb-pill"
        style={{ position: 'relative', cursor: 'pointer', background: showPanel ? 'var(--primary-bg)' : undefined }}
        title="Notifications"
      >
        {Icons.Bell}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--red)', color: '#fff',
            borderRadius: '50%', width: 16, height: 16,
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 340, background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.3)',
          zIndex: 9999, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                ✓ No unread notifications
              </div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-light, var(--border))',
                  borderLeft: `3px solid ${a.level === 'DANGER' ? 'var(--red)' : a.level === 'WARNING' ? 'var(--amber)' : 'var(--blue)'}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────
function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  const visibleNav = NAV.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Admin-only items
      if (item.adminOnly && user?.role !== 'ADMIN') return false;
      // Module permissions for non-admin users
      if (user?.role !== 'ADMIN' && item.module) {
        return (user?.module_permissions || []).includes(item.module);
      }
      return true;
    }),
  })).filter(group => group.items.length > 0);

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-badge">T</div>
          <div className="logo-text">
            <div className="logo-name">Taurus Trade</div>
            <div className="logo-sub">&amp; Logistics ERP</div>
          </div>
        </div>
      </div>

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

      <div className="sidebar-footer">
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <div className="sidebar-user" style={{ cursor: 'pointer' }}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
        </Link>
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

      {/* Notification Bell */}
      <NotificationBell />

      {/* Dark / Light toggle */}
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

      <Link to="/profile" style={{ textDecoration: 'none' }}>
        <div className="topbar-avatar" title={`${user?.first_name} ${user?.last_name} (${user?.role})`}>
          {initials}
        </div>
      </Link>
    </div>
  );
}

// ── Error Boundary ──────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: 'var(--red)', background: 'var(--bg-card)', borderRadius: 12, margin: 16 }}>
        <strong>⚠️ Page Error:</strong> {this.state.error?.message || 'Something went wrong.'}
        <br/><button style={{ marginTop: 12 }} className="btn btn-ghost btn-sm" onClick={() => this.setState({ error: null })}>Try Again</button>
      </div>
    );
    return this.props.children;
  }
}

// ── Protected layout ────────────────────────────────────────
function ProtectedLayout({ children, module }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrap">
        <Topbar />
        <div className="page-body">
          <ErrorBoundary>
            <ModuleGuard module={module}>
              {children}
            </ModuleGuard>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

// ── Admin-only layout ────────────────────────────────────────
function AdminLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrap">
        <Topbar />
        <div className="page-body"><AccessDeniedPage /></div>
      </div>
    </div>
  );
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrap">
        <Topbar />
        <div className="page-body"><ErrorBoundary>{children}</ErrorBoundary></div>
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
          <AlertsProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,.45)',
                  border: '1px solid rgba(255,255,255,.1)',
                  background: '#0c1220',
                  color: '#f2f4f8',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#1a2235' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: '#1a2235' } },
              }}
            />
            <Routes>
              <Route path="/login"       element={<LoginPage />} />
              <Route path="/"            element={<ProtectedLayout module={null}><Dashboard /></ProtectedLayout>} />
              <Route path="/trucks"      element={<ProtectedLayout module="trucks"><Trucks /></ProtectedLayout>} />
              <Route path="/drivers"     element={<ProtectedLayout module="drivers"><Drivers /></ProtectedLayout>} />
              <Route path="/trips"       element={<ProtectedLayout module="trips"><Trips /></ProtectedLayout>} />
              <Route path="/fuel"        element={<ProtectedLayout module="fuel"><Fuel /></ProtectedLayout>} />
              <Route path="/purchase"    element={<ProtectedLayout module="purchase"><Purchase /></ProtectedLayout>} />
              <Route path="/issue"       element={<ProtectedLayout module="issue"><Issue /></ProtectedLayout>} />
              <Route path="/stock"       element={<ProtectedLayout module="stock"><Stock /></ProtectedLayout>} />
              <Route path="/invoicing"   element={<ProtectedLayout module="invoicing"><Invoicing /></ProtectedLayout>} />
              <Route path="/expenditure" element={<ProtectedLayout module="expenditure"><Expenditure /></ProtectedLayout>} />
              <Route path="/revenue"     element={<ProtectedLayout module="revenue"><Revenue /></ProtectedLayout>} />
              <Route path="/maintenance" element={<ProtectedLayout module="maintenance"><Maintenance /></ProtectedLayout>} />
              <Route path="/reports"     element={<ProtectedLayout module="reports"><Reports /></ProtectedLayout>} />
              <Route path="/users"       element={<AdminLayout><Users /></AdminLayout>} />
              <Route path="/audit-log"   element={<AdminLayout><AuditLog /></AdminLayout>} />
              <Route path="/profile"     element={<ProtectedLayout module={null}><Profile /></ProtectedLayout>} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          </AlertsProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
