// src/pages/Profile.jsx – My Profile & Password Change
import { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName,  setLastName]  = useState(user?.last_name  || '');
  const [phone,     setPhone]     = useState(user?.phone      || '');
  const [saving,    setSaving]    = useState(false);

  const [oldPwd,  setOldPwd]  = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const ROLE_COLORS = { ADMIN: 'var(--red)', MANAGER: 'var(--blue)', EMPLOYEE: 'var(--green)' };

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
    if (newPwd !== confPwd) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPwd.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setPwdSaving(true);
    try {
      await api.put('/users/me/', { old_password: oldPwd, new_password: newPwd });
      toast.success('Password changed successfully. Please log in again.');
      setOldPwd(''); setNewPwd(''); setConfPwd('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally { setPwdSaving(false); }
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Profile Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{user?.email}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: ROLE_COLORS[user?.role] + '22',
                color: ROLE_COLORS[user?.role],
                border: `1px solid ${ROLE_COLORS[user?.role]}44`,
              }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">✏️ Edit Profile</div>
        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="form-label">First Name</label>
              <input
                className="form-input"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input
                className="form-input"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +233 24 000 0000"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Email cannot be changed. Contact your administrator.
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Role</label>
            <input
              className="form-input"
              value={user?.role || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-title">🔐 Change Password</div>
        <form onSubmit={changePassword}>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Current Password</label>
            <input
              className="form-input"
              type="password"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Minimum 8 characters.
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-input"
              type="password"
              value={confPwd}
              onChange={e => setConfPwd(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={{ borderColor: confPwd && newPwd && confPwd !== newPwd ? 'var(--red)' : undefined }}
            />
            {confPwd && newPwd && confPwd !== newPwd && (
              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>Passwords do not match.</div>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pwdSaving || (confPwd && newPwd && confPwd !== newPwd)}
          >
            {pwdSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
