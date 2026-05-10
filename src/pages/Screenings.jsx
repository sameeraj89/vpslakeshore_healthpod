import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import { formatDate } from '../lib/utils'
import { ChevronRight, Search } from 'lucide-react'
import { useT, t } from '../lib/lang'
import TX from '../lib/translations'
import { SCREENING_TYPES } from '../lib/screeningConfig'

function isPositive(result) {
  return result?.toLowerCase().match(/positive|elevated|refer|suspicious|lesion|abnormal/)
}

export default function Screenings() {
  const navigate = useNavigate()
  const { lang, tr } = useT()
  const [screenings, setScreenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterResult, setFilterResult] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('screenings')
        .select('*, patients(id, name, uhid, age, gender, camp_name)')
        .order('created_at', { ascending: false })
        .limit(1000)
      setScreenings(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = screenings.filter(s => {
    if (filterType && s.cancer_type !== filterType) return false
    if (filterResult === 'positive' && !isPositive(s.result)) return false
    if (filterResult === 'negative' && isPositive(s.result)) return false
    if (search) {
      const name = s.patients?.name?.toLowerCase() || ''
      const uhid = s.patients?.uhid?.toLowerCase() || ''
      if (!name.includes(search.toLowerCase()) && !uhid.includes(search.toLowerCase())) return false
    }
    return true
  })

  const positiveCount = filtered.filter(s => isPositive(s.result)).length

  return (
    <div>
      <PageHeader
        title={tr(TX.screenings.title)}
        subtitle={`${filtered.length} ${tr(TX.common.records)} · ${positiveCount} ${tr(TX.screenings.positiveCount)}`}
      />

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-input" placeholder={tr(TX.screenings.searchPh)} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 200 }}>
          <option value="">{tr(TX.screenings.allTypes)}</option>
          {SCREENING_TYPES.map(st => <option key={st.key} value={st.key}>{st.icon} {t(st.label, lang)}</option>)}
        </select>
        <select className="form-select" value={filterResult} onChange={e => setFilterResult(e.target.value)} style={{ width: 160 }}>
          <option value="">{tr(TX.screenings.allResults)}</option>
          <option value="positive">{tr(TX.screenings.positiveRefer)}</option>
          <option value="negative">{tr(TX.screenings.negNormal)}</option>
        </select>
        {(filterType || filterResult || search) && (
          <button className="btn-ghost" onClick={() => { setFilterType(''); setFilterResult(''); setSearch('') }}>{tr(TX.screenings.clear)}</button>
        )}
      </div>

      {/* Summary pills — all types that have any records */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {SCREENING_TYPES.map(st => {
          const count = screenings.filter(s => s.cancer_type === st.key).length
          if (count === 0) return null
          const pos = screenings.filter(s => s.cancer_type === st.key && isPositive(s.result)).length
          return (
            <div key={st.key} style={{ background: 'white', border: `1.5px solid ${st.color}33`, borderRadius: 8, padding: '0.375rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem' }} onClick={() => setFilterType(filterType === st.key ? '' : st.key)}>
              <span style={{ color: st.color, fontWeight: 700 }}>{st.icon} {t(st.label, lang)}</span>
              <span style={{ color: '#64748b' }}>{count}</span>
              {pos > 0 && <span style={{ color: '#A6215A', fontWeight: 700 }}>· {pos} +ve</span>}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{tr(TX.screenings.loading)}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔬</div>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
              {screenings.length === 0 ? tr(TX.screenings.noRecorded) : tr(TX.screenings.noMatch)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {screenings.length === 0 ? tr(TX.screenings.noRecordedSub) : tr(TX.screenings.noMatchSub)}
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{tr(TX.common.patient)}</th>
                <th>UHID</th>
                <th>{tr(TX.screenings.thType)}</th>
                <th>{tr(TX.screenings.thMethod)}</th>
                <th>{tr(TX.screenings.thFinding)}</th>
                <th>{tr(TX.screenings.thResult)}</th>
                <th>{tr(TX.screenings.thCamp)}</th>
                <th>{tr(TX.screenings.thDate)}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const pos = isPositive(s.result)
                const cfg = SCREENING_TYPES.find(st => st.key === s.cancer_type)
                return (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${s.patients?.id}`)}>
                    <td style={{ fontWeight: 600 }}>{s.patients?.name || '—'}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1B75BC', fontWeight: 600 }}>{s.patients?.uhid || '—'}</span></td>
                    <td>
                      <span style={{ background: cfg ? `${cfg.color}15` : '#f1f5f9', color: cfg?.color || '#64748b', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}>
                        {cfg ? `${cfg.icon} ${t(cfg.label, lang)}` : s.cancer_type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{s.method || '—'}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.finding || '—'}</td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: pos ? '#A6215A' : '#10b981' }}>
                        {pos ? '⚠ ' : '✓ '}{s.result || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{s.patients?.camp_name || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatDate(s.created_at)}</td>
                    <td><ChevronRight size={14} color="#94a3b8" /></td>
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
