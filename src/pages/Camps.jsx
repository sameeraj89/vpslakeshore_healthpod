import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import PageHeader from '../components/ui/PageHeader'
import { Calendar, MapPin, Users, Plus, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../lib/utils'
import { useT } from '../lib/lang'
import TX from '../lib/translations'

export default function Camps() {
  const { showToast } = useApp()
  const navigate = useNavigate()
  const { tr } = useT()
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', district: '', date: '', coordinator: '', notes: '' })

  async function loadCamps() {
    setLoading(true)
    const { data } = await supabase.from('camps').select('*').order('date', { ascending: false })
    if (data) setCamps(data)
    setLoading(false)
  }

  useEffect(() => { loadCamps() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name || !form.date) { showToast('Camp name and date required', 'error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('camps').insert([form])
      if (error) throw error
      showToast('Camp created')
      setForm({ name: '', location: '', district: '', date: '', coordinator: '', notes: '' })
      setShowForm(false)
      loadCamps()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = camps.filter(c => c.date >= today)
  const past = camps.filter(c => c.date < today)

  function CampCard({ camp }) {
    const isUpcoming = camp.date >= today
    return (
      <div
        className="card"
        style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
        onClick={() => navigate(`/patients?camp=${encodeURIComponent(camp.name)}`)}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: 4 }}>{camp.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />{formatDate(camp.date)}</span>
              {camp.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{camp.location}</span>}
              {camp.coordinator && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />{camp.coordinator}</span>}
            </div>
            {camp.notes && <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#94a3b8' }}>{camp.notes}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            <span style={{
              background: isUpcoming ? 'rgba(43,124,190,0.1)' : '#f1f5f9',
              color: isUpcoming ? '#1B75BC' : '#94a3b8',
              padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
            }}>
              {isUpcoming ? tr(TX.camps.tagUpcoming) : tr(TX.camps.tagCompleted)}
            </span>
            <ChevronRight size={15} color="#94a3b8" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <PageHeader
        title={tr(TX.camps.title)}
        subtitle={tr(TX.camps.subtitle)}
        action={
          <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> {tr(TX.camps.newCamp)}
          </button>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', border: '1.5px solid #1B75BC22' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>{tr(TX.camps.formTitle)}</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">{tr(TX.camps.campName)} *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kalamassery Community Camp May 2026" required />
              </div>
              <div>
                <label className="form-label">{tr(TX.camps.date)} *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">{tr(TX.camps.district)}</label>
                <input className="form-input" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder={tr(TX.camps.districtPh)} />
              </div>
              <div>
                <label className="form-label">{tr(TX.camps.locationVenue)}</label>
                <input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder={tr(TX.camps.locationPh)} />
              </div>
              <div>
                <label className="form-label">{tr(TX.camps.coordinator)}</label>
                <input className="form-input" value={form.coordinator} onChange={e => setForm(f => ({ ...f, coordinator: e.target.value }))} placeholder={tr(TX.camps.coordinatorPh)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">{tr(TX.camps.notes)}</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={tr(TX.camps.notesPh)} style={{ minHeight: 56 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>{tr(TX.camps.cancel)}</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? tr(TX.camps.saving) : tr(TX.camps.createCamp)}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>{tr(TX.camps.loading)}</div>
      ) : camps.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Calendar size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
          <div>{tr(TX.camps.noCamps)}</div>
          <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => setShowForm(true)}>{tr(TX.camps.createFirst)}</button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>{tr(TX.camps.upcoming)} ({upcoming.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
                {upcoming.map(c => <CampCard key={c.id} camp={c} />)}
              </div>
            </>
          )}
          {past.length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>{tr(TX.camps.past)} ({past.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {past.map(c => <CampCard key={c.id} camp={c} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
