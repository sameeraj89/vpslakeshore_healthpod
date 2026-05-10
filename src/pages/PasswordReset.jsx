import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

export default function PasswordReset() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY on auth state change when reset link is followed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also handle the case where the hash has the token (initial page load)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => { window.location.href = '/' }, 2500)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: '0.875rem', padding: '2.5rem 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <img src="/logo.png" alt="VPS Lakeshore" style={{ height: 36, marginBottom: '1.5rem', display: 'block' }} />
        <h2 style={{ margin: '0 0 0.375rem', fontSize: '1.35rem', fontWeight: 700, color: '#0d1b2a' }}>Set new password</h2>
        <p style={{ margin: '0 0 1.75rem', color: '#64748b', fontSize: '0.875rem' }}>Choose a strong password for your HealthPod account.</p>

        {done ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.5rem', padding: '1rem', display: 'flex', gap: '0.625rem', color: '#166534', fontSize: '0.875rem' }}>
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Password updated</div>
              Redirecting you to sign in…
            </div>
          </div>
        ) : !ready ? (
          <div style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
            Verifying reset link…
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />{error}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Confirm password</label>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '0.7rem', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
