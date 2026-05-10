import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { useT, t } from '../lib/lang'
import TX from '../lib/translations'
import { SCREENING_TYPES } from '../lib/screeningConfig'

const CHART_TYPES = SCREENING_TYPES.filter(s => s.type === 'clinical')

export default function Dashboard() {
  const navigate = useNavigate()
  const { fetchPatients, patients } = useApp()
  const { lang, tr } = useT()
  const [stats, setStats] = useState(null)
  const [recentPatients, setRecentPatients] = useState([])
  const [highRisk, setHighRisk] = useState([])
  const [overdueFollowups, setOverdueFollowups] = useState([])

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [pRes, sRes, fuRes] = await Promise.all([
        supabase.from('patients').select('id, name, uhid, age, gender, risk_level, risk_score, created_at, referred'),
        supabase.from('screenings').select('cancer_type, result'),
        supabase.from('follow_ups').select('*, patients(id,name,uhid)').eq('status', 'scheduled').lt('followup_date', today).order('followup_date', { ascending: true }).limit(5),
      ])

      const pts = pRes.data || []
      const scs = sRes.data || []

      const byType = {}
      const posByType = {}
      CHART_TYPES.forEach(ct => { byType[ct.key] = 0; posByType[ct.key] = 0 })
      scs.forEach(s => {
        byType[s.cancer_type] = (byType[s.cancer_type] || 0) + 1
        const isPos = s.result?.toLowerCase().includes('positive') || s.result?.toLowerCase().includes('elevated') || s.result?.toLowerCase().includes('refer')
        if (isPos) posByType[s.cancer_type] = (posByType[s.cancer_type] || 0) + 1
      })

      setStats({
        total: pts.length,
        highRiskCount: pts.filter(p => p.risk_level === 'high').length,
        medRiskCount: pts.filter(p => p.risk_level === 'medium').length,
        totalScreenings: scs.length,
        byType, posByType,
        male: pts.filter(p => p.gender === 'Male').length,
        female: pts.filter(p => p.gender === 'Female').length,
      })

      // Derived from first query — no extra round-trips
      setRecentPatients([...pts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5))
      setHighRisk([...pts].filter(p => p.risk_level === 'high').sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 5))
      setOverdueFollowups(fuRes.data || [])
    }
    load()
  }, [])

  if (!stats) return <div style={{ padding: '2rem', color: '#94a3b8' }}>{tr(TX.dashboard.loading)}</div>

  return (
    <div>
      <PageHeader
        title={tr(TX.dashboard.title)}
        subtitle={tr(TX.dashboard.subtitle)}
      />

      {/* Top stats — High Risk leads because it drives immediate action */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
        <StatCard value={stats.highRiskCount} label={tr(TX.common.highRisk)} sub={tr(TX.dashboard.highRiskSub)} color="#A6215A" urgent onClick={() => navigate('/patients?risk=high')} />
        <StatCard value={stats.medRiskCount}  label={tr(TX.common.modRisk)}  sub={tr(TX.dashboard.modRiskSub)}  color="#b45309" onClick={() => navigate('/patients?risk=medium')} />
        <StatCard value={stats.totalScreenings} label={tr(TX.dashboard.screeningsDone)} sub={tr(TX.dashboard.screeningsSub)} color="#065f46" />
        <StatCard value={stats.total} label={tr(TX.dashboard.totalPatients)} sub={`${stats.male}M / ${stats.female}F`} color="#1B75BC" onClick={() => navigate('/patients')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Screening coverage — clinical types only */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{tr(TX.dashboard.coverageTitle)}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {CHART_TYPES.filter(ct => (stats.byType[ct.key] || 0) > 0 || ct.category === 'cancer').map(ct => {
              const done = stats.byType[ct.key] || 0
              const pos = stats.posByType[ct.key] || 0
              const pct = stats.total > 0 ? Math.round((done / stats.total) * 100) : 0
              const posPct = done > 0 ? Math.round((pos / done) * 100) : 0
              return (
                <div key={ct.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{ct.icon} {t(ct.label, lang)}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{done} {tr(TX.dashboard.screened)}{pos > 0 && <span style={{ color: '#A6215A', fontWeight: 600 }}> · {pos} +ve ({posPct}%)</span>}</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: ct.color, borderRadius: 9999, transition: 'width 0.6s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* High risk list */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{tr(TX.dashboard.highRiskTitle)}</h3>
            <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/patients')}>{tr(TX.dashboard.viewAll)}</button>
          </div>
          {highRisk.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>{tr(TX.dashboard.noHighRisk)}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {highRisk.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.625rem', background: 'rgba(139,26,74,0.04)', borderRadius: 8, cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,26,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#A6215A', flexShrink: 0 }}>
                    {p.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.uhid} · Score {p.risk_score}</div>
                  </div>
                  {p.referred && <span style={{ fontSize: '0.72rem', background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 4, padding: '0.1rem 0.4rem' }}>{tr(TX.common.referred)}</span>}
                  <ArrowRight size={14} color="#94a3b8" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue follow-ups */}
      {overdueFollowups.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', border: '1.5px solid #fca5a5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarClock size={16} color="#ef4444" /> {tr(TX.dashboard.overdueTitle)}
            </h3>
            <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/patients')}>{tr(TX.dashboard.viewPatients)}</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {overdueFollowups.map(fu => (
              <div key={fu.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.625rem', background: '#fff1f2', borderRadius: 7, cursor: 'pointer' }} onClick={() => navigate(`/patients/${fu.patients?.id}`)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{fu.patients?.name}</div>
                  <div style={{ fontSize: '0.76rem', color: '#ef4444' }}>
                    {tr(TX.dashboard.due)} {new Date(fu.followup_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    {fu.reason && ` · ${fu.reason}`}
                  </div>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1B75BC' }}>{fu.patients?.uhid}</span>
                <ArrowRight size={13} color="#94a3b8" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent registrations */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{tr(TX.dashboard.recentTitle)}</h3>
          <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/patients')}>{tr(TX.dashboard.seeAll)}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{tr(TX.dashboard.tablePatient || TX.common.patient)}</th>
              <th>UHID</th>
              <th>{tr(TX.dashboard.ageGender)}</th>
              <th>{tr(TX.common.risk)}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recentPatients.map(p => {
              const rl = p.risk_level || 'low'
              const rc = { low: '#10b981', medium: '#f59e0b', high: '#A6215A' }
              const rLabel = { high: `🔴 ${tr(TX.common.high)}`, medium: `🟡 ${tr(TX.common.medium)}`, low: `🟢 ${tr(TX.common.low)}` }
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1B75BC' }}>{p.uhid}</span></td>
                  <td>{p.age ? `${p.age}${tr(TX.common.yrs)}` : '—'} {p.gender ? `/ ${p.gender.charAt(0)}` : ''}</td>
                  <td><span style={{ color: rc[rl], fontWeight: 600, fontSize: '0.82rem' }}>{rLabel[rl]}</span></td>
                  <td><ArrowRight size={14} color="#94a3b8" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ value, label, sub, color, urgent, onClick }) {
  return (
    <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s', borderLeft: urgent ? '3px solid #A6215A' : undefined }} onClick={onClick}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = 'none')}
    >
      <div className="stat-value" style={{ color, marginBottom: '0.25rem' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
