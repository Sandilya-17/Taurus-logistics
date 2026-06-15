// src/pages/Users.jsx – Multi-branch user management (Super Admin / Admin / Manager / Employee)
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

const ALL_MODULES = [
  { key: 'trucks',       label: '🚛 Trucks'       },
  { key: 'drivers',      label: '👤 Drivers'      },
  { key: 'trips',        label: '🗺️ Trips'        },
  { key: 'fuel',         label: '⛽ Fuel Control' },
  { key: 'purchase',     label: '📥 Purchase'     },
  { key: 'issue',        label: '📤 Issue Items'  },
  { key: 'stock',        label: '📦 Stock Ledger' },
  { key: 'tyres',        label: '🛞 Tyres'        },
  { key: 'spares',       label: '🔧 Spare Parts'  },
  { key: 'invoicing',    label: '🧾 Invoicing'    },
  { key: 'expenditure',  label: '💸 Expenditure'  },
  { key: 'revenue',      label: '💰 Revenue'      },
  { key: 'maintenance',  label: '🛠️ Maintenance'  },
  { key: 'reports',      label: '📊 Reports'      },
  { key: 'users',        label: '👥 Users'        },
];

const ROLE_BADGE = {
  SUPER_ADMIN: 'b-red',
  ADMIN:       'b-red',
  MANAGER:     'b-blue',
  EMPLOYEE:    'b-gray',
};

// ── Permission Modal ─────────────────────────────────────────────────────────
function PermissionModal({ user: target, onClose, onSaved }) {
  const [selected, setSelected] = useState(target.module_permissions || []);
  const [saving,   setSaving]   = useState(false);

  const toggle = (key) =>
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/users/${target.id}/`, { module_permissions: selected });
      toast.success(`Permissions updated for ${target.first_name}.`);
      onSaved(); onClose();
    } catch { toast.error('Failed to update permissions.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span>🔐 Module Permissions — {target.first_name} {target.last_name}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="alert alert-info mb16">
          <span>Admins always have full access. Permissions below apply to <strong>Manager</strong> and <strong>Employee</strong> roles.</span>
        </div>
        <div className="flex gap8 mb12">
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(ALL_MODULES.map(m => m.key))}>✓ Select All</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>✕ Clear All</button>
          <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>
            {selected.length}/{ALL_MODULES.length} selected
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {ALL_MODULES.map(m => {
            const checked = selected.includes(m.key);
            return (
              <label key={m.key} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                border: `1.5px solid ${checked ? 'var(--sky)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer',
                background: checked ? '#eff6ff' : 'var(--surface)',
                transition: 'all .15s', userSelect: 'none',
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(m.key)}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--sky)' }} />
                <span style={{ fontSize: 12.5, fontWeight: checked ? 600 : 400, color: checked ? 'var(--blue)' : 'var(--text)' }}>
                  {m.label}
                </span>
              </label>
            );
          })}
        </div>
        <div className="flex gap8">
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? '⏳ Saving…' : '✓ Save Permissions'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── User Form Modal ──────────────────────────────────────────────────────────
function UserFormModal({ editing, onClose, onSaved, branches, currentUser }) {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin      = currentUser?.role === 'ADMIN';

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: editing
      ? { ...editing, password: '', branch: editing.branch ?? '' }
      : {
          role: 'EMPLOYEE',
          is_active: true,
          module_permissions: [],
          // Pre-fill branch for ADMIN users (their branch only)
          branch: isAdmin ? (currentUser?.branch ?? '') : '',
        }
  });
  const [saving, setSaving] = useState(false);
  const wRole = watch('role');

  // Roles available based on the actor's role:
  // SUPER_ADMIN → can assign any role including ADMIN
  // ADMIN       → can only assign MANAGER or EMPLOYEE
  const availableRoles = isSuperAdmin
    ? [
        { value: 'SUPER_ADMIN', label: 'Super Admin' },
        { value: 'ADMIN',       label: 'Admin'       },
        { value: 'MANAGER',     label: 'Manager'     },
        { value: 'EMPLOYEE',    label: 'Employee'    },
      ]
    : [
        { value: 'MANAGER',  label: 'Manager'  },
        { value: 'EMPLOYEE', label: 'Employee' },
      ];

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      // For SUPER_ADMIN role, never send branch
      if (payload.role === 'SUPER_ADMIN') {
        delete payload.branch;
      } else if (!payload.branch) {
        delete payload.branch;
      }
      if (editing) {
        await api.patch(`/users/${editing.id}/`, payload);
        toast.success('User updated.');
      } else {
        await api.post('/users/', payload);
        toast.success('User created successfully.');
      }
      onSaved(); onClose();
    } catch (e) {
      const err = e.response?.data;
      const msg = typeof err === 'string' ? err
        : Array.isArray(err) ? err.join(', ')
        : Object.values(err || {}).flat().join(', ');
      toast.error(msg || 'Failed to save user.');
    } finally { setSaving(false); }
  };

  // Determine the branch the current ADMIN belongs to (for display)
  const adminBranchName = branches.find(b => b.id === currentUser?.branch)?.name
    || currentUser?.branch_name
    || 'Your Branch';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span>{editing ? '✏️ Edit User' : '+ Add New User'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="fgrid">
            <div className="fg">
              <label>First Name *</label>
              <input type="text" {...register('first_name', { required: true })} />
              {errors.first_name && <span style={{ color: 'var(--red)', fontSize: 11 }}>Required</span>}
            </div>
            <div className="fg">
              <label>Last Name *</label>
              <input type="text" {...register('last_name', { required: true })} />
            </div>
            <div className="fg">
              <label>Email Address *</label>
              <input type="email" {...register('email', { required: true })} />
            </div>
            <div className="fg">
              <label>Phone</label>
              <input type="tel" placeholder="0244XXXXXX" {...register('phone')} />
            </div>
            <div className="fg">
              <label>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input
                type="password"
                {...register('password', {
                  required: !editing,
                  minLength: { value: 8, message: 'Min 8 chars' },
                })}
              />
              {errors.password && (
                <span style={{ color: 'var(--red)', fontSize: 11 }}>
                  {errors.password.message || 'Required'}
                </span>
              )}
            </div>
            <div className="fg">
              <label>Role *</label>
              <select {...register('role', { required: true })}>
                {availableRoles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Branch selector */}
            {wRole !== 'SUPER_ADMIN' && (
              <div className="fg">
                <label>Branch *</label>
                {isSuperAdmin ? (
                  // Super Admin picks from all branches
                  <select {...register('branch', { required: wRole !== 'SUPER_ADMIN' })}>
                    <option value="">— Select Branch —</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                ) : (
                  // ADMIN: branch is locked to their own branch
                  <>
                    <input
                      type="hidden"
                      {...register('branch')}
                      value={currentUser?.branch ?? ''}
                    />
                    <input
                      type="text"
                      readOnly
                      value={adminBranchName}
                      style={{ background: 'var(--surface)', color: 'var(--muted)', cursor: 'not-allowed' }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, display: 'block' }}>
                      Users are created in your branch automatically.
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="fg">
              <label>Status</label>
              <select {...register('is_active')}>
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>
          </div>

          {wRole !== 'ADMIN' && wRole !== 'SUPER_ADMIN' && (
            <div className="alert alert-info mt8" style={{ fontSize: 12 }}>
              💡 After creating the user, use the <strong>Permissions</strong> button to assign module access.
            </div>
          )}

          <div className="flex gap8 mt16">
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? '⏳ Saving…' : editing ? '✓ Update User' : '+ Create User'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users,        setUsers]        = useState([]);
  const [branches,     setBranches]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterRole,   setFilterRole]   = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [permTarget,   setPermTarget]   = useState(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin      = currentUser?.role === 'ADMIN' || isSuperAdmin;


  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Both SUPER_ADMIN and ADMIN fetch /users/branches/ — ADMIN gets back only their branch
      const [uRes, bRes] = await Promise.all([
        api.get('/users/'),
        api.get('/users/branches/'),
      ]);
      setUsers(uRes.data.results || uRes.data);
      setBranches(bRes.data.results || bRes.data);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u) => {
    if (!isAdmin) return toast.error('Admin access required.');
    try {
      await api.patch(`/users/${u.id}/`, { is_active: !u.is_active });
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}.`);
      load();
    } catch { toast.error('Failed to update user.'); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch =
      u.email?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q);
    const matchRole   = !filterRole   || u.role === filterRole;
    const matchBranch = !filterBranch || String(u.branch) === filterBranch;
    return matchSearch && matchRole && matchBranch;
  });

  if (!isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Admin Access Required</div>
        <div style={{ color: 'var(--muted)' }}>Only Admins can manage users and permissions.</div>
      </div>
    );
  }

  const countByRole = (role) => users.filter(u => u.role === role).length;

  return (
    <div>
      {showForm && (
        <UserFormModal
          editing={editing}
          branches={branches}
          currentUser={currentUser}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={load}
        />
      )}
      {permTarget && (
        <PermissionModal user={permTarget} onClose={() => setPermTarget(null)} onSaved={load} />
      )}

      {/* Branch info banner for branch admins */}
      {!isSuperAdmin && currentUser?.branch_name && (
        <div className="alert alert-info mb16" style={{ fontWeight: 600 }}>
          🏢 Managing users for <strong>{currentUser.branch_name}</strong> branch only.
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid mb16" style={{ gridTemplateColumns: `repeat(${isSuperAdmin ? 6 : 4},1fr)` }}>
        {[
          ...(isSuperAdmin ? [{ label: 'Super Admins', val: countByRole('SUPER_ADMIN'), color: 'var(--red)' }] : []),
          { label: 'Total Users',  val: users.length,              color: 'var(--blue)'  },
          ...(isSuperAdmin ? [{ label: 'Admins', val: countByRole('ADMIN'), color: 'var(--red)' }] : []),
          { label: 'Managers',     val: countByRole('MANAGER'),    color: 'var(--sky)'   },
          { label: 'Employees',    val: countByRole('EMPLOYEE'),   color: 'var(--green)' },
          { label: 'Inactive',     val: users.filter(u => !u.is_active).length, color: 'var(--muted)' },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color, fontSize: 22 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb16">
          <div className="card-title" style={{ margin: 0 }}>
            <span className="card-title-ic">👥</span> User Management
          </div>
          <div className="flex gap8">
            {/* Branch filter — only Super Admin sees multiple branches */}
            {isSuperAdmin && branches.length > 1 && (
              <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)' }}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
            )}
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)' }}>
              <option value="">All Roles</option>
              {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
              {isSuperAdmin && <option value="ADMIN">Admin</option>}
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200, padding: '7px 10px', fontSize: 12 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              + Add User
            </button>
          </div>
        </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Role</th>
                {isSuperAdmin && <th>Branch</th>}
                <th>Module Access</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>
                    {u.first_name} {u.last_name}
                    {u.id === currentUser?.id && (
                      <span className="badge b-blue" style={{ marginLeft: 6, fontSize: 9 }}>YOU</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{u.email}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role] || 'b-gray'}`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td style={{ fontSize: 11 }}>
                      {u.branch_name
                        ? <span className="badge b-navy">{u.branch_name}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                  )}
                  <td>
                    {(u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') ? (
                      <span className="badge b-red">Full Access</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 240 }}>
                        {(u.module_permissions || []).length === 0 ? (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>No modules</span>
                        ) : (
                          (u.module_permissions || []).slice(0, 4).map(m => (
                            <span key={m} className="badge b-navy" style={{ fontSize: 10 }}>{m}</span>
                          ))
                        )}
                        {(u.module_permissions || []).length > 4 && (
                          <span className="badge b-gray" style={{ fontSize: 10 }}>
                            +{(u.module_permissions || []).length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'b-green' : 'b-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td>
                    <div className="flex gap8">
                      {/* Edit: Super Admin can edit anyone; Admin can only edit non-admins in their branch */}
                      {(isSuperAdmin || (u.role !== 'SUPER_ADMIN' && u.role !== 'ADMIN')) && (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => { setEditing(u); setShowForm(true); }}
                        >
                          Edit
                        </button>
                      )}
                      {/* Permissions: only for MANAGER and EMPLOYEE */}
                      {u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN' && (
                        <button
                          className="btn btn-xs"
                          style={{ background: '#eff6ff', color: 'var(--blue)', border: '1px solid #bfdbfe' }}
                          onClick={() => setPermTarget(u)}
                        >
                          🔐 Perms
                        </button>
                      )}
                      {/* Activate/Deactivate: cannot touch yourself or Super Admins */}
                      {u.id !== currentUser?.id && u.role !== 'SUPER_ADMIN' &&
                        (isSuperAdmin || u.role !== 'ADMIN') && (
                        <button
                          className={`btn btn-xs ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => toggleActive(u)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role legend */}
      <div className="card mt16">
        <div className="card-title"><span className="card-title-ic">ℹ️</span>Role Hierarchy</div>
        <div className="g3" style={{ gap: 12 }}>
          {[
            { role: 'SUPER ADMIN', color: '#dc2626', desc: 'Controls both branches. Full access to all data across Branch 1 and Branch 2. Can create/manage Admins.' },
            { role: 'ADMIN (per branch)', color: 'var(--red)', desc: 'Full access within their branch only. Can create Managers and Employees in their branch. Cannot see the other branch.' },
            { role: 'MANAGER', color: 'var(--blue)', desc: 'Access controlled by module permissions set by their Admin. Can view and edit assigned modules within their branch.' },
            { role: 'EMPLOYEE', color: '#64748b', desc: 'Access controlled by module permissions. Typically restricted to specific modules only within their branch.' },
          ].map(r => (
            <div key={r.role} style={{ background: 'var(--surface)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, color: r.color, fontSize: 12.5, marginBottom: 6 }}>{r.role}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
