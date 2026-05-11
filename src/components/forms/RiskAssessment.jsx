import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../lib/store'
import { useLang, t } from '../../lib/lang'
import { DOMAINS, getTier, generateVoucherCode } from '../../lib/riskConfig'
import { generateScorecard } from '../../lib/generatePDF'
import { ShieldCheck, ChevronRight, ChevronLeft, Download, Printer, Share2, Bluetooth, BluetoothConnected, BluetoothOff } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  isSupported as btSupported,
  readBP, readSpO2, readWeight, readGlucose,
  classifyBP, classifySpO2, classifyBMI, classifyGlucose,
} from '../../lib/bluetooth'

const DOMAIN_ICONS = ['🏃', '🥗', '🚬', '😴', '💊', '📋']

// Color an option by its points relative to the question's max
function optionTone(points, maxPts) {
  if (maxPts === 0) return null
  const ratio = points / maxPts
  if (ratio >= 0.85) return { border: '#10b981', bg: 'rgba(16,185,129,0.07)', text: '#059669', badge: '#10b981' }
  if (ratio >= 0.5)  return { border: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  text: '#b45309', badge: '#f59e0b' }
  if (ratio > 0)     return { border: '#f97316', bg: 'rgba(249,115,22,0.07)',  text: '#c2410c', badge: '#f97316' }
  return               { border: '#ef4444', bg: 'rgba(239,68,68,0.06)',   text: '#b91c1c', badge: '#ef4444' }
}

function feedbackText(points, maxPts, lang) {
  const ratio = maxPts > 0 ? points / maxPts : 0
  if (ratio >= 0.85) return lang === 'ml' ? '✓ മികച്ചത്' : '✓ Excellent'
  if (ratio >= 0.5)  return lang === 'ml' ? '↑ മെച്ചപ്പെടുത്താം' : '↑ Room to improve'
  if (ratio > 0)     return lang === 'ml' ? '⚠ ശ്രദ്ധ ആവശ്യം' : '⚠ Needs attention'
  return                    lang === 'ml' ? '⛔ ഉയർന്ന റിസ്ക്' : '⛔ High risk factor'
}

// Animated "+N pts" flash component
function PtsFlash({ pts }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1400)
    return () => clearTimeout(t)
  }, [pts])

  if (!visible) return null
  return (
    <span style={{
      position: 'absolute', top: -14, right: 4,
      fontSize: '0.7rem', fontWeight: 700, color: pts > 0 ? '#10b981' : '#ef4444',
      animation: 'floatUp 1.4s ease-out forwards',
      pointerEvents: 'none',
    }}>
      {pts > 0 ? `+${pts}` : '0'} pts
    </span>
  )
}

export default function RiskAssessment({ patient, onDone }) {
  const { saveRiskAssessment, updatePatient, showToast } = useApp()
  const { lang } = useLang()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [flashKey, setFlashKey] = useState({}) // { questionKey: pts } to trigger flash

  const domain = DOMAINS[step]
  const [btStatus, setBtStatus] = useState({}) // { qKey: 'loading' | 'done' | 'error' }
  const [btReadings, setBtReadings] = useState({}) // { qKey: display string }
  const [btWeight, setBtWeight] = useState(null) // kg from scale
  const [heightCm, setHeightCm] = useState('')   // for BMI calculation
  const [manualInputs, setManualInputs] = useState({ systolic: '', diastolic: '', spo2: '', weight: '', height: '', glucose: '' })

  const totalScore = Object.values(answers).reduce((s, v) => s + (v?.points || 0), 0)
  const fullMax = DOMAINS.reduce((s, d) => s + d.maxPoints, 0)

  function setAnswer(qKey, option) {
    const prev = answers[`${domain.key}_${qKey}`]
    setAnswers(a => ({ ...a, [`${domain.key}_${qKey}`]: option }))
    // Trigger flash if the new answer is different
    if (prev?.label !== option.label) {
      setFlashKey(f => ({ ...f, [qKey]: option.points }))
      // Reset flash key after animation
      setTimeout(() => setFlashKey(f => { const n = { ...f }; delete n[qKey]; return n }), 1500)
    }
  }
  function getAnswer(qKey) {
    return answers[`${domain.key}_${qKey}`]
  }

  const domainComplete = domain?.questions.every(q => getAnswer(q.key))

  // Auto-select a biometrics option by matching its English label
  function btAutoSelect(qKey, labelEn, displayText) {
    const dom = DOMAINS.find(d => d.key === 'biometrics')
    const question = dom?.questions.find(q => q.key === qKey)
    const opt = question?.options.find(o => t(o.label, 'en') === labelEn)
    if (!opt) return
    setAnswers(a => ({ ...a, [`biometrics_${qKey}`]: opt }))
    setBtReadings(r => ({ ...r, [qKey]: displayText }))
    setBtStatus(s => ({ ...s, [qKey]: 'done' }))
  }

  async function btRead(device) {
    setBtStatus(s => ({ ...s, [device]: 'loading' }))
    try {
      if (device === 'bp') {
        const { systolic, diastolic } = await readBP()
        btAutoSelect('blood_pressure', classifyBP(systolic, diastolic), `${systolic}/${diastolic} mmHg`)
      } else if (device === 'spo2') {
        const { spo2 } = await readSpO2()
        btAutoSelect('spo2', classifySpO2(spo2), `${spo2}%`)
      } else if (device === 'weight') {
        const { kg } = await readWeight()
        setBtWeight(kg)
        setBtStatus(s => ({ ...s, weight: 'done' }))
        // Compute BMI if height is already entered
        if (heightCm) {
          const h = parseFloat(heightCm) / 100
          if (h > 0) {
            const bmi = Math.round((kg / (h * h)) * 10) / 10
            btAutoSelect('bmi', classifyBMI(bmi), `BMI ${bmi}`)
          }
        }
      } else if (device === 'glucose') {
        const { mgdl } = await readGlucose()
        btAutoSelect('blood_sugar', classifyGlucose(mgdl), `${mgdl} mg/dL`)
      }
    } catch (err) {
      if (err.name !== 'NotFoundError') { // user cancelled picker — not an error
        setBtStatus(s => ({ ...s, [device]: 'error' }))
        setTimeout(() => setBtStatus(s => { const n = { ...s }; delete n[device]; return n }), 3000)
      } else {
        setBtStatus(s => { const n = { ...s }; delete n[device]; return n })
      }
    }
  }

  function handleManualInput(field, val) {
    const next = { ...manualInputs, [field]: val }
    setManualInputs(next)
    const sys = parseInt(next.systolic), dia = parseInt(next.diastolic)
    if ((field === 'systolic' || field === 'diastolic') && sys > 50 && dia > 30 && dia < sys) {
      btAutoSelect('blood_pressure', classifyBP(sys, dia), `${sys}/${dia} mmHg`)
    }
    if (field === 'spo2') {
      const s = parseInt(val)
      if (s >= 70 && s <= 100) btAutoSelect('spo2', classifySpO2(s), `${s}%`)
    }
    if (field === 'weight' || field === 'height') {
      const w = parseFloat(next.weight), h = parseFloat(next.height) / 100
      if (w > 20 && h > 0.5 && h < 2.5) {
        const bmi = Math.round((w / (h * h)) * 10) / 10
        btAutoSelect('bmi', classifyBMI(bmi), `BMI ${bmi}`)
      }
    }
    if (field === 'glucose') {
      const g = parseInt(val)
      if (g > 30 && g < 800) btAutoSelect('blood_sugar', classifyGlucose(g), `${g} mg/dL`)
    }
  }

  // Recompute BMI when height changes with existing weight
  function handleHeightChange(val) {
    setHeightCm(val)
    if (btWeight && val) {
      const h = parseFloat(val) / 100
      if (h > 0) {
        const bmi = Math.round((btWeight / (h * h)) * 10) / 10
        btAutoSelect('bmi', classifyBMI(bmi), `BMI ${bmi}`)
      }
    }
  }

  async function handleFinish() {
    const allAnswered = DOMAINS.every(d => d.questions.every(q => answers[`${d.key}_${q.key}`]))
    if (!allAnswered) { showToast('Please answer all questions before saving', 'error'); return }
    setSaving(true)
    const tier = getTier(totalScore)
    const domainScores = DOMAINS.map(d =>
      d.questions.reduce((s, q) => s + (answers[`${d.key}_${q.key}`]?.points || 0), 0)
    )
    // Guest flow (no patient record) — show score without saving to DB
    if (!patient?.id) {
      setDone(true)
      onDone?.({ score: totalScore, tier, domainScores })
      setSaving(false)
      return
    }
    try {
      const answersMap = {}
      Object.entries(answers).forEach(([k, v]) => { answersMap[k] = t(v.label, lang) })
      await saveRiskAssessment({
        patient_id: patient.id,
        score: totalScore,
        answers: answersMap,
        tobacco_use: t(answers['tobacco_alcohol_tobacco']?.label, 'en') || null,
        alcohol_use: t(answers['tobacco_alcohol_alcohol']?.label, 'en') || null,
        diet: t(answers['nutrition_fruit_veg']?.label, 'en') || null,
        physical_activity: t(answers['physical_activity_exercise_freq']?.label, 'en') || null,
        bmi_category: t(answers['biometrics_bmi']?.label, 'en') || null,
        diabetes: answers['biometrics_blood_sugar']?.points === 0,
        hypertension: answers['biometrics_blood_pressure']?.points === 0,
      })
      await updatePatient(patient.id, { risk_score: totalScore, risk_level: tier.level })
      if (tier.level === 'red') {
        supabase.from('staff_alerts').insert({
          patient_id: patient.id,
          alert_type: 'red_tier_hra',
          score: totalScore,
          message: `Red-tier HRA: ${patient.name || 'Patient'} scored ${totalScore}/100`,
          resolved: false,
        }).then(({ error }) => { if (error) console.warn('staff_alerts insert:', error.message) })
      }
      showToast(lang === 'ml' ? 'റിസ്ക് അസസ്മെന്റ് സേവ് ചെയ്തു' : 'Risk assessment saved')
      setDone(true)
      onDone?.({ score: totalScore, tier, domainScores })
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    const tier = getTier(totalScore)
    const domainScores = DOMAINS.map(d =>
      d.questions.reduce((s, q) => s + (answers[`${d.key}_${q.key}`]?.points || 0), 0)
    )
    return <ScoreCard score={totalScore} tier={tier} lang={lang} patient={patient} domainScores={domainScores} />
  }

  return (
    <>
      {/* Progress bar + domain chips */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            {DOMAIN_ICONS[step]} {t(domain.label, lang)}
          </span>
          {/* Live score counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {step > 0 && (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1B75BC', background: 'rgba(0,114,188,0.08)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                {lang === 'ml' ? `ആകെ: ${totalScore}` : `Running: ${totalScore}`}
              </span>
            )}
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {lang === 'ml' ? `${step + 1} / ${DOMAINS.length}` : `${step + 1} of ${DOMAINS.length}`}
            </span>
          </div>
        </div>
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 9999 }}>
          <div style={{ height: '100%', width: `${((step + 1) / DOMAINS.length) * 100}%`, background: 'linear-gradient(90deg, #1B75BC, #2e9bed)', borderRadius: 9999, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', overflowX: 'auto' }}>
          {DOMAINS.map((d, i) => (
            <div key={d.key} style={{
              flex: 1, minWidth: 44,
              padding: '0.2rem 0.3rem',
              borderRadius: 6,
              background: i < step ? '#10b981' : i === step ? '#1B75BC' : '#e2e8f0',
              color: i <= step ? 'white' : '#94a3b8',
              fontSize: '0.62rem',
              fontWeight: 600,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              transition: 'background 0.3s',
            }}>
              {DOMAIN_ICONS[i]} {i < step ? '✓' : t(d.label, lang).split(' ')[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Section points badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: 4 }}>
          {lang === 'ml' ? `ഈ വിഭാഗം: ${domain.maxPoints} pts` : `This section: ${domain.maxPoints} pts`}
        </span>
        {/* Domain progress mini bar */}
        <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 9999 }}>
          <div style={{
            height: '100%',
            width: `${domain.questions.length > 0 ? (domain.questions.filter(q => getAnswer(q.key)).length / domain.questions.length) * 100 : 0}%`,
            background: '#10b981',
            borderRadius: 9999,
            transition: 'width 0.3s',
          }} />
        </div>
        <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
          {domain.questions.filter(q => getAnswer(q.key)).length}/{domain.questions.length}
        </span>
      </div>

      {/* Manual numeric entry — always shown on biometrics domain */}
      {domain.key === 'biometrics' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.625rem' }}>
            📋 {lang === 'ml' ? 'അളവുകൾ നൽകുക (manual)' : 'Enter measurements manually'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {/* BP */}
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>{lang === 'ml' ? 'BP (mmHg)' : 'Blood Pressure (mmHg)'}</div>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <input type="number" min="60" max="260" placeholder="Sys" value={manualInputs.systolic}
                  onChange={e => handleManualInput('systolic', e.target.value)}
                  style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.82rem' }} />
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>/</span>
                <input type="number" min="30" max="160" placeholder="Dia" value={manualInputs.diastolic}
                  onChange={e => handleManualInput('diastolic', e.target.value)}
                  style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.82rem' }} />
              </div>
            </div>
            {/* SpO2 */}
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>SpO₂ (%)</div>
              <input type="number" min="70" max="100" placeholder="e.g. 98" value={manualInputs.spo2}
                onChange={e => handleManualInput('spo2', e.target.value)}
                style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.82rem', boxSizing: 'border-box' }} />
            </div>
            {/* Weight + Height */}
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>{lang === 'ml' ? 'ഭാരം / ഉയരം' : 'Weight (kg) / Height (cm)'}</div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input type="number" min="20" max="300" placeholder="kg" value={manualInputs.weight}
                  onChange={e => handleManualInput('weight', e.target.value)}
                  style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.82rem' }} />
                <input type="number" min="100" max="220" placeholder="cm" value={manualInputs.height}
                  onChange={e => handleManualInput('height', e.target.value)}
                  style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.82rem' }} />
              </div>
            </div>
            {/* Blood sugar */}
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>{lang === 'ml' ? 'രക്തത്തിലെ പഞ്ചസാര (mg/dL)' : 'Blood Sugar (mg/dL)'}</div>
              <input type="number" min="30" max="800" placeholder="e.g. 110" value={manualInputs.glucose}
                onChange={e => handleManualInput('glucose', e.target.value)}
                style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.82rem', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            {lang === 'ml' ? 'മൂല്യം നൽകിയാൽ ഉത്തരം യോമാറ്റിക്കായി തിരഞ്ഞെടുക്കും' : 'Values auto-select the correct answer below'}
          </div>
        </div>
      )}

      {/* Bluetooth panel — only on biometrics domain */}
      {domain.key === 'biometrics' && btSupported() && (
        <div style={{
          background: 'rgba(27,117,188,0.05)', border: '1px solid rgba(27,117,188,0.2)',
          borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.625rem' }}>
            <Bluetooth size={13} color="#1B75BC" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1B75BC' }}>
              {lang === 'ml' ? 'ഉപകരണങ്ങൾ കണക്ട് ചെയ്യുക' : 'Auto-read from devices'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {[
              { id: 'bp',      label: lang === 'ml' ? 'BP മോണിറ്റർ' : 'BP Monitor',      icon: '🩺', qKey: 'blood_pressure' },
              { id: 'spo2',    label: lang === 'ml' ? 'SpO₂ മീറ്റർ' : 'SpO₂ Meter',     icon: '🫀', qKey: 'spo2' },
              { id: 'weight',  label: lang === 'ml' ? 'വെയ്റ്റ് സ്കെയിൽ' : 'Weight Scale', icon: '⚖️', qKey: 'bmi' },
              { id: 'glucose', label: lang === 'ml' ? 'ഗ്ലൂക്കോമീറ്റർ' : 'Glucometer',   icon: '💉', qKey: 'blood_sugar' },
            ].map(dev => {
              const status = btStatus[dev.id]
              const done = btReadings[dev.qKey]
              return (
                <button
                  key={dev.id}
                  onClick={() => btRead(dev.id)}
                  disabled={status === 'loading'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    border: `1.5px solid ${done ? '#10b981' : status === 'error' ? '#ef4444' : '#1B75BC'}`,
                    borderRadius: '9999px',
                    background: done ? 'rgba(16,185,129,0.08)' : status === 'error' ? 'rgba(239,68,68,0.06)' : 'white',
                    color: done ? '#059669' : status === 'error' ? '#b91c1c' : '#1B75BC',
                    fontSize: '0.75rem', fontWeight: 600, cursor: status === 'loading' ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {status === 'loading' ? (
                    <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  ) : done ? (
                    <BluetoothConnected size={11} />
                  ) : (
                    <span>{dev.icon}</span>
                  )}
                  {dev.label}
                  {done && <span style={{ opacity: 0.75 }}>· {done}</span>}
                  {status === 'error' && <span> ✗</span>}
                </button>
              )
            })}
          </div>
          {/* Height input for BMI calculation */}
          {(btWeight !== null || btStatus.weight === 'loading') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
              <label style={{ fontSize: '0.73rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                {lang === 'ml' ? 'ഉയരം (cm):' : 'Height (cm):'}
              </label>
              <input
                type="number" min="100" max="220" placeholder="e.g. 165"
                value={heightCm}
                onChange={e => handleHeightChange(e.target.value)}
                style={{ width: 80, padding: '0.2rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }}
              />
              {btWeight && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{btWeight} kg</span>}
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {domain.questions.map((q, qi) => {
          const maxPts = Math.max(...q.options.map(o => o.points))
          const selected = getAnswer(q.key)
          return (
            <div key={q.key} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.625rem', border: `1px solid ${selected ? '#1B75BC33' : '#e2e8f0'}`, transition: 'border-color 0.2s' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span>{qi + 1}. {t(q.label, lang)}</span>
                {/* Per-question feedback + BT badge on selection */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                  {domain.key === 'biometrics' && btReadings[q.key] && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1B75BC', background: 'rgba(27,117,188,0.1)', border: '1px solid rgba(27,117,188,0.25)', padding: '0.1rem 0.4rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <BluetoothConnected size={9} /> {btReadings[q.key]}
                    </span>
                  )}
                  {selected && (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      color: optionTone(selected.points, maxPts)?.text,
                      background: optionTone(selected.points, maxPts)?.bg,
                      border: `1px solid ${optionTone(selected.points, maxPts)?.border}`,
                      padding: '0.15rem 0.5rem', borderRadius: 4,
                    }}>
                      {feedbackText(selected.points, maxPts, lang)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {q.options.map(opt => {
                  const isSelected = selected?.label === opt.label
                  const tone = optionTone(opt.points, maxPts)
                  return (
                    <label
                      key={t(opt.label, 'en')}
                      style={{
                        position: 'relative',
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.625rem 1rem',
                        minHeight: 44,
                        border: `1.5px solid ${isSelected ? tone.border : '#cbd5e1'}`,
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9375rem',
                        background: isSelected ? tone.bg : 'white',
                        color: isSelected ? tone.text : '#475569',
                        fontWeight: isSelected ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      <input type="radio" name={`${domain.key}_${q.key}`} style={{ display: 'none' }}
                        checked={isSelected} onChange={() => setAnswer(q.key, opt)} />
                      {t(opt.label, lang)}
                      {/* Points badge — show on hover / always for selected */}
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700, marginLeft: 2,
                        color: isSelected ? tone.badge : '#94a3b8',
                        opacity: isSelected ? 1 : 0.6,
                      }}>
                        {opt.points}p
                      </span>
                      {/* Animated +N pts flash */}
                      {isSelected && flashKey[q.key] !== undefined && (
                        <PtsFlash key={`${q.key}-${flashKey[q.key]}`} pts={flashKey[q.key]} />
                      )}
                    </label>
                  )
                })}
              </div>
              {/* Health fact blurb — shown after an answer is selected */}
              {selected && q.fact && (
                <div style={{
                  marginTop: '0.625rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(27,117,188,0.05)',
                  border: '1px solid rgba(27,117,188,0.15)',
                  borderRadius: '0.5rem',
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>💡</span>
                  <span style={{ fontSize: '0.875rem', color: '#1e3a5f', lineHeight: 1.55 }}>
                    {t(q.fact, lang)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
        <button
          className="btn-secondary"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ChevronLeft size={15} />
          {lang === 'ml' ? 'മുന്‍പ്' : 'Back'}
        </button>

        {step < DOMAINS.length - 1 ? (
          <button
            className="btn-primary"
            onClick={() => setStep(s => s + 1)}
            disabled={!domainComplete}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {lang === 'ml' ? 'അടുത്തത്' : 'Next'}
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleFinish}
            disabled={!domainComplete || saving}
            style={{ background: '#10b981' }}
          >
            {saving
              ? (lang === 'ml' ? 'സേവ് ചെയ്യുന്നു…' : 'Saving…')
              : (lang === 'ml' ? 'സ്കോർ കാണുക' : 'See My Score →')}
          </button>
        )}
      </div>
    </>
  )
}

// ─── Animated Score Card ──────────────────────────────────────────────────────

const RING_R = 54
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R

function ScoreCard({ score, tier, lang, patient, domainScores }) {
  const [display, setDisplay] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const rafRef = useRef(null)

  // Stable for the session — avoids date drift on midnight re-renders
  const voucherCode = useMemo(() => generateVoucherCode(patient, score, tier), [patient?.uhid, score, tier.level])

  function handleShare(channel) {
    const tierLabel = t(tier.label, lang)
    const msg = lang === 'ml'
      ? `🏥 HealthPod ആരോഗ്യ സ്കോർ: ${score}/100 — ${tierLabel}\n\nപ്രിയ ${patient?.name || 'രോഗി'},\nVPS Lakeshore HealthPod-ൽ നിന്നുള്ള നിങ്ങളുടെ NCD ഹെൽത്ത് റിസ്ക് സ്കോർകാർഡ്.\n\n💊 വെൽനസ് വൗച്ചർ: ${tier.voucher} OFF\nകോഡ്: ${voucherCode}\n\nകൂടുതൽ സ്ക്രീനിംഗിനായി VPS Lakeshore Hospital-ൽ ബന്ധപ്പെടുക.\nTel: +91-484-2701000`
      : `🏥 HealthPod Health Score: ${score}/100 — ${tierLabel}\n\nDear ${patient?.name || 'Patient'},\nYour NCD Health Risk Scorecard from VPS Lakeshore HealthPod.\n\n💊 Wellness Voucher: ${tier.voucher} OFF on wellness package\nCode: ${voucherCode}\n\nFor appointments & follow-up:\nVPS Lakeshore Hospital, Kochi\nTel: +91-484-2701000`

    if (channel === 'whatsapp') {
      // Pre-fill patient's phone if available; normalise to +91 10-digit
      const raw = (patient?.phone || '').replace(/\D/g, '').replace(/^0+/, '')
      const phone = raw.length === 10 ? `91${raw}` : raw.length === 12 && raw.startsWith('91') ? raw : ''
      const waUrl = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`
      window.open(waUrl, '_blank')
    } else if (channel === 'email') {
      const sub = lang === 'ml'
        ? `HealthPod ഹെൽത്ത് സ്കോർകാർഡ് — ${patient?.name || ''}`
        : `HealthPod Health Scorecard — ${patient?.name || ''} (${score}/100)`
      // Pre-fill patient email if present on the record
      const to = patient?.email ? encodeURIComponent(patient.email) : ''
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(msg)}`
    }
  }

  // Count-up animation
  useEffect(() => {
    const duration = 1600
    const start = performance.now()
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * score))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Show domain detail after reveal
        setTimeout(() => setShowDetails(true), 300)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [score])

  const strokeOffset = RING_CIRCUMFERENCE - (display / 100) * RING_CIRCUMFERENCE

  return (
    <div className="hp-scorecard" style={{ textAlign: 'center' }}>
      {/* Animated SVG ring */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
        <svg width={148} height={148} viewBox="0 0 148 148">
          {/* Track */}
          <circle cx={74} cy={74} r={RING_R} fill="none" stroke="#e2e8f0" strokeWidth={10} />
          {/* Animated progress arc */}
          <circle
            cx={74} cy={74} r={RING_R}
            fill="none"
            stroke={tier.color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            transform="rotate(-90 74 74)"
            style={{ transition: 'stroke-dashoffset 0.08s linear' }}
          />
        </svg>
        {/* Score number overlaid */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: tier.color, lineHeight: 1 }}>{display}</div>
          <div style={{ fontSize: '0.65rem', color: tier.color, fontWeight: 600, opacity: 0.8 }}>
            {lang === 'ml' ? '/ 100' : 'out of 100'}
          </div>
        </div>
      </div>

      {/* Tier badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        background: tier.bg, border: `1.5px solid ${tier.border}`,
        color: tier.color, borderRadius: '9999px', padding: '0.375rem 1.25rem',
        fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem',
        animation: 'fadeSlideUp 0.5s ease 0.3s both',
      }}>
        {tier.level === 'green' ? '🟢' : tier.level === 'amber' ? '🟡' : tier.level === 'orange' ? '🟠' : '🔴'}
        {t(tier.label, lang)}
      </div>

      <p style={{ color: '#475569', maxWidth: 400, margin: '0 auto 1.25rem', fontSize: '0.9rem', animation: 'fadeSlideUp 0.5s ease 0.5s both' }}>
        {t(tier.message, lang)}
      </p>

      {/* Domain breakdown — fades in after count-up */}
      {showDetails && (
        <div style={{ maxWidth: 420, margin: '0 auto 1.25rem', animation: 'fadeSlideUp 0.4s ease both' }}>
          {DOMAINS.map((d, i) => {
            const ds = domainScores?.[i] || 0
            const pct = d.maxPoints > 0 ? ds / d.maxPoints : 0
            const barColor = pct >= 0.7 ? '#10b981' : pct >= 0.4 ? '#f59e0b' : '#ef4444'
            return (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', width: 20 }}>{DOMAIN_ICONS[i]}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', flex: '0 0 130px', textAlign: 'left' }}>
                  {t(d.label, lang)}
                </span>
                <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 9999 }}>
                  <div style={{
                    height: '100%', width: `${pct * 100}%`, background: barColor,
                    borderRadius: 9999,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: barColor, width: 36, textAlign: 'right' }}>
                  {ds}/{d.maxPoints}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Voucher */}
      <div style={{
        background: 'linear-gradient(135deg, #1B75BC 0%, #1a5fa8 40%, #A6215A 100%)',
        borderRadius: '0.875rem', padding: '1.25rem', color: 'white',
        maxWidth: 340, margin: '0 auto',
        animation: 'fadeSlideUp 0.5s ease 0.7s both',
        boxShadow: '0 4px 24px rgba(0,114,188,0.25)',
      }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.85, marginBottom: '0.25rem' }}>
          {lang === 'ml' ? 'നിങ്ങളുടെ ഡിസ്കൗണ്ട് വൗച്ചർ' : 'Your Wellness Voucher'}
        </div>
        <div style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.5px' }}>{tier.voucher} OFF</div>
        <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.875rem' }}>
          {lang === 'ml' ? 'VPS Lakeshore ഹോസ്പിറ്റലിൽ' : 'on VPS Lakeshore wellness package'}
        </div>
        {/* QR code + code side by side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.625rem 0.75rem' }}>
          <QRCodeSVG
            value={voucherCode}
            size={64}
            bgColor="transparent"
            fgColor="white"
            level="M"
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', wordBreak: 'break-all' }}>
              {voucherCode}
            </div>
            <div style={{ fontSize: '0.6rem', opacity: 0.75, marginTop: 3 }}>
              {lang === 'ml' ? 'QR കൗണ്ടറിൽ സ്കാൻ ചെയ്യുക' : 'Scan QR or quote code at counter'}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="hp-print-hide" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', justifyContent: 'center', marginTop: '1.25rem', animation: 'fadeSlideUp 0.4s ease 0.9s both' }}>
        <button
          className="btn-primary"
          onClick={() => generateScorecard(patient, score, tier, domainScores).catch(console.error)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.85rem' }}
        >
          <Download size={14} />
          {lang === 'ml' ? 'PDF' : 'Download PDF'}
        </button>
        <button
          onClick={() => window.print()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
        >
          <Printer size={14} />
          {lang === 'ml' ? 'പ്രിന്റ്' : 'Print'}
        </button>
        <button
          onClick={() => handleShare('whatsapp')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.85rem', border: '1.5px solid #25D366', borderRadius: '0.5rem', background: 'rgba(37,211,102,0.07)', color: '#128C3E', cursor: 'pointer', fontWeight: 600 }}
        >
          <Share2 size={14} />
          WhatsApp
        </button>
        <button
          onClick={() => handleShare('email')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
        >
          <Share2 size={14} />
          {lang === 'ml' ? 'ഇമെയിൽ' : 'Email'}
        </button>
      </div>
    </div>
  )
}
