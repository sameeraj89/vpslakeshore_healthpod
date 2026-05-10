import { useState } from 'react'
import Sidebar from './Sidebar'
import Toast from '../ui/Toast'
import { useApp } from '../../lib/store'
import { Menu } from 'lucide-react'

export default function Layout({ children }) {
  const { toast } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Mobile backdrop */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 39 }}
        />
      )}

      <main className="app-main" style={{ flex: 1, overflow: 'auto', padding: '1.75rem', maxWidth: '100%', minWidth: 0 }}>
        {/* Mobile top bar */}
        <div className="mobile-header">
          <button
            aria-label="Open navigation menu"
            onClick={() => setMenuOpen(true)}
            style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: 44, minHeight: 44 }}
          >
            <Menu size={20} color="#475569" />
          </button>
          <img src="/logo.svg" alt="HealthPod" style={{ height: 32 }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>HealthPod</span>
        </div>

        {children}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
