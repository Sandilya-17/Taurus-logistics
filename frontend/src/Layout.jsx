import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/api';
import toast from 'react-hot-toast';

const MENU = [
  { path: '/dashboard',   label: 'Dashboard',      icon: '◈', perm: null },
  { path: '/trucks',      label: 'Fleet Master',   icon: '⬡', perm: 'VIEW_TRUCKS' },
  { path: '/fuel',        label: 'Fuel Entries',   icon: '◎', perm: 'FUEL_ENTRY' },
  { path: '/trips',       label: 'Trips / Challan',icon: '⊕', perm: 'TRIPS' },
  { path: '/spare-parts', label: 'Spare Parts',    icon: '⚙', perm: 'SPARE_PART_ISSUE' },
  { path: '/tyres',       label: 'Tyre Stock',     icon: '◉', perm: 'TYRE_ISSUE' },
  { path: '/reports',     label: 'Reports',        icon: '▦', perm: null },
  { path: '/users',       label: 'User Management',icon: '◫', adminOnly: true },
];

const CSS_VARS = `
  :root {
    --bg: #0f1117;
    --surface-0: #13161e;
    --surface-1: #191d28;
    --surface-2: #1e2333;
    --surface-3: #252b3b;
    --border: rgba(255,255,255,0.07);
    --border-strong: rgba(255,255,255,0.12);
    --text-primary: #f0f2f8;
    --text-secondary: #a0a8c0;
    --text-muted: #5c6480;
    --accent: #6366f1;
    --accent-hover: #5254cc;
    --accent-subtle: rgba(99,102,241,0.1);
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --sidebar-w: 240px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text-primary); font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--surface-3); border-radius: 10px; }
  input, select, textarea, button { font-family: inherit; }
  a { text-decoration: none; }
`;

export default function Layout({ children }) {
  const { user, logout, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState('password');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [unForm, setUnForm] = useState({ currentPassword: '', newUsername: '' });
  const [saving, setSaving] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const visibleMenu = MENU.filter(m => {
    if (m.adminOnly) return isAdmin();
    return true;
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 4) { toast.error('Password must be at least 4 characters'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed! Please login again.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowProfile(false);
      setTimeout(() => { logout(); navigate('/login'); }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Current password is incorrect');
    } finally { setSaving(false); }
  };

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    if (unForm.newUsername.trim().length < 3) { toast.error('Username must be at least 3 characters'); return; }
    setSaving(true);
    try {
      await authAPI.changeUsername({ currentPassword: unForm.currentPassword, newUsername: unForm.newUsername.trim() });
      toast.success('Username changed! Please login again.');
      setUnForm({ currentPassword: '', newUsername: '' });
      setShowProfile(false);
      setTimeout(() => { logout(); navigate('/login'); }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed - check password or username taken');
    } finally { setSaving(false); }
  };

  const inputSt = {
    width: '100%', background: 'var(--surface-0)', border: '1.5px solid var(--border-strong)',
    color: 'var(--text-primary)', padding: '9px 12px', fontSize: 13,
    fontFamily: 'inherit', borderRadius: 8, outline: 'none',
  };
  const labelSt = { color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 };

  const initials = (user?.fullName || user?.username || '?').slice(0, 2).toUpperCase();
  const roleColor = user?.role === 'ADMIN' ? '#6366f1' : '#10b981';

  return (
    <>
      <style>{CSS_VARS}</style>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .nav-item { position: relative; }
        .nav-item::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 0; background: var(--accent); border-radius: 0 3px 3px 0; transition: height 0.2s; }
        .nav-item.active::before { height: 60%; }
        .nav-item:hover { background: var(--surface-2) !important; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

        {/* Sidebar */}
        <div style={{
          width: collapsed ? 64 : 'var(--sidebar-w)',
          background: 'var(--surface-1)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{
            padding: collapsed ? '20px 0' : '20px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 18,
            }}>🚛</div>
            {!collapsed && (
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>LogiPro</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 1 }}>Enterprise Suite</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
            {!collapsed && (
              <div style={{ padding: '4px 20px 10px', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Navigation
              </div>
            )}
            {visibleMenu.map(m => (
              <NavLink
                key={m.path}
                to={m.path}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '11px 0' : '11px 20px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  transition: 'all 0.15s',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  margin: '1px 8px',
                  borderRadius: 10,
                })}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>
                {!collapsed && <span style={{ flex: 1 }}>{m.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          {!collapsed && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: roleColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.fullName || user?.username}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{user?.role}</div>
                </div>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              padding: '12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              borderTop: '1px solid var(--border)',
              fontSize: 13,
              background: 'none',
              border: 'none',
              width: '100%',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Top bar */}
          <div style={{
            background: 'var(--surface-1)',
            borderBottom: '1px solid var(--border)',
            padding: '0 24px',
            height: 56,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {time.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => { setShowProfile(true); setProfileTab('password'); }}
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                  padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <span>⊙</span> {user?.username}
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
                  padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  borderRadius: 8, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
            {children}
          </div>
        </div>

        {/* Profile Modal */}
        {showProfile && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }} onClick={() => setShowProfile(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--surface-1)', border: '1px solid var(--border)',
              width: 440, borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700 }}>My Account</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{user?.fullName || user?.username} · {user?.role}</div>
                </div>
                <button onClick={() => setShowProfile(false)} style={{ background: 'var(--surface-2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: 30, height: 30, borderRadius: 8, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
                {[['password', 'Change Password'], ['username', 'Change Username']].map(([t, l]) => (
                  <button key={t} onClick={() => setProfileTab(t)} style={{
                    padding: '13px 0', marginRight: 24, background: 'none', border: 'none',
                    borderBottom: profileTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                    color: profileTab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 13, fontWeight: profileTab === t ? 600 : 400,
                    transition: 'all 0.15s',
                  }}>{l}</button>
                ))}
              </div>

              <div style={{ padding: 24 }}>
                {profileTab === 'password' && (
                  <form onSubmit={handleChangePassword}>
                    {[
                      ['currentPassword', 'Current Password', pwForm, setPwForm],
                      ['newPassword', 'New Password', pwForm, setPwForm],
                      ['confirmPassword', 'Confirm New Password', pwForm, setPwForm],
                    ].map(([key, lbl, fm, setFm]) => (
                      <div key={key} style={{ marginBottom: 14 }}>
                        <label style={labelSt}>{lbl}</label>
                        <input type="password" value={fm[key]}
                          onChange={e => setFm(p => ({ ...p, [key]: e.target.value }))}
                          style={inputSt} required
                          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                        />
                        {key === 'confirmPassword' && pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                          <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>Passwords do not match</div>
                        )}
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                      <button type="button" onClick={() => setShowProfile(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 18px', cursor: 'pointer', borderRadius: 8, fontSize: 13 }}>Cancel</button>
                      <button type="submit" disabled={saving} style={{ background: saving ? 'var(--surface-3)' : 'var(--accent)', border: 'none', color: '#fff', padding: '8px 18px', cursor: saving ? 'not-allowed' : 'pointer', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                        {saving ? 'Saving…' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                )}
                {profileTab === 'username' && (
                  <form onSubmit={handleChangeUsername}>
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelSt}>Current Username</label>
                      <div style={{ color: 'var(--accent)', fontSize: 14, padding: '9px 12px', background: 'var(--surface-0)', border: '1.5px solid var(--border-strong)', borderRadius: 8 }}>{user?.username}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelSt}>New Username</label>
                      <input type="text" value={unForm.newUsername} onChange={e => setUnForm(p => ({ ...p, newUsername: e.target.value }))} style={inputSt} required
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelSt}>Current Password (to confirm)</label>
                      <input type="password" value={unForm.currentPassword} onChange={e => setUnForm(p => ({ ...p, currentPassword: e.target.value }))} style={inputSt} required
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                      <button type="button" onClick={() => setShowProfile(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 18px', cursor: 'pointer', borderRadius: 8, fontSize: 13 }}>Cancel</button>
                      <button type="submit" disabled={saving} style={{ background: saving ? 'var(--surface-3)' : 'var(--accent)', border: 'none', color: '#fff', padding: '8px 18px', cursor: saving ? 'not-allowed' : 'pointer', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                        {saving ? 'Saving…' : 'Update Username'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
