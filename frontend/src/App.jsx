// src/App.jsx — Taurus ERP — KL-ERP Style UI
import { useState, createContext, useContext, useEffect, useCallback, useRef, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
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
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/');
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
    } catch {}
  }, []);
  return <AuthCtx.Provider value={{ user, login, logout, refreshUser }}>{children}</AuthCtx.Provider>;
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
  Dollar:   <Ic><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Ic>,
  Wrench:   <Ic><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Ic>,
  Tyre:     <Ic><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></Ic>,
  Chart:    <Ic><path d="M3 3v18h18"/><path d="M7 15l4-4 4 4 5-6"/></Ic>,
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
  Settings: <Ic><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ic>,
  Eye:      <Ic><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Ic>,
  EyeOff:   <Ic><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></Ic>,
  Key:      <Ic><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></Ic>,
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
      { to: '/purchase', icon: Icons.Box,  label: 'Purchase' },
      { to: '/issue',    icon: Icons.Box,  label: 'Issue Items' },
      { to: '/stock',    icon: Icons.Box,  label: 'Stock Ledger' },
      { to: '/tyres',    icon: Icons.Tyre, label: 'Tyres' },
    ],
  },
  {
    label: 'Financials',
    items: [
      { to: '/invoicing',   icon: Icons.Receipt, label: 'Invoicing' },
      { to: '/expenditure', icon: Icons.Dollar,  label: 'Expenditure' },
      { to: '/revenue',     icon: Icons.Chart,   label: 'Revenue' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/maintenance', icon: Icons.Wrench, label: 'Maintenance' },
      { to: '/reports',     icon: Icons.Chart,  label: 'Reports' },
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

/* ── Settings Modal ──────────────────────────────────────────── */
function SettingsModal({ onClose }) {
  const { user, refreshUser } = useAuth();

  // Profile tab
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName,  setLastName]  = useState(user?.last_name  || '');
  const [phone,     setPhone]     = useState(user?.phone      || '');
  const [saving,    setSaving]    = useState(false);

  // Password tab
  const [oldPwd,    setOldPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [confPwd,   setConfPwd]   = useState('');
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const [tab, setTab] = useState('profile');

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/me/', { first_name: firstName, last_name: lastName, phone });
      await refreshUser();
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPwd !== confPwd) { toast.error('New passwords do not match.'); return; }
    if (newPwd.length < 8)  { toast.error('Password must be at least 8 characters.'); return; }
    setPwdSaving(true);
    try {
      await api.put('/users/me/', { old_password: oldPwd, new_password: newPwd });
      toast.success('Password changed successfully.');
      setOldPwd(''); setNewPwd(''); setConfPwd('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally { setPwdSaving(false); }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  const PwField = ({ label, value, onChange, show, onToggle, autoComplete }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="pw-toggle-wrap">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          autoComplete={autoComplete}
          placeholder="••••••••"
        />
        <button type="button" className="pw-toggle" onClick={onToggle}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <span style={{ display:'flex', color:'var(--c-brand)' }}>{Icons.Settings}</span>
            <span className="modal-title">Account Settings</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', padding:'0 20px' }}>
          {[
            { key: 'profile', label: '👤 Profile' },
            { key: 'password', label: '🔐 Password' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                background: 'none',
                border: 'none',
                borderBottom: tab === t.key ? '2px solid var(--c-brand)' : '2px solid transparent',
                color: tab === t.key ? 'var(--c-brand)' : 'var(--text-3)',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === 'profile' && (
            <form onSubmit={saveProfile}>
              {/* Avatar display */}
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                <div style={{
                  width:56, height:56, borderRadius:'50%',
                  background:'var(--c-brand)', color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, fontWeight:800, flexShrink:0,
                }}>
                  {initials(user)}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{fullName(user)}</div>
                  <div style={{ color:'var(--text-3)', fontSize:12 }}>{user?.email}</div>
                  <div style={{ marginTop:4 }}>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                      background:'var(--c-brand-xs)', color:'var(--c-brand)',
                      border:'1px solid var(--c-brand-s)',
                    }}>{user?.role}</span>
                  </div>
                </div>
              </div>

              <div className="form-row-2" style={{ marginBottom:14 }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input value={firstName} onChange={e=>setFirstName(e.target.value)} required placeholder="First name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input value={lastName} onChange={e=>setLastName(e.target.value)} required placeholder="Last name" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Phone</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. +233 24 000 0000" />
              </div>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Email Address</label>
                <input value={user?.email || ''} disabled style={{ opacity:0.5, cursor:'not-allowed' }} />
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>Email cannot be changed. Contact your administrator.</div>
              </div>
              <div className="modal-footer" style={{ padding:'14px 0 0', borderTop:'1px solid var(--border)', marginTop:6 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={changePassword}>
              <PwField
                label="Current Password"
                value={oldPwd} onChange={e=>setOldPwd(e.target.value)}
                show={showOld} onToggle={()=>setShowOld(s=>!s)}
                autoComplete="current-password"
              />
              <PwField
                label="New Password"
                value={newPwd} onChange={e=>setNewPwd(e.target.value)}
                show={showNew} onToggle={()=>setShowNew(s=>!s)}
                autoComplete="new-password"
              />
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:-10, marginBottom:14 }}>Minimum 8 characters.</div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="pw-toggle-wrap">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confPwd}
                    onChange={e=>setConfPwd(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    style={{ borderColor: confPwd && newPwd && confPwd!==newPwd ? 'var(--c-red)' : undefined }}
                  />
                  <button type="button" className="pw-toggle" onClick={()=>setShowConf(s=>!s)}>
                    {showConf ? 'Hide' : 'Show'}
                  </button>
                </div>
                {confPwd && newPwd && confPwd!==newPwd && (
                  <div style={{ fontSize:11, color:'var(--c-red)', marginTop:4 }}>Passwords do not match.</div>
                )}
              </div>
              <div className="modal-footer" style={{ padding:'14px 0 0', borderTop:'1px solid var(--border)', marginTop:6 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={pwdSaving || (confPwd && newPwd && confPwd!==newPwd)}>
                  {pwdSaving ? 'Changing…' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
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
  const [menuOpen, setMenuOpen]         = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    <>
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
          {/* ── Settings Gear Button ── */}
          <button
            className="icon-btn settings-btn"
            title="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            {Icons.Settings}
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
                <button
                  className="dropdown-item"
                  onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
                >
                  {Icons.Settings}<span>Settings</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={logout}>
                  {Icons.Logout}<span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
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
  const [captchaInput, setCaptchaInput] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Simple static captcha (replace with real captcha service if needed)
  const CAPTCHA = 'TL2026';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login/', { email, password });
      login(data.user, data.access, data.refresh);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="kl-login-root">
      {/* Left brand panel */}
      <div className="kl-login-brand">
        <div className="kl-login-logo-wrap">
          {/* Truck + gear logo */}
          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:160, height:160 }}>
            <circle cx="80" cy="80" r="74" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none"/>
            <circle cx="80" cy="80" r="54" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" strokeDasharray="5 4"/>
            {/* Gear teeth */}
            {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i)=>(
              <rect key={i}
                x="77" y="20" width="6" height="10" rx="2"
                fill="rgba(255,255,255,0.5)"
                transform={`rotate(${deg} 80 80)`}
              />
            ))}
            <circle cx="80" cy="80" r="36" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
            {/* Truck body */}
            <rect x="46" y="70" width="38" height="22" rx="3" fill="white" fillOpacity="0.95"/>
            <rect x="84" y="76" width="24" height="16" rx="2" fill="white" fillOpacity="0.95"/>
            <line x1="84" y1="82" x2="108" y2="82" stroke="#1565c0" strokeWidth="1.5"/>
            <circle cx="56" cy="94" r="5.5" fill="#1565c0" stroke="white" strokeWidth="1.5"/>
            <circle cx="72" cy="94" r="5.5" fill="#1565c0" stroke="white" strokeWidth="1.5"/>
            <circle cx="98" cy="94" r="5.5" fill="#1565c0" stroke="white" strokeWidth="1.5"/>
          </svg>
        </div>
        <h1 className="kl-login-brand-name">Taurus Trade<br/>&amp; Logistics</h1>
        <p className="kl-login-brand-tagline">Enterprise Resource Planning</p>
        <div className="kl-login-brand-dots">
          <span/><span/><span/>
        </div>
      </div>

      {/* Right form panel */}
      <div className="kl-login-panel">
        <div className="kl-login-card">
          <div className="kl-login-card-header">
            <h2>Login</h2>
          </div>

          {error && <div className="kl-login-error">{error}</div>}

          <form onSubmit={onSubmit} autoComplete="on">
            <div className="kl-login-field">
              <input
                type="email"
                placeholder="Enter Email *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="kl-login-field">
              <div className="kl-pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter Password *"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="kl-pw-toggle" onClick={() => setShowPw(s => !s)}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Captcha */}
            <div className="kl-captcha-row">
              <div className="kl-captcha-img">
                <span className="kl-captcha-text">{CAPTCHA}</span>
              </div>
              <button type="button" className="kl-captcha-refresh" title="Refresh captcha" onClick={() => {}}>↻</button>
            </div>

            <div className="kl-login-field">
              <input
                type="text"
                placeholder="Enter verification Code"
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value)}
              />
            </div>

            <div className="kl-login-links">
              <a href="#forgot">Forgot Password?</a>
              <span className="kl-divider">|</span>
              <a href="#mfa">MFA Registration?</a>
            </div>

            <button type="submit" className="kl-login-btn" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>
        </div>

        <p className="kl-login-footer">
          © {new Date().getFullYear()} Taurus Trade &amp; Logistics. All Rights Reserved.
        </p>
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
                  fontFamily: 'inherit',
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
