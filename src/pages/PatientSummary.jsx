import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { SCREENING_TYPES, SCREENING_CATEGORIES } from '../lib/screeningConfig'
import { QRCodeSVG } from 'qrcode.react'
import { t } from '../lib/lang'

const RISK_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#A6215A' }
const RISK_LABELS = {
  low:    { en: 'Low Risk',      ml: 'കുറഞ്ഞ അപകടസാധ്യത' },
  medium: { en: 'Moderate Risk', ml: 'മിതമായ അപകടസാധ്യത' },
  high:   { en: 'High Risk',     ml: 'ഉയർന്ന അപകടസാധ്യത' },
}

function isPositive(result) {
  return !!(result?.toLowerCase().match(/positive|elevated|refer|suspicious|lesion|abnormal/))
}

export default function PatientSummary() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [screenings, setScreenings] = useState({})
  const [referral, setReferral] = useState(null)
  const [notes, setNotes] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: scs }, { data: refs }, { data: dn }] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id).single(),
        supabase.from('screenings').select('*').eq('patient_id', id),
        supabase.from('referrals').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(1),
        supabase.from('doctor_notes').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(1),
      ])
      setPatient(p)
      if (scs) {
        const byType = {}
        scs.forEach(s => { byType[s.cancer_type] = s })
        setScreenings(byType)
      }
      setReferral(refs?.[0] || null)
      setNotes(dn?.[0] || null)
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!loading && patient) {
      setTimeout(() => window.print(), 400)
    }
  }, [loading, patient])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#64748b' }}>
      Preparing summary…
    </div>
  )
  if (!patient) return <div style={{ padding: '2rem' }}>Patient not found.</div>

  const riskLevel = patient.risk_level || 'low'
  const riskColor = RISK_COLORS[riskLevel]
  const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  // Only show clinical types for the screening results table
  const clinicalTypes = SCREENING_TYPES.filter(st => st.type === 'clinical')
  // Filter by patient gender
  const visibleTypes = clinicalTypes.filter(st => !st.genderFilter || st.genderFilter.includes(patient.gender) || !patient.gender)

  const screeningsDone = visibleTypes.filter(st => !!screenings[st.key]).length

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4; margin: 12mm; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; margin: 0; }
        * { box-sizing: border-box; }
        .bilingual-label { display: flex; flex-direction: column; gap: 1px; }
        .bilingual-label .en { font-size: 0.82rem; font-weight: 600; color: #1e293b; }
        .bilingual-label .ml { font-size: 0.72rem; color: #64748b; }
      `}</style>

      {/* Print controls */}
      <div className="no-print" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button onClick={() => window.print()} style={{ background: '#1B75BC', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
          🖨 Print / Save PDF
        </button>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1.5px solid #cbd5e1', padding: '0.5rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
          ← Back
        </button>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 'auto' }}>Print dialog opens automatically</span>
      </div>

      {/* Summary document */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem', background: 'white' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '3px solid #1B75BC', paddingBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.svg" alt="VPS Lakeshore" style={{ height: 44 }} onError={e => e.target.style.display='none'} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>VPS Lakeshore Hospital</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>HealthPod · Screening &amp; Early Detection Programme</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ഹെൽത്ത്‌പോഡ് · സ്ക്രീനിംഗ് & നേരത്തെ കണ്ടെത്തൽ</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>Patient Summary Card</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>രോഗി സംഗ്രഹ കാർഡ്</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>Printed: {printDate}</div>
                <div style={{ fontFamily: 'monospace', color: '#1B75BC', fontWeight: 700, marginTop: 2, fontSize: '0.9rem' }}>{patient.uhid}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                  {screeningsDone}/{visibleTypes.length} screenings done
                </div>
              </div>
              {/* QR code encoding UHID */}
              <div style={{ border: '1px solid #e2e8f0', padding: 4, borderRadius: 4, background: 'white' }}>
                <QRCodeSVG value={patient.uhid} size={72} level="M" />
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>Scan to verify</div>
              </div>
            </div>
          </div>
        </div>

        {/* Patient details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1rem', background: '#f8fafc', borderRadius: 8, padding: '0.875rem' }}>
          <Detail label="Full Name / പൂർണ്ണ നാമം" value={patient.name} large />
          <Detail label="UHID" value={patient.uhid} mono />
          <Detail label="Age / Gender · പ്രായം / ലിംഗം" value={[patient.age ? `${patient.age} yrs` : null, patient.gender].filter(Boolean).join(' / ')} />
          <Detail label="Date of Birth · ജനനതീയതി" value={patient.dob ? formatDate(patient.dob) : '—'} />
          <Detail label="Phone · ഫോൺ" value={patient.phone || '—'} />
          <Detail label="District · ജില്ല" value={patient.district || '—'} />
          {patient.camp_name && <Detail label="Camp · ക്യാമ്പ്" value={patient.camp_name} />}
          {patient.abha_number && <Detail label="ABHA ID" value={patient.abha_number} mono />}
          {patient.aadhaar_last4 && <Detail label="Aadhaar (last 4)" value={`XXXX-XXXX-${patient.aadhaar_last4}`} mono />}
        </div>

        {/* Risk score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: `${riskColor}08`, border: `2px solid ${riskColor}30`, borderRadius: 10, padding: '0.875rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${riskColor}18`, border: `3px solid ${riskColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: riskColor, lineHeight: 1 }}>{patient.risk_score || 0}</span>
            <span style={{ fontSize: '0.58rem', color: riskColor, fontWeight: 600 }}>/ 100</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: riskColor }}>{RISK_LABELS[riskLevel]?.en}</div>
            <div style={{ fontSize: '0.75rem', color: riskColor, fontStyle: 'italic' }}>{RISK_LABELS[riskLevel]?.ml}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>WHO STEPS NCD Risk Score · {patient.risk_score || 0} points</div>
            {patient.referred && (
              <div style={{ marginTop: 4, fontSize: '0.78rem', fontWeight: 600, color: '#A6215A' }}>⚠ Referred for further evaluation · റഫർ ചെയ്തിരിക്കുന്നു</div>
            )}
          </div>
        </div>

        {/* Screening results — grouped by category */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '0.5rem' }}>
            Screening Results · സ്ക്രീനിംഗ് ഫലങ്ങൾ
          </div>
          {SCREENING_CATEGORIES.filter(cat => cat.key !== 'questionnaire').map(cat => {
            const types = visibleTypes.filter(st => st.category === cat.key)
            if (types.length === 0) return null
            return (
              <div key={cat.key} style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{cat.icon}</span>
                  <span>{t(cat.label, 'en')}</span>
                  <span style={{ color: '#94a3b8', fontWeight: 400 }}>·</span>
                  <span style={{ color: '#94a3b8', textTransform: 'none', fontWeight: 500 }}>{t(cat.label, 'ml')}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thStyle}>Type · തരം</th>
                      <th style={thStyle}>Method · രീതി</th>
                      <th style={thStyle}>Finding · കണ്ടെത്തൽ</th>
                      <th style={thStyle}>Result · ഫലം</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map(st => {
                      const s = screenings[st.key]
                      const pos = isPositive(s?.result)
                      return (
                        <tr key={st.key}>
                          <td style={tdStyle}>
                            <div className="bilingual-label">
                              <span className="en">{st.icon} {t(st.label, 'en')}</span>
                              <span className="ml">{t(st.label, 'ml')}</span>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.75rem' }}>
                            {s ? t(st.method, 'en') : '—'}
                          </td>
                          <td style={{ ...tdStyle, color: '#475569', fontSize: '0.75rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s?.finding || '—'}
                          </td>
                          <td style={tdStyle}>
                            {s ? (
                              <span style={{ fontWeight: 600, color: pos ? '#A6215A' : '#10b981', fontSize: '0.78rem' }}>
                                {pos ? '⚠ ' : '✓ '}{s.result}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Not done · ചെയ്തിട്ടില്ല</span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                            {s?.created_at ? formatDate(s.created_at) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>

        {/* Referral */}
        {referral && (
          <div style={{ marginBottom: '1rem', background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem' }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: '0.375rem', fontSize: '0.875rem' }}>⚠ Referral Issued · റഫറൽ</div>
            <div style={{ fontSize: '0.82rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
              <span><b>Department:</b> {referral.department || '—'}</span>
              <span><b>Priority:</b> {referral.priority === 'urgent' ? '🔴 Urgent' : '🟢 Routine'}</span>
              {referral.reason && <span style={{ gridColumn: '1/-1' }}><b>Reason:</b> {referral.reason}</span>}
              {referral.notes && <span style={{ gridColumn: '1/-1' }}><b>Notes:</b> {referral.notes}</span>}
            </div>
          </div>
        )}

        {/* Doctor notes */}
        {notes && (
          <div style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1rem' }}>
            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Clinical Notes — Dr. {notes.doctor_name || 'Physician'}</div>
            {notes.clinical_assessment && <div style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}><b>Assessment:</b> {notes.clinical_assessment}</div>}
            {notes.diagnosis && <div style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}><b>Diagnosis:</b> {notes.diagnosis}</div>}
            {notes.treatment_plan && <div style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}><b>Plan:</b> {notes.treatment_plan}</div>}
            {notes.followup_date && <div style={{ fontSize: '0.82rem' }}><b>Follow-up:</b> {formatDate(notes.followup_date)}</div>}
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '0.625rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
          <span>VPS Lakeshore Hospital · Kochi, Kerala · HealthPod Screening Programme</span>
          <span>Data handled per DISHA guidelines · Confidential</span>
        </div>

        {/* Signature lines */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
          {['Screened By', 'Reviewed By (Doctor)', 'Coordinator'].map(label => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.375rem', fontSize: '0.68rem', color: '#94a3b8' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

const thStyle = {
  textAlign: 'left', padding: '0.375rem 0.5rem', fontWeight: 600, color: '#64748b',
  fontSize: '0.68rem', textTransform: 'uppercase', border: '1px solid #e2e8f0',
}

const tdStyle = {
  padding: '0.375rem 0.5rem', border: '1px solid #e2e8f0', verticalAlign: 'top',
}

function Detail({ label, value, large, mono }) {
  return (
    <div>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: large ? '0.95rem' : '0.82rem', fontWeight: large ? 700 : 500, color: '#1e293b', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</div>
    </div>
  )
}
