import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../lib/store'
import { formatDate, getRiskLabel, coerceUUIDs } from '../lib/utils'
import { supabase } from '../lib/supabase'
import RiskAssessment from '../components/forms/RiskAssessment'
import ScreeningForm from '../components/forms/ScreeningForm'
import { SCREENING_TYPES, SCREENING_CATEGORIES } from '../lib/screeningConfig'
import { useT } from '../lib/lang'
import TX from '../lib/translations'
import { ArrowLeft, User, Phone, MapPin, Shield, Activity, SendHorizonal, FileText, Stethoscope, CalendarClock, Printer, ChevronDown, ChevronUp, FileDown, Trash2 } from 'lucide-react'
import { can, isAdmin } from '../lib/roles'
import { getTier, tierToRiskLevel } from '../lib/riskConfig'
import { generateFullReport } from '../lib/generatePDF'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { tr } = useT()
  const { patients, user } = useApp()
  const [patient, setPatient] = useState(null)
  const [patientScreenings, setPatientScreenings] = useState({})
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'risk')
  const [loading, setLoading] = useState(true)
  const [referralOpen, setReferralOpen] = useState(false)
  const [domainScores, setDomainScores] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Permanently delete ${patient.name} (${patient.uhid})? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from('patients').delete().eq('id', patient.id)
      if (error) throw error
      navigate('/patients', { replace: true })
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  async function handleFullReport() {
    setReportLoading(true)
    try {
      const [{ data: referrals }, { data: doctorNotes }, { data: followups }] = await Promise.all([
        supabase.from('referrals').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(1),
        supabase.from('doctor_notes').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(5),
        supabase.from('follow_ups').select('*').eq('patient_id', id).order('followup_date', { ascending: true }),
      ])
      const score = patient.risk_score || 0
      const tier = getTier(score)
      await generateFullReport(
        patient, score, tier,
        domainScores,
        patientScreenings,
        referrals?.[0] || null,
        doctorNotes || [],
        followups || [],
      )
    } catch (err) {
      console.error('Report generation failed', err)
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let p = patients.find(x => x.id === id)
      if (!p) {
        const { data } = await supabase.from('patients').select('*').eq('id', id).single()
        p = data
      }
      if (cancelled) return
      setPatient(p)

      const { data: scs } = await supabase.from('screenings').select('*').eq('patient_id', id)
      if (cancelled) return
      if (scs) {
        const byType = {}
        scs.forEach(s => { byType[s.cancer_type] = s })
        setPatientScreenings(byType)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>{tr(TX.patientDetail.loading)}</div>
  if (!patient) return <div style={{ padding: '2rem', color: '#ef4444' }}>{tr(TX.patientDetail.notFound)}</div>

  const riskLevel = patient.risk_level || 'low'
  const riskColors = { low: '#10b981', medium: '#f59e0b', high: '#A6215A' }

  const screeningsDone = SCREENING_TYPES.filter(t => !!patientScreenings[t.key]).length

  const tabs = [
    { key: 'risk',      label: tr(TX.patientDetail.tabRisk),      icon: Shield },
    { key: 'screenings', label: `${tr(TX.patientDetail.tabScreenings)}${screeningsDone > 0 ? ` (${screeningsDone})` : ''}`, icon: Activity },
    { key: 'referral',  label: tr(TX.patientDetail.tabReferral),  icon: SendHorizonal },
    ...(can(user, 'doctor_notes') ? [{ key: 'notes', label: tr(TX.patientDetail.tabNotes), icon: Stethoscope }] : []),
    { key: 'followup',  label: tr(TX.patientDetail.tabFollowup),  icon: CalendarClock },
  ]

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Back + Print */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="btn-ghost" onClick={() => navigate('/patients')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: 0 }}>
          <ArrowLeft size={15} /> {tr(TX.common.backToPatients)}
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleFullReport}
            disabled={reportLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', padding: '0.45rem 0.875rem', background: '#1B75BC', color: 'white', border: 'none', borderRadius: 8, cursor: reportLoading ? 'wait' : 'pointer', fontWeight: 600 }}
          >
            <FileDown size={14} />
            {reportLoading ? 'Generating…' : 'Full Report PDF'}
          </button>
          <button className="btn-ghost" onClick={() => navigate(`/patients/${id}/summary`)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <Printer size={14} /> {tr(TX.common.printSummary)}
          </button>
          {isAdmin(user) && (
            <button
              onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', padding: '0.45rem 0.875rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              <Trash2 size={14} /> Delete Patient
            </button>
          )}
        </div>
      </div>

      {/* Patient card */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, minWidth: 240 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, rgba(43,124,190,0.15), rgba(139,26,74,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={22} color="#1B75BC" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{patient.name}</h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
              {patient.age ? `${patient.age} yrs` : ''}{patient.age && patient.gender ? ' · ' : ''}{patient.gender}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1B75BC', fontWeight: 600, marginTop: 2 }}>{patient.uhid}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {patient.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569' }}>
              <Phone size={13} />{patient.phone}
            </div>
          )}
          {patient.district && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569' }}>
              <MapPin size={13} />{patient.district}
            </div>
          )}
          {patient.camp_name && (
            <div style={{ fontSize: '0.85rem', color: '#475569' }}>🏕 {patient.camp_name}</div>
          )}
          <div style={{ background: `${riskColors[riskLevel]}18`, color: riskColors[riskLevel], border: `1px solid ${riskColors[riskLevel]}44`, borderRadius: 6, padding: '0.2rem 0.625rem', fontSize: '0.8rem', fontWeight: 700 }}>
            {getRiskLabel(patient.risk_score || 0)} ({patient.risk_score || 0})
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.625rem 1rem',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2.5px solid #1B75BC' : '2.5px solid transparent',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === tab.key ? '#1B75BC' : '#64748b',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            {tab.done && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card">
        {activeTab === 'risk' && (
          <RiskAssessment patient={patient} onDone={({ score, tier, domainScores: ds }) => {
            setPatient(p => ({ ...p, risk_score: score, risk_level: tierToRiskLevel(tier.level) }))
            if (ds) setDomainScores(ds)
          }} />
        )}
        {activeTab === 'screenings' && (
          <ScreeningsPanel
            patient={patient}
            patientScreenings={patientScreenings}
            onSaved={(key, data) => setPatientScreenings(prev => ({ ...prev, [key]: data }))}
          />
        )}
        {activeTab === 'referral' && (
          <ReferralForm patient={patient} />
        )}
        {activeTab === 'notes' && (
          <DoctorNotesForm patient={patient} />
        )}
        {activeTab === 'followup' && (
          <FollowUpForm patient={patient} />
        )}
      </div>
    </div>
  )
}

function ScreeningsPanel({ patient, patientScreenings, onSaved }) {
  const { tr } = useT()
  const [openKey, setOpenKey] = useState(null)

  function toggle(key) {
    setOpenKey(prev => prev === key ? null : key)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {SCREENING_CATEGORIES.map(cat => {
        const types = SCREENING_TYPES.filter(t => t.category === cat.key)
        // Filter by gender where applicable
        const visible = types.filter(t => !t.genderFilter || t.genderFilter.includes(patient.gender) || !patient.gender)
        if (visible.length === 0) return null

        return (
          <div key={cat.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: cat.color }}>{tr(cat.label)}</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {visible.filter(t => patientScreenings[t.key]).length}/{visible.length} {tr(TX.common.done)}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {visible.map(t => {
                const done = !!patientScreenings[t.key]
                const isOpen = openKey === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => toggle(t.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.625rem 0.875rem',
                      border: `1.5px solid ${isOpen ? t.color : done ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: 8, background: isOpen ? `${t.color}08` : done ? '#f0fdf4' : 'white',
                      cursor: 'pointer', textAlign: 'left', gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{t.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isOpen ? t.color : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tr(t.label)}
                        </div>
                        {done && patientScreenings[t.key]?.result && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {patientScreenings[t.key].result}
                          </div>
                        )}
                        {!done && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{tr(TX.common.notDone)}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {done && <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>✓</span>}
                      {isOpen ? <ChevronUp size={13} color={t.color} /> : <ChevronDown size={13} color="#94a3b8" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Expanded form for the open type in this category */}
            {visible.map(t => openKey === t.key && (
              <div key={`form-${t.key}`} style={{ marginBottom: '0.5rem' }}>
                <ScreeningForm
                  patient={patient}
                  typeKey={t.key}
                  existingData={patientScreenings[t.key]}
                  onSaved={data => { onSaved(t.key, data) }}
                />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ReferralForm({ patient }) {
  const { updatePatient, showToast } = useApp()
  const [department, setDepartment] = useState('')
  const [reason, setReason] = useState('')
  const [priority, setPriority] = useState('routine')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await supabase.from('referrals').insert(coerceUUIDs({
        patient_id: patient.id,
        department,
        reason,
        priority,
        notes,
      }))
      await updatePatient(patient.id, { referred: true, referral_notes: reason })
      showToast('Referral saved')
    } catch (err) {
      showToast('Failed to save referral', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>E-Referral</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label className="form-label">Department / Specialist</label>
          <select className="form-select" value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">Select department</option>
            <option>Oncology</option>
            <option>Surgical Oncology</option>
            <option>Gynaecology</option>
            <option>Gastroenterology</option>
            <option>Urology</option>
            <option>Radiology</option>
            <option>Pathology / Biopsy</option>
            <option>Dental</option>
            <option>ENT</option>
            <option>Dermatology</option>
            <option>Internal Medicine</option>
          </select>
        </div>
        <div>
          <label className="form-label">Priority</label>
          <div className="radio-group">
            {['routine', 'urgent'].map(p => (
              <label key={p} className={`radio-option ${priority === p ? 'selected' : ''}`}>
                <input type="radio" name="priority" checked={priority === p} onChange={() => setPriority(p)} />
                {p === 'urgent' ? '🔴 Urgent' : '🟢 Routine'}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="form-label">Reason for Referral</label>
        <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. VIA positive, refer for colposcopy" />
      </div>
      <div>
        <label className="form-label">Additional Notes</label>
        <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Clinical context, history…" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Create Referral'}
        </button>
      </div>
    </div>
  )
}

function DoctorNotesForm({ patient }) {
  const { showToast, user } = useApp()
  const [doctorName, setDoctorName] = useState(user?.user_metadata?.name || '')
  const [assessment, setAssessment] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [plan, setPlan] = useState('')
  const [followupDate, setFollowupDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState([])

  useEffect(() => {
    supabase.from('doctor_notes').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(10).then(({ data, error }) => {
      if (error) showToast('Failed to load doctor notes', 'error')
      setNotes(data || [])
    })
  }, [patient.id])

  async function handleSave() {
    if (!assessment.trim() && !diagnosis.trim() && !plan.trim()) {
      showToast('Add at least one field before saving', 'error'); return
    }
    setSaving(true)
    try {
      const payload = coerceUUIDs({ patient_id: patient.id, doctor_name: doctorName, clinical_assessment: assessment, diagnosis, treatment_plan: plan, followup_date: followupDate || null })
      const { data, error } = await supabase.from('doctor_notes').insert(payload).select().single()
      if (error) throw error
      setNotes(prev => [data, ...prev])
      setAssessment(''); setDiagnosis(''); setPlan(''); setFollowupDate('')
      showToast('Note added')
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Doctor's Clinical Notes</h3>

      {/* New note form */}
      <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Add note for this visit</div>
        <div>
          <label className="form-label">Doctor / Physician Name</label>
          <input className="form-input" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Name" />
        </div>
        <div>
          <label className="form-label">Clinical Assessment</label>
          <textarea className="form-textarea" value={assessment} onChange={e => setAssessment(e.target.value)} placeholder="General findings, patient condition, examination notes…" style={{ minHeight: 72 }} />
        </div>
        <div>
          <label className="form-label">Diagnosis / Impression</label>
          <textarea className="form-textarea" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Working diagnosis or clinical impression…" style={{ minHeight: 56 }} />
        </div>
        <div>
          <label className="form-label">Treatment Plan / Advice</label>
          <textarea className="form-textarea" value={plan} onChange={e => setPlan(e.target.value)} placeholder="Medications, lifestyle advice, further investigations…" style={{ minHeight: 72 }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 220px' }}>
            <label className="form-label">Follow-up Date</label>
            <input className="form-input" type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginBottom: 0 }}>
            {saving ? 'Saving…' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes timeline */}
      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Previous Notes ({notes.length})
          </div>
          {notes.map((n, i) => (
            <div key={n.id} style={{ background: i === 0 ? '#f8fafc' : '#fafafa', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem 1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{n.doctor_name || 'Unknown physician'}</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              {n.clinical_assessment && <div style={{ marginBottom: '0.375rem' }}><span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assessment</span><div style={{ color: '#334155', marginTop: 2 }}>{n.clinical_assessment}</div></div>}
              {n.diagnosis && <div style={{ marginBottom: '0.375rem' }}><span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Diagnosis</span><div style={{ color: '#334155', marginTop: 2 }}>{n.diagnosis}</div></div>}
              {n.treatment_plan && <div style={{ marginBottom: '0.375rem' }}><span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Plan</span><div style={{ color: '#334155', marginTop: 2 }}>{n.treatment_plan}</div></div>}
              {n.followup_date && <div style={{ fontSize: '0.78rem', color: '#1B75BC', marginTop: '0.375rem' }}>Follow-up: {new Date(n.followup_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FollowUpForm({ patient }) {
  const { showToast } = useApp()
  const [followups, setFollowups] = useState([])
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('follow_ups').select('*').eq('patient_id', patient.id).order('followup_date', { ascending: true }).then(({ data, error }) => {
      if (error) showToast('Failed to load follow-ups', 'error')
      setFollowups(data || [])
    })
  }, [patient.id])

  async function handleAdd() {
    if (!date) { showToast('Please set a follow-up date', 'error'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('follow_ups').insert(coerceUUIDs({ patient_id: patient.id, followup_date: date, reason, assigned_to: assignedTo, status: 'scheduled' })).select().single()
      if (error) throw error
      setFollowups(prev => [...prev, data].sort((a, b) => a.followup_date.localeCompare(b.followup_date)))
      setDate(''); setReason(''); setAssignedTo('')
      showToast('Follow-up scheduled')
    } catch (err) {
      showToast(err.message || 'Failed to schedule', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function markDone(fu) {
    await supabase.from('follow_ups').update({ status: 'completed' }).eq('id', fu.id)
    setFollowups(prev => prev.map(f => f.id === fu.id ? { ...f, status: 'completed' } : f))
    showToast('Marked complete')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Follow-up Schedule</h3>

      {/* Existing */}
      {followups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {followups.map(fu => {
            const overdue = fu.followup_date < today && fu.status !== 'completed'
            return (
              <div key={fu.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: fu.status === 'completed' ? '#f0fdf4' : overdue ? '#fff1f2' : '#f8fafc', borderRadius: 8, border: `1px solid ${fu.status === 'completed' ? '#86efac' : overdue ? '#fca5a5' : '#e2e8f0'}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {new Date(fu.followup_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {overdue && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>OVERDUE</span>}
                  </div>
                  {fu.reason && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{fu.reason}</div>}
                  {fu.assigned_to && <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Assigned: {fu.assigned_to}</div>}
                </div>
                {fu.status === 'completed'
                  ? <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Done</span>
                  : <button onClick={() => markDone(fu)} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.25rem 0.625rem', fontSize: '0.78rem', cursor: 'pointer', color: '#475569' }}>Mark done</button>
                }
              </div>
            )
          })}
        </div>
      )}

      {/* Add new */}
      <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: '1rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem' }}>Schedule new follow-up</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label className="form-label">Follow-up Date *</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} min={today} />
          </div>
          <div>
            <label className="form-label">Assigned To</label>
            <input className="form-input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Staff name / department" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Reason / Notes</label>
            <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Repeat VIA in 6 months, post-referral check" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleAdd} disabled={saving}>
            {saving ? 'Scheduling…' : 'Add Follow-up'}
          </button>
        </div>
      </div>
    </div>
  )
}
