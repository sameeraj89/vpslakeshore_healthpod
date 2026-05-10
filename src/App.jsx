import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './lib/store'
import { LangProvider } from './lib/lang'
import { supabase, supabaseConfigured } from './lib/supabase'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import PasswordReset from './pages/PasswordReset'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import PatientSummary from './pages/PatientSummary'
import Camps from './pages/Camps'
import Screenings from './pages/Screenings'
import Reports from './pages/Reports'
import UserManagement from './pages/admin/UserManagement'
import HealthPods from './pages/HealthPods'
import Campaigns from './pages/Campaigns'
import Kiosk from './pages/Kiosk'
import { canAccess } from './lib/roles'

function SetupScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: 'linear-gradient(135deg, #1B75BC, #A6215A)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>H</span>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem' }}>HealthPod needs setup</h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>The Supabase environment variables are not configured yet.</p>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'left', fontSize: '0.875rem', color: '#475569', lineHeight: 1.8 }}>
          <b style={{ color: '#1e293b' }}>1.</b> Create a project at <b>supabase.com</b><br />
          <b style={{ color: '#1e293b' }}>2.</b> Run <code style={{ background: '#f1f5f9', padding: '0 4px', borderRadius: 4 }}>supabase_schema.sql</code> in the SQL editor<br />
          <b style={{ color: '#1e293b' }}>3.</b> Add to Vercel Environment Variables:<br />
          <code style={{ display: 'block', background: '#f1f5f9', padding: '0.625rem', borderRadius: 6, marginTop: '0.5rem', fontSize: '0.8rem' }}>
            VITE_SUPABASE_URL=https://xxx.supabase.co<br />
            VITE_SUPABASE_ANON_KEY=eyJ...
          </code><br />
          <b style={{ color: '#1e293b' }}>4.</b> Redeploy on Vercel
        </div>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user, setUser } = useApp()
  const [checking, setChecking] = useState(true)

  if (!supabaseConfigured) return <SetupScreen />

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1B75BC, #A6215A)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>H</span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading HealthPod…</div>
        </div>
      </div>
    )
  }

  if (!user) {
    if (window.location.pathname === '/reset-password') return <PasswordReset />
    if (window.location.pathname === '/kiosk') return <Kiosk />
    return <Login />
  }

  return (
    <Routes>
      {/* Full-page standalone routes — no layout/sidebar */}
      <Route path="/patients/:id/summary" element={<PatientSummary />} />
      <Route path="/kiosk" element={<Kiosk />} />

      {/* Main app with sidebar layout */}
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/" element={canAccess(user, 'dashboard') ? <Dashboard /> : <Navigate to="/kiosk" replace />} />
            <Route path="/register" element={canAccess(user, 'register') ? <Register /> : <Navigate to="/" replace />} />
            <Route path="/patients" element={canAccess(user, 'patients') ? <Patients /> : <Navigate to="/" replace />} />
            <Route path="/patients/:id" element={canAccess(user, 'patients') ? <PatientDetail /> : <Navigate to="/" replace />} />
            <Route path="/camps" element={canAccess(user, 'camps') ? <Camps /> : <Navigate to="/" replace />} />
            <Route path="/screenings" element={canAccess(user, 'screenings') ? <Screenings /> : <Navigate to="/" replace />} />
            <Route path="/reports" element={canAccess(user, 'reports') ? <Reports /> : <Navigate to="/" replace />} />
            <Route path="/healthpods" element={canAccess(user, 'healthpods') ? <HealthPods /> : <Navigate to="/" replace />} />
            <Route path="/campaigns" element={canAccess(user, 'campaigns') ? <Campaigns /> : <Navigate to="/" replace />} />
            <Route path="/admin/users" element={canAccess(user, 'admin_users') ? <UserManagement /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </LangProvider>
    </BrowserRouter>
  )
}
