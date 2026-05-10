import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function Login() {
  const { setUser } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false)

  async function handleGuest() {
    setGuestLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInAnonymously()
      if (!err && data.user) {
        setUser(data.user)
        return
      }
    } catch (_) { /* anonymous auth not enabled — fall through */ }
    // Fallback: navigate directly to kiosk without a session
    window.location.href = '/kiosk'
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setUser(data.user)
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!email) { setError('Enter your email address first'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f0f4f8' }}>

      {/* Left panel — branding */}
      <div
        className="login-brand-panel"
        style={{
          flex: 1,
          background: 'linear-gradient(160deg, #1B75BC 0%, #145e9a 55%, #A6215A 100%)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '3rem', minWidth: 0,
        }}
      >
        <img
          src="/logo.png"
          alt="VPS Lakeshore Hospital"
          style={{ height: 72, marginBottom: '2.5rem', filter: 'brightness(0) invert(1)' }}
        />
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2 }}>HealthPod</h1>
          <p style={{ margin: '0 0 0.5rem', opacity: 0.65, fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>Screening &amp; Early Detection Programme</p>
          <p style={{ margin: 0, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 600, opacity: 0.95, letterSpacing: '0.01em' }}>Your Health. Revealed. Rewarded.</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 600, opacity: 0.95, letterSpacing: '0.01em' }}>In 10 min.</p>
        </div>
        <div style={{ marginTop: 'auto', color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.7 }}>
          "Prevention is not a department at Lakeshore.<br />It is a promise."
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '100%', maxWidth: 420, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '3rem 2.5rem',
        background: 'white',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
      }}>

        {mode === 'login' ? (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <img src="/logo.png" alt="VPS Lakeshore" style={{ height: 36, marginBottom: '1.5rem', display: 'block' }} className="mobile-only-logo" />
              <h2 style={{ margin: '0 0 0.375rem', fontSize: '1.35rem', fontWeight: 700, color: '#0d1b2a' }}>Welcome back</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Sign in to access the HealthPod programme</p>
            </div>

            {error && (
              <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />{error}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" placeholder="you@lakeshorehospital.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.75rem', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '0.7rem', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <button onClick={() => { setMode('reset'); setError(''); setResetSent(false) }}
              style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#1B75BC', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              Forgot password?
            </button>

            {/* Guest / kiosk access */}
            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={handleGuest}
                disabled={guestLoading}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 10,
                  cursor: guestLoading ? 'wait' : 'pointer',
                  color: '#475569', fontSize: '0.9rem', fontWeight: 600,
                  minHeight: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {guestLoading ? 'Opening kiosk…' : 'Continue as Guest →'}
              </button>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.375rem', textAlign: 'center' }}>
                For patients — opens the health screening kiosk
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 0.375rem', fontSize: '1.35rem', fontWeight: 700, color: '#0d1b2a' }}>Reset password</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>We'll send a reset link to your email.</p>
            </div>

            {resetSent ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.5rem', padding: '1rem', display: 'flex', gap: '0.625rem', color: '#166534', fontSize: '0.875rem' }}>
                <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Check your inbox</div>
                  A password reset link was sent to <b>{email}</b>. Check spam if you don't see it.
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />{error}
                  </div>
                )}
                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Email address</label>
                    <input className="form-input" type="email" placeholder="you@lakeshorehospital.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '0.7rem', fontSize: '0.95rem' }}>
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}

            <button onClick={() => { setMode('login'); setError('') }}
              style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              ← Back to sign in
            </button>
          </>
        )}

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.7 }}>
          Contact your programme coordinator to get access. Data is stored securely per DISHA guidelines.
        </div>
      </div>
    </div>
  )
}
