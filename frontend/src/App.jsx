// src/App.jsx — Taurus ERP — Enterprise UI
import { useState, createContext, useContext, useEffect, useCallback, useRef, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/main.css';
import api, { fmtMoney, getCurrencyConfig } from './utils/api';

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
const AuthCtx  = createContext(null);
export const useAuth  = () => useContext(AuthCtx);
const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

/* ── Branch Context (Super Admin multi-branch control) ─────── */
const BranchCtx = createContext(null);
export const useBranch = () => useContext(BranchCtx);

/* ── Currency Context (branch-aware) ───────────────────────── */
// useCurrency() returns: { fmt(val) => string, symbol, branchId }
// Branch 2 → Leone (Le), everything else → GH₵
const CurrencyCtx = createContext(null);
export const useCurrency = () => useContext(CurrencyCtx);

function BranchProvider({ user, children }) {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // For SUPER_ADMIN: null = "All Branches" view; numeric = specific branch selected
  // For branch admins/managers/employees: locked to their own branch ID
  const [activeBranchId, setActiveBranchId] = useState(
    isSuperAdmin ? null : (user?.branch?.id ?? null)
  );
  const [branches, setBranches] = useState([]);

  // Load all branches for SUPER_ADMIN dropdown
  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/users/branches/')
      .then(r => setBranches(r.data?.results ?? r.data ?? []))
      .catch(() => {});
  }, [isSuperAdmin]);

  // branchQS: params to spread into every API call
  // - Super Admin with no filter selected → {} (backend returns all branches)
  // - Super Admin with a branch selected  → { branch_id: N }
  // - Non-super-admin                     → {} (backend enforces their branch via JWT user)
  const branchQS = (isSuperAdmin && activeBranchId) ? { branch_id: activeBranchId } : {};
  const branchParam = (isSuperAdmin && activeBranchId) ? `?branch_id=${activeBranchId}` : '';

  // Determine the currency code for the active branch:
  // - SUPER_ADMIN viewing a specific branch → use that branch's currency field from API
  // - SUPER_ADMIN viewing all               → default GHS
  // - Branch user                           → their own branch's currency (from user object)
  const getActiveCurrencyCode = () => {
    if (isSuperAdmin) {
      if (activeBranchId) {
        const found = branches.find(b => b.id === activeBranchId || String(b.id) === String(activeBranchId));
        return found?.currency || 'GHS';
      }
      return 'GHS'; // all-branches view defaults to GHS
    }
    // Non-super-admin: use their own branch's currency
    return user?.branch_currency || user?.branch?.currency || 'GHS';
  };

  const currencyCode = getActiveCurrencyCode();
  const currencyConfig = getCurrencyConfig(currencyCode);
  const fmt = (val) => fmtMoney(val, currencyCode);

  return (
    <BranchCtx.Provider value={{
      isSuperAdmin,
      activeBranchId,
      setActiveBranchId: isSuperAdmin ? setActiveBranchId : () => {}, // non-super-admin cannot change branch
      branches,
      branchQS,
      branchParam,
    }}>
      <CurrencyCtx.Provider value={{
        fmt,
        symbol: currencyConfig.symbol,
        branchId: isSuperAdmin ? activeBranchId : (user?.branch?.id ?? null),
        currencyCode,
      }}>
        {children}
      </CurrencyCtx.Provider>
    </BranchCtx.Provider>
  );
}

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
      { to: '/invoicing',   icon: Icons.Receipt,     label: 'Invoicing' },
      { to: '/expenditure', icon: Icons.Expenditure, label: 'Expenditure' },
      { to: '/revenue',     icon: Icons.Chart,       label: 'Revenue' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/maintenance', icon: Icons.Wrench,   label: 'Maintenance' },
      { to: '/reports',     icon: Icons.BarChart, label: 'Reports' },
      { to: '/users',       icon: Icons.Users,    label: 'Users',     roles: ['ADMIN', 'SUPER_ADMIN'] },
      { to: '/audit',       icon: Icons.Log,      label: 'Audit Log', roles: ['ADMIN', 'SUPER_ADMIN'] },
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
            <div className="sidebar-user-role">{user?.role?.replace('_', ' ') || 'Admin'}</div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── Branch Selector (Super Admin only) ──────────────────────── */
function BranchSelector() {
  const branchCtx = useBranch();
  // Only SUPER_ADMIN sees the branch selector
  if (!branchCtx || !branchCtx.isSuperAdmin) return null;
  const { activeBranchId, setActiveBranchId, branches } = branchCtx;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>
        Branch
      </span>
      <select
        value={activeBranchId ?? ''}
        onChange={e => setActiveBranchId(e.target.value ? Number(e.target.value) : null)}
        style={{
          fontSize: 12, fontWeight: 600,
          padding: '5px 10px',
          borderRadius: 6,
          border: '1.5px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text)',
          cursor: 'pointer',
          outline: 'none',
          minWidth: 130,
        }}
      >
        <option value="">All Branches</option>
        {branches.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
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
        {/* Branch selector — SUPER_ADMIN only */}
        <BranchSelector />

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
              <div className="user-chip-role">{user?.role?.replace('_', ' ') || 'Admin'}</div>
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

/* ── Taurus SVG Logo ─────────────────────────────────────────── */
function TaurusLogo({ width = 320 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 120" width={width} height="auto">
      <defs>
        <linearGradient id="tlPrimary" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="tlAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <g transform="translate(15, 12)">
        <path d="M15 20 L50 45 L15 70 L30 45 Z" fill="url(#tlPrimary)" opacity="0.4" />
        <path d="M35 20 L80 45 L35 70 L50 45 Z" fill="url(#tlPrimary)" />
        <path d="M60 30 L85 45 L60 60 L72 45 Z" fill="url(#tlAccent)" />
        <rect x="15" y="78" width="65" height="4" rx="2" fill="url(#tlAccent)" />
      </g>
      <text x="125" y="68"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="52" fontWeight="900" fill="#0F172A" letterSpacing="1">
        TAURUS
      </text>
      <text x="127" y="94"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="14" fontWeight="700" fill="#EA580C" letterSpacing="5">
        TRADING &amp; LOGISTICS
      </text>
    </svg>
  );
}

/* ── Login ───────────────────────────────────────────────────── */
const QUICK_LOGINS = [
  {
    label: 'Super Admin',
    sub: 'Full access · All branches',
    email: 'superadmin@taurus.com',
    password: 'superadmin1234',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    initials: 'SA',
  },
  {
    label: 'Admin 1',
    sub: 'Branch 1 admin',
    email: 'admin1@taurus.com',
    password: 'admin1234',
    color: '#0066FF',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    initials: 'A1',
  },
  {
    label: 'Admin 2',
    sub: 'Branch 2 admin',
    email: 'admin2@taurus.com',
    password: 'admin1234',
    color: '#0F766E',
    bg: '#F0FDFA',
    border: '#99F6E4',
    initials: 'A2',
  },
];

function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [quickLoading, setQuickLoading] = useState(null);
  const [error, setError]       = useState('');

  const doLogin = async (loginEmail, loginPassword) => {
    setError('');
    try {
      const { data } = await api.post('/auth/login/', { email: loginEmail, password: loginPassword });
      login(data.user, data.access, data.refresh);
      navigate('/');
    } catch (err) {
      const d = err.response?.data;
      const msg = typeof d === 'string'
        ? d
        : d?.detail
        || (Array.isArray(d?.non_field_errors) ? d.non_field_errors[0] : null)
        || (Array.isArray(d) ? d[0] : null)
        || 'Invalid email or password.';
      setError(typeof msg === 'string' ? msg : 'Invalid email or password.');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await doLogin(email, password);
    setLoading(false);
  };

  const onQuickLogin = async (q) => {
    setQuickLoading(q.email);
    await doLogin(q.email, q.password);
    setQuickLoading(null);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#F1F5F9' }}>

      {/* ── Left Panel ── */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'linear-gradient(160deg, #0B1120 0%, #0F2456 60%, #1a3a7a 100%)',
        padding:'48px 40px', position:'relative', overflow:'hidden',
      }}>
        {/* decorative rings */}
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.05)', top:-150, left:-150 }} />
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.03)', bottom:-250, right:-250 }} />
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(249,115,22,0.07)', top:'28%', right:-80 }} />
        <div style={{ position:'absolute', width:120, height:120, borderRadius:'50%', background:'rgba(99,102,241,0.10)', bottom:'20%', left:40 }} />

        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:460 }}>
          {/* Logo */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 120" width="340" height="auto" style={{ marginBottom:36 }}>
            <defs>
              <linearGradient id="tlPrimaryW" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="100%" stopColor="#BFDBFE" />
              </linearGradient>
              <linearGradient id="tlAccentW" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
            </defs>
            <g transform="translate(15, 12)">
              <path d="M15 20 L50 45 L15 70 L30 45 Z" fill="url(#tlPrimaryW)" opacity="0.4" />
              <path d="M35 20 L80 45 L35 70 L50 45 Z" fill="url(#tlPrimaryW)" />
              <path d="M60 30 L85 45 L60 60 L72 45 Z" fill="url(#tlAccentW)" />
              <rect x="15" y="78" width="65" height="4" rx="2" fill="url(#tlAccentW)" />
            </g>
            <text x="125" y="68" fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fontSize="52" fontWeight="900" fill="#FFFFFF" letterSpacing="1">TAURUS</text>
            <text x="127" y="94" fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fontSize="14" fontWeight="700" fill="#F97316" letterSpacing="5">TRADING &amp; LOGISTICS</text>
          </svg>

          <div style={{ color:'rgba(255,255,255,0.92)', fontSize:20, fontWeight:700, marginBottom:10, letterSpacing:'-0.02em' }}>
            Enterprise Resource Planning
          </div>
          <div style={{ color:'rgba(255,255,255,0.45)', fontSize:13.5, lineHeight:1.75, maxWidth:320, margin:'0 auto 36px' }}>
            Fleet, fuel, inventory and financials — unified in one platform.
          </div>

          {/* Feature pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            {[['🚛','Fleet'],['⛽','Fuel'],['📦','Inventory'],['💰','Finance'],['📊','Reports']].map(([ic, label]) => (
              <div key={label} style={{
                display:'flex', alignItems:'center', gap:5,
                background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.11)',
                borderRadius:20, padding:'5px 13px', fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:500,
              }}>
                <span style={{ fontSize:13 }}>{ic}</span>{label}
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div style={{ display:'flex', gap:0, marginTop:44, borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,0.09)' }}>
            {[['99.9%','Uptime'],['2','Branches'],['15+','Modules']].map(([val, lbl], i) => (
              <div key={lbl} style={{
                flex:1, padding:'14px 0', textAlign:'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.09)' : 'none',
                background:'rgba(255,255,255,0.04)',
              }}>
                <div style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>{val}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2, fontWeight:500 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position:'absolute', bottom:24, color:'rgba(255,255,255,0.2)', fontSize:11.5, letterSpacing:'0.02em' }}>
          © {new Date().getFullYear()} Taurus Trade &amp; Logistics
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{
        width:'100%', maxWidth:500, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'48px 44px', background:'#FFFFFF',
        boxShadow:'-4px 0 48px rgba(0,0,0,0.07)',
        overflowY:'auto',
      }}>
        <div style={{ width:'100%', maxWidth:380 }}>

          {/* Logo on right panel (mobile friendly) */}
          <div style={{ marginBottom:32 }}>
            <TaurusLogo width={240} />
          </div>

          <div style={{ fontSize:26, fontWeight:800, color:'#0B1120', letterSpacing:'-0.03em', marginBottom:4 }}>
            Welcome back
          </div>
          <div style={{ fontSize:13.5, color:'#64748B', marginBottom:28, lineHeight:1.5 }}>
            Sign in to your ERP account to continue
          </div>

          {/* ── Quick Login Section ── */}
          <div style={{
            background:'#F8FAFF', border:'1px solid #E8EEFF',
            borderRadius:12, padding:'14px 16px', marginBottom:24,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
              Quick Access
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {QUICK_LOGINS.map((q) => {
                const isActive = quickLoading === q.email;
                return (
                  <button
                    key={q.email}
                    onClick={() => onQuickLogin(q)}
                    disabled={!!quickLoading || loading}
                    style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'10px 14px', borderRadius:9,
                      border:`1.5px solid ${isActive ? q.color : q.border}`,
                      background: isActive ? q.color : q.bg,
                      cursor: (quickLoading || loading) ? 'not-allowed' : 'pointer',
                      transition:'all 0.18s ease', textAlign:'left', width:'100%',
                      opacity: (quickLoading && !isActive) ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!quickLoading && !loading) { e.currentTarget.style.borderColor = q.color; e.currentTarget.style.background = isActive ? q.color : q.bg; e.currentTarget.style.transform = 'translateX(2px)'; }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isActive ? q.color : q.border; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width:34, height:34, borderRadius:8, flexShrink:0,
                      background: isActive ? 'rgba(255,255,255,0.25)' : q.color,
                      display:'grid', placeItems:'center',
                      fontSize:12, fontWeight:800, color:'#fff', letterSpacing:'0.02em',
                    }}>
                      {isActive ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      ) : q.initials}
                    </div>
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13.5, fontWeight:700,
                        color: isActive ? '#fff' : '#0B1120', lineHeight:1.2,
                      }}>
                        {isActive ? 'Signing in…' : q.label}
                      </div>
                      <div style={{
                        fontSize:11.5, marginTop:2,
                        color: isActive ? 'rgba(255,255,255,0.75)' : '#64748B',
                      }}>
                        {q.email}
                      </div>
                    </div>
                    {/* Arrow */}
                    {!isActive && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={q.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
            <div style={{ flex:1, height:1, background:'#E8EDF4' }} />
            <span style={{ fontSize:11.5, fontWeight:600, color:'#94A3B8', whiteSpace:'nowrap' }}>or sign in manually</span>
            <div style={{ flex:1, height:1, background:'#E8EDF4' }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8,
              padding:'10px 14px', marginBottom:18, fontSize:13, color:'#DC2626', fontWeight:500,
              display:'flex', alignItems:'flex-start', gap:8,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Manual form */}
          <form onSubmit={onSubmit} autoComplete="on" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Email address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" placeholder="you@company.com"
                style={{
                  width:'100%', height:42, padding:'0 13px',
                  border:'1.5px solid #E2E8F0', borderRadius:8,
                  fontSize:13.5, color:'#0B1120', background:'#F8FAFC',
                  outline:'none', boxSizing:'border-box', transition:'border-color 0.18s, box-shadow 0.18s',
                }}
                onFocus={e => { e.target.style.borderColor='#1E3A8A'; e.target.style.boxShadow='0 0 0 3px rgba(30,58,138,0.1)'; }}
                onBlur={e => { e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; }}
              />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" placeholder="••••••••"
                  style={{
                    width:'100%', height:42, padding:'0 48px 0 13px',
                    border:'1.5px solid #E2E8F0', borderRadius:8,
                    fontSize:13.5, color:'#0B1120', background:'#F8FAFC',
                    outline:'none', boxSizing:'border-box', transition:'border-color 0.18s, box-shadow 0.18s',
                  }}
                  onFocus={e => { e.target.style.borderColor='#1E3A8A'; e.target.style.boxShadow='0 0 0 3px rgba(30,58,138,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{
                  position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer',
                  fontSize:11.5, fontWeight:700, color:'#1E3A8A', padding:'2px 4px',
                }}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!quickLoading}
              style={{
                height:44, borderRadius:8, border:'none', cursor: (loading || quickLoading) ? 'not-allowed' : 'pointer',
                background: (loading || quickLoading) ? '#94A3B8' : 'linear-gradient(135deg, #0B1120 0%, #1E3A8A 100%)',
                color:'#fff', fontSize:14.5, fontWeight:700, letterSpacing:'0.01em',
                marginTop:2, transition:'opacity 0.18s, transform 0.1s',
                boxShadow: (loading || quickLoading) ? 'none' : '0 4px 16px rgba(30,58,138,0.3)',
              }}
              onMouseEnter={e => { if (!loading && !quickLoading) e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:28, fontSize:11.5, color:'#94A3B8', lineHeight:1.6 }}>
            © {new Date().getFullYear()} Taurus Trade &amp; Logistics · All rights reserved
          </div>
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

/* ── Branch Provider Wrapper ─────────────────────────────────── */
function BranchProviderWrapper({ children }) {
  const { user } = useAuth();
  return <BranchProvider user={user}>{children}</BranchProvider>;
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
                  <BranchProviderWrapper>
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
                  </BranchProviderWrapper>
                </RequireAuth>
              } />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
