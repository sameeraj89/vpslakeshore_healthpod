import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import { exportToExcel, exportLeads, isPositiveResult } from '../lib/exportExcel'
import { exportDHIS2 } from '../lib/exportDHIS2'
import { Download, Database, Users } from 'lucide-react'
import { SCREENING_TYPES } from '../lib/screeningConfig'
import { useT, t } from '../lib/lang'
import TX from '../lib/translations'
import ReactECharts from 'echarts-for-react'

// Only clinical (non-questionnaire) types for the screening results chart
const CHART_TYPES = SCREENING_TYPES.filter(t => t.type === 'clinical')

export default function Reports() {
  const { lang, tr } = useT()
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState([])
  const [screenings, setScreenings] = useState([])
  const [camps, setCamps] = useState([])
  const [followups, setFollowups] = useState([])
  const [filterCamp, setFilterCamp] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showLeadMenu, setShowLeadMenu] = useState(false)
  const leadMenuRef = useRef(null)

  useEffect(() => {
    if (!showLeadMenu) return
    function handleClickOutside(e) {
      if (leadMenuRef.current && !leadMenuRef.current.contains(e.target)) setShowLeadMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLeadMenu])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: pts }, { data: scs }, { data: cmps }, { data: fus }] = await Promise.all([
        supabase.from('patients').select('*').order('created_at', { ascending: false }).limit(10000),
        supabase.from('screenings').select('*').limit(50000),
        supabase.from('camps').select('*').order('date', { ascending: false }).limit(500),
        supabase.from('follow_ups').select('*, patients(name,uhid)').limit(5000),
      ])
      setPatients(pts || [])
      setScreenings(scs || [])
      setCamps(cmps || [])
      setFollowups(fus || [])
      setLoading(false)
    }
    load()
  }, [])

  const filteredPatients = patients.filter(p => {
    if (filterCamp && p.camp_name !== filterCamp) return false
    if (dateFrom && p.created_at < dateFrom) return false
    if (dateTo && p.created_at.slice(0, 10) > dateTo) return false
    return true
  })

  const filteredScreenings = screenings.filter(s => {
    const pt = filteredPatients.find(p => p.id === s.patient_id)
    return !!pt
  })

  const riskDist = {
    high: filteredPatients.filter(p => p.risk_level === 'high').length,
    medium: filteredPatients.filter(p => p.risk_level === 'medium').length,
    low: filteredPatients.filter(p => p.risk_level === 'low').length,
  }

  const screeningsByType = CHART_TYPES.map(ct => ({
    key: ct.key,
    label: t(ct.label, lang),
    icon: ct.icon,
    color: ct.color,
    total: filteredScreenings.filter(s => s.cancer_type === ct.key).length,
    positive: filteredScreenings.filter(s => s.cancer_type === ct.key && isPositiveResult(s.result)).length,
  })).filter(ct => ct.total > 0 || SCREENING_TYPES.find(s => s.key === ct.key)?.category === 'cancer')

  const campStats = camps.map(c => {
    const pts = patients.filter(p => p.camp_name === c.name)
    const scs = screenings.filter(s => pts.some(p => p.id === s.patient_id))
    return { ...c, patientCount: pts.length, screeningCount: scs.length }
  })

  const avgScore = filteredPatients.length > 0
    ? Math.round(filteredPatients.reduce((s, p) => s + (p.risk_score || 0), 0) / filteredPatients.length)
    : 0

  const referred = filteredPatients.filter(p => p.referred).length
  const today = new Date().toISOString().split('T')[0]
  const overdueCount = followups.filter(f => f.status === 'scheduled' && f.followup_date < today).length

  async function handleExcelExport() {
    setExporting(true)
    try {
      exportToExcel(filteredPatients, filteredScreenings)
    } finally {
      setExporting(false)
    }
  }

  async function handleDHIS2Export() {
    const count = exportDHIS2(filteredPatients, filteredScreenings)
    alert(`DHIS2 export ready — ${count} records.\n\nUpdate UID mappings in src/lib/exportDHIS2.js before importing.`)
  }

  function handleLeadExport(riskFilter) {
    const count = exportLeads(filteredPatients, filteredScreenings, { riskFilter })
    if (!count) { alert('No patients match the selected filter.'); return }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>{tr(TX.reports.loading)}</div>

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        title={tr(TX.reports.title)}
        subtitle={tr(TX.reports.subtitle)}
        action={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={handleExcelExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={15} /> {exporting ? tr(TX.reports.exporting) : tr(TX.reports.excelExport)}
            </button>
            {/* Lead export dropdown */}
            <div ref={leadMenuRef} style={{ position: 'relative' }}>
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', borderColor: '#059669' }}
                onClick={() => setShowLeadMenu(v => !v)}>
                <Users size={15} /> Export Leads ▾
              </button>
              {showLeadMenu && (
                <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 200, overflow: 'hidden' }}>
                  {[
                    { label: 'All patients', value: 'all' },
                    { label: '🔴 Act Now (high risk)', value: 'red' },
                    { label: '🟠 At Risk', value: 'orange' },
                    { label: '🟡 Watchful', value: 'amber' },
                    { label: '🟢 Thriving', value: 'green' },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => { handleLeadExport(opt.value); setShowLeadMenu(false) }}
                      style={{ width: '100%', padding: '0.625rem 1rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#1e293b' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn-secondary" onClick={handleDHIS2Export} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7c3aed', borderColor: '#7c3aed' }}>
              <Database size={15} /> DHIS2
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', flexShrink: 0 }}>{tr(TX.reports.filterLabel)}</div>
        <select className="form-select" value={filterCamp} onChange={e => setFilterCamp(e.target.value)} style={{ width: 200 }}>
          <option value="">{tr(TX.reports.allCamps)}</option>
          {camps.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>{tr(TX.reports.from)}</label>
          <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>{tr(TX.reports.to)}</label>
          <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
        </div>
        {(filterCamp || dateFrom || dateTo) && (
          <button className="btn-ghost" onClick={() => { setFilterCamp(''); setDateFrom(''); setDateTo('') }}>{tr(TX.reports.clear)}</button>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
        <KPI label={tr(TX.reports.totalPatients)}   value={filteredPatients.length}   color="#1B75BC" />
        <KPI label={tr(TX.reports.screeningsDone)}  value={filteredScreenings.length} color="#10b981" />
        <KPI label={tr(TX.reports.referred)}        value={referred}                  color="#A6215A" />
        <KPI label={tr(TX.reports.avgRisk)}         value={avgScore} sub="/ 100"      color="#f59e0b" />
        <KPI label={tr(TX.reports.overdueFollowup)} value={overdueCount}              color={overdueCount > 0 ? '#ef4444' : '#94a3b8'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Risk distribution — donut chart */}
        <div className="card">
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>{tr(TX.reports.riskDistTitle)}</h3>
          {filteredPatients.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', padding: '2rem 0', textAlign: 'center' }}>{tr(TX.reports.noPatients)}</div>
          ) : (
            <ReactECharts
              style={{ height: 220 }}
              option={{
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { bottom: 0, textStyle: { fontSize: 11 } },
                series: [{
                  type: 'pie',
                  radius: ['42%', '68%'],
                  center: ['50%', '42%'],
                  avoidLabelOverlap: true,
                  label: { show: false },
                  emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
                  data: [
                    { value: riskDist.high,   name: tr(TX.common.highRisk), itemStyle: { color: '#A6215A' } },
                    { value: riskDist.medium, name: tr(TX.common.modRisk),  itemStyle: { color: '#f59e0b' } },
                    { value: riskDist.low,    name: tr(TX.common.lowRisk),  itemStyle: { color: '#10b981' } },
                  ].filter(d => d.value > 0),
                }],
              }}
            />
          )}
        </div>

        {/* Screening results — horizontal bar chart */}
        <div className="card">
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>{tr(TX.reports.screeningRes)}</h3>
          {screeningsByType.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', padding: '2rem 0', textAlign: 'center' }}>{tr(TX.reports.noPatients)}</div>
          ) : (
            <ReactECharts
              style={{ height: 220 }}
              option={{
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { left: '2%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
                xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } } },
                yAxis: {
                  type: 'category',
                  data: screeningsByType.map(s => `${s.icon} ${s.label}`),
                  axisLabel: { fontSize: 10, width: 120, overflow: 'truncate' },
                },
                series: [
                  {
                    name: tr(TX.reports.screened),
                    type: 'bar',
                    stack: 'total',
                    data: screeningsByType.map(s => ({ value: s.total - s.positive, itemStyle: { color: s.color + '55' } })),
                    label: { show: false },
                  },
                  {
                    name: '+ve',
                    type: 'bar',
                    stack: 'total',
                    data: screeningsByType.map(s => ({ value: s.positive, itemStyle: { color: '#A6215A' } })),
                    label: {
                      show: true, position: 'right',
                      formatter: p => p.value > 0 ? `${p.value}` : '',
                      color: '#A6215A', fontSize: 10,
                    },
                  },
                ],
              }}
            />
          )}
        </div>
      </div>

      {/* Camp-wise breakdown */}
      {campStats.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700 }}>{tr(TX.reports.campSummary)}</h3>
          <table>
            <thead>
              <tr>
                <th>{tr(TX.common.camp)}</th>
                <th>{tr(TX.reports.thDate)}</th>
                <th>{tr(TX.reports.thDistrict)}</th>
                <th>{tr(TX.reports.thPatients)}</th>
                <th>{tr(TX.reports.thScreenings)}</th>
                <th>{tr(TX.reports.thHighRisk)}</th>
                <th>{tr(TX.reports.thReferred)}</th>
              </tr>
            </thead>
            <tbody>
              {campStats.map(c => {
                const pts = patients.filter(p => p.camp_name === c.name)
                const hr = pts.filter(p => p.risk_level === 'high').length
                const ref = pts.filter(p => p.referred).length
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{c.district || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#1B75BC' }}>{c.patientCount}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{c.screeningCount}</td>
                    <td style={{ fontWeight: 700, color: '#A6215A' }}>{hr}</td>
                    <td style={{ fontWeight: 700, color: '#f59e0b' }}>{ref}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Gender breakdown */}
      <div className="card">
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700 }}>{tr(TX.reports.demographics)}</h3>
        {filteredPatients.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{tr(TX.reports.noPatients)}</div>
        ) : (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: tr(TX.common.male),   count: filteredPatients.filter(p => p.gender === 'Male').length,                               color: '#1B75BC' },
              { label: tr(TX.common.female), count: filteredPatients.filter(p => p.gender === 'Female').length,                             color: '#e91e8c' },
              { label: tr(TX.common.other),  count: filteredPatients.filter(p => p.gender !== 'Male' && p.gender !== 'Female').length,      color: '#94a3b8' },
            ].map(g => (
              <div key={g.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: g.count > 0 ? g.color : '#94a3b8' }}>{g.count}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{g.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {Math.round((g.count / filteredPatients.length) * 100)}%
                </div>
              </div>
            ))}
            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
                {Math.round(filteredPatients.reduce((s, p) => s + (p.age || 0), 0) / filteredPatients.length)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tr(TX.reports.avgAge)}</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: referred > 0 ? '#A6215A' : '#94a3b8' }}>{referred}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tr(TX.reports.referred)}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {Math.round((referred / filteredPatients.length) * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KPI({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '0.25rem' }}>
        {value}{sub && <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{sub}</span>}
      </div>
      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{label}</div>
    </div>
  )
}
