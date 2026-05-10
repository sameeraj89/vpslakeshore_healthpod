import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import RiskAssessment from '../components/forms/RiskAssessment'

const IDLE_MS = 3 * 60 * 1000   // reset to welcome after 3 min idle
const THANKYOU_MS = 60 * 1000   // auto-reset from thank-you after 1 min
const TAP_WINDOW = 2500          // 5 taps within 2.5s triggers staff exit
const DEFAULT_PIN = '1234'

// ─── Idle timer reset on any interaction ─────────────────────────────────────
function useIdleReset(onIdle, active) {
  const timer = useRef(null)
  const reset = useCallback(() => {
    clearTimeout(timer.current)
    if (active) timer.current = setTimeout(onIdle, IDLE_MS)
  }, [onIdle, active])
  useEffect(() => {
    if (!active) return
    reset()
    window.addEventListener('mousemove', reset)
    window.addEventListener('touchstart', reset)
    window.addEventListener('keydown', reset)
    return () => {
      clearTimeout(timer.current)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('touchstart', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [active, reset])
}

// ─── Main Kiosk component ────────────────────────────────────────────────────
export default function Kiosk() {
  const navigate = useNavigate()
  const { saveRiskAssessment, updatePatient, showToast } = useApp()

  const [screen, setScreen] = useState('welcome')  // welcome | identify | hra
  const [lang, setLang] = useState('en')
  const [patient, setPatient] = useState(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [resultDone, setResultDone] = useState(false)

  // Staff exit: 5 taps in < 2.5s
  const tapTimes = useRef([])
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const tx = {
    en: {
      welcome: 'Welcome to', sub: 'Your Health. Revealed. Rewarded. In 10 min.',
      programme: 'Screening & Early Detection Programme',
      promise: '"Prevention is not a department at Lakeshore. It is a promise."',
      startBtn: 'Start Health Check →',
      identifyTitle: 'Find your record',
      identifyPlaceholder: 'Enter UHID, ABHA or mobile number',
      identifyBtn: 'Continue →',
      skipBtn: "I don't have a record — continue anyway",
      notFound: 'No record found. Please register at the front desk.',
      back: '← Back',
      hraTitle: 'Health Risk Assessment',
      thankTitle: 'All done!',
      thankMsg: 'Your health score has been saved. A nurse counsellor will be with you shortly.',
      resetIn: 'Returning to start in',
      seconds: 'seconds',
      staffExit: 'Staff mode',
      pinPrompt: 'Enter staff PIN to exit kiosk',
      pinBtn: 'Exit Kiosk',
      pinWrong: 'Incorrect PIN',
      cancel: 'Cancel',
    },
    ml: {
      welcome: 'സ്വാഗതം', sub: 'നിങ്ങളുടെ ആരോഗ്യം. 10 മിനിറ്റിൽ.',
      programme: 'സ്ക്രീനിംഗ് & ആർലി ഡിറ്റക്ഷൻ പ്രോഗ്രാം',
      promise: '"പ്രതിരോധം ലേക്ഷോറിൽ ഒരു വകുപ്പല്ല. അത് ഒരു വാഗ്ദാനമാണ്."',
      startBtn: 'ആരോഗ്യ പരിശോധന ആരംഭിക്കുക →',
      identifyTitle: 'നിങ്ങളുടെ രേഖ കണ്ടെത്തുക',
      identifyPlaceholder: 'UHID, ABHA അല്ലെങ്കിൽ മൊബൈൽ നൽകുക',
      identifyBtn: 'തുടരുക →',
      skipBtn: 'രേഖ ഇല്ല — തുടരുക',
      notFound: 'രേഖ കണ്ടെത്തിയില്ല. ഫ്രണ്ട് ഡെസ്കിൽ രജിസ്റ്റർ ചെയ്യുക.',
      back: '← തിരികെ',
      hraTitle: 'ആരോഗ്യ റിസ്ക് വിലയിരുത്തൽ',
      thankTitle: 'പൂർത്തിയായി!',
      thankMsg: 'നിങ്ങളുടെ ആരോഗ്യ സ്കോർ സേവ് ചെയ്തു. ഒരു നഴ്സ് കൗൺസെലർ ഉടൻ ബന്ധപ്പെടും.',
      resetIn: 'ആരംഭ സ്ക്രീനിലേക്ക്',
      seconds: 'സെക്കൻഡ്',
      staffExit: 'Staff mode',
      pinPrompt: 'Kiosk നിർത്തുന്നതിന് staff PIN നൽകുക',
      pinBtn: 'Exit Kiosk',
      pinWrong: 'PIN തെറ്റാണ്',
      cancel: 'റദ്ദാക്കുക',
    },
  }
  const tr = (key) => tx[lang][key] || tx.en[key]

  // Idle reset — active on identify/hra screens
  useIdleReset(() => resetToWelcome(), screen === 'identify' || screen === 'hra')

  function resetToWelcome() {
    setScreen('welcome')
    setPatient(null)
    setQuery('')
    setSearchError('')
    setResultDone(false)
  }

  // Auto-reset after ScoreCard is shown
  const [countdown, setCountdown] = useState(Math.floor(THANKYOU_MS / 1000))
  useEffect(() => {
    if (!resultDone) { setCountdown(Math.floor(THANKYOU_MS / 1000)); return }
    const interval = setInterval(() => setCountdown(c => c - 1), 1000)
    const timer = setTimeout(resetToWelcome, THANKYOU_MS)
    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [resultDone])

  // Staff tap-out on logo
  function handleLogoTap() {
    const now = Date.now()
    tapTimes.current = [...tapTimes.current.filter(t => now - t < TAP_WINDOW), now]
    if (tapTimes.current.length >= 5) {
      tapTimes.current = []
      setShowPinDialog(true)
    }
  }

  function handlePinSubmit() {
    const stored = localStorage.getItem('kiosk_pin') || DEFAULT_PIN
    if (pinInput === stored) {
      setShowPinDialog(false)
      navigate('/')
    } else {
      setPinError(tr('pinWrong'))
      setTimeout(() => setPinError(''), 2000)
    }
  }

  async function handleLookup(e) {
    e?.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    const q = query.trim()
    const { data } = await supabase
      .from('patients')
      .select('*')
      .or(`uhid.eq.${q},abha_number.eq.${q},abha_address.eq.${q},phone.ilike.${q}`)
      .maybeSingle()
    setSearching(false)
    if (data) {
      setPatient(data)
      setScreen('hra')
    } else {
      setSearchError(tr('notFound'))
    }
  }

  // ─── Welcome Screen ──────────────────────────────────────────────────────
  if (screen === 'welcome') {
    const metrics = [
      { icon: '❤️', label: lang === 'ml' ? 'രക്തസമ്മർദ്ദം' : 'Blood Pressure' },
      { icon: '🫁', label: lang === 'ml' ? 'ഓക്സിജൻ' : 'SpO₂' },
      { icon: '⚖️', label: lang === 'ml' ? 'ബിഎംഐ' : 'BMI' },
      { icon: '🩸', label: lang === 'ml' ? 'ഗ്ലൂക്കോസ്' : 'Glucose' },
    ]
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #1B75BC 0%, #145e9a 55%, #A6215A 100%)',
        padding: '2rem',
        userSelect: 'none',
      }}>
        <style>{`
          @keyframes kiosk-pulse {
            0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 0 0 0 rgba(255,255,255,0.45); }
            50%       { box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 0 0 18px rgba(255,255,255,0); }
          }
        `}</style>

        {/* Language toggle — prominent, top-centre */}
        <div style={{ position: 'absolute', top: '1.25rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem' }}>
          {['en', 'ml'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '0.625rem 1.25rem', borderRadius: 8, minHeight: 48, minWidth: 80,
              background: lang === l ? 'white' : 'rgba(255,255,255,0.15)',
              color: lang === l ? '#1B75BC' : 'white',
              border: lang === l ? 'none' : '1.5px solid rgba(255,255,255,0.35)',
              fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>{l === 'en' ? 'English' : 'മലയാളം'}</button>
          ))}
        </div>

        {/* Logo tap target */}
        <img
          src="/logo-light.svg"
          alt="VPS Lakeshore Hospital"
          style={{ height: 88, marginBottom: '1.5rem', cursor: 'default', marginTop: '3rem' }}
          onClick={handleLogoTap}
        />

        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', fontWeight: 500, margin: '0 0 1.5rem', textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {tr('programme')}
        </p>

        <h1 style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.35rem', fontWeight: 500, margin: '0 0 0.2rem', textAlign: 'center' }}>
          {tr('welcome')}
        </h1>
        <h2 style={{ color: 'white', fontSize: '3rem', fontWeight: 900, margin: '0 0 0.75rem', textAlign: 'center', lineHeight: 1.1, maxWidth: 520, letterSpacing: '-0.01em' }}>
          HealthPod
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '1.2rem', fontStyle: 'italic', margin: '0 0 2.5rem', textAlign: 'center', fontWeight: 500 }}>
          {tr('sub')}
        </p>

        {/* Health metrics preview strip */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.75rem' }}>
          {metrics.map(m => (
            <div key={m.label} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{m.icon}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.85 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setScreen('identify')}
          style={{
            padding: '1.2rem 3.5rem', fontSize: '1.3rem', fontWeight: 800,
            background: 'white', color: '#1B75BC',
            border: 'none', borderRadius: '3rem', cursor: 'pointer',
            animation: 'kiosk-pulse 2.8s ease-in-out infinite',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {tr('startBtn')}
        </button>

        {/* Chairman's promise — bottom */}
        <p style={{ marginTop: 'auto', paddingTop: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6, maxWidth: 420 }}>
          {tr('promise')}
        </p>

        {/* PIN dialog */}
        {showPinDialog && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: '2rem', width: 300, textAlign: 'center' }}>
              <p style={{ fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>{tr('pinPrompt')}</p>
              <input
                type="password" maxLength={8}
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                autoFocus
                style={{ width: '100%', padding: '0.625rem', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: '1.25rem', textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '0.3em' }}
              />
              {pinError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{pinError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { setShowPinDialog(false); setPinInput(''); setPinError('') }}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  {tr('cancel')}
                </button>
                <button onClick={handlePinSubmit}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: 6, background: '#1B75BC', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  {tr('pinBtn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Identify Screen ─────────────────────────────────────────────────────
  if (screen === 'identify') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#f0f4f8', padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <button onClick={resetToWelcome} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.95rem', cursor: 'pointer', marginBottom: '1rem', padding: '0.625rem 0', minHeight: 44, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            {tr('back')}
          </button>
          <div style={{ background: 'white', borderRadius: 16, padding: '2.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1.75rem' }}>
              {tr('identifyTitle')}
            </h2>
            <form onSubmit={handleLookup}>
              <input
                type="text"
                placeholder={tr('identifyPlaceholder')}
                value={query}
                onChange={e => { setQuery(e.target.value); setSearchError('') }}
                autoFocus
                style={{
                  width: '100%', padding: '1rem 1.25rem',
                  border: `2px solid ${searchError ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: 10, fontSize: '1.1rem', marginBottom: '1rem',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {searchError && (
                <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', color: '#991b1b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {searchError}
                </div>
              )}
              <button
                type="submit"
                disabled={searching || !query.trim()}
                style={{
                  width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 700,
                  background: '#1B75BC', color: 'white', border: 'none', borderRadius: 10,
                  cursor: searching || !query.trim() ? 'not-allowed' : 'pointer',
                  opacity: searching || !query.trim() ? 0.6 : 1,
                }}
              >
                {searching ? '…' : tr('identifyBtn')}
              </button>
            </form>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button
              onClick={() => { setPatient(null); setScreen('hra') }}
              style={{
                background: 'none', border: 'none', color: '#94a3b8',
                fontSize: '0.85rem', cursor: 'pointer', padding: '0.625rem',
                minHeight: 44, textDecoration: 'underline', textDecorationStyle: 'dotted',
              }}
            >
              {tr('skipBtn')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── HRA Screen ──────────────────────────────────────────────────────────
  if (screen === 'hra') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.5rem' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Kiosk header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.png" alt="VPS Lakeshore" style={{ height: 30 }} onClick={handleLogoTap} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{patient?.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{patient?.uhid}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {['en', 'ml'].map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', minHeight: 44, minWidth: 44,
                  background: lang === l ? '#1B75BC' : '#e2e8f0',
                  color: lang === l ? 'white' : '#64748b',
                  border: 'none', fontWeight: 600, cursor: 'pointer',
                }}>{l === 'en' ? 'EN' : 'ML'}</button>
              ))}
            </div>
          </div>

          {/* RiskAssessment — shows ScoreCard internally when done */}
          <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <RiskAssessment
              patient={patient}
              lang={lang}
              onDone={() => setResultDone(true)}
            />
          </div>

          {/* Countdown strip — appears after ScoreCard is shown */}
          {resultDone && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem', background: 'white', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                {lang === 'ml' ? 'ആരംഭ സ്ക്രീനിലേക്ക്' : tr('resetIn')} <strong>{countdown}</strong> {tr('seconds')}…
              </div>
              <button
                onClick={resetToWelcome}
                style={{ padding: '0.625rem 1.5rem', background: 'linear-gradient(90deg, #1B75BC, #145e9a)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}
              >
                {lang === 'ml' ? '← ആരംഭം' : '← Return to Start'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Fallback — redirect to welcome
  return null
}
