import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { useT } from '../lib/lang'
import RiskAssessment from '../components/forms/RiskAssessment'
import { SCREENING_TYPES } from '../lib/screeningConfig'

const IDLE_MS = 3 * 60 * 1000   // reset to welcome after 3 min idle
const THANKYOU_MS = 120 * 1000  // auto-reset from thank-you after 2 min (extended to allow clinical screening input)
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
  const { lang, setLang } = useT()

  const [screen, setScreen] = useState('welcome')  // welcome | identify | guest | hra
  const [patient, setPatient] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [guestAge, setGuestAge] = useState('')
  const [guestGender, setGuestGender] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestError, setGuestError] = useState('')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [resultDone, setResultDone] = useState(false)
  const [kioskScreenings, setKioskScreenings] = useState({}) // { [typeKey]: { finding, result, notes } }

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
      guestTitle: 'Tell us a little about yourself',
      guestSub: 'This helps personalise your report. Nothing is saved permanently.',
      guestName: 'Full Name',
      guestNamePh: 'e.g. Ravi Kumar',
      guestAge: 'Age',
      guestAgePh: 'e.g. 45',
      guestGender: 'Gender',
      guestPhone: 'Mobile Number (optional)',
      guestPhonePh: 'e.g. 9876543210',
      guestProceed: 'Start Health Check →',
      guestSkip: 'Skip — proceed anonymously',
      male: 'Male', female: 'Female', other: 'Other / Prefer not to say',
      guestNameReq: 'Please enter your name to continue',
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
      guestTitle: 'നിങ്ങളെ കുറിച്ച് അല്‍പ്പം പറയൂ',
      guestSub: 'ഇത് നിങ്ങളുടെ റിപ്പോര്‍ട്ട് വ്യക്തിഗതമാക്കാന്‍ സഹായിക്കുന്നു.',
      guestName: 'പൂര്‍ണ്ണ നാമം',
      guestNamePh: 'ഉദാ: രവി കുമാര്‍',
      guestAge: 'പ്രായം',
      guestAgePh: 'ഉദാ: 45',
      guestGender: 'ലിംഗം',
      guestPhone: 'മൊബൈല്‍ നമ്പര്‍ (ഐച്ഛികം)',
      guestPhonePh: 'ഉദാ: 9876543210',
      guestProceed: 'ആരോഗ്യ പരിശോധന ആരംഭിക്കുക',
      guestSkip: 'ഒഴിവാക്കുക — അജ്ഞാതമായി തുടരുക',
      male: 'പുരുഷന്‍', female: 'സ്ത്രീ', other: 'മറ്റ്',
      guestNameReq: 'തുടരാന്‍ നിങ്ങളുടെ പേര്‍ നല്‍കുക',
    },
  }
  const tr = (key) => tx[lang][key] || tx.en[key]

  // Idle reset — active on identify/guest/hra screens
  useIdleReset(() => resetToWelcome(), screen === 'identify' || screen === 'guest' || screen === 'hra')

  function resetToWelcome() {
    setScreen('welcome')
    setPatient(null)
    setQuery('')
    setSearchError('')
    setResultDone(false)
    setKioskScreenings({})
    setGuestName(''); setGuestAge(''); setGuestGender(''); setGuestPhone(''); setGuestError('')
  }

  function handleGuestProceed(e) {
    e?.preventDefault()
    if (!guestName.trim()) { setGuestError(tr('guestNameReq')); return }
    setPatient({
      name: guestName.trim(),
      age: guestAge ? parseInt(guestAge, 10) : null,
      gender: guestGender || null,
      phone: guestPhone.trim() || null,
      uhid: 'GUEST',
    })
    setScreen('hra')
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
        <div
          onClick={handleLogoTap}
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 14,
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            marginTop: '3rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            cursor: 'default',
          }}
        >
          <img
            src="/logo.png"
            alt="VPS Lakeshore Hospital"
            style={{ height: 56, width: 'auto', display: 'block' }}
          />
        </div>

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
              onClick={() => setScreen('guest')}
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

  // ─── Guest Info Screen ───────────────────────────────────────────────────
  if (screen === 'guest') {
    const inputStyle = {
      width: '100%', padding: '0.875rem 1rem',
      border: '2px solid #e2e8f0', borderRadius: 10,
      fontSize: '1.05rem', outline: 'none', boxSizing: 'border-box',
      background: 'white', color: '#1e293b',
    }
    const labelStyle = {
      display: 'block', fontWeight: 700, fontSize: '0.82rem',
      color: '#475569', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em',
    }
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#f0f4f8', padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: 500 }}>
          <button onClick={() => setScreen('identify')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.95rem', cursor: 'pointer', marginBottom: '1rem', padding: '0.625rem 0', minHeight: 44, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            {tr('back')}
          </button>

          <div style={{ background: 'white', borderRadius: 16, padding: '2.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #1B75BC, #A6215A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>👤</div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{tr('guestTitle')}</h2>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>{tr('guestSub')}</p>
              </div>
            </div>

            <div style={{ height: 1, background: '#f1f5f9', margin: '1.25rem 0' }} />

            <form onSubmit={handleGuestProceed} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>{tr('guestName')} <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder={tr('guestNamePh')}
                  value={guestName}
                  onChange={e => { setGuestName(e.target.value); setGuestError('') }}
                  autoFocus
                  style={{ ...inputStyle, borderColor: guestError ? '#fca5a5' : '#e2e8f0' }}
                />
                {guestError && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0.375rem 0 0' }}>{guestError}</p>}
              </div>

              {/* Age + Gender row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>{tr('guestAge')}</label>
                  <input
                    type="number"
                    placeholder={tr('guestAgePh')}
                    value={guestAge}
                    onChange={e => setGuestAge(e.target.value)}
                    min={1} max={120}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{tr('guestGender')}</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {[['Male', tr('male')], ['Female', tr('female')], ['Other', tr('other')]].map(([val, label]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.375rem 0.625rem', borderRadius: 8, border: `1.5px solid ${guestGender === val ? '#1B75BC' : '#e2e8f0'}`, background: guestGender === val ? '#eff6ff' : 'white', transition: 'all 0.1s' }}>
                        <input
                          type="radio" name="gender" value={val}
                          checked={guestGender === val}
                          onChange={() => setGuestGender(val)}
                          style={{ accentColor: '#1B75BC' }}
                        />
                        <span style={{ fontSize: '0.88rem', fontWeight: guestGender === val ? 700 : 500, color: guestGender === val ? '#1B75BC' : '#475569' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>{tr('guestPhone')}</label>
                <input
                  type="tel"
                  placeholder={tr('guestPhonePh')}
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  maxLength={15}
                  style={inputStyle}
                />
              </div>

              <div style={{ height: 1, background: '#f1f5f9' }} />

              {/* Proceed button */}
              <button
                type="submit"
                style={{
                  width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 800,
                  background: 'linear-gradient(90deg, #1B75BC, #145e9a)',
                  color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer',
                }}
              >
                {tr('guestProceed')}
              </button>
            </form>
          </div>

          {/* Anonymous skip */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button
              onClick={() => { setPatient(null); setScreen('hra') }}
              style={{
                background: 'none', border: 'none', color: '#94a3b8',
                fontSize: '0.82rem', cursor: 'pointer', padding: '0.625rem',
                minHeight: 44, textDecoration: 'underline', textDecorationStyle: 'dotted',
              }}
            >
              {tr('guestSkip')}
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
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {patient?.name || (lang === 'ml' ? 'അതിഥി' : 'Guest')}
                  {(!patient || patient.uhid === 'GUEST') && (
                    <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600, letterSpacing: '0.04em' }}>GUEST</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {patient?.uhid && patient.uhid !== 'GUEST' ? patient.uhid : [patient?.age ? `${patient.age} yrs` : null, patient?.gender].filter(Boolean).join(' · ') || ''}
                </div>
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
              screenings={kioskScreenings}
              onDone={() => setResultDone(true)}
            />
          </div>

          {/* ── Clinical Cancer Screening section — appears after HRA is complete ── */}
          {resultDone && (() => {
            const cancerTypes = SCREENING_TYPES.filter(st =>
              st.category === 'cancer' && st.type === 'clinical' &&
              (!st.genderFilter || st.genderFilter.includes(patient?.gender) || !patient?.gender)
            )
            return (
              <div style={{ marginTop: '1.5rem', background: 'white', borderRadius: 14, padding: '1.5rem', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(166,33,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🔬</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                      {lang === 'ml' ? 'ക്ലിനിക്കൽ കാൻസർ സ്ക്രീനിംഗ്' : 'Clinical Cancer Screening'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {lang === 'ml' ? 'ജീവനക്കാർ ഫലങ്ങൾ രേഖപ്പെടുത്തുന്നു' : 'Staff record findings below — included in PDF download'}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 600, color: '#A6215A' }}>
                    {cancerTypes.filter(st => kioskScreenings[st.key]?.result).length}/{cancerTypes.length} {lang === 'ml' ? 'ചെയ്തു' : 'done'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  {cancerTypes.map(st => {
                    const sc = kioskScreenings[st.key] || {}
                    const isDone = !!(sc.result)
                    const isPositive = isDone && /positive|refer|high risk/i.test(sc.result)
                    return (
                      <div key={st.key} style={{
                        border: `1.5px solid ${isDone ? (isPositive ? '#fca5a5' : '#86efac') : '#e2e8f0'}`,
                        borderRadius: 10,
                        padding: '0.875rem',
                        background: isDone ? (isPositive ? 'rgba(254,226,226,0.4)' : 'rgba(220,252,231,0.4)') : '#fafafa',
                        transition: 'all 0.2s',
                      }}>
                        {/* Type header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{st.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>
                              {lang === 'ml' ? st.label?.ml : st.label?.en}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{st.method?.en}</div>
                          </div>
                          {isDone && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: isPositive ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 700 }}>{isPositive ? '!' : '✓'}</span>
                            </div>
                          )}
                        </div>

                        {/* Finding select */}
                        <div style={{ marginBottom: '0.5rem' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                            {lang === 'ml' ? 'കണ്ടെത്തൽ' : 'Finding'}
                          </label>
                          <select
                            value={sc.finding || ''}
                            onChange={e => setKioskScreenings(prev => ({
                              ...prev,
                              [st.key]: { ...(prev[st.key] || {}), finding: e.target.value }
                            }))}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#1e293b', background: 'white', cursor: 'pointer' }}
                          >
                            <option value="">{lang === 'ml' ? '— തിരഞ്ഞെടുക്കുക —' : '— Select finding —'}</option>
                            {(st.fields.find(f => f.key === 'finding')?.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        {/* Result select */}
                        <div>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                            {lang === 'ml' ? 'ഫലം' : 'Result'}
                          </label>
                          <select
                            value={sc.result || ''}
                            onChange={e => setKioskScreenings(prev => ({
                              ...prev,
                              [st.key]: { ...(prev[st.key] || {}), result: e.target.value }
                            }))}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#1e293b', background: 'white', cursor: 'pointer' }}
                          >
                            <option value="">{lang === 'ml' ? '— ഫലം തിരഞ്ഞെടുക്കുക —' : '— Select result —'}</option>
                            {(st.fields.find(f => f.key === 'result')?.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Info note */}
                <div style={{ marginTop: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(27,117,188,0.06)', borderRadius: 8, border: '1px solid rgba(27,117,188,0.15)', fontSize: '0.75rem', color: '#1B75BC' }}>
                  {lang === 'ml'
                    ? '💡 ഇവിടെ രേഖപ്പെടുത്തിയ ഫലങ്ങൾ PDF ഡൗൺലോഡ് ചെയ്യുമ്പോൾ ഉൾപ്പെടും.'
                    : '💡 Findings recorded here will appear on Page 2 of the downloaded PDF scorecard.'}
                </div>
              </div>
            )
          })()}

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
