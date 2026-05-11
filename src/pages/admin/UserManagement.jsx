import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import { useApp } from '../../lib/store'
import { UserPlus, Trash2, RefreshCw, ShieldCheck } from 'lucide-react'

const ROLES = ['data_entry', 'doctor', 'lab', 'coordinator', 'admin']
const ROLE_LABELS = {
  data_entry: 'Data Entry / CareMitra',
  doctor: 'Doctor / Dental Surgeon',
  lab: 'Lab Team',
  coordinator: 'Programme Coordinator',
  admin: 'Admin',
}

export default function UserManagement() {
  const { showToast, user } = useApp()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'data_entry' })
  const [showForm, setShowForm] = useState(false)

  async function loadUsers() {
    setLoading(true)
    const { data: profiles, error } = await supabase.from('staff_profiles').select('*').order('created_at', { ascending: false })
    if (error) showToast('Failed to load staff: ' + error.message, 'error')
    setUsers(profiles || [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (user?.user_metadata?.role !== 'admin') {
      showToast('Only admins can create staff accounts', 'error'); return
    }
    if (!form.email || !form.password || form.password.length < 8) {
      showToast('Email and password (min 8 chars) required', 'error'); return
    }
    setCreating(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name, role: form.role } },
      })
      if (error) throw error

      // create profile record
      const { error: profileError } = await supabase.from('staff_profiles').insert({
        user_id: data.user?.id,
        email: form.email,
        name: form.name,
        role: form.role,
      })
      if (profileError) throw profileError

      showToast(`Account created for ${form.email}`)
      setForm({ email: '', password: '', name: '', role: 'data_entry' })
      setShowForm(false)
      loadUsers()
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeactivate(profile) {
    if (!window.confirm(`Deactivate ${profile.email}?`)) return
    const { error } = await supabase.from('staff_profiles').update({ active: false }).eq('id', profile.id)
    if (error) { showToast('Failed to deactivate: ' + error.message, 'error'); return }
    showToast(`${profile.email} deactivated`)
    loadUsers()
  }

  const roleColor = { admin: '#A6215A', coordinator: '#1B75BC', doctor: '#7c3aed', lab: '#0891b2', data_entry: '#10b981' }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Email confirmation warning */}
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '0.625rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#92400e', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
        <span>
          <b>Before adding staff:</b> In Supabase → Authentication → Settings → disable <b>"Enable email confirmations"</b>. Otherwise new accounts require email verification before staff can log in.
        </span>
      </div>

      <PageHeader
        title="User Management"
        subtitle="Manage staff accounts and access roles"
        action={
          <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserPlus size={15} /> Add Staff
          </button>
        }
      />

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', border: '1.5px solid #1B75BC22' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>New Staff Account</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
              <div>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Arun Kumar" />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="arun@lakeshorehospital.com" required />
              </div>
              <div>
                <label className="form-label">Temporary Password</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" required />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role legend */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {ROLES.map(r => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#475569' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: roleColor[r] }} />
            {ROLE_LABELS[r]}
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading staff…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <ShieldCheck size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
            <div>No staff accounts yet.</div>
            <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => setShowForm(true)}>Add first staff member</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name || '—'}</td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.email}</td>
                  <td>
                    <span style={{ background: `${roleColor[u.role]}18`, color: roleColor[u.role], padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: u.active !== false ? '#10b981' : '#94a3b8' }}>
                      {u.active !== false ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeactivate(u)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem', minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Deactivate user"
                      aria-label="Deactivate user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
