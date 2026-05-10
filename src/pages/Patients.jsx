import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { exportToExcel } from '../lib/exportExcel'
import { exportDHIS2 } from '../lib/exportDHIS2'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import { UserPlus, Download, Search, ChevronRight, Database } from 'lucide-react'
import { useT } from '../lib/lang'
import TX from '../lib/translations'
import { SCREENING_TYPES } from '../lib/screeningConfig'

const CLINICAL_TYPES = SCREENING_TYPES.filter(t => t.type === 'clinical')

export default function Patients() {
  const navigate = useNavigate()
  const { patients, fetchPatients, loading } = useApp()
  const { tr } = useT()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterRisk, setFilterRisk] = useState(searchParams.get('risk') || '')
  const [filterCamp, setFilterCamp] = useState(searchParams.get('camp') || '')
  const [screenings, setScreenings] = useState([])

  useEffect(() => {
    fetchPatients()
    supabase.from('screenings').select('patient_id, cancer_type, result').then(({ data }) => setScreenings(data || []))
  }, [])

  const camps = [...new Set(patients.map(p => p.camp_name).filter(Boolean))]

  const filtered = patients.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.uhid?.includes(search) && !p.phone?.includes(search)) return false
    if (filterGender && p.gender !== filterGender) return false
    if (filterRisk && p.risk_level !== filterRisk) return false
    if (filterCamp && p.camp_name !== filterCamp) return false
    return true
  })

  async function handleExport() {
    const { data: scs } = await supabase.from('screenings').select('*')
    exportToExcel(filtered, scs || [])
  }

  async function handleDHIS2Export() {
    const { data: scs } = await supabase.from('screenings').select('*')
    const count = exportDHIS2(filtered, scs || [])
    alert(`DHIS2 export ready — ${count} patient records.\n\nBefore importing to DHIS2, update the UID mappings in src/lib/exportDHIS2.js with your programme's org unit and attribute UIDs.`)
  }

  function getScreeningDots(patientId) {
    const types = screenings.filter(s => s.patient_id === patientId)
    return types
  }

  const riskColors = { low: '#10b981', medium: '#f59e0b', high: '#A6215A' }
  const riskBg = { low: 'rgba(16,185,129,0.08)', medium: 'rgba(245,158,11,0.08)', high: 'rgba(139,26,74,0.08)' }

  return (
    <div>
      <PageHeader
        title={tr(TX.patients.title)}
        subtitle={`${filtered.length} ${tr(TX.common.of)} ${patients.length} ${tr(TX.common.patients)}`}
        action={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={15} /> {tr(TX.patients.thScreenings) === 'Screenings' ? 'Excel' : 'Excel'}
            </button>
            <button className="btn-secondary" onClick={handleDHIS2Export} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7c3aed', borderColor: '#7c3aed' }}>
              <Database size={15} /> DHIS2
            </button>
            <button className="btn-primary" onClick={() => navigate('/register')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserPlus size={15} /> {tr(TX.patients.newPatient)}
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-input"
            placeholder={tr(TX.patients.searchPh)}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <select className="form-select" value={filterGender} onChange={e => setFilterGender(e.target.value)} style={{ width: 130 }}>
          <option value="">{tr(TX.patients.allGenders)}</option>
          <option value="Male">{tr(TX.common.male)}</option>
          <option value="Female">{tr(TX.common.female)}</option>
          <option value="Other">{tr(TX.common.other)}</option>
        </select>
        <select className="form-select" value={filterRisk} onChange={e => setFilterRisk(e.target.value)} style={{ width: 160 }}>
          <option value="">{tr(TX.patients.allRisk)}</option>
          <option value="high">{tr(TX.common.highRisk)}</option>
          <option value="medium">{tr(TX.common.modRisk)}</option>
          <option value="low">{tr(TX.common.lowRisk)}</option>
        </select>
        {camps.length > 0 && (
          <select className="form-select" value={filterCamp} onChange={e => setFilterCamp(e.target.value)} style={{ width: 180 }}>
            <option value="">{tr(TX.patients.allCamps)}</option>
            {camps.map(c => <option key={c}>{c}</option>)}
          </select>
        )}
        {(search || filterGender || filterRisk || filterCamp) && (
          <button className="btn-ghost" onClick={() => { setSearch(''); setFilterGender(''); setFilterRisk(''); setFilterCamp('') }} style={{ fontSize: '0.85rem' }}>{tr(TX.patients.clear)}</button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{tr(TX.patients.loading)}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
            {tr(TX.patients.noPatients)}
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn-primary" onClick={() => navigate('/register')}>{tr(TX.patients.registerFirst)}</button>
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{tr(TX.patients.thPatient)}</th>
                <th>UHID</th>
                <th>{tr(TX.patients.thAgeGender)}</th>
                <th>{tr(TX.patients.thPhone)}</th>
                <th>{tr(TX.patients.thCamp)}</th>
                <th>{tr(TX.patients.thRisk)}</th>
                <th>{tr(TX.patients.thScreenings)}</th>
                <th>{tr(TX.patients.thRegistered)}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const dots = getScreeningDots(p.id)
                const rl = p.risk_level || 'low'
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.name}</div>
                      {p.district && <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{p.district}</div>}
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1B75BC', fontWeight: 600 }}>{p.uhid}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{p.age ? `${p.age}${tr(TX.common.yrs)}` : '—'} {p.gender ? `/ ${p.gender.charAt(0)}` : ''}</td>
                    <td style={{ fontSize: '0.85rem' }}>{p.phone || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{p.camp_name || '—'}</td>
                    <td>
                      <span style={{ background: riskBg[rl], color: riskColors[rl], padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}>
                        {rl === 'high' ? tr(TX.common.high) : rl === 'medium' ? tr(TX.common.medium) : tr(TX.common.low)} {p.risk_score > 0 ? `(${p.risk_score})` : ''}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                        {CLINICAL_TYPES.filter(ct => ct.category === 'cancer').map(ct => {
                          const s = dots.find(d => d.cancer_type === ct.key)
                          const isPos = s?.result?.toLowerCase().includes('positive') || s?.result?.toLowerCase().includes('elevated') || s?.result?.toLowerCase().includes('refer')
                          return (
                            <div key={ct.key} title={`${ct.key}: ${s?.result || 'not done'}`} style={{ width: 10, height: 10, borderRadius: '50%', background: !s ? '#e2e8f0' : isPos ? '#A6215A' : '#10b981' }} />
                          )
                        })}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{formatDate(p.created_at)}</td>
                    <td><ChevronRight size={15} color="#94a3b8" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#94a3b8' }}>
        {tr(TX.patients.dotsLegend)}
      </div>
    </div>
  )
}
