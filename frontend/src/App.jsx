// src/App.jsx — Taurus ERP — Enterprise UI v4
import { useState, createContext, useContext, useEffect, useCallback, useRef, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/main.css';
import loginBg from './bg.png';
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
      .then(r => {
        const list = r.data?.results ?? r.data ?? [];
        setBranches(list);
        if (list.length > 0) {
          setActiveBranchId(prev => prev ?? list[0].id);
        }
      })
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
const Ic = ({ children, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {children}
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
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
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
            placeholder="Search pages and modules…"
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
          padding: '0 10px',
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
          aria-label="Open search"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            height: 34, padding: '0 11px',
            borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-3)',
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

        <button className="icon-btn" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'} aria-label="Toggle theme">
          {dark ? Icons.Sun : Icons.Moon}
        </button>

        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" title="Notifications" aria-label="Notifications" onClick={() => setNotifOpen(o => !o)}>
            {Icons.Bell}
          </button>
          <NotifPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* User menu */}
        <div className="user-menu-wrap" ref={menuRef}>
          <button className="user-chip" onClick={() => setMenuOpen(o => !o)} aria-label="User menu">
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
function TaurusLogo({ size = 'md' }) {
  const isLarge = size === 'lg';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isLarge ? 14 : 10 }}>
      <svg
        width={isLarge ? 40 : 30}
        height={isLarge ? 40 : 30}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="10" fill="#0B1F4D" />
        <path d="M10 14 L20 10 L30 14 L20 18 Z" fill="#2563EB" />
        <path d="M10 21 L20 17 L30 21 L20 25 Z" fill="#3B82F6" opacity=".85" />
        <path d="M10 28 L20 24 L30 28 L20 32 Z" fill="#F97316" opacity=".9" />
      </svg>
      <div>
        <div style={{
          fontFamily: "'Inter', -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: isLarge ? 22 : 15,
          letterSpacing: '-0.02em',
          color: '#FFFFFF',
          lineHeight: 1,
        }}>
          Taurus
        </div>
        <div style={{
          fontFamily: "'Inter', -apple-system, sans-serif",
          fontWeight: 600,
          fontSize: isLarge ? 9 : 7.5,
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,.55)',
          lineHeight: 1,
          marginTop: 3,
          textTransform: 'uppercase',
        }}>
          Trade &amp; Logistics
        </div>
      </div>
    </div>
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
  const [focused, setFocused]   = useState(null);

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

  const fieldStyle = (field) => ({
    width: '100%',
    height: 46,
    padding: field === 'password' ? '0 48px 0 14px' : '0 14px',
    border: `1.5px solid ${focused === field ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.35)'}`,
    borderRadius: 10,
    fontSize: 14,
    color: '#0F172A',
    background: focused === field ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.80)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Inter', -apple-system, sans-serif",
    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
    boxShadow: focused === field ? '0 0 0 3px rgba(255,255,255,.2)' : 'none',
  });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: 'relative',
      backgroundImage: `url(${loginBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(11,31,77,.70) 0%, rgba(11,31,77,.45) 100%)',
        zIndex: 0,
      }} />

      {/* Login card */}
      <div style={{
        width: '100%', maxWidth: 420,
        display: 'flex', flexDirection: 'column',
        padding: '44px 44px',
        background: 'rgba(255,255,255,.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 20,
        border: '1.5px solid rgba(255,255,255,.22)',
        boxShadow: '0 8px 40px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.2)',
        boxSizing: 'border-box',
        margin: '20px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <TaurusLogo size="sm" />
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            margin: 0,
            fontSize: 26, fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}>
            Welcome back
          </h1>
          <p style={{
            margin: '8px 0 0',
            fontSize: 14,
            color: 'rgba(255,255,255,.60)',
            lineHeight: 1.5,
          }}>
            Sign in to access the logistics dashboard.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: '#FFF5F5',
            border: '1px solid #FECACA',
            borderLeft: '3px solid #EF4444',
            borderRadius: 10,
            padding: '11px 14px',
            marginBottom: 20,
            fontSize: 13, fontWeight: 500,
            color: '#B91C1C',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} autoComplete="on" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: 'rgba(255,255,255,.80)', marginBottom: 6,
            }}>
              Email address
            </label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required autoComplete="email"
              placeholder="you@company.com"
              style={fieldStyle('email')}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </div>

          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: 'rgba(255,255,255,.80)', marginBottom: 6,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                placeholder="••••••••"
                style={fieldStyle('password')}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <button
                type="button" onClick={() => setShowPw(s => !s)}
                style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94A3B8', padding: 4, display: 'flex', alignItems: 'center',
                }}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              height: 48, borderRadius: 10, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading
                ? 'rgba(255,255,255,.25)'
                : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#fff',
              fontSize: 15, fontWeight: 700,
              letterSpacing: '-0.01em',
              transition: 'opacity 0.15s, box-shadow 0.15s',
              boxShadow: loading ? 'none' : '0 4px 18px rgba(37,99,235,.45)',
              fontFamily: "'Inter', -apple-system, sans-serif",
              marginTop: 4,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1'; }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round"
                  style={{ animation: 'spin 0.75s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <p style={{
          marginTop: 'auto', paddingTop: 28,
          textAlign: 'center',
          fontSize: 11.5,
          color: 'rgba(255,255,255,.35)',
        }}>
          © {new Date().getFullYear()} Taurus Trade &amp; Logistics
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(100,116,139,0.7) !important; }
      `}</style>
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
