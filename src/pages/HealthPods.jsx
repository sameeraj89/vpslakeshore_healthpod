import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import { useApp } from '../lib/store'
import { MapPin, Plus, ToggleLeft, ToggleRight } from 'lucide-react'

const DISTRICTS_KL = [
  'Ernakulam','Thiruvananthapuram','Kozhikode','Thrissur','Kannur',
  'Kollam','Palakkad','Alappuzha','Malappuram','Kottayam',
  'Idukki','Wayanad','Kasaragod','Pathanamthitta'
]

const BLANK = { name: '', code: '', district: 'Ernakulam', address: '', contact_phone: '' }

export default function HealthPods() {
  const { showToast } = useApp()
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('healthpods').select('*').order('code')
    if (error) showToast('Failed to load HealthPods: ' + error.message, 'error')
    setPods(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function suggestCode(name, district) {
    if (!district || !name) return ''
    const distCode = district.slice(0, 3).toUpperCase()
    const num = String(pods.filter(p => p.district === district).length + 1).padStart(3, '0')
    return `HP-${distCode}-${num}`
  }

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if ((field === 'name' || field === 'district') && !editId) {
        next.code = suggestCode(next.name, next.district)
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      showToast('Name and code are required', 'error'); return
    }
    setSaving(true)
    try {
      if (editId) {
        const { error } = await supabase.from('healthpods').update(form).eq('id', editId)
        if (error) throw error
        showToast('HealthPod updated')
      } else {
        const { error } = await supabase.from('healthpods').insert({ ...form, active: true })
        if (error) throw error
        showToast(`HealthPod ${form.code} created`)
      }
      setForm(BLANK); setShowForm(false); setEditId(null)
      load()
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(pod) {
    await supabase.from('healthpods').update({ active: !pod.active }).eq('id', pod.id)
    load()
  }

  function startEdit(pod) {
    setForm({ name: pod.name, code: pod.code, district: pod.district || 'Ernakulam', address: pod.address || '', contact_phone: pod.contact_phone || '' })
    setEditId(pod.id)
    setShowForm(true)
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader
        title="HealthPods"
        subtitle="Manage screening locations. Each pod gets a unique code used to tag all data collected there."
        action={
          <button className="btn-primary" onClick={() => { setForm(BLANK); setEditId(null); setShowForm(v => !v) }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> New HealthPod
          </button>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', border: '1.5px solid #1B75BC22' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>
            {editId ? 'Edit HealthPod' : 'New HealthPod'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '0.875rem' }}>
              <div>
                <label className="form-label">Pod Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Lakeshore Ernakulam Main" required />
              </div>
              <div>
                <label className="form-label">Unique Code <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="form-input" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="HP-EKM-001" required />
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Auto-suggested, editable</div>
              </div>
              <div>
                <label className="form-label">District</label>
                <select className="form-select" value={form.district} onChange={e => set('district', e.target.value)}>
                  {DISTRICTS_KL.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Contact Phone</label>
                <input className="form-input" type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Building, street, landmark" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null) }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Create Pod'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : pods.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <MapPin size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
            <div style={{ marginBottom: '0.75rem' }}>No HealthPods yet.</div>
            <button className="btn-primary" onClick={() => setShowForm(true)}>Add first pod</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>District</th>
                <th>Contact</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pods.map(pod => (
                <tr key={pod.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1B75BC', fontWeight: 700 }}>{pod.code}</span></td>
                  <td style={{ fontWeight: 600 }}>{pod.name}</td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{pod.district || '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{pod.contact_phone || '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: pod.active ? '#10b981' : '#94a3b8' }}>
                      {pod.active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button onClick={() => startEdit(pod)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem', minWidth: 36, minHeight: 36 }}
                        title="Edit">✏️</button>
                      <button onClick={() => toggleActive(pod)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: pod.active ? '#10b981' : '#94a3b8', padding: '0.5rem', minWidth: 36, minHeight: 36 }}
                        title={pod.active ? 'Deactivate' : 'Activate'}>
                        {pod.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
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
