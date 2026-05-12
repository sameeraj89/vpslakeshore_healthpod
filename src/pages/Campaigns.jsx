import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import { useApp } from '../lib/store'
import { Megaphone, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { SCREENING_TYPES } from '../lib/screeningConfig'

const CANCER_TYPES = SCREENING_TYPES.filter(t => t.type === 'clinical')

const BLANK = {
  name: '', description: '', cancer_types: [], start_date: '', end_date: '', active: true,
}

function StatusBadge({ campaign }) {
  const today = new Date().toISOString().split('T')[0]
  if (!campaign.active) return <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>○ Inactive</span>
  if (today < campaign.start_date) return <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b' }}>◷ Upcoming</span>
  if (today > campaign.end_date) return <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>✓ Ended</span>
  return <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>● Live</span>
}

export default function Campaigns() {
  const { showToast } = useApp()
  const [campaigns, setCampaigns] = useState([])
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState(null)
  const [selectedPods, setSelectedPods] = useState([])
  const [expandedId, setExpandedId] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: cps }, { data: ps }] = await Promise.all([
      supabase.from('campaigns').select('*, campaign_healthpods(healthpod_id, healthpods(code, name))').order('start_date', { ascending: false }),
      supabase.from('healthpods').select('id, code, name, district').eq('active', true).order('code'),
    ])
    setCampaigns(cps || [])
    setPods(ps || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function setF(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function toggleCancerType(key) {
    setForm(prev => ({
      ...prev,
      cancer_types: prev.cancer_types.includes(key)
        ? prev.cancer_types.filter(k => k !== key)
        : [...prev.cancer_types, key],
    }))
  }

  function togglePod(id) {
    setSelectedPods(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      showToast('Name, start date and end date are required', 'error'); return
    }
    if (form.end_date < form.start_date) {
      showToast('End date must be after start date', 'error'); return
    }
    setSaving(true)
    try {
      let campaignId = editId
      if (editId) {
        const { error } = await supabase.from('campaigns').update({
          name: form.name, description: form.description,
          cancer_types: form.cancer_types, start_date: form.start_date,
          end_date: form.end_date, active: form.active,
        }).eq('id', editId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('campaigns').insert({
          name: form.name, description: form.description,
          cancer_types: form.cancer_types, start_date: form.start_date,
          end_date: form.end_date, active: form.active,
        }).select().single()
        if (error) throw error
        campaignId = data.id
      }

      // sync pod assignments
      const { error: delError } = await supabase.from('campaign_healthpods').delete().eq('campaign_id', campaignId)
      if (delError) throw delError
      if (selectedPods.length > 0) {
        const { error: podError } = await supabase.from('campaign_healthpods').insert(
          selectedPods.map(pid => ({ campaign_id: campaignId, healthpod_id: pid }))
        )
        if (podError) throw podError
      }

      showToast(editId ? 'Campaign updated' : 'Campaign created')
      setForm(BLANK); setSelectedPods([]); setShowForm(false); setEditId(null)
      load()
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c) {
    const { error } = await supabase.from('campaigns').update({ active: !c.active }).eq('id', c.id)
    if (error) { showToast('Failed to update campaign: ' + error.message, 'error'); return }
    load()
  }

  function startEdit(c) {
    setForm({
      name: c.name, description: c.description || '',
      cancer_types: c.cancer_types || [], start_date: c.start_date,
      end_date: c.end_date, active: c.active,
    })
    setSelectedPods((c.campaign_healthpods || []).map(cp => cp.healthpod_id))
    setEditId(c.id)
    setShowForm(true)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        title="Campaigns"
        subtitle="Run time-bound or disease-specific screening drives at selected HealthPods."
        action={
          <button className="btn-primary" onClick={() => { setForm(BLANK); setSelectedPods([]); setEditId(null); setShowForm(v => !v) }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> New Campaign
          </button>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', border: '1.5px solid #1B75BC22' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>
            {editId ? 'Edit Campaign' : 'New Campaign'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Campaign Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="form-input" value={form.name} onChange={e => setF('name', e.target.value)}
                  placeholder="e.g. Liver Cancer Awareness Week" required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setF('description', e.target.value)}
                  placeholder="Goals, target population, special instructions…" style={{ minHeight: 60 }} />
              </div>
              <div>
                <label className="form-label">Start Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="form-input" type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">End Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="form-input" type="date" value={form.end_date} onChange={e => setF('end_date', e.target.value)} required />
              </div>
            </div>

            {/* Cancer types */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Focus Cancer Types</label>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Leave all unchecked to include all screening types.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CANCER_TYPES.map(ct => {
                  const checked = form.cancer_types.includes(ct.key)
                  return (
                    <button key={ct.key} type="button" onClick={() => toggleCancerType(ct.key)}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: 6, border: `1.5px solid ${checked ? ct.color : '#e2e8f0'}`,
                        background: checked ? ct.color + '18' : 'white', color: checked ? ct.color : '#475569',
                        fontWeight: checked ? 600 : 400, fontSize: '0.82rem', cursor: 'pointer',
                      }}>
                      {ct.icon} {ct.label?.en || ct.key}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* HealthPods */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Assign to HealthPods</label>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Leave all unselected to apply to all pods.
              </div>
              {pods.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No active HealthPods found. Create pods first.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {pods.map(pod => {
                    const checked = selectedPods.includes(pod.id)
                    return (
                      <button key={pod.id} type="button" onClick={() => togglePod(pod.id)}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: 6,
                          border: `1.5px solid ${checked ? '#1B75BC' : '#e2e8f0'}`,
                          background: checked ? 'rgba(27,117,188,0.08)' : 'white',
                          color: checked ? '#1B75BC' : '#475569', fontWeight: checked ? 600 : 400,
                          fontSize: '0.82rem', cursor: 'pointer',
                        }}>
                        {pod.code} — {pod.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null) }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Create Campaign'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : campaigns.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Megaphone size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
            <div style={{ marginBottom: '0.75rem' }}>No campaigns yet.</div>
            <button className="btn-primary" onClick={() => setShowForm(true)}>Create first campaign</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Dates</th>
                <th>Cancer Types</th>
                <th>Pods</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const podList = (c.campaign_healthpods || []).map(cp => cp.healthpods?.code).filter(Boolean)
                const types = c.cancer_types || []
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.description && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{c.description}</div>}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {c.start_date} → {c.end_date}
                    </td>
                    <td>
                      {types.length === 0
                        ? <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>All types</span>
                        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {types.map(t => {
                              const ct = CANCER_TYPES.find(x => x.key === t)
                              return <span key={t} style={{ fontSize: '0.72rem', background: (ct?.color || '#94a3b8') + '18', color: ct?.color || '#64748b', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 600 }}>{ct?.icon} {t}</span>
                            })}
                          </div>
                      }
                    </td>
                    <td>
                      {podList.length === 0
                        ? <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>All pods</span>
                        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {podList.map(code => (
                              <span key={code} style={{ fontSize: '0.72rem', background: 'rgba(27,117,188,0.08)', color: '#1B75BC', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 600 }}>{code}</span>
                            ))}
                          </div>
                      }
                    </td>
                    <td><StatusBadge campaign={c} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => startEdit(c)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem', minWidth: 36, minHeight: 36 }}
                          title="Edit">✏️</button>
                        <button onClick={() => toggleActive(c)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.active ? '#10b981' : '#94a3b8', padding: '0.5rem', minWidth: 36, minHeight: 36 }}
                          title={c.active ? 'Deactivate' : 'Activate'}>
                          {c.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
