import { useState } from 'react'
import { useApp } from '../../lib/store'
import { useT } from '../../lib/lang'
import { useNavigate } from 'react-router-dom'
import ImageUpload from './ImageUpload'
import { getScreeningType } from '../../lib/screeningConfig'

function isActionableResult(result) {
  return !!(result?.toLowerCase().match(/positive|elevated|refer|suspicious|hazardous|high risk|urgent|moderate.*anaemia|severe/))
}

// ── Clinical form (objective measurements) ──────────────────────────────────

function ClinicalForm({ cfg, patient, existingData, onSaved }) {
  const { saveScreening, showToast } = useApp()
  const { tr } = useT()
  const navigate = useNavigate()

  const [fields, setFields] = useState(() => {
    const init = {}
    cfg.fields.forEach(f => { init[f.key] = existingData?.[f.key] || '' })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(existingData?.id || null)
  const [showReferralPrompt, setShowReferralPrompt] = useState(false)

  function setField(key, val) {
    setFields(prev => {
      const next = { ...prev, [key]: val }
      if (cfg.computeResult && key !== 'result' && key !== 'notes') {
        const computed = cfg.computeResult(next)
        if (computed) next.result = computed
      }
      return next
    })
  }

  function buildFinding() {
    // Prefer explicit finding field; otherwise build from numeric fields
    if (fields.finding) return fields.finding
    const nums = cfg.fields.filter(f => f.type === 'number' && fields[f.key] && f.key !== 'result')
    if (nums.length) return nums.map(f => `${f.label}: ${fields[f.key]}`).join(', ')
    // Fallback: first non-empty non-result non-notes field
    const first = cfg.fields.find(f => f.key !== 'result' && f.key !== 'notes' && fields[f.key])
    return first ? fields[first.key] : ''
  }

  function buildNotes() {
    // Collect numeric fields that aren't finding/result, plus free-text notes
    const numericParts = cfg.fields
      .filter(f => f.type === 'number' && fields[f.key] && f.key !== 'result')
      .map(f => `${f.label}: ${fields[f.key]}`)
    const parts = [...numericParts]
    if (fields.notes) parts.push(fields.notes)
    // Also capture non-finding radio/select fields
    cfg.fields
      .filter(f => ['radio', 'select'].includes(f.type) && f.key !== 'finding' && f.key !== 'result' && fields[f.key])
      .forEach(f => parts.push(`${f.label}: ${fields[f.key]}`))
    return parts.join('\n') || null
  }

  async function handleSave() {
    const missing = cfg.fields.filter(f => f.required && !fields[f.key])
    if (missing.length) { showToast(`Please fill in: ${missing[0].label}`, 'error'); return }

    setSaving(true)
    try {
      const data = await saveScreening({
        patient_id: patient.id,
        cancer_type: cfg.key,
        finding: buildFinding(),
        result: fields.result,
        notes: buildNotes(),
        screened_at: new Date().toISOString(),
      })
      setSavedId(data.id)
      onSaved?.(data)
      if (isActionableResult(fields.result)) {
        setShowReferralPrompt(true)
      } else {
        showToast(`${tr(cfg.label)} saved`)
      }
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ border: `1.5px solid ${cfg.color}22`, borderRadius: '0.75rem', overflow: 'hidden' }}>
      {showReferralPrompt && (
        <div style={{ background: 'rgba(200,16,62,0.06)', borderBottom: '1px solid rgba(200,16,62,0.2)', padding: '0.75rem 1rem', display: 'flex', gap: '0.875rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>⚠️</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#A6215A' }}>Actionable result — referral recommended</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Screening saved. Create a formal referral?</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setShowReferralPrompt(false); navigate(`/patients/${patient.id}`, { state: { activeTab: 'referral' } }) }}
              style={{ background: '#A6215A', color: 'white', border: 'none', borderRadius: 6, padding: '0.4rem 0.875rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              Create Referral
            </button>
            <button onClick={() => setShowReferralPrompt(false)}
              style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer', color: '#64748b' }}>
              Later
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: `${cfg.color}0f`, borderBottom: `1px solid ${cfg.color}22`, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cfg.icon} {tr(cfg.label)}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{tr(cfg.method)}</div>
        </div>
        {fields.result && (
          <span style={{
            background: isActionableResult(fields.result) ? 'rgba(200,16,62,0.1)' : 'rgba(16,185,129,0.1)',
            color: isActionableResult(fields.result) ? '#A6215A' : '#10b981',
            border: `1px solid ${isActionableResult(fields.result) ? 'rgba(200,16,62,0.3)' : 'rgba(16,185,129,0.3)'}`,
            borderRadius: 4, padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
          }}>
            {fields.result}
          </span>
        )}
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {cfg.fields.map(field => (
          <FieldRenderer key={field.key} field={field} value={fields[field.key]} onChange={val => setField(field.key, val)} color={cfg.color} />
        ))}

        {savedId && cfg.allowImages && (
          <ImageUpload patient={patient} screeningId={savedId} label={`${tr(cfg.label)} — Clinical Image`} />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ background: cfg.color }}>
            {saving ? 'Saving…' : savedId ? 'Update' : 'Save Screening'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Questionnaire form (scored, validated tools) ─────────────────────────────

function QuestionnaireForm({ cfg, patient, existingData, onSaved }) {
  const { saveScreening, showToast } = useApp()
  const { tr } = useT()
  const navigate = useNavigate()

  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(existingData?.result || null)

  const score = Object.values(answers).reduce((s, v) => s + (v?.points || 0), 0)
  const allAnswered = cfg.questions.every(q => answers[q.key])

  // Group questions by section for CBAC
  const sections = [...new Set(cfg.questions.map(q => q.section).filter(Boolean))]
  const hasSections = sections.length > 0

  async function handleSave() {
    if (!allAnswered) { showToast('Please answer all questions', 'error'); return }
    setSaving(true)
    try {
      const interp = cfg.scoreInterpretation(score, patient)
      const answersMap = {}
      cfg.questions.forEach(q => { answersMap[q.key] = answers[q.key]?.label || '' })

      const data = await saveScreening({
        patient_id: patient.id,
        cancer_type: cfg.key,
        finding: `${tr(cfg.label)} — Score: ${score}/${cfg.maxScore}`,
        result: interp.result,
        notes: JSON.stringify(answersMap),
        screened_at: new Date().toISOString(),
      })
      setResult(interp.result)
      onSaved?.(data)
      if (interp.flag) {
        showToast(`${tr(cfg.label)} — positive screen. Consider referral.`, 'error')
      } else {
        showToast(`${tr(cfg.label)} saved`)
      }
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const pct = cfg.maxScore > 0 ? (score / cfg.maxScore) * 100 : 0
  const interp = allAnswered ? cfg.scoreInterpretation(score, patient) : null

  function renderQuestions(questions, offset = 0) {
    return questions.map((q, qi) => (
      <div key={q.key} style={{ padding: '0.875rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: '#1e293b' }}>
          {offset + qi + 1}. {q.label}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {q.options.map(opt => {
            const selected = answers[q.key]?.label === opt.label
            return (
              <label key={opt.label} style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', border: `1.5px solid ${selected ? cfg.color : '#cbd5e1'}`,
                borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                background: selected ? `${cfg.color}10` : 'white',
                color: selected ? cfg.color : '#1e293b', fontWeight: selected ? 600 : 400,
              }}>
                <input type="radio" style={{ display: 'none' }} checked={selected} onChange={() => setAnswers(a => ({ ...a, [q.key]: opt }))} />
                {opt.label}
                <span style={{ fontSize: '0.72rem', color: selected ? cfg.color : '#94a3b8', marginLeft: 2 }}>({opt.points}pts)</span>
              </label>
            )
          })}
        </div>
      </div>
    ))
  }

  return (
    <div style={{ border: `1.5px solid ${cfg.color}22`, borderRadius: '0.75rem', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: `${cfg.color}0f`, borderBottom: `1px solid ${cfg.color}22`, padding: '0.75rem 1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cfg.icon} {tr(cfg.label)}</div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{tr(cfg.method)}</div>
        {cfg.description && (
          <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4, background: 'white', padding: '0.3rem 0.6rem', borderRadius: 4, display: 'inline-block' }}>
            {cfg.description}
          </div>
        )}
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Saved result banner */}
        {result && (
          <div style={{ padding: '0.625rem 0.875rem', background: isActionableResult(result) ? 'rgba(200,16,62,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${isActionableResult(result) ? 'rgba(200,16,62,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, color: isActionableResult(result) ? '#A6215A' : '#10b981' }}>
            ✓ {result}
          </div>
        )}

        {/* Live score bar */}
        {!result && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem' }}>
              <span style={{ color: '#64748b' }}>Running score</span>
              <span style={{ fontWeight: 700, color: cfg.color }}>{score} / {cfg.maxScore}</span>
            </div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 9999 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 9999, transition: 'width 0.3s' }} />
            </div>
            {interp && (
              <div style={{ marginTop: 6, fontSize: '0.8rem', fontWeight: 600, color: interp.flag ? '#A6215A' : '#10b981' }}>
                {interp.flag ? '⚠ ' : '✓ '}{interp.result}
              </div>
            )}
          </div>
        )}

        {/* Questions — sectioned for CBAC, flat otherwise */}
        {hasSections ? (() => {
          let offset = 0
          return sections.map(section => {
            const sectionQs = cfg.questions.filter(q => q.section === section)
            const el = (
              <div key={section}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{section}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {renderQuestions(sectionQs, offset)}
                </div>
              </div>
            )
            offset += sectionQs.length
            return el
          })
        })() : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {renderQuestions(cfg.questions)}
          </div>
        )}

        {!result && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave} disabled={!allAnswered || saving} style={{ background: cfg.color }}>
              {saving ? 'Saving…' : 'Save Result'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Generic field renderer ───────────────────────────────────────────────────

function FieldRenderer({ field, value, onChange, color }) {
  if (field.type === 'radio') {
    return (
      <div>
        <label className="form-label">{field.label}{field.required && <span style={{ color: '#A6215A' }}> *</span>}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {field.options.map(opt => {
            const selected = value === opt
            return (
              <label key={opt} style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', border: `1.5px solid ${selected ? color : '#cbd5e1'}`,
                borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                background: selected ? `${color}10` : 'white',
                color: selected ? color : '#1e293b', fontWeight: selected ? 600 : 400,
              }}>
                <input type="radio" style={{ display: 'none' }} checked={selected} onChange={() => onChange(opt)} />
                {opt}
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div>
        <label className="form-label">{field.label}{field.required && <span style={{ color: '#A6215A' }}> *</span>}</label>
        <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {field.options.map(opt => <option key={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div style={{ maxWidth: 220 }}>
        <label className="form-label">{field.label}{field.required && <span style={{ color: '#A6215A' }}> *</span>}</label>
        <input className="form-input" type="number" value={value}
          step={field.step || 1} min={field.min} max={field.max}
          placeholder={field.placeholder}
          onChange={e => onChange(e.target.value)} />
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="form-label">{field.label}</label>
        <textarea className="form-textarea" value={value} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder} style={{ minHeight: 56 }} />
      </div>
    )
  }

  return null
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function ScreeningForm({ patient, typeKey, existingData, onSaved }) {
  const cfg = getScreeningType(typeKey)
  if (!cfg) return <div style={{ padding: '1rem', color: '#94a3b8' }}>Unknown screening type: {typeKey}</div>

  if (cfg.type === 'questionnaire') {
    return <QuestionnaireForm cfg={cfg} patient={patient} existingData={existingData} onSaved={onSaved} />
  }
  return <ClinicalForm cfg={cfg} patient={patient} existingData={existingData} onSaved={onSaved} />
}
