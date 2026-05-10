import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutDashboard, UserPlus, Users, ClipboardList, LogOut, WifiOff, RefreshCw, Settings, Calendar, BarChart2, MonitorSmartphone, MapPin, Megaphone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../lib/store'
import { useT } from '../../lib/lang'
import TX from '../../lib/translations'
import { queueCount, syncQueue, isOnline } from '../../lib/offlineQueue'
import { canAccess } from '../../lib/roles'

export default function Sidebar({ mobileOpen, onClose }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setUser, savePatient, showToast, user } = useApp()
  const { lang, toggle, tr } = useT()

  const allNav = [
    { label: tr(TX.sidebar.dashboard),  icon: LayoutDashboard, path: '/',            screen: 'dashboard' },
    { label: tr(TX.sidebar.newPatient), icon: UserPlus,         path: '/register',   screen: 'register' },
    { label: tr(TX.sidebar.patients),   icon: Users,            path: '/patients',   screen: 'patients' },
    { label: tr(TX.sidebar.screenings), icon: ClipboardList,    path: '/screenings', screen: 'screenings' },
    { label: tr(TX.sidebar.camps),      icon: Calendar,         path: '/camps',      screen: 'camps' },
    { label: tr(TX.sidebar.reports),    icon: BarChart2,        path: '/reports',    screen: 'reports' },
  ]
  const nav = allNav.filter(item => canAccess(user, item.screen))
  const adminNav = [
    { label: 'HealthPods',        icon: MapPin,     path: '/healthpods',   screen: 'healthpods' },
    { label: 'Campaigns',         icon: Megaphone,  path: '/campaigns',    screen: 'campaigns' },
    { label: tr(TX.sidebar.userManagement), icon: Settings, path: '/admin/users', screen: 'admin_users' },
  ].filter(item => canAccess(user, item.screen))

  const [pending, setPending] = useState(queueCount())
  const [online, setOnline] = useState(isOnline())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const tick = () => { setPending(queueCount()); setOnline(isOnline()) }
    const handleOnline = () => {
      tick()
      if (queueCount() > 0) handleSync()
    }
    const interval = setInterval(tick, 3000)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', tick)
    return () => { clearInterval(interval); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', tick) }
  }, [])

  async function handleSync() {
    setSyncing(true)
    await syncQueue(savePatient, showToast)
    setPending(queueCount())
    setSyncing(false)
  }

  function handleNavClick(path) {
    navigate(path)
    onClose?.()
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }


  return (
    <aside className={`app-sidebar${mobileOpen ? ' open' : ''}`} style={{
      width: 232, flexShrink: 0, background: 'white',
      borderRight: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>

      {/* Logo area */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
        <img src="/logo.png" alt="VPS Lakeshore Hospital" style={{ height: 44, width: 'auto', display: 'block' }} />
        <div style={{
          marginTop: '0.625rem',
          background: 'linear-gradient(90deg, #1B75BC, #A6215A)',
          borderRadius: 6,
          padding: '0.3rem 0.625rem',
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: 0.8 }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', letterSpacing: '0.08em' }}>
            HEALTHPOD
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.625rem', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <div className="section-title">{tr(TX.sidebar.programme)}</div>
        {nav.map(item => (
          <button
            key={item.path}
            className={`sidebar-link ${pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNavClick(item.path)}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}

        {adminNav.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: '0.5rem' }}>{tr(TX.sidebar.admin)}</div>
            {adminNav.map(item => (
              <button
                key={item.path}
                className={`sidebar-link ${pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid #f1f5f9' }}>
        {!online && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', marginBottom: 4, background: 'rgba(245,158,11,0.1)', borderRadius: 6, fontSize: '0.78rem', color: '#92400e' }}>
            <WifiOff size={13} /> {tr(TX.sidebar.offlineMode)}
          </div>
        )}
        {pending > 0 && (
          <button
            onClick={handleSync}
            disabled={!online || syncing}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0.75rem', marginBottom: 4, background: 'rgba(43,124,190,0.08)', border: '1px solid rgba(43,124,190,0.2)', borderRadius: 6, cursor: online ? 'pointer' : 'default', fontSize: '0.78rem', color: '#1B75BC' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? tr(TX.sidebar.syncing) : `${pending} ${tr(TX.sidebar.pendingSync)}`}
            </span>
            {online && !syncing && <span style={{ fontWeight: 700 }}>{tr(TX.sidebar.syncNow)}</span>}
          </button>
        )}

        <button
          onClick={() => { navigate('/kiosk'); onClose?.() }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', marginBottom: 4, borderRadius: 6, border: '1px solid rgba(27,117,188,0.25)', background: 'rgba(27,117,188,0.06)', cursor: 'pointer', fontSize: '0.8rem', color: '#1B75BC', fontWeight: 600 }}
        >
          <MonitorSmartphone size={14} />
          {lang === 'ml' ? 'Kiosk Mode' : 'Kiosk Mode'}
        </button>

        <button
          onClick={toggle}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0.75rem', marginBottom: 4, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#475569' }}
        >
          {lang === 'en' ? '🇮🇳 മലയാളം' : '🇬🇧 English'}
        </button>

        {user && (
          <div style={{ padding: '0.375rem 0.75rem', marginBottom: 4, fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        )}

        <button className="sidebar-link" onClick={logout}>
          <LogOut size={15} />
          {tr(TX.sidebar.signOut)}
        </button>
      </div>
    </aside>
  )
}
