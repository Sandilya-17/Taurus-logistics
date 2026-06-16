// src/App.jsx — Taurus ERP — Premium Enterprise UI v3
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
const BranchCtx = createContext(null);
export const useBranch = () => useContext(BranchCtx);
const CurrencyCtx = createContext(null);
export const useCurrency = () => useContext(CurrencyCtx);

function BranchProvider({ user, children }) {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [activeBranchId, setActiveBranchId] = useState(
    isSuperAdmin ? null : (user?.branch?.id ?? null)
  );
  const [branches, setBranches] = useState([]);
  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/users/branches/')
      .then(r => setBranches(r.data?.results ?? r.data ?? []))
      .catch(() => {});
  }, [isSuperAdmin]);
  const branchQS = (isSuperAdmin && activeBranchId) ? { branch_id: activeBranchId } : {};
  const branchParam = (isSuperAdmin && activeBranchId) ? `?branch_id=${activeBranchId}` : '';
  const getActiveCurrencyCode = () => {
    if (isSuperAdmin) {
      if (activeBranchId) {
        const found = branches.find(b => b.id === activeBranchId || String(b.id) === String(activeBranchId));
        return found?.currency || 'GHS';
      }
      return 'GHS';
    }
    return user?.branch_currency || user?.branch?.currency || 'GHS';
  };
  const currencyCode = getActiveCurrencyCode();
  const currencyConfig = getCurrencyConfig(currencyCode);
  const fmt = (val) => fmtMoney(val, currencyCode);
  return (
    <BranchCtx.Provider value={{ isSuperAdmin, activeBranchId, setActiveBranchId: isSuperAdmin ? setActiveBranchId : () => {}, branches, branchQS, branchParam }}>
      <CurrencyCtx.Provider value={{ fmt, symbol: currencyConfig.symbol, branchId: isSuperAdmin ? activeBranchId : (user?.branch?.id ?? null), currencyCode }}>
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
const Ic = ({ path, children, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={path} />}
  </svg>
);

const Icons = {
  Dashboard:    <Ic><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Ic>,
  Truck:        <Ic><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a2 2 0 0 0-.59-1.42L17.5 9H14v8h3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></Ic>,
  Driver:       <Ic><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Ic>,
  Trip:         <Ic><path d="M5 12h14M12 5l7 7-7 7"/></Ic>,
  Fuel:         <Ic><path d="M3 22h12V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M15 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2h0V8l-3-3"/></Ic>,
  Box:          <Ic><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></Ic>,
  Purchase:     <Ic><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></Ic>,
  IssueItem:    <Ic><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Ic>,
  StockLedger:  <Ic><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></Ic>,
  Expenditure:  <Ic><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></Ic>,
  Dollar:       <Ic><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Ic>,
  Wrench:       <Ic><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Ic>,
  Tyre:         <Ic><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></Ic>,
  Chart:        <Ic><path d="M3 3v18h18"/><path d="M7 15l4-4 4 4 5-6"/></Ic>,
  BarChart:     <Ic><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Ic>,
  Receipt:      <Ic><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></Ic>,
  User:         <Ic><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Ic>,
  Users:        <Ic><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Ic>,
  Log:          <Ic><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></Ic>,
  Logout:       <Ic><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ic>,
  Sun:          <Ic><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Ic>,
  Moon:         <Ic><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Ic>,
  Bell:         <Ic><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Ic>,
  Menu:         <Ic><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></Ic>,
  ChevronRight: <Ic><path d="M9 18l6-6-6-6"/></Ic>,
  Close:        <Ic><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>,
  Shield:       <Ic><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ic>,
  Search:       <Ic><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></Ic>,
  Command:      <Ic><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></Ic>,
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

/* ── Command Palette ─────────────────────────────────────────── */
function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { user } = useAuth();
  const canSee = (item) => !item.roles || item.roles.includes(user?.role);

  const allItems = NAV.flatMap(s => s.items.filter(canSee).map(i => ({ ...i, section: s.label })));
  const filtered = query.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const go = (to) => { navigate(to); onClose(); };

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          {Icons.Search}
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, modules…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="cmd-key">ESC</div>
        </div>
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="cmd-empty">No results for "{query}"</div>
          ) : filtered.map(item => (
            <div key={item.to} className="cmd-item" onClick={() => go(item.to)}>
              <span style={{ color: 'var(--text-3)', display: 'flex' }}>{item.icon}</span>
              <span>{item.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>{item.section}</span>
            </div>
          ))}
        </div>
        <div className="cmd-footer">
          <div className="cmd-hint"><span className="cmd-key">↑↓</span> navigate</div>
          <div className="cmd-hint"><span className="cmd-key">↵</span> open</div>
          <div className="cmd-hint"><span className="cmd-key">ESC</span> close</div>
        </div>
      </div>
    </div>
  );
}

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

/* ── Branch Selector ──────────────────────────────────────────── */
function BranchSelector() {
  const branchCtx = useBranch();
  if (!branchCtx || !branchCtx.isSuperAdmin) return null;
  const { activeBranchId, setActiveBranchId, branches } = branchCtx;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        Branch
      </span>
      <select
        value={activeBranchId ?? ''}
        onChange={e => setActiveBranchId(e.target.value ? Number(e.target.value) : null)}
        style={{
          fontSize: 12, fontWeight: 600,
          padding: '5px 10px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text)',
          cursor: 'pointer',
          outline: 'none',
          minWidth: 130,
          height: 32,
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

/* ── Notification Panel ──────────────────────────────────────── */
function NotifPanel({ open, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div ref={ref} className="notif-panel">
      <div className="notif-header">
        <span className="notif-title">Notifications</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
          {Icons.Close}
        </button>
      </div>
      <div className="notif-empty">No new notifications</div>
    </div>
  );
}

/* ── Topbar ──────────────────────────────────────────────────── */
function Topbar({ onMenu, onCmd }) {
  const { dark, toggle } = useTheme();
  const { user, logout }  = useAuth();
  const location          = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

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
        {/* Search / Command palette trigger */}
        <button
          onClick={onCmd}
          title="Search (⌘K)"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            height: 32, padding: '0 10px',
            borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg)', color: 'var(--text-3)',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            transition: 'all var(--t)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          {Icons.Search}
          <span style={{ display: 'none', '@media(minWidth:640px)': { display: 'inline' } }}>Search</span>
          <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 2, opacity: .6 }}>⌘K</span>
        </button>

        {/* Branch selector — SUPER_ADMIN only */}
        <BranchSelector />

        <button className="icon-btn" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}>
          {dark ? Icons.Sun : Icons.Moon}
        </button>

        {/* Notification bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button className="icon-btn" title="Notifications" onClick={() => setNotifOpen(o => !o)}>
            {Icons.Bell}
          </button>
          <NotifPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* User menu */}
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Global ⌘K shortcut
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="app-shell">
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Topbar onMenu={() => setSidebarOpen(true)} onCmd={() => setCmdOpen(true)} />
        <main className="page-content page-enter">{children}</main>
      </div>
    </div>
  );
}

/* ── Taurus SVG Logo ─────────────────────────────────────────── */
function TaurusLogo({ width = 280 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 110" width={width} height="auto">
      <defs>
        <linearGradient id="tlPrimary" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0B1F4D" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="tlAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <g transform="translate(10, 10)">
        <path d="M12 18 L44 40 L12 62 L26 40 Z" fill="url(#tlPrimary)" opacity="0.35" />
        <path d="M30 18 L72 40 L30 62 L44 40 Z" fill="url(#tlPrimary)" />
        <path d="M54 27 L76 40 L54 53 L64 40 Z" fill="url(#tlAccent)" />
        <rect x="12" y="70" width="64" height="3.5" rx="1.75" fill="url(#tlAccent)" />
      </g>
      <text x="115" y="62"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif"
        fontSize="48" fontWeight="900" fill="#0B1F4D" letterSpacing="0.5">
        TAURUS
      </text>
      <text x="117" y="86"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif"
        fontSize="12.5" fontWeight="700" fill="#EA580C" letterSpacing="5">
        TRADING &amp; LOGISTICS
      </text>
    </svg>
  );
}

/* ── Login Quick-Access accounts ─────────────────────────────── */
const QUICK_ACCOUNTS = [
  { initials: 'SA', name: 'Super Admin', email: 'superssmin@taurus.com', password: 'admin', color: 'linear-gradient(135deg,#0B1F4D,#2563EB)' },
  { initials: 'A1', name: 'Admin 1',     email: 'admin1@taurus.com',     password: 'admin', color: 'linear-gradient(135deg,#1D4ED8,#60A5FA)' },
  { initials: 'A2', name: 'Admin 2',     email: 'admin2@taurus.com',     password: 'admin', color: 'linear-gradient(135deg,#059669,#34D399)' },
];

/* ── Login Page ──────────────────────────────────────────────── */
function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showManual, setShowManual] = useState(false);

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

  const onQuickAccess = async (acc) => {
    setLoading(true);
    await doLogin(acc.email, acc.password);
    setLoading(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await doLogin(email, password);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left Panel ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minHeight: '100vh',
        background: '#060D1F',
      }}>
        {/* Inline SVG Hero Illustration */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 900 700"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            {/* Background gradient */}
            <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#0D2359" />
              <stop offset="100%" stopColor="#040A16" />
            </radialGradient>
            {/* Globe glow */}
            <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#1E3A8A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0B1F4D" stopOpacity="0" />
            </radialGradient>
            {/* Orange glow */}
            <radialGradient id="orangeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </radialGradient>
            {/* Grid line gradient */}
            <linearGradient id="gridFade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
            {/* Truck body gradient */}
            <linearGradient id="truckBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0B1F4D" />
            </linearGradient>
            {/* Road gradient */}
            <linearGradient id="road" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0F1E3D" stopOpacity="0" />
              <stop offset="20%" stopColor="#0F1E3D" />
              <stop offset="80%" stopColor="#0F1E3D" />
              <stop offset="100%" stopColor="#0F1E3D" stopOpacity="0" />
            </linearGradient>
            {/* Arrow trail gradient */}
            <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="trailGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.7" />
            </linearGradient>
            {/* Card gradient */}
            <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0D1F4A" />
              <stop offset="100%" stopColor="#071030" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="softglow">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="900" height="700" fill="url(#bgGrad)" />

          {/* Grid lines — perspective floor */}
          {[0,1,2,3,4,5,6,7,8].map(i => (
            <line key={`vg${i}`} x1={100 + i*90} y1="340" x2={450} y2="520" stroke="#2563EB" strokeOpacity="0.07" strokeWidth="1" />
          ))}
          {[0,1,2,3,4].map(i => (
            <line key={`hg${i}`} x1="100" y1={360 + i*40} x2="800" y2={360 + i*40} stroke="#2563EB" strokeOpacity="0.05" strokeWidth="1" />
          ))}

          {/* Globe — large ambient circle */}
          <circle cx="430" cy="270" r="195" fill="url(#globeGlow)" />
          <circle cx="430" cy="270" r="175" fill="none" stroke="#1E40AF" strokeOpacity="0.18" strokeWidth="1.5" />
          <circle cx="430" cy="270" r="175" fill="none" stroke="#2563EB" strokeOpacity="0.08" strokeWidth="40" />

          {/* Globe latitude lines */}
          {[-3,-2,-1,0,1,2,3].map(i => {
            const y = 270 + i * 48;
            const halfW = Math.sqrt(Math.max(0, 175*175 - (y-270)*(y-270)));
            return halfW > 5 ? (
              <ellipse key={`lat${i}`} cx="430" cy={y} rx={halfW} ry={halfW * 0.32}
                fill="none" stroke="#3B82F6" strokeOpacity="0.12" strokeWidth="1" />
            ) : null;
          })}
          {/* Globe longitude lines */}
          {[0,1,2,3].map(i => (
            <ellipse key={`lon${i}`} cx="430" cy="270" rx={175 * Math.cos(i * Math.PI/4)} ry="175"
              fill="none" stroke="#3B82F6" strokeOpacity="0.10" strokeWidth="1" />
          ))}

          {/* Globe continent dots — stylised */}
          {[
            [370,210],[390,200],[420,205],[450,215],[470,210],[490,200],[380,230],[400,225],
            [320,260],[340,255],[355,250],[310,275],[330,270],[300,290],[340,285],
            [460,235],[480,240],[500,235],[510,250],[490,260],[470,255],
            [380,290],[400,295],[420,285],[440,290],[460,280],
            [350,310],[370,315],[390,310],[410,320],[430,310],
          ].map(([x,y],i) => (
            <circle key={`dot${i}`} cx={x} cy={y} r="2.5" fill="#60A5FA" opacity="0.35" />
          ))}

          {/* Route lines on globe */}
          <path d="M340 250 Q430 190 510 245" fill="none" stroke="#F97316" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="4 3" />
          <path d="M310 280 Q430 320 520 265" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="4 3" />
          <path d="M360 220 Q450 270 490 310" fill="none" stroke="#10B981" strokeWidth="1.2" strokeOpacity="0.45" strokeDasharray="3 4" />

          {/* Glowing nodes on globe */}
          {[[340,250,'#F97316'],[510,245,'#F97316'],[310,280,'#2563EB'],[520,265,'#2563EB'],[430,240,'#10B981']].map(([x,y,c],i) => (
            <g key={`node${i}`}>
              <circle cx={x} cy={y} r="6" fill={c} opacity="0.18" />
              <circle cx={x} cy={y} r="3" fill={c} opacity="0.7" />
              <circle cx={x} cy={y} r="1.5" fill="#fff" opacity="0.9" />
            </g>
          ))}

          {/* Satellite */}
          <g transform="translate(600, 110) rotate(-15)">
            <rect x="-18" y="-5" width="36" height="10" rx="3" fill="#1E3A8A" stroke="#3B82F6" strokeWidth="1" opacity="0.9" />
            <rect x="-38" y="-3" width="18" height="6" rx="1.5" fill="#2563EB" opacity="0.7" />
            <rect x="20" y="-3" width="18" height="6" rx="1.5" fill="#2563EB" opacity="0.7" />
            <circle cx="0" cy="0" r="3" fill="#60A5FA" />
            {/* Signal arcs */}
            <path d="M-8 8 Q0 14 8 8" fill="none" stroke="#F97316" strokeWidth="1" strokeOpacity="0.6" />
            <path d="M-13 13 Q0 22 13 13" fill="none" stroke="#F97316" strokeWidth="0.8" strokeOpacity="0.35" />
          </g>
          {/* Satellite signal line */}
          <line x1="600" y1="118" x2="480" y2="230" stroke="#F97316" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 4" />

          {/* ── Road ── */}
          <rect x="0" y="480" width="900" height="60" fill="url(#road)" rx="0" />
          {/* Road markings */}
          {[1,2,3,4,5,6,7,8].map(i => (
            <rect key={`rm${i}`} x={i * 110 - 30} y="507" width="60" height="5" rx="2.5" fill="#1E3A8A" opacity="0.5" />
          ))}
          {/* Road edge lines */}
          <line x1="0" y1="482" x2="900" y2="482" stroke="#2563EB" strokeOpacity="0.2" strokeWidth="1.5" />
          <line x1="0" y1="538" x2="900" y2="538" stroke="#2563EB" strokeOpacity="0.15" strokeWidth="1" />

          {/* ── Main Truck ── */}
          <g transform="translate(160, 400)">
            {/* Trailer */}
            <rect x="-140" y="0" width="200" height="68" rx="4" fill="url(#truckBody)" stroke="#2563EB" strokeWidth="1.5" opacity="0.95" />
            {/* Trailer panel lines */}
            <line x1="-140" y1="0" x2="-140" y2="68" stroke="#2563EB" strokeOpacity="0.3" strokeWidth="1" />
            {[-100,-60,-20,20,60].map(x => (
              <line key={x} x1={x} y1="2" x2={x} y2="66" stroke="#1E40AF" strokeOpacity="0.4" strokeWidth="0.8" />
            ))}
            {/* TAURUS text on trailer */}
            <text x="-45" y="40" fontFamily="Inter,sans-serif" fontSize="14" fontWeight="800"
              fill="#fff" opacity="0.9" letterSpacing="3" textAnchor="middle">TAURUS</text>
            {/* Orange arrow chevrons */}
            <path d="M30 20 L55 34 L30 48" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            <path d="M40 20 L65 34 L40 48" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />

            {/* Cab */}
            <rect x="60" y="-12" width="90" height="80" rx="5" fill="#0D2359" stroke="#2563EB" strokeWidth="1.5" />
            {/* Windshield */}
            <rect x="68" y="-6" width="55" height="36" rx="3" fill="#1E3A8A" opacity="0.9" />
            <line x1="95" y1="-6" x2="95" y2="30" stroke="#2563EB" strokeOpacity="0.5" strokeWidth="1" />
            {/* Headlight */}
            <rect x="144" y="20" width="8" height="16" rx="2" fill="#F97316" opacity="0.9" filter="url(#glow)" />
            {/* Headlight beam */}
            <path d="M152 24 L185 18 M152 30 L185 34" stroke="#F97316" strokeOpacity="0.25" strokeWidth="1.5" />
            {/* Exhaust pipe */}
            <rect x="118" y="-22" width="6" height="16" rx="3" fill="#0D2359" stroke="#2563EB" strokeWidth="1" />
            {/* Smoke puffs */}
            <circle cx="121" cy="-28" r="5" fill="#1E3A8A" opacity="0.25" />
            <circle cx="118" cy="-36" r="4" fill="#1E3A8A" opacity="0.15" />

            {/* Wheels */}
            {[-110, -60, 70, 108].map((x,i) => (
              <g key={i}>
                <circle cx={x} cy="72" r="18" fill="#060D1F" stroke="#2563EB" strokeWidth="2" />
                <circle cx={x} cy="72" r="10" fill="#0D1E40" stroke="#3B82F6" strokeWidth="1.5" />
                <circle cx={x} cy="72" r="4" fill="#2563EB" />
                {[0,60,120,180,240,300].map(a => (
                  <line key={a}
                    x1={x + 5*Math.cos(a*Math.PI/180)} y1={72 + 5*Math.sin(a*Math.PI/180)}
                    x2={x + 9*Math.cos(a*Math.PI/180)} y2={72 + 9*Math.sin(a*Math.PI/180)}
                    stroke="#3B82F6" strokeWidth="1.5" />
                ))}
              </g>
            ))}

            {/* Motion trail */}
            <rect x="-220" y="20" width="80" height="3" rx="1.5" fill="url(#trailGrad2)" />
            <rect x="-200" y="28" width="60" height="2" rx="1" fill="url(#trailGrad2)" opacity="0.5" />
            <rect x="-210" y="40" width="70" height="2" rx="1" fill="url(#trailGrad2)" opacity="0.3" />
          </g>

          {/* ── Second smaller truck (background) ── */}
          <g transform="translate(680, 432) scale(0.65)" opacity="0.5">
            <rect x="-100" y="0" width="150" height="55" rx="3" fill="#0D1A3A" stroke="#1E3A8A" strokeWidth="1.5" />
            <text x="-25" y="33" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="700" fill="#fff" opacity="0.6" textAnchor="middle">TAURUS</text>
            <rect x="50" y="-10" width="70" height="65" rx="4" fill="#071030" stroke="#1E3A8A" strokeWidth="1.5" />
            <rect x="56" y="-5" width="42" height="28" rx="2" fill="#132048" opacity="0.9" />
            <rect x="114" y="18" width="7" height="12" rx="2" fill="#F97316" opacity="0.7" />
            {[-70,-30,55,82].map((x,i) => (
              <g key={i}>
                <circle cx={x} cy="58" r="14" fill="#040A16" stroke="#1E3A8A" strokeWidth="1.5" />
                <circle cx={x} cy="58" r="7" fill="#071030" stroke="#2563EB" strokeWidth="1" />
                <circle cx={x} cy="58" r="3" fill="#2563EB" />
              </g>
            ))}
          </g>

          {/* ── Warehouse / Storage building (right) ── */}
          <g transform="translate(700, 310)" opacity="0.6">
            <rect x="0" y="0" width="130" height="140" rx="3" fill="#07112A" stroke="#1E3A8A" strokeWidth="1.5" />
            {/* Roof accent */}
            <path d="M-10 0 L65 -25 L140 0" fill="#0D1E40" stroke="#2563EB" strokeWidth="1.5" />
            {/* Door */}
            <rect x="45" y="80" width="40" height="60" rx="2" fill="#0D1A3A" stroke="#1E3A8A" strokeWidth="1" />
            <line x1="65" y1="80" x2="65" y2="140" stroke="#1E3A8A" strokeWidth="0.8" />
            {/* Windows */}
            {[0,1,2].map(i => (
              <rect key={i} x={10 + i*40} y="20" width="25" height="20" rx="2" fill="#1E3A8A" opacity="0.5" stroke="#2563EB" strokeWidth="0.8" />
            ))}
            {[0,1,2].map(i => (
              <rect key={i} x={10 + i*40} y="50" width="25" height="20" rx="2" fill="#1E3A8A" opacity="0.3" stroke="#2563EB" strokeWidth="0.8" />
            ))}
            {/* Loading dock light */}
            <circle cx="115" cy="100" r="4" fill="#F97316" opacity="0.7" />
          </g>

          {/* ── Shipping containers (right side) ── */}
          {[[750,430,'#0A1E45'],[768,418,'#0C1F3D'],[752,408,'#071535']].map(([x,y,c],i) => (
            <g key={i} opacity={0.5 + i*0.1}>
              <rect x={x} y={y} width="70" height="40" rx="2" fill={c} stroke="#1E3A8A" strokeWidth="1.2" />
              {[1,2,3].map(j => <line key={j} x1={x + j*17} y1={y} x2={x + j*17} y2={y+40} stroke="#1E3A8A" strokeOpacity="0.5" strokeWidth="0.8" />)}
            </g>
          ))}

          {/* ── Floating Data Cards ── */}
          {/* Card 1 — Fleet Status */}
          <g transform="translate(48, 130)">
            <rect x="0" y="0" width="155" height="72" rx="10" fill="url(#cardGrad)" stroke="#1E40AF" strokeWidth="1.2" opacity="0.92" />
            <rect x="0" y="0" width="155" height="3" rx="10" fill="#2563EB" opacity="0.6" />
            <text x="12" y="20" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="700" fill="#60A5FA" opacity="0.8" letterSpacing="1.5">FLEET STATUS</text>
            <text x="12" y="42" fontFamily="Inter,sans-serif" fontSize="22" fontWeight="800" fill="#fff">24</text>
            <text x="46" y="42" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500" fill="#60A5FA" opacity="0.6"> active trucks</text>
            <circle cx="136" cy="18" r="6" fill="#10B981" opacity="0.85" />
            <circle cx="136" cy="18" r="3" fill="#fff" opacity="0.9" />
            {/* Mini bar chart */}
            {[28,42,35,50,44,38,52].map((h,i) => (
              <rect key={i} x={12 + i*16} y={68-h*0.35} width="10" height={h*0.35} rx="2" fill="#2563EB" opacity={0.3+i*0.08} />
            ))}
          </g>

          {/* Card 2 — Revenue */}
          <g transform="translate(48, 220)">
            <rect x="0" y="0" width="155" height="72" rx="10" fill="url(#cardGrad)" stroke="#1E40AF" strokeWidth="1.2" opacity="0.88" />
            <rect x="0" y="0" width="155" height="3" rx="10" fill="#10B981" opacity="0.7" />
            <text x="12" y="20" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="700" fill="#34D399" opacity="0.8" letterSpacing="1.5">MONTHLY REVENUE</text>
            <text x="12" y="44" fontFamily="Inter,sans-serif" fontSize="18" fontWeight="800" fill="#fff">GH₵ 284K</text>
            <text x="12" y="60" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="500" fill="#34D399" opacity="0.7">↑ 12.4% vs last month</text>
            <path d="M90 62 Q105 48 120 52 Q135 56 150 38" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.6" />
          </g>

          {/* Card 3 — Fuel (top right) */}
          <g transform="translate(680, 140)">
            <rect x="0" y="0" width="160" height="72" rx="10" fill="url(#cardGrad)" stroke="#1E40AF" strokeWidth="1.2" opacity="0.88" />
            <rect x="0" y="0" width="160" height="3" rx="10" fill="#F97316" opacity="0.7" />
            <text x="12" y="20" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="700" fill="#FB923C" opacity="0.8" letterSpacing="1.5">FUEL CONSUMPTION</text>
            <text x="12" y="44" fontFamily="Inter,sans-serif" fontSize="18" fontWeight="800" fill="#fff">8,420 L</text>
            <text x="12" y="60" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="500" fill="#FB923C" opacity="0.7">↓ 3.1% vs last month</text>
            {/* Fuel gauge arc */}
            <path d="M110 58 A22 22 0 0 1 152 58" fill="none" stroke="#1E3A8A" strokeWidth="5" />
            <path d="M110 58 A22 22 0 0 1 140 38" fill="none" stroke="#F97316" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Card 4 — Trips */}
          <g transform="translate(680, 225)">
            <rect x="0" y="0" width="160" height="65" rx="10" fill="url(#cardGrad)" stroke="#1E40AF" strokeWidth="1.2" opacity="0.85" />
            <rect x="0" y="0" width="160" height="3" rx="10" fill="#8B5CF6" opacity="0.7" />
            <text x="12" y="20" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="700" fill="#A78BFA" opacity="0.8" letterSpacing="1.5">ACTIVE TRIPS</text>
            <text x="12" y="44" fontFamily="Inter,sans-serif" fontSize="22" fontWeight="800" fill="#fff">17</text>
            <text x="50" y="44" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500" fill="#A78BFA" opacity="0.6"> in progress</text>
            <circle cx="140" cy="32" r="14" fill="#8B5CF6" opacity="0.15" />
            <text x="140" y="37" fontFamily="Inter,sans-serif" fontSize="14" fontWeight="800" fill="#A78BFA" textAnchor="middle">→</text>
          </g>

          {/* ── Connecting lines between cards and globe ── */}
          <line x1="203" y1="166" x2="280" y2="240" stroke="#2563EB" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="203" y1="256" x2="280" y2="290" stroke="#10B981" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="680" y1="176" x2="600" y2="235" stroke="#F97316" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />

          {/* ── Orange arrow chevrons (speed marks) ── */}
          <g opacity="0.55">
            <path d="M82 450 L96 462 L82 474" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M96 450 L110 462 L96 474" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <path d="M110 450 L124 462 L110 474" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          </g>

          {/* ── Stars / particles ── */}
          {[
            [80,60],[200,40],[550,50],[750,75],[820,100],[100,350],[820,300],
            [650,380],[480,100],[350,60],[640,60],[760,180],[500,420],[200,390],
          ].map(([x,y],i) => (
            <circle key={`star${i}`} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="#fff" opacity={0.15 + (i%5)*0.07} />
          ))}

          {/* ── Bottom gradient overlay for text legibility ── */}
          <defs>
            <linearGradient id="textFade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#040A16" stopOpacity="0" />
              <stop offset="60%" stopColor="#040A16" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#040A16" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <rect x="0" y="380" width="900" height="320" fill="url(#textFade)" />
        </svg>

        {/* Subtle top-left brand */}
        <div style={{ position: 'absolute', top: 32, left: 36, zIndex: 2 }}>
          <TaurusLogo width={220} />
        </div>

        {/* Bottom content */}
        <div style={{ position: 'relative', zIndex: 1, padding: '0 48px 52px', width: '100%', maxWidth: 660 }}>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Enterprise Resource Planning<br />
            <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 15, fontWeight: 400, letterSpacing: 'normal' }}>
              Fleet · Fuel · Inventory · Financials — unified.
            </span>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
            {[['🚛','Fleet Management'],['⛽','Fuel Control'],['📦','Inventory'],['💰','Finance'],['📊','Reports']].map(([ic, label]) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.09)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 24, padding: '6px 14px',
                fontSize: 12.5, color: 'rgba(255,255,255,.78)', fontWeight: 500,
              }}>
                <span style={{ fontSize: 14 }}>{ic}</span>{label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 22, left: 36, color: 'rgba(255,255,255,.2)', fontSize: 11, zIndex: 1 }}>
          © {new Date().getFullYear()} Taurus Trade &amp; Logistics · All rights reserved
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{
        width: '100%', maxWidth: 488,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 44px',
        background: '#FFFFFF',
        boxShadow: '-2px 0 60px rgba(11,31,77,.10)',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 370 }}>

          {/* Logo mark */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #0B1F4D 0%, #2563EB 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 4px 20px rgba(37,99,235,.35)',
            }}>
              <span style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>T</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0B1F4D', letterSpacing: '-0.03em', marginBottom: 4 }}>
              Welcome back
            </div>
            <div style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.5 }}>
              Sign in to your ERP account to continue
            </div>
          </div>

          {/* Progress accent */}
          <div style={{ height: 2, borderRadius: 99, background: '#E2E8F0', marginBottom: 28, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '65%', background: 'linear-gradient(90deg,#0B1F4D,#2563EB,#F97316)', borderRadius: 99 }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
              padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#DC2626', fontWeight: 500,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Quick access */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '.10em', textTransform: 'uppercase', marginBottom: 10 }}>
              Quick Access
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {QUICK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  className="qa-card"
                  onClick={() => onQuickAccess(acc)}
                  disabled={loading}
                >
                  <div className="qa-avatar" style={{ background: acc.color }}>
                    {acc.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="qa-name">{acc.name}</div>
                    <div className="qa-email">{acc.email}</div>
                  </div>
                  <div className="qa-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual sign-in toggle */}
          <button
            onClick={() => setShowManual(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              width: '100%', padding: '10px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12.5, color: '#64748B', fontWeight: 500, fontFamily: 'inherit',
              margin: '12px 0 4px',
            }}
          >
            <span>or sign in manually</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ transform: showManual ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {/* Manual form */}
          {showManual && (
            <form onSubmit={onSubmit} autoComplete="on" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="you@company.com"
                  style={{
                    width: '100%', height: 42, padding: '0 13px',
                    border: '1.5px solid #E2E8F0', borderRadius: 9,
                    fontSize: 13.5, color: '#0F172A', background: '#F8FAFC',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)'; }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password" placeholder="••••••••"
                    style={{
                      width: '100%', height: 42, padding: '0 52px 0 13px',
                      border: '1.5px solid #E2E8F0', borderRadius: 9,
                      fontSize: 13.5, color: '#0F172A', background: '#F8FAFC',
                      outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)'; }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 700, color: '#2563EB', padding: '2px 4px', fontFamily: 'inherit',
                  }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 44, borderRadius: 10, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? '#94A3B8' : 'linear-gradient(135deg, #0B1F4D 0%, #2563EB 100%)',
                  color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
                  marginTop: 4, transition: 'opacity .18s, transform .12s, box-shadow .18s',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,.35)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,.45)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 16px rgba(37,99,235,.35)'; }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}
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
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 8px 32px rgba(0,0,0,.12)',
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
