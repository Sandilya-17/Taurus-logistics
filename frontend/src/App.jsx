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

/* ── Login Page ──────────────────────────────────────────────── */
function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Left Panel — Full bleed background image ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=85&w=2000&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        {/* Dark overlay for depth */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(4,10,22,0.72) 0%, rgba(4,10,22,0.45) 60%, rgba(4,10,22,0.65) 100%)',
        }} />

        {/* Top-left brand */}
        <div style={{ position: 'absolute', top: 36, left: 40, zIndex: 2 }}>
          <TaurusLogo width={210} />
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: 'absolute', bottom: 44, left: 40, right: 40, zIndex: 2,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.3 }}>
            Enterprise Resource Planning
          </div>
          <div style={{ color: 'rgba(255,255,255,0.50)', fontSize: 13.5, fontWeight: 400, lineHeight: 1.6 }}>
            Fleet · Fuel · Inventory · Financials — unified.
          </div>
          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {[['🚛','Fleet'],['⛽','Fuel'],['📦','Inventory'],['💰','Finance'],['📊','Reports']].map(([ic, label]) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 20, padding: '5px 12px',
                fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500,
              }}>
                <span style={{ fontSize: 13 }}>{ic}</span>{label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 16, left: 40, color: 'rgba(255,255,255,0.22)', fontSize: 11, zIndex: 1 }}>
          © {new Date().getFullYear()} Taurus Trade &amp; Logistics · All rights reserved
        </div>
      </div>

      {/* ── Right Panel — Clean white login card ── */}
      <div style={{
        width: 420,
        minWidth: 380,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: '48px 44px',
        boxShadow: '-4px 0 40px rgba(0,0,0,0.18)',
        position: 'relative',
      }}>
        {/* Top logos like KL style */}
        <div style={{ position: 'absolute', top: 28, left: 44, right: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <TaurusLogo width={140} />
        </div>

        <div style={{ marginTop: 40 }}>
          {/* Heading */}
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0B1F4D', letterSpacing: '-0.03em', marginBottom: 6 }}>
            Login
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 32 }}>
            Sign in to your ERP account to continue
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#DC2626', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} autoComplete="on" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Email address <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" placeholder="Enter Email"
                style={{
                  width: '100%', height: 44, padding: '0 14px',
                  border: '1.5px solid #D1D5DB', borderRadius: 8,
                  fontSize: 13.5, color: '#111827', background: '#F9FAFB',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color .15s, box-shadow .15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = '#0B1F4D'; e.target.style.boxShadow = '0 0 0 3px rgba(11,31,77,.10)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F9FAFB'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" placeholder="Enter Password"
                  style={{
                    width: '100%', height: 44, padding: '0 52px 0 14px',
                    border: '1.5px solid #D1D5DB', borderRadius: 8,
                    fontSize: 13.5, color: '#111827', background: '#F9FAFB',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color .15s, box-shadow .15s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0B1F4D'; e.target.style.boxShadow = '0 0 0 3px rgba(11,31,77,.10)'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F9FAFB'; }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, color: '#6B7280', padding: '2px 4px', fontFamily: 'inherit',
                }}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 46, borderRadius: 8, border: 'none', marginTop: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#94A3B8' : '#0B1F4D',
                color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.01em',
                transition: 'background .18s, transform .12s, box-shadow .18s',
                boxShadow: loading ? 'none' : '0 4px 18px rgba(11,31,77,.35)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(29,78,216,.40)'; } }}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = '#0B1F4D'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(11,31,77,.35)'; } }}
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
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
